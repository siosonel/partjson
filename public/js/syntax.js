function relabelNavCols() {
	const aliases = {
		substitution: "subs",
		conversion: "conv",
		aggregation: "aggr",
		timing: "time"
	}

	const narrowScreen = window.innerWidth < 550;
	for(const label in aliases) {
		const short = aliases[label]
		const navCol = document.getElementById("nav-col-"+short)
		navCol.querySelector('.nav-tab').innerHTML = "[" + (narrowScreen ? short : label) + "]"
	}
}

relabelNavCols()
window.onresize = relabelNavCols

demo([{
	section: "stem",
	id: "stem-undelim",
	title: `A stem may either be an unprocessed constant or substitutable 
	  property name, alias, or keyword. The stem forms the 'root word' of 
	  an input key or value term.`,
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
	title: `Nested values are indicated by joining multiple stems with a string delimiter.
	 The delimiter defaults to <span class="code-snippet">.</span>, but 
	 may be overriden by declaring a @delimit value in the template root.`,
	template: {
		"@delimit": "|",
		"$nested|random|id": ["$catname"]
	}
},{
	symbol: "$",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-a-data-value",
	title: `<span class="code-snippet">$</span> substitutes a data value`,
	template: {
    "$catname": "+1"
  }
},{
	symbol: "=",
	tokenType: "subs",
	section: "substitution",
	id: "substitute-external-value",
	title: `<span class="code-snippet">=</span> substitutes an external 
	  property or function reference that was supplied directly to the template filler.`,
	template: {
		"adjustedPreyMass": {
    	"=roundedPreyMass()": "+1"
		}
  }
},{
	symbol: "&",
	tokenType: "subs",
	tabLabel: "&amp;",
	section: "substitution",
	id: "substitute-a-join",
	title: `<span class="code-snippet">&amp;</span> substitutes a joined property.`,
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
	title: `<span class="code-snippet">@</span> substitutes a result or context value`,
	template: {
		"staticResult": 0.5,
		"child": {
			"version": "@parent.staticResult"
		}
	}
},{
	symbol: "()",
	tokenType: "conv",
	section: "conversion",
	id: "call-as-function",
	title: `<span class="code-snippet">()</span> calls a substituted value as a function`,
	template: {
		"$preytype": "=roundedPreyMass()"
	}
},{
	symbol: "[]",
	tokenType: "conv",
	section: "conversion",
	id: "distribute-array-values",
	title: `<span class="code-snippet">[]</span> expects an array
	  as a substituted property and distributes its values.`,
	template: {
		"@before()": "=saveSplitOwners()",
		"byOwner": {
			"$owners[]": "+$preymass"
		}
	}
},{
	symbol: "(]",
	tokenType: "conv",
	section: "conversion",
	id: "distribute-returned-array-values",
	title: `<span class="code-snippet">(]</span> calls a substituted 
	 property as a function and distributes its returned value.`,
	template: {
		"byOwner": {
			"=splitOwners(]": "+$preymass"
		}
	}
},{
	symbol: "+",
	tokenType: "aggr",
	section: "aggregation",
	id: "add-a-value",
	title: `<span class="code-snippet">+</span> adds the computed value from a running count`,
	template: {
		consumedMass: {
    	"$catname": "+$preymass"
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
    	"lost": "-=wholeNums[]"
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
	title: `<span class="code-snippet">[ ]</span>, the JSON array, collects values 
		into a list, or a set when used with the "distinct" option.`,
	template: {
		"distinctPreyType": [
			"$preytype", "distinct"
		],
    nonDistinct: [
    	"$preytype"
    ]
	}
},{
	symbol: "[[ , ]]",
	tokenType: "aggr",
	section: "aggregation",
	id: "collect-into-a-map",
	title: `<span class="code-snippet">[[ , ]]</span>, represents a JSON array of arrays
	  and will either (a) collect an array entry per data row
		or (b) map the first element to values in the format 
		<span class="code-snippet">[[ key, value ]]</span> when the "map" option
		is specified. These aggregations are useful when
		all of the elements in the nested array are objects, such as when
		using a data row as a map key.`,
	template: {
		"mappedToPreyType": [
			["$preytype", "+1"], "map"
		],
    notMappedToPreyType: [
    	["$preytype", "+1"]
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
}], window.location.search.includes("reveal="))
