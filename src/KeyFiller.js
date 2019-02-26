export default class KeyFiller { 
  constructor(Tree) {
    this.Tree = Tree
    this.allowedKeyTypes = new Set(["string", "number"])
  }

  getFxn(subterm, symbols, input, ignore) {  	
		const [convFxn, tokens] = this.Tree.converter.default(this.Tree, input, ignore, input.term)
		if (!convFxn) return
  	return this[tokens.conv](convFxn, input)
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

KeyFiller.prototype[""] = function(fxn, input) {
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
