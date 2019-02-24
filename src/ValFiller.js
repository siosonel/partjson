export default class ValFiller {
  constructor(Tree) {
    this.Tree = Tree
    this.ignore = this.Tree.opts.ignore
  }

  getFxn(input, ignore) {
  	if (typeof input.templateVal=='string') {
      return this.getStringFiller(input, ignore)
    }
    else if (Array.isArray(input.templateVal)) {
      return this.getArrayFiller(input, ignore)
    }
    else if (input.templateVal && typeof input.templateVal == 'object') {
      return this.getObjectFiller(input)
    }
    else {
      return (row, key, result) => {
      	result[key] = input.templateVal
      }
    }
  }

  getStringFiller(input, ignore) {
    const [subterm, symbols, tokens] = this.Tree.parseTerm(input.templateVal)
    const subconv = subterm + tokens.conv
    input.ignore = subconv in ignore ? ignore[subconv] : ignore["@"]
    const subsToken = tokens.skip ? symbols : tokens.subs
    const callAsFxn = tokens.conv == "()" || tokens.conv == "(]"
    if (subsToken in this) {
    	const subsFxn = this[subsToken](subterm, input, callAsFxn)
    	if (subsFxn) {
      	const conv = tokens.conv ? tokens.conv : "''"
      	return this[tokens.aggr + conv] ? this[tokens.aggr + conv](subsFxn, input) : null
      }
    }
    else {
      input.errors.push(['val', 'UNSUPPORTED-SYMBOL'])
    }
  }

  getArrayFiller(input, ignore) { 
    if (!input.templateVal[0]) {
    	return (row, key, result) => {
    		result[key] = input.templateVal
    	}
    }
    else if (typeof input.templateVal[0] == 'string') {
      const [subterm, symbols, tokens] = this.Tree.parseTerm(input.templateVal[0])
    	const subconv = subterm + tokens.conv
    	input.ignore = subconv in ignore ? ignore[subconv] : ignore["@"]
      const subsToken = tokens.skip ? symbols : tokens.subs
      const callAsFxn = tokens.conv == "()" || tokens.conv == "(]"
      if (subsToken in this) {
      	const subsFxn = this[subsToken](subterm, input, callAsFxn)
      	if (subsFxn) {
      		const conv = tokens.conv ? tokens.conv : "''"
      		return this["["+ conv +"]"](subsFxn, input)
      	}
      }
	    else {
	      input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE'])
	    }
    }
    else if (Array.isArray(input.templateVal[0])) {
    	return this["[[,]]"](input.templateVal[0], input)
    }
    else if (input.templateVal[0] && typeof input.templateVal[0] == 'object') {
      return this["[{}]"](input.templateVal[0], input)
    }
    else {
    	input.errors.push("val", "UNSUPPORTED-TEMPLATE-VALUE")
    }
  }

  getObjectFiller(input) {
  	this.Tree.parseTemplate(input.templateVal, input.inheritedIgnore, input.lineage)
    return (row, key, result) => {
      if (!(key in result)) {
        result[key] = this.Tree.getEmptyResult(key, result)
      }
      const context = this.Tree.contexts.get(result[key])
      this.Tree.processRow(row, input.templateVal, result[key])
    }
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
  }
}

ValFiller.prototype["#"] = function(subterm, input) {
	if (!this.Tree.commentedTerms.has(input)) {
		this.Tree.commentedTerms.set(input, {
			keys: new Set(),
			values: new Set()
		})
	}
  this.Tree.commentedTerms.get(input).values.add(subterm)
}

/* Substitution Functions */
ValFiller.prototype[""] = function(subterm, input, callAsFxn) {
  if (callAsFxn) {
  	input.errors.push(["val", "UNSAFE-GLOBAL-FXN"])
  	return
  } 
  return this.isNumeric(subterm) 
    ? () => +subterm
    : () => subterm
}

