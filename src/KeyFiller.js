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
      input.errors.push(["key", "UNSUPPORTED-KEY-SYMBOL"])
    } 
  }

  invalidKey(input, key, row, context) {
  	if (this.ignoredVals.includes(key)) {
  		return false
  	}
  	if (!this.allowedKeyTypes.has(typeof key)) {
      context.errors.push([input, "INVALID-RESULT-KEY", row])
      return true
    }
  }
}

KeyFiller.prototype[""] = function(subterm) {
  return (row) => [subterm]
}
    
KeyFiller.prototype["$"] = function(subterm, input) {
	const nestedSymbol = "$" + this.Tree.userDelimit
  if (subterm == "$" || subterm == nestedSymbol) {
  	input.errors.push(["key", "ERR-ROW-AS-KEY"])
  }
  else if (subterm.startsWith(nestedSymbol)) {
  	const nestedProps = subterm.split(this.Tree.userDelimit).slice(1);
	  const reducer = (d,k) => d ? d[k] : null
	  return (row, context) => {
	  	const key = nestedProps.reduce(reducer, row)
			if (this.invalidKey(input, key, row)) {
	      return []
	    }
	    else {
	      return [key]
	    }
	  }
  }
  else {
	  const prop = subterm.slice(1);
	  return (row, context) => {
	    const key = row[prop]; //console.log([subterm, prop, row, value])
	    if (this.invalidKey(input, key, row, context)) {
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
  return (row, context) => {
    const keys = row[prop]
    if (!Array.isArray(keys)) {
      //return this.Tree.errors.getKeys("ERR-NON-ARRAY-KEYS", subterm + "[]", input, row)
  		input.errors.push(["key", "ERR-NON-ARRAY-KEYS", row])
  		return []
    }
    else {
      for(const key of keys) {
        if (this.invalidKey(input, key, row, context)) {
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
  	input.errors.push(["key", "ERR-MISSING-FXN"])
  }
  else {
  	return (row, context) => {
  		const key = fxn(row)
  		if (this.invalidKey(input, key, row, context)) {
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
  	input.errors.push(["key", "ERR-MISSING-FXN"])
  }
  else {
  	return (row, context) => {
  		const keys = fxn(row)
  		const allowed = []
  		for(const key of keys) {
	  		if (this.invalidKey(input, key, row, context)) {
		      return []
		    }
		    allowed.push(key)
		  }
		  return allowed
  	}
  }
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
