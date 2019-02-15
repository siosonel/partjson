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
    	return this["[]"](templateVal[0], input)
    }
  }

  getObjectFiller(templateVal, input) {
    return (row, key, result) => {
      if (!(key in result)) {
        result[key] = this.Tree.getEmptyResult(key, result)
      }
      this.Tree.processRow(row, templateVal, result[key])
    }
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
  	return (row, key, result) => {
    	result[key] = row
    }
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
			//this.Tree.errors.add(["template", "val-unsupported-option", input.lineage])
			input.errors.push(["val", "UNSUPPORTED-VALUE-OPTION"])
		}
	}
}

ValueFiller.prototype["[$[]]"] = function(subterm, input) {
  const prop = subterm.slice(1)
	if (!input.valOptions) {
		return (row, key, result) => {
	    const values = row[prop]
	    if (!Array.isArray(values)) {
	      this.Tree.errors.setArrVal(row, key, result, "ERR-NON-ARRAY-VALS", subterm + "[]", input)
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
	      this.Tree.errors.setArrVal(row, key, result, "ERR-NON-ARRAY-VALS", subterm + "[]", input)
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
    // this.Tree.processRow(row, template, item)
    for(const term in filler.inputs) {
      if (filler.inputs[term].valFxn) {
      	filler.inputs[term].valFxn(row, term, item)
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
    //this.Tree.errors.add(['template', 'val-missing-function', input.lineage])
  	//return this.Tree.errors.getArrValFxn("ERR-MISSING-FXN", subterm, input)
  	input.errors.push(["val", "ERR-MISSING-FXN"])
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