ValFiller.prototype["$"] = function(subterm, input, callAsFxn) {
  if (subterm == "$" || subterm == "$" + this.Tree.userDelimit) {
  	return (row) => row
  }
  else if (subterm.includes(this.Tree.userDelimit)) {
  	const nestedProps = subterm.slice(1).split(this.Tree.userDelimit)
  	if (nestedProps[0] == "") nestedProps.shift()
    const reducer = (d,k) => d ? d[k] : null
    return !callAsFxn 
      ? (row) => nestedProps.reduce(reducer, row)
    	: (row) => {
    		const fxn = nestedProps.reduce(reducer, row)
    		if (typeof fxn != "function") {
    			input.errors.push(["val", "NOT-A-FUNCTION-" + subterm + "()", row])
    			return
    		}
    		return fxn(row)
    	} 
  }
  else {
	  const prop = subterm.slice(1)
	  return !callAsFxn 
	    ? (row) => row[prop]
	    : (row) => {
    	  const fxn = row[prop]
    	  if (typeof fxn != "function") {
    	    input.errors.push(["val", "NOT-A-FUNCTION", row])
    	    return
    	  }
    		return fxn(row)
      } 
	}
}

ValFiller.prototype["="] = function(subterm, input, callAsFxn) {
  const nestedProps = subterm.slice(1).split(this.Tree.treeDelimit)
  const reducer = (d,k) => d && k in d ? d[k] : null
  const propOrFxn = nestedProps.reduce(reducer, this.Tree.opts["="])
  if (!propOrFxn) {
  	input.errors.push(["val", "MISSING-EXTERNAL-SUBS"])
  }
  else if (!callAsFxn) {
  	return () => propOrFxn
  }
  else if (typeof propOrFxn !== "function") {
  	input.errors.push(["val", "NOT-A-FUNCTION"])
  }
  else {
  	return propOrFxn
  }
}

ValFiller.prototype["@"] = function(subterm, input, callAsFxn) {
	if (this.Tree.reservedOpts.includes(subterm)) return
  if (subterm == "@" || subterm == "@" + this.Tree.treeDelimit) {
  	return (row, context) => context.self
  }
  else if (subterm.includes(this.Tree.treeDelimit)) {
  	const nestedProps = subterm.split(this.Tree.treeDelimit)
    const reducer = (resultContext, d) => {
    	if (d[0] == "@" && d.length > 1 && !this.Tree.reservedContexts.includes(d)) {
    		input.errors.push(["val", "UNRECOGNIZED-CONTEXT", input.lineage.join(".")+"."+d])
    		return [null, null]
    	}
    	const [result, context] = resultContext
     	return !result || !d 
    		? null
    		: d == "@"
    			? [context.self, context]
    			: d[0] == "@"
    				? [context[d.slice(1)], this.Tree.contexts.get(context[d.slice(1)])]
    				: !result
    					? [null, null]
    					: [result[d], this.Tree.contexts.get(result[d])]
    }
    if (!callAsFxn) {
    	return (row, context) => {
    		const value = nestedProps.reduce(reducer, [context.self, context])
    		return Array.isArray(value) ? value[0] : null
    	}
    }
    else {
    	return (row, context) => {
    		const value = nestedProps.reduce(reducer, [context.self, context])
    		const fxn = Array.isArray(value) ? value[0] : null
    		if (typeof fxn !== "function") {
			  	input.errors.push(["val", "NOT-A-FUNCTION", row])
			  	return
			  }
			  return fxn(row, context)
    	}
    }
  }
  else if (!this.Tree.reservedContexts.includes(subterm)) {
  	input.errors.push(["val", "UNRECOGNIZED-CONTEXT"])
  }
  else { 
	  const prop = subterm.slice(1)
	  return !callAsFxn 
	  	? (row, context) => context[prop]
	  	: (row, context) => {
	  		const fxn = context[prop]
    		if (typeof fxn !== "function") {
			  	input.errors.push(["val", "NOT-A-FUNCTION", row])
			  	return
			  }
			  return fxn(row, context)
	  	}
	}
}

