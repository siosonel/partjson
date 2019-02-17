const tsvText = `catname	catsex	owners	ownerblock	huntblock	huntdate	preytype	preysubtype	preymass
Jerry	male	Bob	A1	B1	2019-01-02 19:25	bird	robin	0.596
Jerry	male	Bob	A1	B4	2019-01-04 20:45	mammal	rat	0.601
Jerry	male	Bob,Jane	A1	C3	2019-01-07 06:45	mammal	squirel	0.8
Princess	female	Alice,Joe	C2	C3	2019-01-05 09:45	fish	minnow	0.1
Princess	female	Alice,Mike	C2	C3	2019-01-07 09:45	fish	catfish	1.6
Princess	female	Alice,Mike	C2	C3	2019-01-09 09:45	amphibian	frog	0.7`

const examples = [{
	title: "Group by a data property value",
	template: {
		byCat: {
    	"$catname": {
    	  total: "+1"
   		}
  	}
  }
},{
	title: "List by prey types",
	template: {
		distinctPreyType: [
    	"$preytype", "distinct"
    ],
    nonDistinct: [
    	"$preytype"
    ]
  }
},{
	title: "List by prey types",
	template: {
		distinctPreyType: [
    	"$preytype", "distinct"
    ],
    nonDistinct: [
    	"$preytype"
    ]
  }
}]