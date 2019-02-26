export default class KeyFiller { 
  constructor(Tree) {
    this.Tree = Tree
    this.allowedKeyTypes = new Set(["string", "number"])
  }

  getFxn(subterm, symbols, input, ignore) {
		if (this.Tree.reservedOpts.includes(subterm)) return
    if (input.keyTokens.skip) {
    	this["#"](subterm, input)
    }
    else if (input.keyTokens.subs in this.Tree.valFiller) {
	  	const conv = input.keyTokens.conv ? input.keyTokens.conv : "''"
	  	const convFxn = this.Tree.valFiller.getStringFiller(input, ignore, input.term, "key")
	  	if (this[conv]) {
	  		return this[conv](convFxn, input)
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
  		context.errors.push(["key", "NON-ARRAY-KEYS", row])
  		return []
    }
  	const allowed = []
		for(const key of keys) {
  		if (!input.ignore(key)) {
  			if (!this.allowedKeyTypes.has(typeof key)) { console.log([key])
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

KeyFiller.prototype["''"] = function(fxn, input) {
  return (row, context) => {
  	return this.getAllowedKeys([fxn(row, context)], row, input, context)
  }
}
    
KeyFiller.prototype["()"] = function(convFxn, input) {
  return (row, context) => {
  	const fxn = convFxn(row, context)
  	return this.getAllowedKeys([fxn(row, context)], row, input, context)
  }
}

KeyFiller.prototype["[]"] = function(fxn, input) {
	return (row, context) => {
  	return this.getAllowedKeys(fxn(row, context), row, input, context)
  }
}

KeyFiller.prototype["(]"] = function(convFxn, input) {
  return (row, context) => {
  	const fxn = convFxn(row, context)
  	return this.getAllowedKeys(fxn(row, context), row, input, context)
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
