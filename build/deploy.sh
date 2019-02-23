#!/bin/bash

set -e

######## 
# NOTES
# - called from project root, e.g., `./build/deploy.sh $ENV`
# - checks out committed code into a subdirectory tmpbuild
# - calls webpack.config.$ENV to bundle *.js code
# - tars only the code that is needed (for examples, scr/* and scripts/* are not included in the build)
# - reuses serverconfig.json, dataset/*, and genome/* files from the previously deployed build 
# - restarts node server
########

###############
# ARGUMENTS
###############

# default to deploying to ppdev
if (($# == 0)); then
	ENV="internal-stage"
	REV="HEAD"
	DEPLOYER=$USER
elif (($# == 1)); then
	ENV=$1
	REV="HEAD"
	DEPLOYER=$USER
elif (($# == 2)); then
	ENV=$1
	REV=$2
	DEPLOYER=$USER
else 
	ENV=$1
	REV=$2
	DEPLOYER=$3
fi


########################
# PROCESS COMMIT INFO
########################

# convert $REV to standard numeric notation
if [[ $REV=="HEAD" ]]; then
	if [[ -d .git ]]; then
		REV=$(git rev-parse --short HEAD)
	fi
fi

if [[ "$REV" == "HEAD" || "$REV" == "" ]]; then
	echo "Unable to convert the HEAD revision into a Git commit hash."
	exit 1
fi


#####################
# CONTEXTUAL CONFIG
#####################

APP=partjson # might be overridden below

if [[ "$ENV" == "pecan-int-test" || "$ENV" == "internal-stage" || "$ENV" == "internal-test" ]]; then
	DEPLOYER=genomeuser
	REMOTEHOST=pp-irt.stjude.org
	REMOTEDIR=/opt/app/pecan/portal/www
	URL="//pecan-int-test.stjude.org/$APP/"
	SUBDOMAIN=pecan-int-test

elif [[ "$ENV" == "pecan-int" || "$ENV" == "internal-prod" ]]; then
	DEPLOYER=genomeuser
	REMOTEHOST=pp-irp.stjude.org
	REMOTEDIR=/opt/app/pecan/portal/www
	URL="//pecan-int-test.stjude.org/$APP/"
	SUBDOMAIN=pecan-int

elif [[ "$ENV" == "pecan-test" || "$ENV" == "public-stage" ]]; then
	DEPLOYER=genomeuser
	REMOTEHOST=pp-prt.stjude.org
	REMOTEDIR=/opt/app/pecan/portal/www
	URL="//pecan-test.stjude.org/$APP/"
	SUBDOMAIN=pecan-test
	SRCHOSTPECAN=https://pecan-test.stjude.org
	SRCHOSTPP=https://proteinpaint.stjude.org

elif [[ "$ENV" == "pecan" || "$ENV" == "public-prod" || "$ENV" == "vpn-prod" || "$ENV" == "scp-prod" ]]; then
	DEPLOYER=genomeuser
	REMOTEHOST=pp-prp1.stjude.org
	REMOTEDIR=/opt/app/pecan/portal/www
	URL="//pecan.stjude.org/$APP/"
	SUBDOMAIN=pecan
	URLHOST=pecan.stjude.cloud
	SRCHOSTPECAN=https://pecan.stjude.cloud
	SRCHOSTPP=https://proteinpaint.stjude.org
	# 
	# *** TO-DO ***: 
	# Replace the following with a build server, preferably via git hooks + CI.
	#
	# The following approach removes the need to maintain another git repo
	# on a prod-whitelisted machine. So builds are created locally in the
	# dev machine, no need to worry about incompatible builds in another 
	# remote machine.
	# 
	# vpn-prod (step 1): 
	#	- put the built tar into a non-whitelisted temporary host
	# 
	# scp-prod (step 2): 
	# 	- log on to prod-whitelisted machine/remote desktop
	#	- scp built tar from the non-whitelisted temporary host
	#	- scp built tar to prod host
	#	- then complete the deployment via from there
	#
	if [[ "$ENV" == "vpn-prod" || "$ENV" == "scp-prod" ]]; then
		TEMPHOST=pp-irp
	fi
else
	echo "Environment='$ENV' is not supported"
	exit 1
fi



#################################
# EXTRACT AND BUILD FROM COMMIT
#################################

if [[ "$ENV" != "scp-prod" ]]; then
	rm -Rf tmpbuild
	# remote repo not used, use local repo for now
	mkdir tmpbuild
	git archive $REV | tar -x -C tmpbuild/

	cd tmpbuild
	# save some time by reusing parent folder's node_modules
	# but making sure to update to committed package.json
	ln -s ../node_modules node_modules
	# npm update
	npm run build

	# create dirs to put extracted files
	rm -rf $APP
	mkdir $APP
	mv public/* $APP/
	mv dist $APP

	cd $APP
	tar -cvzf ../$APP-$REV.tgz .
	cd ..
fi

##########
# DEPLOY
##########

if [[ "$ENV" == "vpn-prod" ]]; then
	scp $APP-$REV.tgz $DEPLOYER@$TEMPHOST:~
	echo "Deployed to $TEMPHOST. Whitelisted IP address required to access $REMOTEHOST."
	exit 1
elif [[ "$ENV" == "scp-prod" ]]; then
	scp $DEPLOYER@$TEMPHOST:~/$APP-$REV.tgz .
	ssh -t $DEPLOYER@$TEMPHOST "
		rm ~/$APP-$REV.tgz
	"
fi

# normal deployment
scp $APP-$REV.tgz $DEPLOYER@$REMOTEHOST:~

ssh -t $DEPLOYER@$REMOTEHOST "
	rm -Rf $REMOTEDIR/$APP-new
	mkdir $REMOTEDIR/$APP-new
	tar --warning=no-unknown-keyword --warning=no-timestamp -xvzf ~/$APP-$REV.tgz -C $REMOTEDIR/$APP-new/
	rm ~/$APP-$REV.tgz

	rm -Rf $REMOTEDIR/$APP-prev
	mv $REMOTEDIR/$APP $REMOTEDIR/$APP-prev

	mv $REMOTEDIR/$APP-new $REMOTEDIR/$APP
	chmod -R 755 $REMOTEDIR/$APP

	# link under pecan directory
  ln -s $REMOTEDIR/$APP $REMOTEDIR/html/$APP

	echo \"$ENV $REV $(date)\" >> $REMOTEDIR/$APP/rev.txt
"

#############
# CLEANUP
#############

if [[ "$ENV" == "scp-prod" ]]; then
	rm ./$APP-$REV.tgz
else 
	cd ..
	rm -rf tmpbuild
fi