ValFiller.prototype["&"] = function(subterm, input, callAsFxn) {
  const nestedProps = subterm.slice(1).split(this.Tree.userDelimit)
  const alias = nestedProps.shift()
  if (!nestedProps.length) {
  	return !callAsFxn 
  		? () => this.Tree.joins.get(alias)
  		: (row, context) => {
  			const fxn = this.Tree.joins.get(alias)
  			if (typeof fxn != "function") {
  				input.errors.push(["val", "NOT-A-FUNCTION", row])
			  	return
  			}
			  return fxn(row, context)
  		}
  }
  else if (nestedProps.length == 1) {
  	const prop = nestedProps[0]
	  if (!callAsFxn) {
	  	return () => {
		  	const join = this.Tree.joins.get(alias)
		  	return join ? join[prop] : null
		  }
		}
		else {
			return (row, context) => {
		  	const join = this.Tree.joins.get(alias)
		  	const fxn = join ? join[prop] : null
		  	if (typeof fxn != "function") {
  				input.errors.push(["val", "NOT-A-FUNCTION", row])
			  	return
  			}
			  return fxn(row, context)
		  }
		}
  }
  else {
  	const reducer = (d,k) => d ? d[k] : null
  	const join = this.Tree.joins.get(alias)
    if (!callAsFxn) {
    	return (row) => nestedProps.reduce(reducer, this.Tree.joins.get(alias))	 
    }
    else {
    	return (row, context) => {
    		const fxn = nestedProps.reduce(reducer, this.Tree.joins.get(alias))
		  	if (typeof fxn != "function") {
  				input.errors.push(["val", "NOT-A-FUNCTION", row])
			  	return
  			}
			  return fxn(row, context)
    	}
    }
  }
}

/* No aggregation */
ValFiller.prototype["''"] = function(subsFxn, input) {
 	return (row, key, result, context) => {
 		const value = subsFxn(row, context)
 		if (input.ignore(value, key, row)) return
 		result[key] = value
 	}
}

ValFiller.prototype["()"] = ValFiller.prototype["''"]

ValFiller.prototype["[]"] = ValFiller.prototype["''"]

ValFiller.prototype["(]"] = ValFiller.prototype["[]"]

/* Aggregation into an array or set collection */
ValFiller.prototype["['']"] = function(subsFxn, input) {
  const option = input.templateVal[1] ? input.templateVal[1] : ""
  if (!option || option != "distinct") {
		return (row, key, result, context) => {
	  	if (!(key in result)) result[key] = []
	  	const value = subsFxn(row, context)
 			if (input.ignore(value, key, row, context)) return
	  	result[key].push(value)
	  }
	}
	else {
		return (row, key, result, context) => {
	  	if (!(key in result)) result[key] = new Set()
	 		const value = subsFxn(row, context)
	 		if (input.ignore(value, key, row, context)) return
	  	result[key].add(value)
	  }
	}
}

ValFiller.prototype["[()]"] = ValFiller.prototype["['']"]

ValFiller.prototype["[[]]"] = function(subsFxn, input) {
  const option = input.templateVal[1] ? input.templateVal[1] : ""
  if (!option || option != "distinct") {
		return (row, key, result, context) => {
	    const values = subsFxn(row, context)
	    if (!Array.isArray(values)) {
	    	context.errors.push([input, "NON-ARRAY-VALS", row])
	    	return
	    }
    	if (!(key in result)) result[key] = []
    	for(const value of values) {
		 		if (input.ignore(value, key, row, context)) continue
	    	result[key].push(...values)
	    }
	  }
	}
	else {
		return (row, key, result, context) => {
	    const values = subsFxn(row, context)
	    if (!Array.isArray(values)) {
	    	context.errors.push([input, "NON-ARRAY-VALS", row])
	    	return
	    }
    	if (!(key in result)) result[key] = new Set()
    	for(const value of values) {
		 		if (input.ignore(value, key, row, context)) continue
    		result[key].add(value)
	    }
	  }
	}
}

ValFiller.prototype["[(]]"] = ValFiller.prototype["[[]]"]

ValFiller.prototype["[{}]"] = function (template, input) {
  this.Tree.parseTemplate(template, input.inheritedIgnore, input.lineage)
  const filler = this.Tree.fillers.get(template);
  return (row, key, result) => {
    if (!(key in result)) {
    	result[key] = this.Tree.getEmptyResult(key, result, true)
    }
    const item = this.Tree.getEmptyResult(result[key].length, result)
    this.Tree.processRow(row, template, item)
    result[key].push(item)
  }
}

ValFiller.prototype["[[,]]"] = function (templates, input) {
  const fillers = []
  for(const templateVal of templates) {
  	const inputCopy = Object.assign({}, input, {templateVal})
  	fillers.push(this.getFxn(inputCopy, input.inheritedIgnore))
  }
  const option = input.templateVal[1] ? input.templateVal[1] : ""
  if (!option || option != "map") {
	  return (row, key, result) => {
	  	if (!(key in result)) result[key] = []
	  	const items = []
	  	for(const i in fillers) {
	  		fillers[+i](row, +i, items)
	  	}
	  	result[key].push(items)
	  }
	}
	else {
		return (row, key, result) => {
	  	if (!(key in result)) result[key] = new Map()
	  	const temp = []
	  	fillers[0](row, 0, temp)
	  	if (result[key].has(temp[0])) {
	  		temp[1] = result[key].get(temp[0])
	  	}
	  	fillers[1](row, 1, temp)
	  	result[key].set(temp[0], temp[1])
	  }
	}
}

