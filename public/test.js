const tsvText = `catname	catsex	owners	ownerblock	huntblock	huntdate	preytype	preysubtype	preymass	nested-json
Jerry	male	Bob	A1	B1	2019-01-02 19:25	bird	robin	0.596	{"random":{"id": "a10c"}}
Jerry	male	Bob	A1	B4	2019-01-04 20:45	mammal	rat	0.601	{"random":{"id": "bkd0"}}
Jerry	male	Bob,Jane	A1	C3	2019-01-07 06:45	mammal	squirel	0.8	{"random":{"id": "jjkl"}}
Princess	female	Alice,Joe	C2	C3	2019-01-05 09:45	fish	minnow	0.1	{"random":{"id": "hgys"}}
Princess	female	Alice,Mike	C2	C3	2019-01-07 09:45	fish	catfish	1.6	{"random":{"id": "irty"}}
Princess	female	Alice,Mike	C2	C3	2019-01-09 09:45	amphibian	frog	0.7	{"random":{"id": "34jd"}}`

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
    massMin: ">$preymass",
		massMax: "<$preymass",
    count: "+1"
  }
},{
	section: "stem",
	id: "stem",
	title: `A stem word can be modified by any of the optional symbols to`
		+ ` indicate the type of processing that needs to happen.`,
	template: {
		"$catname": "unprocessed-stem",
		"unprocessed-stem": "+$preymass"
	}
},{
	symbol: "[delim]",
	tokenType: "stem",
	tabLabel: "[delim]",
	section: "stem",
	id: "stem-delim",
	title: `Nested values are indicated by partitioning the stem word with a user supplied delimiter.`,
	template: {
		"$nested.random.id": ["$catname"]
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
	template: {
  	"@join()": {
  		"loc": "=blockInfo()"
  	},
  	"$catname": {
  		count: "+1",
  		blockName: "&loc.name",
  		blockPop: "&loc.population"
  	}
  }
},{
	symbol: "@",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-result",
	title: `<span class="code-snippet">@</span> substitutes a result value`,
	template: {
		"staticResult": "0.5",
		"child": {
			"version": "@parent.staticResult"
		}
	}
},{
	symbol: "()",
	tokenType: "conv",
	section: "conversion",
	id: "convert-via-function",
	title: `<span class="code-snippet">()</span> calls a substituted value as a function`,
	template: {
		"$preytype": "=roundedPreyMass()"
	}
},{
	symbol: "[]",
	tokenType: "conv",
	section: "conversion",
	id: "convert-array",
	title: `<span class="code-snippet">[]</span> distributes the returned value of a function call`,
	template: {
		"byOwner": {
			"=splitOwners[]": "+$preymass"
		},
		"byPreyType": {
			"$preytype": [
				"=splitOwners[]", "distinct"
			]
		}
	}
},{
	symbol: "+",
	tokenType: "aggr",
	section: "aggregation",
	id: "add-a-value",
	title: `<span class="code-snippet">+</span> adds the computed value from a running count`,
	template: {
		byCat: {
    	"$catname": "+1"
   	}
  }
},{
	symbol: "-",
	tokenType: "aggr",
	section: "aggregation",
	id: "subtract-a-value",
	title: `<span class="code-snippet">-</span> subtracts the computed value from a running count`,
	template: {
		lostmass: {
    	"$catname": "-$preymass"
   	}}
},{
	symbol: "<",
	tokenType: "aggr",
	tabLabel: "&lt;",
	section: "aggregation",
	id: "find-max-value",
	title: `<span class="code-snippet">&lt;</span> finds the maximum value, by replacing a result's input by a greater value`,
	template: {
		massMax: "<$preymass"
  }
},{
	symbol: ">",
	tokenType: "aggr",
	tabLabel: "&gt;",
	section: "aggregation",
	id: "find-min-value",
	title: `<span class="code-snippet">&gt;</span> finds the minimum value, by replacing a result's input by a lesser value`,
	template: {
    massMin: ">$preymass"
  }
},{
	symbol: "[ ]",
	tokenType: "aggr",
	section: "aggregation",
	id: "collect-into-a-list",
	title: `<span class="code-snippet">[ ]</span> collects values into a list`,
	template: {
		"distinctPreyType": [
			"$preytype", "distinct"
		],
    nonDistinct: [
    	"$preytype"
    ]
	}
},{
	symbol: ":__",
	tokenType: "time",
	section: "timing",
	id: "compute-before-untimed-inputs",
	title: `A <span class="code-snippet">:__</span> prefix tells the template filler to process the input before untimed inputs for the same data row.`,
	template: {
		"count": "+1",
		":__b4count": "@.count"
	}
},{
	symbol: "_:_",
	tokenType: "time",
	section: "timing",
	id: "compute-after-untimed-inputs",
	title: `A <span class="code-snippet">_:_</span> prefix tells the template filler to process the input after untimed inputs have been processed for the same data row.`,
	template: {
		"count": "+1",
		":__b4count": "@.count",
		"_:_afterCount": "@.count",
	}
},{
	symbol: "__:",
	tokenType: "time",
	section: "timing",
	id: "compute-after-all-rows",
	title: `A <span class="code-snippet">__:</span> prefix will delay the processing of a template input after the last data row has been looped through.`,
	template: {
		"count": "+1",
		"totalPreyMass": "+$preymass",
		"__:averagePreyMass": "=totalMassOverCount()"
	}
},{
	symbol: "#",
	tokenType: "skip",
	section: "skip",
	id: "skip-an-input",
	title: `<span class="code-snippet">#</span> in an input key or value causes a template input to be ignored`,
	template: {
  	"#$preytype": "+1",
  	"$catname": "#+1",
  }
},{
	section: "skip",
	id: "skip-may-create-empty-an-object",
	title: `<span class="code-snippet">#</span> in a nested input may create an empty object`,
	template: {
  	"$preytype": {
  	  "count": "#+1"
  	}
  }
}]

const fxns = {
	totalMassOverCount(row, key, result, context) {
		return context.self.totalPreyMass / context.self.count
	},
	roundedPreyMass: d => isNumeric(d.preymass) 
		? +d.preymass.toPrecision(2) 
		: null,
	adjustPreyMass(row) {
		return row.preymass*0.8
	},
	splitOwners(row) { 
		return row.owners.split(",")
	},
	blockInfo(row) {
		return row.ownerblock[0] == 'C' 
			? {name: "Friendly Neighborhood", population: 630}
			: {name: "Sesame Street", population: 950}
	}
}