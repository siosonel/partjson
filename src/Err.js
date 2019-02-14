class Err {
	constructor() {
    this.errors = new Set()
    this.errorMessages = Object.create(null)
    
    this.errorMessages["template"] = {
      "key": "Invalid template key.",
      "value": "Invalid template value.",
      "array-value": "Unsupported template array value."
    }

    this.errorMessages["key"] = {
      "subs": 
      	"Substituted key values must be a string, number, or undefined."
    }

    this.errorMessages["val"] = {
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
  }

  add(info) {
  	this.errors.add(info)
  }

  log() {
    const log = Object.create(null)
    for(const e of this.errors) {
      const [type, subtype, lineage, row] = e
      let  message = this.errorMessages[type][subtype]
      if (!message) message = 'Error '+ type + ":" + subtype 
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
    if (Object.keys(log).length) {
      console.log(log)
    }
  }
}