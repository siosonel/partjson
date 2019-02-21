import KeyFiller from "./KeyFiller"
import ValueFiller from "./ValueFiller"
import Err from "./Err"

/*
-------
Parjson
-------
This is a ParJSON template filler. It processes
rows of data into a well-defined tree of 
data collections and aggregated results
that matches the shape of the input template.

This implementation passes once over all data 
rows. It is thus suitable for partitioning and 
aggregating streaming data. It may also be used
to parallelize data processing. 

See parjson.html for an example template.

See parjson.readme.txt for more information
*/

export default class Parjson {
  constructor(opts={}) {
    this.defaultOpts = {
      template: {},
      "=": {},
      ignoredVals: []
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
    this.parseTemplate(this.opts.template)

    if (this.opts.data) {
    	this.add(this.opts.data, false)
    }
    this.errors.log(this.fillers)
  }

  parseTemplate(template, lineage=[]) {
    const filler = Object.create(null)
    filler.inputs = Object.create(null)
    filler["@before"] = this.trueFxn
    filler["@after"] = this.trueFxn
    filler["__:"] = []
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
        errors: []
      }
      if (symbols=="@()") {
      	filler[subterm] = this[subterm](template[term], input)
      }
      else {
	      input.keyFxn = this.keyFiller.getFxn(subterm, symbols, input)
	      if (input.keyFxn) {
	        input.valFxn = this.valueFiller.getFxn(input)
	      	if (keyTokens.time == "__:") {
		      	filler["__:"].push(term)
		      }
	      	else {
	      		steps[step].push(term)
	      	}
	      }
	    }
      if (templateVal) {
        if (!Array.isArray(templateVal) 
        	&& typeof templateVal == 'object') {
          this.parseTemplate(templateVal, input.lineage)
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
  		const value = result[key]
  		if (value instanceof Set) {
  			result[key] = [...result[key]]
  		}
  		else if (value) {
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
  	this.errors.markErrors(result, context)
  }

  trueFxn() {
  	return true
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
  }
}

Parjson.prototype["@before"] = function (subterm, input) {
	const fxn = this.opts["="][subterm.slice(1,-2)]
	if (!fxn) {
		input.errors.push(["val", "MISSING-@before-FXN"])
		return this.trueFxn
	}
	else return fxn
}

Parjson.prototype["@after"] = function (subterm, input) {
	const fxn = this.opts["="][subterm.slice(1,-2)]
	if (!fxn) {
		input.errors.push(["val", "MISSING-@after-FXN"])
		return this.trueFxn
	}
	else return fxn
}

Parjson.prototype["@join"] = function (joins, input) {
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

Parjson.prototype["@dist"] = function (_subterm, input) {
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
