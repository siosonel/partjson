class e{constructor(e){this.Tree=e,this.ignoredVals=e.opts.ignoredVals,this.allowedKeyTypes=new Set(["string","number","undefined"])}getFxn(e,t,s){if(!this.Tree.reservedOpts.includes(e))if(s.keyTokens.skip)this["#"](e,s);else{if(s.keyTokens.subs in this.Tree.valueFiller){const t=this.Tree.valueFiller[s.keyTokens.subs](e,s);if(!t)return void s.errors.push(["key","UNSUPPORTED-KEY-SUBSTITUTION"]);const r=s.keyTokens.conv?s.keyTokens.conv:"''";return this[r]?this[r](t,s):void s.errors.push(["key","UNSUPPORTED-KEY-CONVERSION"])}if(t in this)return this[t](e,s);s.errors.push(["key","UNSUPPORTED-KEY-SYMBOL"])}}getAllowedKeys(e,t,s,r){if(!Array.isArray(e))return r.errors.push(["key","ERR-NON-ARRAY-KEYS",t]),[];const i=[];for(const n of e)this.ignoredVals.includes(n)||(this.allowedKeyTypes.has(typeof n)?i.push(n):r.errors.push([s,"INVALID-RESULT-KEY",t]));return i}}e.prototype["''"]=function(e,t){return(s,r)=>this.getAllowedKeys([e(s,r)],s,t,r)},e.prototype["()"]=function(e,t){return(s,r)=>this.getAllowedKeys([e(s,r)],s,t,r)},e.prototype["[]"]=function(e,t){return(s,r)=>this.getAllowedKeys(e(s,r),s,t,r)},e.prototype["#"]=function(e,t){this.Tree.commentedTerms.has(t)||this.Tree.commentedTerms.set(t,{keys:new Set,values:new Set}),this.Tree.commentedTerms.get(t).keys.add(e)};class t{constructor(e){this.Tree=e,this.ignoredVals=this.Tree.opts.ignoredVals}getFxn(e){return"string"==typeof e.templateVal?this.getStringFiller(e):Array.isArray(e.templateVal)?this.getArrayFiller(e):e.templateVal&&"object"==typeof e.templateVal?this.getObjectFiller(e):(t,s,r)=>{r[s]=e.templateVal}}getStringFiller(e){const[t,s,r]=this.Tree.parseTerm(e.templateVal),i=r.skip?s:r.subs;if(i in this){const s=this[i](t,e);if(s){const t=r.conv?r.conv:"''";return this[r.aggr+t]?this[r.aggr+t](s,e):null}}else e.errors.push(["val","UNSUPPORTED-TEMPLATE-VALUE-SYMBOL"])}getArrayFiller(e){if(!e.templateVal[0])return(t,s,r)=>{r[s]=e.templateVal};if("string"==typeof e.templateVal[0]){const[t,s,r]=this.Tree.parseTerm(e.templateVal[0]),i=r.skip?s:r.subs;if(i in this){const s=this[i](t,e);if(s){return this["["+(r.conv?r.conv:"''")+"]"](s,e)}}else e.errors.push(["val","UNSUPPORTED-TEMPLATE-VALUE-SYMBOL"])}else{if(e.templateVal[0]&&"object"==typeof e.templateVal[0])return this["[{}]"](e.templateVal[0],e);e.errors.push("val","UNSUPPORTED-TEMPLATE-VALUE")}}getObjectFiller(e){return(t,s,r)=>{s in r||(r[s]=this.Tree.getEmptyResult(s,r));this.Tree.contexts.get(r[s]);this.Tree.processRow(t,e.templateVal,r[s])}}isNumeric(e){return!isNaN(parseFloat(e))&&isFinite(e)&&""!==e}}t.prototype["#"]=function(e,t){this.Tree.commentedTerms.has(t)||this.Tree.commentedTerms.set(t,{keys:new Set,values:new Set}),this.Tree.commentedTerms.get(t).values.add(e)},t.prototype[""]=function(e,t){return this.isNumeric(e)?()=>+e:()=>e},t.prototype.$=function(e,t){if("$"==e||e=="$"+this.Tree.userDelimit)return e=>e;if(e.includes(this.Tree.userDelimit)){const t=e.slice(1).split(this.Tree.userDelimit);""==t[0]&&t.shift();const s=(e,t)=>e?e[t]:null;return e=>t.reduce(s,e)}{const t=e.slice(1);return e=>e[t]}},t.prototype["="]=function(e,t){const s=e.slice(1).split(this.Tree.treeDelimit).reduce((e,t)=>e&&t in e?e[t]:null,this.Tree.opts["="]);if(s)return s;t.errors.push(["val","ERR-MISSING-FXN"])},t.prototype["@"]=function(e,t){if(!this.Tree.reservedOpts.includes(e)){if("@"==e||e=="@"+this.Tree.treeDelimit)return(e,t)=>t.self;if(e.includes(this.Tree.treeDelimit)){const t=e.split(this.Tree.treeDelimit),s=(e,t)=>{const[s,r]=e;return s&&t?"@"==t?[r.self,r]:"@"==t[0]?[r[t.slice(1)],this.Tree.contexts.get(r[t.slice(1)])]:s?[s[t],this.Tree.contexts.get(s[t])]:[null,null]:null};return(e,r)=>t.reduce(s,[r.self,r])[0]}{const t=e.slice(1);return(e,s)=>s[t]}}},t.prototype["&"]=function(e,t){const s=e.slice(1).split(this.Tree.userDelimit),r=s.shift();if(s.length){if(1==s.length){const e=s[0];return()=>{const t=this.Tree.joins.get(r);return t?t[e]:null}}{const e=(e,t)=>e?e[t]:null;this.Tree.joins.get(r);return t=>s.reduce(e,this.Tree.joins.get(r))}}return()=>this.Tree.joins.get(r)},t.prototype["''"]=function(e,t){return(t,s,r,i)=>{r[s]=e(t,i)}},t.prototype["()"]=function(e,t){return(t,s,r,i)=>{r[s]=e(t,i)}},t.prototype["[]"]=function(e,t){return(t,s,r,i)=>{r[s]=e(t,i)}},t.prototype["['']"]=function(e,t){const s=t.templateVal[1]?t.templateVal[1]:"";return s&&"distinct"==s?(t,s,r,i)=>{s in r||(r[s]=new Set),r[s].add(e(t,i))}:(t,s,r,i)=>{s in r||(r[s]=[]),r[s].push(e(t,i))}},t.prototype["[()]"]=function(e,t){const s=t.templateVal[1]?t.templateVal[1]:"";return s&&"distinct"==s?(t,s,r,i)=>{s in r||(r[s]=new Set),r[s].add(e(t,i))}:(t,s,r,i)=>{s in r||(r[s]=[]),r[s].push(e(t,i))}},t.prototype["[[]]"]=function(e,t){const s=t.templateVal[1]?t.templateVal[1]:"";return s&&"distinct"==s?(s,r,i,n)=>{const o=e(s,n);if(Array.isArray(o)){r in i||(i[r]=new Set);for(const e of o)i[r].add(e)}else n.errors.push([t,"ERR-NON-ARRAY-VALS",s])}:(s,r,i,n)=>{const o=e(s,n);Array.isArray(o)?(r in i||(i[r]=[]),i[r].push(...o)):n.errors.push([t,"ERR-NON-ARRAY-VALS",s])}},t.prototype["[{}]"]=function(e,t){this.Tree.parseTemplate(e,t.lineage);this.Tree.fillers.get(e);return(t,s,r)=>{s in r||(r[s]=this.Tree.getEmptyResult(s,r,!0));const i=this.Tree.getEmptyResult(r[s].length,r);this.Tree.processRow(t,e,i),r[s].push(i)}},t.prototype["+''"]=function(e,t){return(t,s,r,i)=>{s in r||(r[s]=0),r[s]+=e(t,i)}},t.prototype["+()"]=function(e){return(t,s,r,i)=>{s in r||(r[s]=0),r[s]+=-e(t,i)}},t.prototype["-''"]=function(e){return(t,s,r,i)=>{s in r||(r[s]=0),r[s]-=e(t,i)}},t.prototype["-()"]=function(e){return(t,s,r,i)=>{s in r||(r[s]=0),r[s]-=e(t,i)(t)}},t.prototype["<''"]=function(e,t){return(s,r,i,n)=>{const o=+e(s,n);this.ignoredVals.includes(o)||(this.isNumeric(o)?r in i?i[r]<o&&(i[r]=o):i[r]=o:n.errors.push([t,"NON-NUMERIC-THAN",s]))}},t.prototype["<()"]=function(e,t){return(s,r,i,n)=>{const o=+e(s,n)(s);this.ignoredVals.includes(o)||(this.isNumeric(o)?r in i?i[r]<o&&(i[r]=o):i[r]=o:n.errors.push([t,"NON-NUMERIC-THAN",s]))}},t.prototype[">''"]=function(e,t){return(s,r,i,n)=>{const o=+e(s,n);this.ignoredVals.includes(o)||(this.isNumeric(o)?r in i?i[r]>o&&(i[r]=o):i[r]=o:n.errors.push([t,"NON-NUMERIC-THAN",s]))}},t.prototype[">()"]=function(e,t){return(s,r,i,n)=>{const o=+e(s,n)(s);this.ignoredVals.includes(o)||(this.isNumeric(o)?r in i?i[r]>o&&(i[r]=o):i[r]=o:n.errors.push([t,"NON-NUMERIC-THAN",s]))}};class s{constructor(){this.errors=new Set,this.resultLog=Object.create(null),this.quiet=!1}clear(){this.errors.clear(),this.resultLog=Object.create(null)}log(e){Object.keys(this.resultLog).length&&console.log(this.resultLog)}markErrors(e,t){if(!t)return;const s=this.resultLog;for(const r in t.filler.inputs){const i=t.filler.inputs[r];for(const t of i.errors){const[r,n,o]=t;n in s||(s[n]=Object.create(null));const l=JSON.stringify(i.lineage);l in s[n]||(s[n][l]=o?[]:0),o?s[n][l].push(o):s[n][l]+=1,"key"==r?e["{{ "+n+" }} "+i.term]=i.templateVal:"val"==r&&(Array.isArray(i.templateVal)?e[i.term]=["{{ "+n+" }} ",...i.templateVal]:"string"==typeof i.templateVal?e[i.term]="{{ "+n+" }} "+i.templateVal:e[i.term]="{{ "+n+" }} ")}}if(t.errors.length){const s={};e["@errors"]=s;for(const e of t.errors){const[t,r,i]=e,n="{{ "+r+" }} "+t.term;n in s||(s[n]=0),s[n]+=1}}}}class r{constructor(r={}){this.defaultOpts={template:{},"=":{},ignoredVals:[]},this.opts=Object.assign(this.defaultOpts,r),this.userDelimit=".",this.treeDelimit=".",this.subsSymbols=["$","=","@","&"],this.convSymbols=["()","[]"],this.aggrSymbols=["+","-","<",">"],this.timeSymbols=[":__","_:_","__:"],this.skipSymbols=["#"],this.reservedOpts=["@userDelimit","@treeDelimit"],this.reservedFxns=["@before()","@after()","@dist()","@join()"],this.reservedContexts=["@branch","@parent","@root","@self"],this.reservedTerms=[...this.reservedOpts,...this.reservedFxns,...this.reservedContexts],this.steps=[":__","","_:_"],this.errors=new s(this),this.keyFiller=new e(this),this.valueFiller=new t(this),this.refresh()}refresh(e={}){this.errors.clear(),Object.assign(this.opts,e),this.opts.template["@userDelimit"]&&(this.userDelimit=this.opts.template["@userDelimit"]),this.opts.template["@treeDelimit"]&&(this.treeDelimit=this.opts.template["@treeDelimit"]),delete this.commentedTerms,this.commentedTerms=new WeakMap,delete this.joins,this.joins=new Map,delete this.fillers,this.fillers=new Map,delete this.context,this.contexts=new WeakMap,delete this.tree,this.tree=this.getEmptyResult(),this.parseTemplate(this.opts.template),this.opts.data&&this.add(this.opts.data,!1),this.errors.log(this.fillers)}parseTemplate(e,t=[]){const s=Object.create(null);s.inputs=Object.create(null),s["@before"]=this.trueFxn,s["@after"]=this.trueFxn,s["__:"]=[],this.fillers.set(e,s);const r=this.steps.map(e=>[]);for(const i in e){const[n,o,l,c]=this.parseTerm(i),h=e[i],u=s.inputs[i]={term:i,subterm:n,symbols:o,keyTokens:l,templateVal:h,lineage:[...t,i],errors:[]};"@()"==o?s[n]=this[n](e[i],u):(u.keyFxn=this.keyFiller.getFxn(n,o,u),u.keyFxn&&(u.valFxn=this.valueFiller.getFxn(u),"__:"==l.time?s["__:"].push(i):r[c].push(i))),h&&(Array.isArray(h)||"object"!=typeof h||this.parseTemplate(h,u.lineage))}s.steps=r.filter(e=>e.length)}parseTerm(e){const t=this.skipSymbols.includes(e[0])?"#":"",s=e.slice(0,3),r=this.timeSymbols.includes(s)?s:"",i=t.length+r.length,n=e[i],o=e.slice(-2),l=this.aggrSymbols.includes(n)?n:"",c=this.convSymbols.includes(o)?o:"",h=l&&c?e.slice(i+1,-2):l?e.slice(i+1):c?e.slice(i,-2):r?e.slice(i):e,u=this.subsSymbols.includes(h[0])?h[0]:"",p=t||l+u+c,a=u?h.slice(1):h;return[h,p,{skip:t,time:r,aggr:l,subs:u,stem:a,conv:c,subterm:h},this.steps.indexOf(r)]}getEmptyResult(e=null,t=null,s=!1){const r=s?[]:Object.create(null),i={branch:e,parent:t,self:r,root:this.tree?this.tree:r,errors:[]};return this.contexts.set(r,i),r}add(e,t=!0){t&&error.clear(),this.joins.clear();for(const t of e)this.processRow(t,this.opts.template,this.tree),this.joins.clear();this.processResult(this.tree),t&&this.errors.log()}processRow(e,t,s){const r=this.contexts.get(s),i=this.fillers.get(t);if(r.filler=i,i["@before"](e,s,r)&&(!i["@join"]||i["@join"](e))){for(const t of i.steps)for(const n of t){const t=i.inputs[n];if(t.keyFxn&&t.valFxn){const i=t.keyFxn(e,r);for(const n of i)t.valFxn&&t.valFxn(e,n,s,r)}}i["@after"](e,s,r),i["@dist"]&&i["@dist"](r)}}processResult(e){const t=this.contexts.get(e);if(t)for(const s of t.filler["__:"]){const r=t.filler.inputs[s];if(r.keyFxn&&r.valFxn){const s=r.keyFxn(null,t);for(const i of s)r.valFxn&&r.valFxn(null,i,e,t)}}for(const t in e){const s=e[t];if(s instanceof Set)e[t]=[...e[t]];else if(s)if(Array.isArray(s)){if(s[0]&&"object"==typeof s[0])for(const e of s)this.processResult(e)}else if("object"==typeof s){const e=this.contexts.get(s);e&&e["@dist"]&&e["@dist"](s),this.processResult(s)}}this.errors.markErrors(e,t)}trueFxn(){return!0}isNumeric(e){return!isNaN(parseFloat(e))&&isFinite(e)&&""!==e}}r.prototype["@before"]=function(e,t){const s=this.opts["="][e.slice(1,-2)];return s||(t.errors.push(["val","MISSING-@before-FXN"]),this.trueFxn)},r.prototype["@after"]=function(e,t){const s=this.opts["="][e.slice(1,-2)];return s||(t.errors.push(["val","MISSING-@after-FXN"]),this.trueFxn)},r.prototype["@join"]=function(e,t){return s=>{let r=!0;for(const i in e){const n=this.opts["="][e[i].slice(1,-2)];if(n){const e=n(s);e?this.joins.set(i,e):r=!1}else t.errors.push(["val","MISSING-@join-FXN"])}return r}},r.prototype["@dist"]=function(e,t){const s=Array.isArray(e)?e[0]:e,r=this.valueFiller["@"](s);return e=>{e["@dist"]=(i=>{const n=r(null,e);n?Array.isArray(n)?n.push(i):n[s]=i:e.errors.push([t,"MISSING-DIST-TARGET"])})}};export default r;
