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
    this.subsSymbols = ["$", "=", "@"]
    this.convSymbols = ["()", "[]"] //, "{}"]
    this.aggrSymbols = ["+", "-", "<", ">"]
    this.timeSymbols = [":__", "_:_", "__:"]
    this.skipSymbols = ["#"]
    this.reservedTerms = [
    	"@branch", "@parent", "@root",
    	"@before()", "@after()", "@dist()"
    ]
    this.steps = [
    	"@before()", 
    	":__", 
    	"", 
    	"_:_", 
    	"@after()", 
    	"__:"
    ]

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
    this.fillers.set(template, filler)
    
    const steps = this.steps.map(d => [])
    for(const term in template) {
      const [subterm, symbols, step] = this.parseTerm(term)
      const input = filler.terms[term] = {
        subterm,
        symbols,
        lineage: [...lineage, term]
      }
      input.keyFxn = this.keyFiller.getFxn(subterm, symbols, input)
      if (input.keyFxn) {
        input.valFxn = this.valueFiller.getFxn(template[term], input)
      	steps[step].push(term)
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
    const step = reservedTerm == "@before()" || reservedTerm == "@after()"
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
    for(const row of rows) {
      this.processRow(row, this.opts.template, this.tree)
    }
    this.processResult(this.tree)
    if (refreshErrors) this.logErrors()
  }

  processRow(row, template, result) {
  	const context = this.contexts.get(result);
  	const filler = this.fillers.get(template);
  	for(const step of filler.steps) {
	    for(const term of step) { 
	      const input = filler.terms[term]; 
	      if (input.keyFxn && input.valFxn) {
	      	if (term == "@before()" || term == "@after()") {
	      		input.valFxn(row, "", result, context)
	      	} 
	      	else {
		        const keys = input.keyFxn(row); 
		        for(const key of keys) {
		          if (input.valFxn) {
		          	input.valFxn(row, key, result, context)
		          }
		        }
		      }
	      }
	    }
	  }
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
  				const context = this.contexts.get(value); //console.log(context)
  				if (context && context["@dist"]) { //console.log(context["@dist"])
  					context["@dist"](value)
  				}
  				this.processResult(value)
  			}
  		}
  	}
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


class KeyFiller { 
  constructor(Tree) {
    this.Tree = Tree
    this.ignoredVals = Tree.opts.ignoredVals
    this.allowedKeyTypes = new Set(["string", "number", "undefined"])
  }

  getFxn(subterm, symbols, input) {
  	if (subterm in this) {
  		return this[subterm](subterm, input)
  	}
    else if (symbols in this) {
      return this[symbols](subterm, input)
    }
    else {
      this.Tree.errors.add(["template", "key", input.lineage])
    } 
  }
}

KeyFiller.prototype[""] = function(subterm) {
  return (row) => [subterm]
}
    
KeyFiller.prototype["$"] = function(subterm, input) {
	const nestedSymbol = "$" + this.Tree.userDelimit
  if (subterm == "$" || subterm == nestedSymbol) {
  	this.Tree.errors.add(["template", "row-as-key", input.lineage]) 
  }
  else if (subterm.startsWith(nestedSymbol)) {
  	const nestedProps = subterm.split(this.Tree.userDelimit).slice(1);
	  const reducer = (d,k) => d ? d[k] : null
	  return (row) => {
	  	const key = nestedProps.reduce(reducer, row)
			if (!this.allowedKeyTypes.has(typeof key)) {
	      this.Tree.errors.add(["key", "subs", input.lineage])
	      return []
	    }
	    else {
	      return [key]
	    }
	  }
  }
  else {
	  const prop = subterm.slice(1);
	  return (row) => {
	    const key = row[prop]; //console.log([subterm, prop, row, value])
	    if (!this.allowedKeyTypes.has(typeof key)) {
	      this.Tree.errors.add(["key", "subs", lineage, row])
	      return []
	    }
	    else {
	      return [key]
	    }
	  }
	}
}

