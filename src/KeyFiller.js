export default class KeyFiller { 
  constructor(Pj) {
    this.Pj = Pj
    this.allowedKeyTypes = new Set(["string", "number"])
  }

  getFxn(input, ignore) {  	
		const [convFxn, tokens] = this.Pj.converter.default(this.Pj, input, ignore, input.term)
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

KeyFiller.prototype[""] = function(fxn, input) {
  return (row, context) => {
  	return this.getAllowedKeys([fxn(row, context)], row, input, context)
  }
}
    
KeyFiller.prototype["()"] = KeyFiller.prototype[""]

KeyFiller.prototype["[]"] = function(fxn, input) {
	return (row, context) => {
  	return this.getAllowedKeys(fxn(row, context), row, input, context)
  }
}

KeyFiller.prototype["(]"] = KeyFiller.prototype["[]"]
