const tsvText = `catname	catsex	owners	ownerblock	huntblock	huntdate	preytype	preysubtype	preymass
Jerry	male	Bob	A1	B1	2019-01-02 19:25	bird	robin	0.596
Jerry	male	Bob	A1	B4	2019-01-04 20:45	mammal	rat	0.601
Jerry	male	Bob,Jane	A1	C3	2019-01-07 06:45	mammal	squirel	0.8
Princess	female	Alice,Joe	C2	C3	2019-01-05 09:45	fish	minnow	0.1
Princess	female	Alice,Mike	C2	C3	2019-01-07 09:45	fish	catfish	1.6
Princess	female	Alice,Mike	C2	C3	2019-01-09 09:45	amphibian	frog	0.7`

const examples = [{
	section: "quick-examples",
	id: "group-by-data-value",
	title: "Group by data value",
	template: {
		byCat: {
    	"$catname": {
    	  total: "+1"
   		}
  	}
  }
},{
	section: "quick-examples",
	id: "list-by-value",
	title: "List by data value",
	template: {
		distinctPreyType: [
    	"$preytype", "distinct"
    ],
    nonDistinct: [
    	"$preytype"
    ]
  }
},{
	section: "quick-examples",
	id: "min-max-values",
	title: "Find the minimum and maximum values",
	template: {
		massMin: "<$preymass",
    massMax: ">$preymass",
    total: "+1"
  }
},{
	symbol: "$",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-data-value",
	title: `"$" substitutes a data value`,
	template: {
		byCat: {
    	"$catname": {
    	  total: "+1"
   		}
  	}
  }
},{
	symbol: "=",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-function",
	title: `"=" substitutes a user supplied function`,
	template: {
		"adjustedPreyMass": {
    	"$preytype": "+=adjustPreyMass()"
		}
  }
},{
	symbol: "&",
	tokenType: "subs",
	tabLabel: "&amp;",
	section: "substitution",
	id: "substitute-a-join",
	title: `"&" substitutes a joined property`,
	template: {}
},{
	symbol: "@",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-result",
	title: `"@" substitutes a result value`,
	template: {}
},{
	section: "stem",
	id: "stem",
	title: `A stem word can be modified by any of the optional symbols.`,
	template: {}
},{
	symbol: "[delim]",
	tokenType: "stem",
	tabLabel: "[&nbsp;delim&nbsp;]",
	section: "stem",
	id: "stem-delim",
	title: `Nested values are indicated by partitioning the stem word with a user supplied delimiter.`,
	template: {}
},{
	symbol: "( )",
	tokenType: "conv",
	section: "conversion",
	id: "convert-a-value",
	title: `"()" calls a substituted value as a function`,
	template: {}
},{
	symbol: "[ ]",
	tokenType: "conv",
	section: "conversion",
	id: "convert-a-value",
	title: `"[]" distributes the returned value of a function call`,
	template: {}
},{
	symbol: "+",
	tokenType: "aggr",
	section: "aggregation",
	id: "aggregate-a-value",
	title: `"+" adds the computed value from a running total`,
	template: {}
},{
	symbol: "-",
	tokenType: "aggr",
	section: "aggregation",
	id: "aggregate-a-value",
	title: `"-" subtracts the computed value from a running total`,
	template: {}
},{
	symbol: "<",
	tokenType: "aggr",
	tabLabel: "&lt;",
	section: "aggregation",
	id: "find-min-value",
	title: `"<" finds the minimum value`,
	template: {}
},{
	symbol: ">",
	tokenType: "aggr",
	tabLabel: "&gt;",
	section: "aggregation",
	id: "find-max-value",
	title: `">" finds the maximum value`,
	template: {}
},{
	symbol: "[ &nbsp; ]",
	tokenType: "aggr",
	section: "aggregation",
	id: "collect-into-a-list",
	title: `"[ ]" collects values into a list`,
	template: {}
},{
	symbol: ":__",
	tokenType: "time",
	section: "timing",
	id: "compute-before-unmarked-inputs",
	title: `A ":__" prefix will cause a template input to be processed before unmarked inputs`,
	template: {}
},{
	symbol: "_:_",
	tokenType: "time",
	section: "timing",
	id: "compute-after-unmarked-inputs",
	title: `A "_:_" prefix will cause a template input to be processed after unmarked inputs`,
	template: {}
},{
	symbol: "__:",
	tokenType: "time",
	section: "timing",
	id: "compute-after-all-rows",
	title: `A "__:" prefix will cause a template input to be processed after the last data row has been looped through`,
	template: {}
},{
	symbol: "#",
	tokenType: "skip",
	section: "skip",
	id: "skip-an-input",
	title: `"#" causes a template input to be ignored`,
	template: {}
}]

const fxns = {
	adjustPreyMass(row) {
		return row.preymass*0.8
	},
	splitOwners(row) { 
		return row.owners.split(",")
	}
}