KeyFiller.prototype["$[]"] = function(subterm, input) {
  const prop = subterm.slice(1);
  return (row) => {
    const keys = row[prop]; //console.log([subterm, prop, row, value])
    if (!Array.isArray(keys)) {
      this.Tree.errors.add(["key", "conv", input.lineage, row])
      return []
    }
    else {
      for(const key of keys) {
        if (!this.allowedKeyTypes.has(typeof key)) {
          this.Tree.errors.add(["key", "subs", input.lineage, row])
          return []
        }
        return keys
      }
    }
  }
}

KeyFiller.prototype["=()"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
    this.Tree.errors.add(['template', 'key-missing-function', input.lineage])
  	return (row) => []
  }
  else {
  	return (row) => {
  		const key = fxn(row)
  		if (this.ignoredVals.includes(key)) {
  			return []
  		}
			if (!this.allowedKeyTypes.has(typeof key)) {
	      this.Tree.errors.add(["key", "subs", input.lineage])
	      return []
	    }
	    else {
	      return [key]
	    }
  	}
  }
}

KeyFiller.prototype["=[]"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
    this.Tree.errors.add(['template', 'key-missing-function', input.lineage])
  	return (row) => []
  }
  else {
  	return (row) => {
  		const keys = fxn(row)
  		const allowed = []
  		for(const key of keys) {
	  		if (!this.ignoredVals.includes(key)) {
	  			if (!this.allowedKeyTypes.has(typeof key)) {
		      	this.Tree.errors.add(["key", "subs", input.lineage])
			    }
			    else {
			      allowed.push(key)
			    }
			  }
		  }
		  return allowed
  	}
  }
}

KeyFiller.prototype["@()"] = function(subterm, input) {
	console.log(subterm)
  return () => []
}

KeyFiller.prototype["#"] = function(subterm, input) {
	if (!this.Tree.commentedTerms.has(input)) {
		this.Tree.commentedTerms.set(input, {
			keys: new Set(),
			values: new Set()
		})
	}
  this.Tree.commentedTerms.get(input).keys.add(subterm)
}

KeyFiller.prototype["@"] = function(subterm, input) {
	return ()=>[]
}

KeyFiller.prototype["@before"] = function(subterm, input) {
	return ()=>[]
}

KeyFiller.prototype["@after"] = function(subterm, input) {
	return ()=>[]
}

class ValueFiller {
  constructor(Tree) {
    this.Tree = Tree
    this.ignoredVals = this.Tree.opts.ignoredVals
  }

  getFxn(templateVal, input) {
    if (typeof templateVal=='string') {
      return this.getStringFiller(templateVal, input)
    }
    else if (Array.isArray(templateVal)) {
      return this.getArrayFiller(templateVal, input)
    }
    else if (templateVal && typeof templateVal == 'object') {
      return this.getObjectFiller(templateVal, input)
    }
    else {
      this.errors.add(['template', 'value', input])
    }
  }

  getStringFiller(templateVal, input) {
    const term = templateVal
    const [subterm, symbols] = this.Tree.parseTerm(term);
    if (symbols in this) {
      return this[symbols](subterm, input)
    }
    else {
      this.Tree.errors.add(['template', 'value', input.lineage])
    }
  }

  getArrayFiller(templateVal, input) { 
    input.valOptions = templateVal.length > 1 ? templateVal.slice(1) : null
    if (typeof templateVal[0] == 'string') {
      const [subterm, symbols] = this.Tree.parseTerm(templateVal[0]);
      const bracketedSymbols = '[' + symbols + ']'
      if (bracketedSymbols in this) {
      	return this[bracketedSymbols](subterm, input)
      }
      else {
      	this.Tree.errors.add(['template', 'array-value', input.lineage])
      }
    }
    else if (templateVal[0] && typeof templateVal[0] == 'object') {
      return this["[{}]"](templateVal[0], input)
    }
    else {
    	return this["[]"](templateVal, input)
    }
  }

  getObjectFiller(templateVal, input) {
    return (row, key, result) => {
      if (!(key in result)) {
        result[key] = this.getChildObj(key, result)
      }
      this.Tree.processRow(row, templateVal, result[key])
    }
  }

  getChildObj(branch, parent, isArray = false) {
  	const child = isArray ? [] : Object.create(null)
  	this.Tree.contexts.set(child, {branch, parent, root: this.Tree.tree})
    return child
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
  }
}

