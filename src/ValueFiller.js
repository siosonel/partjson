class ValueFiller {
  constructor(Tree) {
    this.Tree = Tree
    this.ignoredVals = this.Tree.opts.ignoredVals
  }

  getFxn(templateVal, input) { 
  	if (this.Tree.reservedFxns.includes(input.subterm + "()")) {
  		return this.Tree.opts.fxns[input.subterm.slice(1)]
  	}
    else if (typeof templateVal=='string') {
      return this.getStringFiller(templateVal, input)
    }
    else if (Array.isArray(templateVal)) {
      return this.getArrayFiller(templateVal, input)
    }
    else if (templateVal && typeof templateVal == 'object') {
      return this.getObjectFiller(templateVal, input)
    }
    else {
      input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE'])
    }
  }

  getStringFiller(templateVal, input) {
    const term = templateVal
    const [subterm, symbols] = this.Tree.parseTerm(term);
    if (symbols in this) {
      return this[symbols](subterm, input)
    }
    else {
      input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE-SYMBOL'])
    }
  }

  getArrayFiller(templateVal, input) { 
    input.valOptions = templateVal.length > 1 ? templateVal.slice(1) : []
    if (typeof templateVal[0] == 'string') {
      const [subterm, symbols] = this.Tree.parseTerm(templateVal[0]);
      const bracketedSymbols = '[' + symbols + ']'
      if (bracketedSymbols in this) {
      	return this[bracketedSymbols](subterm, input)
      }
      else {
      	input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-ARRAY-VALUE'])
      }
    }
    else if (templateVal[0] && typeof templateVal[0] == 'object') {
      return this["[{}]"](templateVal[0], input)
    }
    else {
    	return this["[]"](templateVal[0], input)
    }
  }

  getObjectFiller(templateVal, input) {
    return (row, key, result) => {
      if (!(key in result)) {
        result[key] = this.Tree.getEmptyResult(key, result)
      }
      const context = this.Tree.contexts.get(result[key])
      this.Tree.processRow(row, templateVal, result[key], context)
    }
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
  }
}

ValueFiller.prototype[""] = function(subterm) {
  return (row, key, result) => result[key] = subterm
}

ValueFiller.prototype["$"] = function(subterm, input=null) {
  const nestedSymbol = "$" + this.Tree.userDelimit
  if (subterm == "$" || subterm == nestedSymbol) {
  	return !input ? (row) => row 
  		: (row, key, result) => {
  			result[key] = row
  		}
  }
  else if (subterm.startsWith(nestedSymbol)) {
  	const nestedProps = subterm.split(this.Tree.userDelimit).slice(1);
    const reducer = (d,k) => d ? d[k] : null
    return !input ? (row) => nestedProps.reduce(reducer, row)
    	: (row, key, result) => {
    		result[key] = nestedProps.reduce(reducer, row)
    	}
  }
  else {
	  const prop = subterm.slice(1)
	  return !input ? (row) => row[prop]
	  	: (row, key, result) => {
	  		result[key] = row[prop]
	  	}
	}
}

ValueFiller.prototype["&"] = function(subterm, input) {
	const [alias, prop] = subterm.slice(1).split(this.Tree.userDelimit)
  return (row, key, result) => {
  	const join = this.Tree.joins.get(alias)
  	result[key] = join ? join[prop] : null
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
  	if (subterm) result[key].push(subterm)
  }
}

ValueFiller.prototype["[$]"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
  if (!input.valOptions.length)  {
		return (row, key, result) => {
	  	if (!(key in result)) result[key] = []
	  	result[key].push(subsFxn(row))
	  }
	}
  else if (input.valOptions[0] == 'distinct') {
	  return (row, key, result) => {
	  	if (!(key in result)) result[key] = new Set()
	  	result[key].add(subsFxn(row))
	  }
	}
	else {
		input.errors.push(["val", "UNSUPPORTED-VALUE-OPTION"])
	}
}

