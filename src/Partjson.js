import KeyFiller from "./KeyFiller"
import ValueFiller from "./ValueFiller"
import Err from "./Err"

/*
-------
Partjson
-------
This is a Partjson template filler. It processes
rows of data into a well-defined tree of 
data collections and aggregated results
that matches the shape of the input template.

This implementation passes once over all data 
rows. It is thus suitable for partitioning and 
aggregating streaming data. It may also be used
to parallelize data processing. 

See partjson.html for an example template.

See partjson.readme.txt for more information
*/

export default class Partjson {
  constructor(opts={}) {
    this.defaultOpts = {
      template: {},
      "=": {},
      ignore: []
    }

    this.opts = Object.assign(
      this.defaultOpts,
      opts 
    )

    this.userDelimit = "."
    this.treeDelimit = "."
    this.subsSymbols = ["$", "=", "@", "&"]
    this.convSymbols = ["()", "[]"] //, "{}"]
    this.aggrSymbols = ["+", "-", "<", ">"]
    this.timeSymbols = [":__", "_:_", "__:"]
    this.skipSymbols = ["#"]
    this.reservedOpts = ["@userDelimit", "@treeDelimit"]
    this.reservedFxns = ["@before()", "@after()", "@dist()", "@join()"]
    this.reservedContexts = ["@branch", "@parent", "@root", "@self"]
    this.reservedTerms = [
      ...this.reservedOpts,
      ...this.reservedFxns,
    	...this.reservedContexts
    ]
    this.steps = [":__", "", "_:_"]
    this.errors = new Err(this)
    this.keyFiller = new KeyFiller(this)
    this.valueFiller = new ValueFiller(this)
    this.refresh()
  }

  refresh(opts={}) {
    this.errors.clear()
  	Object.assign(this.opts,opts)
  	if (this.opts.template['@userDelimit']) {
  		this.userDelimit = this.opts.template['@userDelimit']
  	}
  	if (this.opts.template['@treeDelimit']) {
  		this.treeDelimit = this.opts.template['@treeDelimit']
  	}
  	
  	//console.clear()
  	delete this.commentedTerms
  	this.commentedTerms = new WeakMap()

  	delete this.joins
  	this.joins = new Map()
  	
  	// fillers will track template parsing metadata
  	delete this.fillers
    this.fillers = new Map()
    
    // contexts will track results object metadata
    delete this.context
    this.contexts = new WeakMap() 
    
    delete this.tree
    this.tree = this.getEmptyResult()
    this.parseTemplate(this.opts.template, {"@": this.falseFxn})

    if (this.opts.data) {
    	this.add(this.opts.data, false)
    }
    this.errors.log(this.fillers)
  }

  parseTemplate(template, inheritedIgnore, lineage=[]) {
    const filler = Object.create(null)
    filler.inputs = Object.create(null)
    filler["@before"] = this.trueFxn
    filler["@after"] = this.trueFxn
    filler["__:"] = []
    filler.errors = []
    const ignore = this["@ignore"](template, inheritedIgnore, filler)
    filler["@ignore"] = ignore
    this.fillers.set(template, filler)

    const steps = this.steps.map(d => [])
    for(const term in template) {
      const [subterm, symbols, keyTokens, step] = this.parseTerm(term)
      const templateVal = template[term]
      const input = filler.inputs[term] = {
        term,
        subterm,
        symbols,
        keyTokens,
        templateVal,
        lineage: [...lineage, term],
        inheritedIgnore: ignore,
        errors: []
      }

      if (symbols == "@()") {
      	if (this[subterm]) {
      		filler[subterm] = this[subterm](template[term], input, filler)
      	}
      	else {
      		input.errors.push('key', "UNRECOGNIZED-RESERVED-"+term)
      	}
      }
      else {
	      input.keyFxn = this.keyFiller.getFxn(subterm, symbols, input, ignore)
	      if (input.keyFxn) {
	        input.valFxn = this.valueFiller.getFxn(input, ignore)
	      	if (keyTokens.time == "__:") {
		      	filler["__:"].push(term)
		      }
	      	else {
	      		steps[step].push(term)
	      	}
	      }
	    }
    }
    filler.steps = steps.filter(d => d.length)
  }

  /*** the heart of the code ***/
  parseTerm(term) {
  	const skip = this.skipSymbols.includes(term[0]) ? "#" : ""
  	const colons = term.slice(0,3)
  	const time = this.timeSymbols.includes(colons) ? colons : "";
  	const start = skip.length + time.length
    const prefix = term[start]
    const suffix = term.slice(-2)
    const aggr = this.aggrSymbols.includes(prefix) ? prefix : ""
    const conv = this.convSymbols.includes(suffix) ? suffix : ""
    const subterm = aggr && conv 
      ? term.slice(start + 1, -2)
      : aggr 
        ? term.slice(start + 1)
        : conv 
          ? term.slice(start, -2)
          : time 
          	? term.slice(start)
          	: term;
    const subs = this.subsSymbols.includes(subterm[0]) ? subterm[0] : ""
    const symbols = skip ? skip : aggr + subs + conv
    const stem = subs ? subterm.slice(1) : subterm
    const tokens = {skip, time, aggr, subs, stem, conv, subterm}
    return [subterm, symbols, tokens, this.steps.indexOf(time)]
  }

  getEmptyResult(branch=null, parent=null, isArray = false) {
  	const result = isArray ? [] : Object.create(null)
  	const context = {
  		branch, // string name where this result will be mounted to the tree
  		parent, 
  		self: result,
  		root: this.tree ? this.tree : result,
  		errors: []
  	}
  	this.contexts.set(result, context)
    return result
  }