ValueFiller.prototype[""] = function(subterm) {
  return (row, key, result) => result[key] = subterm
}

ValueFiller.prototype["$"] = function(subterm, input) {
  const nestedSymbol = "$" + this.Tree.userDelimit
  if (subterm == "$" || subterm == nestedSymbol) {
  	this.Tree.errors.add(["template", "value-identity-loop", input.lineage])
  }
  else if (subterm.startsWith(nestedSymbol)) {
  	const nestedProps = subterm.split(this.Tree.userDelimit).slice(1);
    const reducer = (d,k) => d ? d[k] : null
    return (row, key, result) => {
    	result[key] = nestedProps.reduce(reducer, row)
    }
  }
  else {
	  const prop = subterm.slice(1)
	  return (row, key, result) => result[key] = row[prop]
	}
}

ValueFiller.prototype["#"] = function(subterm, input) {
	if (!this.Tree.commentedTerms.has(input)) {
		this.Tree.commentedTerms.set(input, {
			keys: new Set(),
			values: new Set()
		})
	}
  this.Tree.commentedTerms.get(input).values.add(subterm)
}

ValueFiller.prototype["[]"] = function(subterm) {
  return (row, key, result) => {
  	if (!(key in result)) result[key] = []
  }
}

ValueFiller.prototype["[$]"] = function(subterm, input) {
  const nestedSymbol = "$" + this.Tree.userDelimit
  if (subterm == "$" || subterm == nestedSymbol) {
  	return (row, key, result) => {
    	if (!(key in result)) result[key] = []
    	result[key].push(row)
    }
  }
  else if (subterm.startsWith(nestedSymbol)) {
  	const nestedProps = subterm.split(this.Tree.userDelimit).slice(1);
    const reducer = (d,k) => d ? d[k] : null
    return (row, key, result) => {
    	if (!(key in result)) result[key] = []
    	result[key] = nestedProps.reduce(reducer, row)
    }
  } 
  else {
	  const prop = subterm.slice(1)
	  if (!input.valOptions) {
		  return (row, key, result) => {
		  	if (!(key in result)) result[key] = []
		    result[key].push(row[prop])
		  }
		}
		else if (input.valOptions[0] == "distinct") {
			return (row, key, result) => {
		  	if (!(key in result)) result[key] = new Set()
		    result[key].add(row[prop])
		  }
		}
		else {
			this.Tree.errors.add(["template", "val-unsupported-option", input.lineage])
		}
	}
}

ValueFiller.prototype["[$[]]"] = function(subterm, input) {
  const prop = subterm.slice(1)
	if (!input.valOptions) {
		return (row, key, result) => {
	    const values = row[prop]
	    if (!Array.isArray(values)) {
	      this.Tree.errors.add(["val", "non-array", input.lineage, row])
	    }
	    else {
	    	if (!(key in result)) result[key] = []
	    	result[key].push(...values)
	    }
	  }
	}
	else if (input.valOptions[0] == "distinct") {
		return (row, key, result) => {
	    const values = row[prop]
	    if (!Array.isArray(values)) {
	      this.Tree.errors.add(["val", "non-array", input.lineage, row])
	    }
	    else {
	    	if (!(key in result)) result[key] = new Set()
	    	for(const value of values) {
	    		result[key].add(value)
	    	}
	    }
	  }
	}
	else { 
		this.Tree.errors.add(["template", "val-unsupported-option", input.lineage])
	}
}

ValueFiller.prototype["[{}]"] = function (template, input) {
  this.Tree.parseTemplate(template, input.lineage)
  const filler = this.Tree.fillers.get(template);
  return (row, key, result) => {
    if (!(key in result)) {
    	result[key] = this.getChildObj(key, result, true)
    }
    const item = this.getChildObj(result[key].length, result)
    // this.Tree.processRow(row, template, item)
    for(const k in filler.terms) {
      if (filler.terms[k].valFxn) {
      	filler.terms[k].valFxn(row, k, item)
      }
    }
    result[key].push(item)
  }
}

