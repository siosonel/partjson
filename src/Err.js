class Err {
	constructor() {
    this.errors = new Set()
    this.resultLog = Object.create(null)
    this.quiet = false
    this.messages = Object.create(null)

    this.messages[""] = {}

    this.messages["template"] = {
      "key": "Invalid template key.",
      "value": "Invalid template value.",
      "array-value": "Unsupported template array value."
    }

    this.messages["key"] = {
      "subs": 
      	"Substituted key values must be a string, number, or undefined."
    }

    this.messages["val"] = {
    	"non-numeric-incr": 
      	"A numeric value is required for increment.",
      "non-numeric-than": 
      	"A numeric value is required for minimum or maximum aggregation.",
      "non-array": 
      	"Converted array-split value must be an array."
    }
  }

  clear() {
  	this.errors.clear()
    this.resultLog = Object.create(null)
  }

  add(info) {
  	this.errors.add(info)
  }

  getKeys(title, subterm, input) {
  	this.errors.add(["", title, input.lineage])
  	return this.quiet ? [] : ["{{ " + title + " }} " + subterm]
  }

  setStdVal(title, subterm, input) {
  	this.errors.add(["", title, input.lineage])
  	return this.quiet ? null : (row, key, result) => {
  		if (!(key in result)) result[key] = "{{ " + title + " }} " + subterm
  	}
  }

  setArrVal(row, key, result, title, subterm, input) {
  	this.errors.add(["", title, [...input.lineage, subterm], row])
  	if (this.quiet) return
		if (!(key in result)) result[key] = []
		result[key].push("{{ " + title + " }} " + subterm)
	}

  getArrValFxn(title, subterm, input) {
  	this.errors.add(["", title, input.lineage])
  	return this.quiet ? null : (row, key, result) => {
  		if (!(key in result)) result[key] = [
  			"{{ " + title + " }} " + subterm
  		]
  	}
  }

  log(fillers) {
    const log = Object.create(null)
    /*
    for(const e of this.errors) {
      const [type, subtype, lineage, row] = e
      let  message = this.messages[type][subtype]
      if (!message) message = (type ? "Error "+ type + ": " : "") + subtype 
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
  	*/
  	
    for(const templateFiller of fillers) { //console.log(filler)
    	const [template, filler] = templateFiller
    	for(const term in filler.inputs) {
    		const input = filler.inputs[term]
  			for(const e of input.errors) {
  				const [type, message, row] = e
  				if (!(message in log)) {
		        log[message] = Object.create(null)
		      }
		      const key = JSON.stringify(input.lineage)
		      if (!(key in log[message])) {
		        log[message][key] = row ? [] : 0
		      }
		      if (row) log[message][key].push(row)
		      else log[message][key] += 1
  			}
    	}
    }

    if (Object.keys(log).length) {
      //console.log(log)
    }


  	if (Object.keys(this.resultLog).length) {
      console.log(this.resultLog)
    }
  }

  markErrors(result, context) {
  	const log = this.resultLog
  	for(const term in context.filler.inputs) {
  		const input = context.filler.inputs[term]
			for(const e of input.errors) {
				const [type, message, row] = e
				if (!(message in log)) {
	        log[message] = Object.create(null)
	      }
	      const key = JSON.stringify(input.lineage)
	      if (!(key in log[message])) {
	        log[message][key] = row ? [] : 0
	      }
	      if (row) log[message][key].push(row)
	      else log[message][key] += 1

	      if (type == "key") {
	      	result["{{ " + message + " }} " + input.term] = input.templateVal
	      }
	      else if (type == "val") {
	      	if (Array.isArray(input.templateVal)) {
	      		result[input.term] = ["{{ " + message + " }} ", ...input.templateVal]
	      	}
	      }
			}
  	}
  }
}