"use strict"

/*
-------
Parjson
-------
Partition rows of data into a well-defined
tree structure of aggregated values and
collections, using a JSON-based processing
directive syntax.

See parjson.html for an example template.

See parjson.readme.txt for more information
*/

/*export default*/ class Parjson {
  constructor(opts={}) {
    this.defaultOpts = {
      template: {},
      fxns: {},
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
    this.reservedFxns = ["@before()", "@after()", "@dist()", "@join()"]
    this.reservedTerms = ["@branch", "@parent", "@root"].concat(this.reservedTerms)
    this.steps = [":__", "", "_:_", "__:"]
    this.setErrorTracking()
    this.keyFiller = new KeyFiller(this)
    this.valueFiller = new ValueFiller(this)
    this.refresh()
  }

  refresh(opts={}) {
    this.errors.clear()
  	Object.assign(this.opts,opts)
  	if (this.opts.userDelimit) {
  		this.userDelimit = this.opts.userDelimit
  	}
  	if (opts.treeDelimit) {
  		this.treeDelimit = this.opts.treeDelimit
  	}
  	
  	//console.clear()
  	delete this.commentedTerms
  	this.commentedTerms = new WeakMap()

  	delete this.joins
  	this.joins = new Map()
  	
  	// fillers will track template parsing metadata
  	delete this.fillers
    this.fillers = new WeakMap()
    
    // contexts will track results object metadata
    delete this.context
    this.contexts = new WeakMap() 
    
    this.parseTemplate(this.opts.template)
    this.tree = Object.create(null)
    this.contexts.set(this.tree, {
    	"root": this.tree
    })
    //return
    if (this.opts.data) {
    	this.add(this.opts.data, false)
    }
    this.logErrors()
  }

  parseTemplate(template, lineage=[]) {
    const filler = Object.create(null)
    filler.terms = Object.create(null)
    filler["@before"] = this.trueFxn
    filler["@after"] = this.trueFxn
    this.fillers.set(template, filler)
    
    const steps = this.steps.map(d => [])
    for(const term in template) {
      const [subterm, symbols, step] = this.parseTerm(term)
      const input = filler.terms[term] = {
        subterm,
        symbols,
        lineage: [...lineage, term]
      }
      if (symbols != "#" && this.reservedFxns.includes(subterm + "()")) {
      	filler[subterm] = this[subterm](template[term], input)
      }
      else {
	      input.keyFxn = this.keyFiller.getFxn(subterm, symbols, input)
	      if (input.keyFxn) {
	        input.valFxn = this.valueFiller.getFxn(template[term], input)
	      	steps[step].push(term)
	      }
	    }
      const templateVal = template[term]
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
    const reservedTerm = this.detectReservedTerm(subterm)
    const symbols = skip 
    	? skip
    	: reservedTerm 
    		? reservedTerm 
    		: aggr + subs + conv
    const step = this.reservedFxns.includes(reservedTerm) // == "@after()"
    	? reservedTerm
    	: time
    return [subterm, symbols, this.steps.indexOf(step)]
  }

  detectReservedTerm(subterm) {
  	for(const term of this.reservedTerms) { //
  		if (subterm.startsWith(term) || subterm + "()" == term) { 
  			return term
  		} 
  	}
  }

  add(rows, refreshErrors = true) {
  	if (refreshErrors) error.clear()
  	this.joins.clear()
    for(const row of rows) {
      this.processRow(row, this.opts.template, this.tree)
      this.joins.clear()
    }
    this.processResult(this.tree)
    if (refreshErrors) this.logErrors()
  }

  processRow(row, template, result) {
  	const context = this.contexts.get(result);
  	const filler = this.fillers.get(template);
  	if (!filler["@before"](row)) return
  	if (filler["@join"]) {
  		if (!filler["@join"](row)) return
  	}
  	for(const step of filler.steps) {
	    for(const term of step) { 
	      const input = filler.terms[term]; 
	      if (input.keyFxn && input.valFxn) {
	        const keys = input.keyFxn(row); 
	        for(const key of keys) {
	          if (input.valFxn) {
	          	input.valFxn(row, key, result, context)
	          }
	        }
	      }
	    }
	  }
	  filler["@after"](row)
	  if (filler["@dist"]) filler["@dist"](context)
  }

  processResult(result) {
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
  }

  trueFxn() {
  	return true
  }

  setErrorTracking() {
    this.errors = new Set()
    this.errorMessages = Object.create(null)
    
    this.errorMessages["template"] = {
      "key": "Invalid template key.",
      "value": "Invalid template value.",
      "array-value": "Unsupported template array value."
    }

    this.errorMessages["key"] = {
      "subs": 
      	"Substituted key values must be a string, number, or undefined."
    }

    this.errorMessages["val"] = {
    	"non-numeric-incr": 
      	"A numeric value is required for increment.",
      "non-numeric-than": 
      	"A numeric value is required for minimum or maximum aggregation.",
      "non-array": 
      	"Converted array-split value must be an array."
    }
  }

  logErrors() {
    const log = Object.create(null)
    for(const e of this.errors) {
      const [type, subtype, lineage, row] = e
      let  message = this.errorMessages[type][subtype]
      if (!message) message = 'Error '+ type + ":" + subtype 
      if (!(message in log)) {
        log[message] = Object.create(null)
      }
      const key = JSON.stringify(lineage)
      if (!(key in log[message])) {
        log[message][key] = row ? [] : 0
      }
      if (row) log[message][key].push(row)
      else log[message][key] += 1
    }
    if (Object.keys(log).length) {
      console.log(log)
    }
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
  }
}

Parjson.prototype["@before"] = function (subterm, input) {
	const fxn = this.opts.fxns[subterm.slice(1,-2)]
	if (!fxn) {
		this.errors.add(["template", "undefined-@before-fxn", input.lineage])
		return this.trueFxn
	}
	else return fxn
}

Parjson.prototype["@after"] = function (subterm, input) {
	const fxn = this.opts.fxns[subterm.slice(1,-2)]
	if (!fxn) {
		this.errors.add(["template", "undefined-@after-fxn", input.lineage])
		return this.trueFxn
	}
	else return fxn
}

Parjson.prototype["@join"] = function (joins, input) {
	return (row) => {
		let ok = true
		for(const alias in joins) {
			const fxn = this.opts.fxns[joins[alias].slice(1,-2)]
			if (!fxn) {
				this.errors.add(["template", "undefined-@join-fxn", input.lineage])
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
	const subterm = _subterm[0]
	if (!subterm.startsWith('@root')) {
  	this.errors.add(["template", "context-root-expected", input.lineage])
  }
  else if (!subterm.includes(this.treeDelimit)) {
  	this.errors.add(["template", "context-root-undelimited", input.lineage])
  }
  else {
  	const nestedProps = subterm.split(this.treeDelimit).slice(1)
  	for(const term of nestedProps) {
  		if (term[0] != "$") {
  			this.errors.add(["template", "root-unsupported-context", input.lineage])
  			return
  		}
  	}
  	const nestedKeys = nestedProps.map(k => k.slice(1));  	
    const reducer = (d, k) => d[k]
    return (context) => {
		  context["@dist"] = (result) => {
		  	const target = nestedKeys.reduce(reducer, this.tree)
		    if (!Array.isArray(target)) {
		    	this.errors.add(["val", "@dist()-target-not-array", input.lineage])
		    	return
		    }
		    target.push(result)
		  }
	  }
  }
}
