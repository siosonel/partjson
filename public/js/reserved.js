demo([{
	symbol: "@userDelimit",
	tokenType: "options",
	section: "options",
	id: "user-delimit",
	title: `The <span class="code-snippet">@userDelimit</span> character 
	 defaults to <span class="code-snippet">.</span>, but may be reset at the template root.`,
	template: {
  	"@userDelimit": "_",
  	"test": {
  		"$nested_random_id": "test"
  	}
  }
},{
	symbol: "@treeDelimit",
	tokenType: "options",
	section: "options",
	id: "tree-delimit",
	title: `The <span class="code-snippet">@treeDelimit</span> 
		character defaults to <span class="code-snippet">.</span>, but may be reset at the template root.`,
	template: {
  	"@treeDelimit": "|",
  	"version": 0.1,
  	"trial": {
  		"child": {
  			"version": "@parent|@parent|version"
  		}
  	}
  }
},{
	symbol: "@",
	tokenType: "context",
	section: "context",
	id: "self",
	title: `A <span class="code-snippet">@</span> by itself refers to the current result,
	 equivalent to <span class="code-snippet">context.self</span>. When referring to
	 a property of the current result, a delimiter right after the 
	 <span class="code-snippet">@</span> must be used to access 
	 nested subproperties, for example <span class="code-snippet">@.property</span>.
	 This is because all stems attached directly to the <span class="code-snippet">@</span> 
	 symbol are reserved terms.`,
	template: {
  	"property": 0.1,
  	"self-context-prop": "@.property"
  }
},{
	symbol: "@branch",
	tokenType: "context",
	section: "context",
	id: "branch",
	title: `A <span class="code-snippet">@branch</span> refers to the string 
		key or integer index to which a result is attached to the parent tree.`,
	template: {
  	"property": 0.1,
  	"trial": {
  		 "attachment-key": "@branch"
  	}
  }
},{
	symbol: "@parent",
	tokenType: "context",
	section: "context",
	id: "parent",
	title: `A <span class="code-snippet">@parent</span> refers
	 to the result object that contains the current result as a subproperty.`,
	template: {
  	"property": 0.1,
  	"trial": {
  		"parent-context-prop": "@parent.property",
  		"grandchild": {
  			"grand-prop": "@parent.@parent.property",
  		}
  	}
  }
},{
	symbol: "@root",
	tokenType: "context",
	section: "context",
	id: "root",
	title: `The <span class="code-snippet">@root</span> refers to the 
		overall result object.`,
	template: {
  	"property": 0.1,
  	"trial": {
  		"child": {
  			"grandchild": {
  				"root-context-prop": "@root.property"
  			}
  		}
  	}
  }
},{
	symbol: "@before()",
	tokenType: "filters",
	section: "filters",
	id: "before",
	title: `
		The <span class="code-snippet">@before()</span> term is linked to a user supplied function
		and gets called before a data row is processed by any input functions. An example use case
		is to clean data row keys and values before input functions are applied to fill a template.
		The user supplied function MUST return a value that evaluates to 
		<span class="code-snippet">true</span> in order for a data row to be processed.
		<br/><br/>
		The arguments supplied to this function are defined in the 
		<a href='./syntax.html#conversion'>conversion</a> section.`,
	template: {
  	"@before()": "=savedDoublePreyMass()",
  	"shows-double": {
  		"$preytype": "+$preymass",
  	}
  }
},{
	symbol: "@join()",
	tokenType: "filters",
	section: "filters",
	id: "join",
	title: `A <span class="code-snippet">@join()</span> object takes aliases and functions
	 as key-values. The function will be passed the current data 
	 <span class="code-snippet">row</span> as argument, and should return an object
	 with key-values to be referenced later as <span class="code-snippet">&amp;</span>
	 prefixed terms in template inputs. Or, if 
	 <span class="code-snippet">null</span> is returned, the data
	 row will NOT be used to fill the current result.`,
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
	symbol: "@ignoredVals()",
	tokenType: "filters",
	section: "filters",
	id: "ignore-values-in-array",
	title: `
		The <span class="code-snippet">@ignoreVals()</span> term may be 
		(a) an array of ignored values, 
		(b) a function that returns <span class="code-snippet">true</span> when a value
		is to be ignored, or (c) an object with 
		<span class="code-snippet">"term": [ value ] || "=filter()"</span> as key-values.
		An array of ignored values will be applied to all
		input value terms in the current template.`,
	template: {
		"@ignoredVals()": ["mammal"],
  	"okPreyType": [
  		"$preytype", "distinct"
  	] 
  }
},{
	tokenType: "filters",
	section: "filters",
	id: "ignore-using-function",
	title: `
		An <span class="code-snippet">@ignoredVals()</span> function must 
		return <span class="code-snippet">true</span> when a value
		is to be ignored, given (<span class="code-snippet">value</span>, 
		<span class="code-snippet">key</span>, 
		<span class="code-snippet">row</span>,
		<span class="code-snippet">context</span>) as arguments. The filter
		will be applied to all input value terms in the current template.`,
	template: {
  	"filteredMass": {
  		"@ignoredVals()": "=ignoreTinyMass()",
  		"minMass": ">$preymass"
  	}
  }
},{
	tokenType: "filters",
	section: "filters",
	id: "ignore-values-by-term",
	title: `
		An object of <span class="code-snippet">@ignoredVals()</span> 
		applies term-specific filtering by value.`,
	template: {
  	"@ignoredVals()": {
  		"$preytype": "=ignoreMammals()",
  		"=preyTypeFxn()": ["fish"]
  	},	
		"filtered-property-value": [
			"$preytype", "distinct"
		],
		"filtered-returned-value": [
			"=preyTypeFxn()", "distinct"
		]
  }
},{
	tokenType: "filters",
	section: "filters",
	id: "ignore-inheritance",
	title: `
		Nested templates inherit its parent template's 
		<span class="code-snippet">@ignoredVals()</span>,
		but may override it.`,
	template: {
		"@ignoredVals()": {
			"$preytype": ["mammal"],
		},
		"inheritedIgnore": {
			"nestedResult": {
				"filteredPreyTypes": [
					"$preytype", "distinct"
				]
			}
  	},
  	"overridenIgnore": {
  		"@ignoredVals()": {
				"$preytype": [],
			},
			"nestedResult": {
				"filteredPreyTypes": [
					"$preytype", "distinct"
				]
			}
  	}
  }
},{
	symbol: "@after()",
	tokenType: "post",
	section: "post",
	id: "after",
	title: `The <span class="code-snippet">@after()</span> term gets called after 
	  all the input functions have been called.
		<br/><br/>
		The arguments supplied to this function are defined in the 
		<a href='./syntax.html#conversion'>conversion</a> section.`,
	template: {
  	"@after()": "=savedTriplePreyMass()",
  	"mass-before-triple": {
  		"$preytype": "+$preymass",
  	}
  }
},{
	symbol: "@dist()",
	tokenType: "post",
	section: "post",
	id: "dist",
	title: `The <span class="code-snippet">@dist()</span> function distributes 
		results from one result subtree to another, once template branches are 
		filled with final results. Usually, this would copy deeply nested result 
		objects into one or more root object arrays, 
		for easier access at the end of data processing.
		<br/><br/>
	  An array of result branches, supplied as input value to the 
	  <span class="code-snippet">@dist()</span> key, will receive
	  the distributed results.`,
	template: {
		"dist-target": [],
  	"my": {
  		"deep": {
  			"deep": {
  				"results": {
  					"$preytype": {
  						"type": "@branch",
  						"total": "+1",
  						"@dist()": [
	  						"@root.dist-target"
	  					]
  					}
  				}
  			}
  		}
  	}
  }
},{
	symbol: "@done()",
	tokenType: "post",
	section: "post",
	id: "done",
	title: `A <span class="code-snippet">@done()</span> callback gets called after 
	  the final results are filled and distributed. This function will receive
	  as argument the final result of the template or subtemplate that it is defined in.`,
	template: {
		"byCat": {
			"$catname": {
				"total": "+1",
				"rows": [
					"$"
				],
				"@dist()": ["@root.results"]
			}
		},
		"results": [],
  	"@done()": "=logResultsToDevConsole()"
  }
}], window.location.search.includes("reveal="))