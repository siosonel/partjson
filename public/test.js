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
    	  count: "+1"
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
    count: "+1"
  }
},{
	symbol: "$",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-data-value",
	title: `<span class="code-snippet">$</span> substitutes a data value`,
	template: {
		byCat: {
    	"$catname": {
    	  count: "+1"
   		}
  	}
  }
},{
	symbol: "=",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-function",
	title: `<span class="code-snippet">=</span> substitutes a user supplied function`,
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
	title: `<span class="code-snippet">&amp;</span> substitutes a joined property`,
	template: {}
},{
	symbol: "@",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-result",
	title: `<span class="code-snippet">@</span> substitutes a result value`,
	template: {}
},{
	section: "stem",
	id: "stem",
	title: `A stem word can be modified by any of the optional symbols.`,
	template: {}
},{
	symbol: "[delim]",
	tokenType: "stem",
	tabLabel: "[delim]",
	section: "stem",
	id: "stem-delim",
	title: `Nested values are indicated by partitioning the stem word with a user supplied delimiter.`,
	template: {}
},{
	symbol: "()",
	tokenType: "conv",
	section: "conversion",
	id: "convert-a-value",
	title: `<span class="code-snippet">()</span> calls a substituted value as a function`,
	template: {}
},{
	symbol: "[]",
	tokenType: "conv",
	section: "conversion",
	id: "convert-a-value",
	title: `<span class="code-snippet">[]</span> distributes the returned value of a function call`,
	template: {}
},{
	symbol: "+",
	tokenType: "aggr",
	section: "aggregation",
	id: "add-a-value",
	title: `<span class="code-snippet">+</span> adds the computed value from a running count`,
	template: {}
},{
	symbol: "-",
	tokenType: "aggr",
	section: "aggregation",
	id: "subtract-a-value",
	title: `<span class="code-snippet">-</span> subtracts the computed value from a running count`,
	template: {}
},{
	symbol: "<",
	tokenType: "aggr",
	tabLabel: "&lt;",
	section: "aggregation",
	id: "find-min-value",
	title: `<span class="code-snippet">&lt;</span> finds the minimum value`,
	template: {}
},{
	symbol: ">",
	tokenType: "aggr",
	tabLabel: "&gt;",
	section: "aggregation",
	id: "find-max-value",
	title: `<span class="code-snippet">&gt;</span> finds the maximum value`,
	template: {}
},{
	symbol: "[ ]",
	tokenType: "aggr",
	section: "aggregation",
	id: "collect-into-a-list",
	title: `<span class="code-snippet">[ ]</span> collects values into a list`,
	template: {}
},{
	symbol: ":__",
	tokenType: "time",
	section: "timing",
	id: "compute-before-unmarked-inputs",
	title: `A <span class="code-snippet">:__</span> prefix will cause a template input to be processed before unmarked inputs`,
	template: {}
},{
	symbol: "_:_",
	tokenType: "time",
	section: "timing",
	id: "compute-after-unmarked-inputs",
	title: `A <span class="code-snippet">_:_</span> prefix will cause a template input to be processed after unmarked inputs`,
	template: {}
},{
	symbol: "__:",
	tokenType: "time",
	section: "timing",
	id: "compute-after-all-rows",
	title: `A <span class="code-snippet">__:</span> prefix will cause a template input to be processed after the last data row has been looped through`,
	template: {}
},{
	symbol: "#",
	tokenType: "skip",
	section: "skip",
	id: "skip-an-input",
	title: `<span class="code-snippet">#</span> causes a template input to be ignored`,
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