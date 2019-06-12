demo(
  [
    {
      symbol: "@delimit",
      tokenType: "options",
      section: "options",
      id: "delimiter",
      title: `The <span class="code-snippet">@delimit</span> character separates nested
	 terms. It defaults to <span class="code-snippet">.</span>, but may be 
	 reset at the template root.`,
      template: {
        "@delimit": "_",
        test: {
          $nested_random_id: "test"
        }
      }
    },
    {
      symbol: "@errmode",
      tokenType: "options",
      section: "options",
      id: "error-mode",
      title: `The <span class="code-snippet">@errmode</span> 
		option globally sets where and how errors are displayed.
		It may be provided as a four item array where the error
		modes are listed in the order <br/>[
			<span class="code-snippet">input</span>, 
			<span class="code-snippet">result</span>, 
			<span class="code-snippet">root</span>, 
			<span class="code-snippet">console</span>
		],<br/>
		or as an object with any of the above keys to override the
		default error modes of <br/>
		<span class="code-snippet">{</span><br/>
			&nbsp;&nbsp;<span class="code-snippet">"input": "{}",</span>
			<br/>
			&nbsp;&nbsp;<span class="code-snippet">"result": "{}-",</span>
			<br/>
			&nbsp;&nbsp;<span class="code-snippet">"root": "",</span>
			<br/>
			&nbsp;&nbsp;<span class="code-snippet">"console": "{}",</span>
			<br/>
		<span class="code-snippet">}</span>.
		<br/><br/>
		The mode symbols have the following effect:
		<br/>
		<ul>
			<li><span class="code-snippet">""</span> silences the error display</li>
			<li><span class="code-snippet">"{}"</span> display errors as object, more succint</li>
			<li><span class="code-snippet">"[]"</span> display errors in an array, longer but may
			be easier to handle by an application</li>
			<li>a trailing <span class="code-snippet">-</span> minus
			character will omit errors that have already been marked on inputs.</li>
		</ul>`,
      template: {
        "@errmode": {
          root: "[]",
          console: ""
        },
        version: 0.1,
        trial: {
          version: "@ppparent.version"
        }
      }
    },
    {
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
        property: 0.1,
        "self-context-prop": "@.property"
      }
    },
    {
      symbol: "@branch",
      tokenType: "context",
      section: "context",
      id: "branch",
      title: `A <span class="code-snippet">@branch</span> refers to the string 
		key or integer index to which a result is attached to the parent tree.`,
      template: {
        property: 0.1,
        trial: {
          "attachment-key": "@branch"
        }
      }
    },
    {
      symbol: "@parent",
      tokenType: "context",
      section: "context",
      id: "parent",
      title: `A <span class="code-snippet">@parent</span> refers
	 to the result object that contains the current result as a subproperty.`,
      template: {
        property: 0.1,
        trial: {
          "parent-context-prop": "@parent.property",
          grandchild: {
            "grand-prop": "@parent.@parent.property"
          }
        }
      }
    },
    {
      symbol: "@root",
      tokenType: "context",
      section: "context",
      id: "root",
      title: `The <span class="code-snippet">@root</span> refers to the 
		overall result object.`,
      template: {
        property: 0.1,
        trial: {
          child: {
            grandchild: {
              "root-context-prop": "@root.property"
            }
          }
        }
      }
    },
    {
      symbol: "@key",
      tokenType: "context",
      section: "context",
      id: "key",
      title: `
      The <span class="code-snippet">@key</span> term returns the 
      converted key-option value in a <span class="code-snippet">[{...}, key-option]</span>
      input template, if applicable, or undefined if not. Note that the key-option value
      could be any type, not just a string.`,
      template: {
        test: [
          {
            id: "@key",
            count: "+1"
          },
          "=splitOwners(]"
        ]
      }
    },
    {
      symbol: "@values",
      tokenType: "context",
      section: "context",
      id: "values",
      title: `
      (1) TO BE DEPRECATED: Use 
        <a href="syntax.html#collect-object-into-a-list">
          <span class="code-snippet">[{...}, key-option]</span>
        </a> instead to collect unique result objects into array.
      <br/><br/>
      The <span class="code-snippet">@values</span> term returns the 
      equivalent of Javascript's Object.values(result). This is RECOMMENDED
      over the use of <span class="code-snippet">@dist()</a>.`,
      template: {
        "__:results": "@.byCatName.@values",
        byCatName: {
          $catname: ["$preytype"]
        }
      }
    },
    {
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
          $preytype: "+$preymass"
        }
      }
    },
    {
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
          loc: "=blockInfo()"
        },
        $catname: {
          count: "+1",
          blockName: "&loc.name",
          blockPop: "&loc.population"
        }
      }
    },
    {
      symbol: "@ignore()",
      tokenType: "filters",
      section: "filters",
      id: "ignore-values-in-array",
      title: `
		The <span class="code-snippet">@ignore()</span> term may be 
		(a) an array of ignored values, 
		(b) a function that returns <span class="code-snippet">true</span> when a value
		is to be ignored, or (c) an object with 
		<span class="code-snippet">"term": [ value ] || "=filter()"</span> as key-values.
		An array of ignored values will be applied to all
		inputs in the current template. An ignored value is determined after substitution
		and conversion, where applicable to an input term.`,
      template: {
        "@ignore()": ["mammal"],
        okPreyType: ["$preytype", 0]
      }
    },
    {
      tokenType: "filters",
      section: "filters",
      id: "ignore-using-function",
      title: `
		An <span class="code-snippet">@ignore()</span> function must 
		return <span class="code-snippet">true</span> when a value
		is to be ignored, given (<span class="code-snippet">value</span>, 
		<span class="code-snippet">key</span>, 
		<span class="code-snippet">row</span>,
		<span class="code-snippet">context</span>) as arguments. The filter
		will be applied to all inputs in the current template.`,
      template: {
        filteredMass: {
          "@ignore()": "=ignoreTinyMass()",
          minMass: ">$preymass"
        }
      }
    },
    {
      tokenType: "filters",
      section: "filters",
      id: "ignore-values-by-term",
      title: `
		An object of <span class="code-snippet">@ignore()</span> 
		key-value terms applies term-specific filtering by value.`,
      template: {
        "@ignore()": {
          $preytype: "=ignoreMammals()",
          "=preyTypeFxn()": ["fish"]
        },
        "filtered-property-value": ["$preytype"],
        "filtered-returned-value": ["=preyTypeFxn()"]
      }
    },
    {
      tokenType: "filters",
      section: "filters",
      id: "ignore-inheritance",
      title: `
		Nested templates inherit its parent template's 
		<span class="code-snippet">@ignore()</span>,
		but may override it.`,
      template: {
        "@ignore()": {
          $preytype: ["mammal"]
        },
        inheritedIgnore: {
          nestedResult: {
            filteredPreyTypes: ["$preytype"]
          }
        },
        overridenIgnore: {
          "@ignore()": {
            $preytype: []
          },
          nestedResult: {
            filteredPreyTypes: ["$preytype"]
          }
        }
      }
    },
    {
      symbol: "@after()",
      tokenType: "post",
      section: "post",
      id: "after",
      title: `The <span class="code-snippet">@after()</span> term gets called after 
	  all the input functions have been called for a data row.
		<br/><br/>
		The arguments supplied to this function are defined in the 
		<a href='./syntax.html#conversion'>conversion</a> section.`,
      template: {
        "@after()": "=savedTriplePreyMass()",
        "mass-before-triple": {
          $preytype: "+$preymass"
        }
      }
    },
    {
      symbol: "@dist()",
      tokenType: "post",
      section: "post",
      id: "dist",
      title: `NOTES:<br/>
    (1) TO BE DEPRECATED: Use 
      <a href="syntax.html#collect-object-into-a-list">
        <span class="code-snippet">[{...}, key-option]</span>
      </a> instead to collect unique result objects into array.
    <br/><br/>
    (2) Use <a href="#values"><span class="code-snippet">@values</span></a>
    whenever possible, as it is a more readable to specify an
    input source in a template instead of templating a "goto"-like result 
    target such as when <span class="code-snippet">@dist()</span> is used.
    <br/><br/>
    The <span class="code-snippet">@dist()</span> function distributes 
		results from one result subtree to another, once all data rows have been
		processed and template branches are filled with final results. 
		Usually, this would copy deeply nested result 
		objects into one or more root object arrays, 
		for easier access at the end of data processing.
		<br/><br/>
	  An array of result branches, supplied as input value to the 
	  <span class="code-snippet">@dist()</span> key, will receive
	  the distributed results.`,
      template: {
        "dist-target": [],
        my: {
          deep: {
            deep: {
              results: {
                $preytype: {
                  type: "@branch",
                  total: "+1",
                  "@dist()": ["@root.dist-target"]
                }
              }
            }
          }
        }
      }
    },
    {
      symbol: "@done()",
      tokenType: "post",
      section: "post",
      id: "done",
      title: `A <span class="code-snippet">@done()</span> callback gets called after 
	  the final results are filled and distributed. This function will receive
	  as argument the final result of the template or subtemplate that it is defined in.`,
      template: {
        "@done()": "=logResultsToDevConsole()",
        byCat: {
          $catname: {
            total: "+1",
            rows: ["$"],
            "@dist()": ["@root.results"]
          }
        },
        results: []
      }
    }
  ],
  window.location.search.includes("reveal=")
)
