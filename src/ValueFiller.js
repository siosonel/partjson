class ValueFiller {
  constructor(Tree) {
    this.Tree = Tree
    this.ignoredVals = this.Tree.opts.ignoredVals
  }

  getFxn(input) {
  	if (typeof input.templateVal=='string') {
      return this.getStringFiller(input)
    }
    else if (Array.isArray(input.templateVal)) {
      return this.getArrayFiller(input)
    }
    else if (input.templateVal && typeof input.templateVal == 'object') {
      return this.getObjectFiller(input)
    }
    else {
      input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE'])
    }
  }

  getStringFiller(input) {
    const [subterm, symbols, valTokens] = this.Tree.parseTerm(input.templateVal)
    if (symbols in this) {
      return this[symbols](subterm, input)
    }
    else {
      input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE-SYMBOL'])
    }
  }

  getArrayFiller(input) { 
    if (typeof input.templateVal[0] == 'string') {
      const [subterm, symbols] = this.Tree.parseTerm(input.templateVal[0]);
      const bracketedSymbols = '[' + symbols + ']'
      if (bracketedSymbols in this) {
      	return this[bracketedSymbols](subterm, input)
      }
      else {
      	input.errors.push(['val', 'UNSUPPORTED-ARRAY-VALUE'])
      }
    }
    else if (Array.isArray(input.templateVal[0])) {
      const [subterm, symbols] = this.Tree.parseTerm(input.templateVal[0][0]);
      const bracketedSymbols = '[[' + symbols + ']]'
      if (bracketedSymbols in this) {
      	return this[bracketedSymbols](subterm, input)
      }
      else {
      	input.errors.push(['val', 'UNSUPPORTED-SET-VALUE'])
      }
    }
    else if (input.templateVal[0] && typeof input.templateVal[0] == 'object') {
      return this["[{}]"](input.templateVal[0], input)
    }
    else {
    	return this["[]"](input.templateVal[0], input)
    }
  }

  getObjectFiller(input) {
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

ValueFiller.prototype["@"] = function(subterm, input=null) {
  const nestedSymbol = "@" + this.Tree.treeDelimit
  if (subterm == "@" || subterm == nestedSymbol) {
  	return !input ? (row, key, result) => result 
  		: (row, key, result) => {
  			result[key] = result
  		}
  }
  else if (subterm.includes(this.Tree.treeDelimit)) {
  	const nestedProps = subterm.split(this.Tree.treeDelimit)
    const reducer = (rc, d) => {
    	if (!d || !rc) return null
    	if (d[0] == "@") {
    		const contextProp = rc[1][d.slice(1)];
    		const result = typeof contextProp != "string" ? contextProp.self : null
    		return [contextProp, this.Tree.contexts.get(contextProp)]
    	}
    	else {
    		const resultProp = rc[0][d];
    		return [resultProp, this.Tree.contexts.get(resultProp)]
    	}
    }
    return !input 
    	? (row, key, result, context) => nestedProps.reduce(reducer, [result, context])[0]
    	: (row, key, result, context) => {
    		result[key] = nestedProps.reduce(reducer, [result, context])[0]
    	}
  }
  else {
	  const prop = subterm.slice(1)
	  return !input 
	  	? (row, key, result, context) => context[prop]
	  	: (row, key, result, context) => { 
	  		result[key] = context[prop]
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
	return (row, key, result) => {
  	if (!(key in result)) result[key] = []
  	result[key].push(subsFxn(row))
  }
}

ValueFiller.prototype["[[$]]"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
  return (row, key, result) => {
  	if (!(key in result)) result[key] = new Set()
  	result[key].add(subsFxn(row))
  }
}

ValueFiller.prototype["[$[]]"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
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

ValueFiller.prototype["[$[]]"] = function(subterm, input) {
  const subsFxn = this["$"](subterm)
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
  return (row, key, result, context) => {
  	const value = fxn(row, key, result, context)
  	if (this.ignoredVals.includes(value)) return
  	if (!(key in result)) result[key] = []
  	result[key].push(value)
  }
}

ValueFiller.prototype["[[=()]]"] = function(subterm, input) {
	const fxn = this.Tree.opts.fxns[subterm.slice(1)]
	if (!fxn) {
  	input.errors.push(["val", "ERR-MISSING-FXN"])
  	return
  }
	return (row, key, result) => {
  	if (!(key in result)) result[key] = new Set()
  	const value = fxn(row)
  	if (this.ignoredVals.includes(value)) return
  	result[key].add(value)
  }
}

ValueFiller.prototype["[=[]]"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
  	input.errors.push(["val", "ERR-MISSING-FXN"])
  	return
  }
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

ValueFiller.prototype["[[=[]]]"] = function(subterm, input) {
  const fxn = this.Tree.opts.fxns[subterm.slice(1)]
  if (!fxn) {
  	input.errors.push(["val", "ERR-MISSING-FXN"])
  	return
  }
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
