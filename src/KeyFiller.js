export default class KeyFiller { 
  constructor(Tree) {
    this.Tree = Tree
    this.ignoredVals = Tree.opts.ignoredVals
    this.allowedKeyTypes = new Set(["string", "number", "undefined"])
  }

  getFxn(subterm, symbols, input) {
		if (this.Tree.reservedOpts.includes(subterm)) return
    if (input.keyTokens.skip) {
    	this["#"](subterm, input)
    }
    else if (input.keyTokens.subs in this.Tree.valueFiller) {
	  	const subsFxn = this.Tree.valueFiller[input.keyTokens.subs](subterm, input)
	  	if (!subsFxn) {
	  		input.errors.push(["key", "UNSUPPORTED-KEY-SUBSTITUTION"])
	  		return
	  	}
	  	const conv = input.keyTokens.conv ? input.keyTokens.conv : "''"
	  	if (this[conv]) {
	  		return this[conv](subsFxn, input)
	  	}
	  	else {
	  		input.errors.push(["key", "UNSUPPORTED-KEY-CONVERSION"])
	  		return
	  	}
	  }
    else if (symbols in this) {
      return this[symbols](subterm, input)
    }
    else {
      input.errors.push(["key", "UNSUPPORTED-KEY-SYMBOL"])
    } 
  }

  getAllowedKeys(keys, row, input, context) {
  	if (!Array.isArray(keys)) {
  		context.errors.push(["key", "ERR-NON-ARRAY-KEYS", row])
  		return []
    }
  	const allowed = []
		for(const key of keys) {
  		if (!this.ignoredVals.includes(key)) {
  			if (!this.allowedKeyTypes.has(typeof key)) {
	      	context.errors.push([input, "INVALID-RESULT-KEY", row])
	    	}
	    	else {
	   			allowed.push(key)
	   		}
	   	}
	  }
		return allowed
	}
}

KeyFiller.prototype["''"] = function(subsFxn, input) {
  return (row, context) => {
  	return this.getAllowedKeys([subsFxn(row, context)], row, input, context)
  }
}
    
KeyFiller.prototype["()"] = function(subsFxn, input) {
	return (row, context) => {
  	return this.getAllowedKeys([subsFxn(row, context)], row, input, context)
  }
}

KeyFiller.prototype["[]"] = function(subsFxn, input) {
	return (row, context) => {
  	return this.getAllowedKeys(subsFxn(row, context), row, input, context)
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