ValueFiller.prototype["+"] = function(subterm) {
  if (this.isNumeric(subterm)) {
    const incr = +subterm
    return (row, key, result) => {
      if (!(key in result)) result[key] = 0
      result[key] += incr
    }
  }
  else { 
    return (row, key, result) => {
      if (!(key in result)) result[key] = ""
      result[key] += subterm
    }
  }
}

ValueFiller.prototype["-"] = function(subterm, input) {
  if (this.isNumeric(subterm)) {
    const incr = -subterm
    return (row, key, result) => {
      if (!(key in result)) result[key] = 0
      result[key] += incr
    }
  }
  else { 
    this.Tree.errors.add(['template', 'value-non-variable-decr', input.lineage])
  }
}

ValueFiller.prototype["+$"] = function(subterm, input) {
  const prop = subterm.slice(1)
  return (row, key, result) => {
    if (!(key in result)) result[key] = 0
    const value = +row[prop]
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      this.Tree.errors.add(['val', 'non-numeric-incr', input.lineage, row])
      return
    }
    result[key] += value
  }
}

ValueFiller.prototype["-$"] = function(subterm, input) {
  const prop = subterm.slice(1)
  return (row, key, result) => {
    if (!(key in result)) result[key] = 0
    const value = row[prop]
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      this.Tree.errors.add(['val', 'non-numeric-decr', input.lineage, row])
      return
    }
    result[key] += -value
  }
}

ValueFiller.prototype["<$"] = function(subterm, input) {
  const prop = subterm.slice(1)
  return (row, key, result) => {
    const value = +row[prop]
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      this.Tree.errors.add(['val', 'non-numeric-than', input.lineage, row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    }
    else if (value < result[key]) {
      result[key] = row[prop]
    }
  }
}

ValueFiller.prototype[">$"] = function(subterm, input) {
  const prop = subterm.slice(1)
  return (row, key, result) => {
    const value = +row[prop]
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      this.Tree.errors.add(['val', 'non-numeric-than', input.lineage, row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    }
    else if (value > result[key]) {
      result[key] = row[prop]
    }
  }
}

ValueFiller.prototype["=()"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
    this.Tree.errors.add(['template', 'val-missing-function', input.lineage])
  	return () => {}
  }
  else if (input.subterm == "@before" || input.subterm == "@after") { 
  	return (row, key, result, context) => {
  		result[key] = fxn(row, row, key, context)
  	}
  }
  else {
  	return (row, key, result) => result[key] = fxn(row)
  }
}

ValueFiller.prototype["[=()]"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
    this.Tree.errors.add(['template', 'val-missing-function', input.lineage])
  	return () => {}
  }
  else if (!input.valOptions) {
	  return (row, key, result, context) => {
	  	const value = fxn(row, key, result, context)
    	if (this.ignoredVals.includes(value)) return
	  	if (!(key in result)) result[key] = []
	  	result[key].push(value)
	  }
	}
	else if (input.valOptions[0] == "distinct") {
		return (row, key, result) => {
	  	if (!(key in result)) result[key] = new Set()
	  	const value = fxn(row)
    	if (this.ignoredVals.includes(value)) return
	  	result[key].add(value)
	  }
	}
	else {
		this.Tree.errors.add(["template", "val-unsupported-option", input.lineage])
	}
}

ValueFiller.prototype["[=[]]"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
    this.Tree.errors.add(['template', 'val-missing-function', input.lineage])
  	return () => {}
  }
  else if (!input.valOptions) {
	  return (row, key, result) => {
	  	const values = fxn(row)
	  	if (!Array.isArray(values)) {
	  		this.Tree.errors.add(['val', 'non-array-fxn-returned-value', input.lineage, row])
	  		return
	  	}
	  	else {
	  		if (!(key in result)) result[key] = []
		  	for(const value of values) {
		  		if (!this.ignoredVals.includes(value)) {
		  			result[key].push(value)
		  		}
		  	}
		  }
	  }
	}
	else if (input.valOptions[0] == "distinct") {
		return (row, key, result) => {
	  	const values = fxn(row)
	  	if (!Array.isArray(values)) {
	  		this.Tree.errors.add(['val', 'non-array-fxn-returned-value', input.lineage, row])
	  		return
	  	}
	  	else {
	  		if (!(key in result)) result[key] = new Set()
		  	for(const value of values) {
		  		if (!this.ignoredVals.includes(value)) {
		  			result[key].add(value)
		  		}
		  	}
		  }
	  }
	}
	else {
		this.Tree.errors.add(["template", "val-unsupported-option", input.lineage])
	}
}

