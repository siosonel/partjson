export default class Err {
	constructor() {
    this.errors = new Set()
    this.resultLog = Object.create(null)
    this.quiet = false
  }

  clear() {
  	this.errors.clear()
    this.resultLog = Object.create(null)
  }

  log(fillers) {
  	if (Object.keys(this.resultLog).length) {
      console.log(this.resultLog)
    }
  }

  markErrors(result, context) { 
  	if (!context) return;
  	const log = this.resultLog
  	for(const term in context.filler.inputs) {
  		const input = context.filler.inputs[term]
			for(const err of input.errors) {
				const [type, message, row] = err
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
	      	else if (typeof input.templateVal == "string")  {
	      		result[input.term] = "{{ " + message + " }} " + input.templateVal
	      	}
	      	else {
	      		result[input.term] = "{{ " + message + " }} "
	      	}
	      }
			}
  	}

  	if (context.errors.length) {
  		const log = {}
  		result["@errors"] = log  		
  		for(const err of context.errors) {
  			const [input, message, row] = err
  			const key = "{{ " + message + " }} " + input.term
  			if (!(key in log)) log[key] = 0
	      log[key] += 1
  		}
  	}
  }
}