  add(rows, refreshErrors = true) {
  	if (refreshErrors) error.clear()
  	this.joins.clear()
    for(const row of rows) {
      this.processRow(row, this.opts.template, this.tree)
      this.joins.clear()
    }
    this.processResult(this.tree)
    if (refreshErrors) this.errors.log()
  }

  processRow(row, template, result) {
  	const context = this.contexts.get(result)
  	const filler = this.fillers.get(template)
  	context.filler = filler
  	if (!filler["@before"](row, result, context)) return
  	if (filler["@join"] && !filler["@join"](row)) return
  	for(const step of filler.steps) {
	    for(const term of step) { 
	      const input = filler.inputs[term]; 
	      if (input.keyFxn && input.valFxn) {
	        const keys = input.keyFxn(row, context)
	        for(const key of keys) {
	          if (input.valFxn) {
	          	input.valFxn(row, key, result, context)
	          }
	        }
	      }
	    }
	  }
	  filler["@after"](row, result, context)
	  if (filler["@dist"]) filler["@dist"](context)
	  if (filler["@done"]) context.done = filler["@done"]
  }

  processResult(result) {
  	const context = this.contexts.get(result)
  	if (context) {
	  	for(const term of context.filler["__:"]) { 
	  		const input = context.filler.inputs[term];
	  		if (input.keyFxn && input.valFxn) {
	        const keys = input.keyFxn(null, context)
	        for(const key of keys) {
	          if (input.valFxn) {
	          	input.valFxn(null, key, result, context)
	          }
	        }
	      }
	  	}
	  }

  	for(const key in result) {
  		if (result[key] instanceof Set) {
  			result[key] = [...result[key]]
  		}
  		else if (result[key] instanceof Map) {
  			result[key] = [...result[key].entries()]
  		}
  		const value = result[key]
  		if (value) {
  			if (Array.isArray(value)) {
  				// assumes all element values will be the same type
  				if (value[0] && typeof value[0] == "object") {
  					for(const v of value) {
  						this.processResult(v)
  					}
  				}
  			}  
  			else if (typeof value == 'object') {
  				const context = this.contexts.get(value)
  				if (context && context["@dist"]) {
  					context["@dist"](value)
  				}
  				this.processResult(value)
  			}
  		}
  	}
  	this.errors.markErrors(result, context);
  	if (context && context.done) {
  		context.done(result)
  	}
  }

  trueFxn() {
  	return true
  }

  falseFxn() {
  	return false
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
  }
}

Partjson.prototype["@before"] = function (subterm, input) {
	const fxn = this.opts["="][subterm.slice(1,-2)]
	if (!fxn) {
		input.errors.push(["val", "MISSING-@before-FXN"])
		return this.trueFxn
	}
	else return fxn
}

Partjson.prototype["@after"] = function (subterm, input) {
	const fxn = this.opts["="][subterm.slice(1,-2)]
	if (!fxn) {
		input.errors.push(["val", "MISSING-@after-FXN"])
		return this.trueFxn
	}
	else return fxn
}

Partjson.prototype["@join"] = function (joins, input, filler) {
	return (row) => {
		let ok = true
		for(const alias in joins) {
			const fxn = this.opts["="][joins[alias].slice(1,-2)]
			if (!fxn) {
				input.errors.push(["val", "MISSING-@join-FXN"])
			}
			else {
				const keyVals = fxn(row)
				if (keyVals) this.joins.set(alias, keyVals)
				else ok = false
			}
		}
		return ok
	}
}

Partjson.prototype["@dist"] = function (_subterm, input) {
	const subterm = Array.isArray(_subterm) ? _subterm[0] : _subterm
	const subsFxn = this.valueFiller["@"](subterm)
	return (context) => {
	  context["@dist"] = (result) => {
	  	const target = subsFxn(null, context)
	  	if (!target) {
	  		context.errors.push([input, "MISSING-DIST-TARGET"])
	  	}
	  	else if (Array.isArray(target)) {
	  		target.push(result)
	  	}
	    else {
	    	target[subterm] = result
	    }
	  }
  }
}

Partjson.prototype["@done"] = function (subterm, input) {
	const fxn = this.opts["="][subterm.slice(1,-2)]
	if (!fxn) {
		input.errors.push(["val", "MISSING-@before-FXN"])
		return this.trueFxn
	}
	else return fxn
}

Partjson.prototype["@ignore"] = function (template, inheritedIgnore, filler) {
	if (!template["@ignore()"]) {
		return inheritedIgnore
	}
	const nonObj = Array.isArray(template["@ignore()"]) 
		|| typeof template["@ignore()"] == "string"
	const ignore = nonObj
		? {"@": template["@ignore()"]}
		: template["@ignore()"]

	const fxns = {}
	for(const term in ignore) {
		const ignoreVal = ignore[term]
		if (Array.isArray(ignoreVal)) {
			fxns[term] = (value) => ignoreVal.includes(value)
		}
		else if (typeof ignoreVal == 'string' && ignoreVal[0] == "=") {
			const fxn = this.opts["="][ignoreVal.slice(1,-2)]
  	  if (!fxn) {
  	  	filler.errors.push(["val", "MISSING-@ignore()-FXN", ignoreVal])
  	  	fxns[term] = this.falseFxn
  	  }
  	  else {
  	  	fxns[term] = fxn
  		}
		} 
		else {
			filler.errors.push(["val", "UNSUPPORTED-@ignore()-VALUE", ignoreVal])
  	  fxns[term] = this.falseFxn
		}
	}

	return nonObj ? fxns : Object.assign({}, inheritedIgnore, fxns)
}

window["Partjson"] = Partjson