ValueFiller.prototype["[$[]]"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
	if (!input.valOptions.length) {
		return (row, key, result, context) => {
	    const values = subsFxn(row)
	    if (!Array.isArray(values)) {
      	context.errors.push([input, "ERR-NON-ARRAY-VALS", row])
	    }
	    else {
	    	if (!(key in result)) result[key] = []
	    	result[key].push(...values)
	    }
	  }
	}
	else if (input.valOptions[0] == "distinct") {
		return (row, key, result, context) => {
	    const values = subsFxn(row)
	    if (!Array.isArray(values)) {
      	context.errors.push([input, "ERR-NON-ARRAY-VALS", row])
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
		input.errors.push(["val", "UNSUPPORTED-VALUE-OPTION"])
	}
}

ValueFiller.prototype["[{}]"] = function (template, input) {
  this.Tree.parseTemplate(template, input.lineage)
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
    input.errors.push(["val", "NON-NUMERIC-DECREMENT"])
  }
}

ValueFiller.prototype["+$"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
  return (row, key, result, context) => {
    if (!(key in result)) result[key] = 0
    const value = +subsFxn(row)
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-INCREMENT", row])
      return
    }
    result[key] += value
  }
}

ValueFiller.prototype["-$"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
  return (row, key, result, context) => {
    if (!(key in result)) result[key] = 0
    const value = +subsFxn(row)
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-DECREMENT", row])
      return
    }
    result[key] += -value
  }
}

ValueFiller.prototype["<$"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
  return (row, key, result, context) => {
    const value = +subsFxn(row)
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-THAN", row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    }
    else if (value < result[key]) {
      result[key] = value
    }
  }
}

ValueFiller.prototype[">$"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
  return (row, key, result, context) => {
    const value = +subsFxn(row)
    if (this.ignoredVals.includes(value)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-THAN", row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    }
    else if (value > result[key]) {
      result[key] = value
    }
  }
}

ValueFiller.prototype["=()"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
  	input.errors.push(["val", "ERR-MISSING-FXN"])
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
  	input.errors.push(["val", "ERR-MISSING-FXN"])
  }
  else if (!input.valOptions.length) {
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
		input.errors.push(["val", "UNSUPPORTED-VALUE-OPTION"])
	}
}

ValueFiller.prototype["[=[]]"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
  	input.errors.push(["val", "ERR-MISSING-FXN"])
  }
  else if (!input.valOptions.length) {
	  return (row, key, result, context) => {
	  	const values = fxn(row)
	  	if (!Array.isArray(values)) {
	  		context.errors.push([input, "NON-ARRAY-RESULT", row])
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
		return (row, key, result, context) => {
	  	const values = fxn(row)
	  	if (!Array.isArray(values)) {
	  		context.errors.push([input, "NON-ARRAY-RESULT", row])
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
		input.errors.push(["val", "UNSUPPORTED-VALUE-OPTION"])
	}
}

ValueFiller.prototype["@branch"] = function(subterm, input) {
  return (row, key, result, context) => {
  	result[key] = context.branch
  }
}

ValueFiller.prototype["@parent"] = function(subterm, input) {
  if (subterm == "@parent" || subterm == "@parent" + this.Tree.treeDelimit) {
  	input.errors.push(["val", "CONTEXT-PARENT-LOOP"])
  }
  else if (!subterm.includes(this.Tree.treeDelimit)) {
  	input.errors.push(["val", "CONTEXT-PARENT-UNDELIMITED"])
  }
  else {
  	const nestedProps = subterm.split(this.Tree.treeDelimit).slice(1);
  	for(const term of nestedProps) {
  		if (term[0] != "$" && !this.Tree.reservedTerms.includes('@' + term)) {
  			input.errors.push(["val", "CONTEXT-UNRESERVED-TERM"])
  			return
  		}
  	}
    const reducer = (d,k) => {
    	if (!d) return null
    	if (k[0] == "$") return d[k.slice(1)]
    	const context = this.Tree.contexts.get(d)
    	return context[k]
    }
    return (row, key, result, context) => {
    	result[key] = nestedProps.reduce(reducer, context.parent)
    }
	}
}

ValueFiller.prototype["@root"] = function(subterm, input) {
  if (!subterm.includes(this.Tree.treeDelimit)) {
  	input.errors.push(["val", "CONTEXT-ROOT-UNDELIMITED"])
  }
  else {
  	const nestedProps = subterm.split(this.Tree.treeDelimit).slice(1)
  	for(const term of nestedProps) {
  		if (term[0] != "$") {
  			input.errors.push(["val", "ROOT-UNSUPPORTED-CONTEXT"])
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