ValueFiller.prototype["@branch"] = function(subterm, input) {
  return (row, key, result) => {
  	const context = this.Tree.contexts.get(result)
  	if (!context) {
  		this.Tree.errors.add(["internal", "missing-context", input.lineage])
  	}
  	result[key] = context.branch
  }
}

ValueFiller.prototype["@parent"] = function(subterm, input) {
  if (subterm == "@parent" || subterm == "@parent" + this.Tree.treeDelimit) {
  	this.Tree.errors.add(["template", "context-parent-loop", input.lineage])
  }
  else if (!subterm.includes(this.Tree.treeDelimit)) {
  	this.Tree.errors.add(["template", "context-parent-undelimited", input.lineage])
  }
  else {
  	const nestedProps = subterm.split(this.Tree.treeDelimit).slice(1);
  	for(const term of nestedProps) {
  		if (term[0] != "$" && !this.Tree.reservedTerms.includes('@' + term)) {
  			this.Tree.errors.add(["template", "context-unreserved-term", input.lineage])
  			return
  		}
  	}
    const reducer = (d,k) => {
    	if (!d) return null
    	if (k[0] == "$") return d[k.slice(1)]
    	const context = this.Tree.contexts.get(d)
    	if (!context) {
    		this.Tree.errors.add(["value", "missing-parent-context", input.lineage])
    	}
    	return context[k]
    }
    return (row, key, result) => {
    	const context = this.Tree.contexts.get(result)
	  	if (!context) {
	  		this.Tree.errors.add(["internal", "missing-context", input.lineage])
	  		return
	  	}
    	result[key] = nestedProps.reduce(reducer, context.parent)
    }
	}
}

ValueFiller.prototype["@root"] = function(subterm, input) {
  if (!subterm.includes(this.Tree.treeDelimit)) {
  	this.Tree.errors.add(["template", "context-root-undelimited", input.lineage])
  }
  else {
  	const nestedProps = subterm.split(this.Tree.treeDelimit).slice(1)
  	for(const term of nestedProps) {
  		if (term[0] != "$") {
  			this.Tree.errors.add(["template", "root-unsupported-context", input.lineage])
  			return
  		}
  	}
  	const nestedKeys = nestedProps.map(k => k.slice(1));  	
    const reducer = (d, k) => d[k]
    return (row, key, result) => {
    	result[key] = nestedKeys.reduce(reducer, this.Tree.tree)
    }
	}
}

ValueFiller.prototype["[@root]"] = function (subterm, input) {
	if (!subterm.includes(this.Tree.treeDelimit)) {
  	this.Tree.errors.add(["template", "context-root-undelimited", input.lineage])
  }
  else {
  	const nestedProps = subterm.split(this.Tree.treeDelimit).slice(1)
  	for(const term of nestedProps) {
  		if (term[0] != "$") {
  			this.Tree.errors.add(["template", "root-unsupported-context", input.lineage])
  			return
  		}
  	}
  	const nestedKeys = nestedProps.map(k => k.slice(1));  	
    const reducer = (d, k) => d[k]
    
    if (input.subterm == "@dist") { 
	    return (row, key, result) => {
		    const context =  this.Tree.contexts.get(result)
		    if (context && context["@dist"]) return
		    if (!context) {
		  		this.Tree.errors.add(["internal", "missing-context", input.lineage])
		  		return
		  	}
		  	else {
			  	context['@dist'] = (result) => {
			  		const target = nestedKeys.reduce(reducer, this.Tree.tree)
			    	if (!Array.isArray(target)) {
			    		this.Tree.errors.add(["val", "@dist()-target-not-array", input.lineage])
			    		return
			    	}
			    	target.push(result)
			  	}
			  }
		  }
	  }
  }
}
