class Err {
	constructor() {
    this.errors = new Set()
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

  log() {
    const log = Object.create(null)
    for(const e of this.errors) {
      const [type, subtype, lineage, row] = e
      let  message = this.messages[type][subtype]
      if (!message) message = 'Error '+ type + ": " + subtype 
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