/* Operator aggregation */
ValFiller.prototype["+''"] = function(subsFxn, input) { 
  return (row, key, result, context) => {
    if (!(key in result)) result[key] = 0
		const value = subsFxn(row, context)
		if (input.ignore(value, key, row, context)) return
    result[key] += +value
  }
}

ValFiller.prototype["+()"] = ValFiller.prototype["+''"] 

ValFiller.prototype["+[]"] = function(subsFxn, input) { 
  return (row, key, result, context) => {
    if (!(key in result)) result[key] = 0
		const values = subsFxn(row, context)
		if (!Array.isArray(values)) {
			input.errors.push(["val", "NON-ARRAY-VALS", row])
			return
		}
		for(const value of values) {
			if (input.ignore(value, key, row, context)) continue
	    result[key] += this.isNumeric(value) ? +value : value
		}
  }
}

ValFiller.prototype["+(]"] = ValFiller.prototype["+[]"]

ValFiller.prototype["-''"] = function(subsFxn, input) {
  return (row, key, result, context) => {
    if (!(key in result)) result[key] = 0
		const value = subsFxn(row, context)
		if (input.ignore(value, key, row, context)) return
    result[key] += -value
  }
}

ValFiller.prototype["-()"] = ValFiller.prototype["-''"]

ValFiller.prototype["-[]"] = function(subsFxn, input) { 
  return (row, key, result, context) => {
		const values = subsFxn(row, context)
		if (!Array.isArray(values)) {
			input.errors.push(["val", "NON-ARRAY-VALS", row])
			return
		}
    if (!(key in result)) result[key] = 0
		for(const value of values) {
			if (input.ignore(value, key, row, context)) continue
	    result[key] += -value
		}
  }
}

ValFiller.prototype["-(]"] = ValFiller.prototype["-[]"]

ValFiller.prototype["<''"] = function(subsFxn, input) {
  return (row, key, result, context) => {
    const value = +subsFxn(row, context)
		if (input.ignore(value, key, row, context)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-THAN", row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    }
    else if (result[key] < value) {
      result[key] = value
    }
  }
}

ValFiller.prototype["<()"] = ValFiller.prototype["<''"]

ValFiller.prototype["<[]"] = function(subsFxn, input) {
  return (row, key, result, context) => {
    const values = subsFxn(row, context)
    if (!Array.isArray(values)) {
			input.errors.push(["val", "NON-ARRAY-VALS", row])
			return
		}
		for(const value of values) {
			if (input.ignore(value, key, row, context)) return
	    if (!this.isNumeric(value)) {
	      context.errors.push([input, "NON-NUMERIC-THAN", row])
	      return
	    }
	    const val = +value
	    if (!(key in result)) {
	      result[key] = val
	    }
	    else if (result[key] < val) {
	      result[key] = val
	    }
	  }
  }
}

ValFiller.prototype["<(]"] = ValFiller.prototype["<[]"]

ValFiller.prototype[">''"] = function(subsFxn, input) {
  return (row, key, result, context) => {
    const value = +subsFxn(row, context)
		if (input.ignore(value, key, row, context)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-THAN", row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    }
    else if (result[key] > value) {
      result[key] = value
    }
  }
}

ValFiller.prototype[">()"] = ValFiller.prototype[">''"]

ValFiller.prototype[">[]"] = function(subsFxn, input) {
  return (row, key, result, context) => {
    const values = subsFxn(row, context)
    if (!Array.isArray(values)) {
			input.errors.push(["val", "NON-ARRAY-VALS", row])
			return
		}
		for(const value of values) {
			if (input.ignore(value, key, row, context)) return
	    if (!this.isNumeric(value)) {
	      context.errors.push([input, "NON-NUMERIC-THAN", row])
	      return
	    }
	    const val = +value
	    if (!(key in result)) {
	      result[key] = val
	    }
	    else if (result[key] > val) {
	      result[key] = val
	    }
	  }
  }
}

ValFiller.prototype[">(]"] = ValFiller.prototype[">[]"]

