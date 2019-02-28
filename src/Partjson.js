import Reserved from "./Reserved"
import KeyFiller from "./KeyFiller"
import ValFiller from "./ValFiller"
import Err from "./Err"
import * as converter from "./converter"

/*
-------
Partjson
-------
This is a Partjson template filler. It processes
rows of data into a well-defined tree of 
data collections and aggregated results
that matches the shape of the input template.

This implementation passes once over all data 
rows. It is thus suitable for partitioning and 
aggregating streaming data. It may also be used
to parallelize data processing. 

See public/index.html for examples and documentation.
*/

export default class Partjson {
  constructor(opts={}) {
    this.defaultOpts = {
      template: {},
      "=": {}
    }

    this.opts = Object.assign(
      this.defaultOpts,
      opts 
    )

    this.delimit = "."
    this.subsSymbols = ["$", "=", "@", "&"]
    this.convSymbols = ["()", "[]", "(]"] //, "{}", "(}"]
    this.aggrSymbols = ["+", "-", "<", ">"]
    this.timeSymbols = [":__", "_:_", "__:"]
    this.skipSymbols = ["#"]
    this.steps = [":__", "", "_:_"]
    this.errors = new Err(this)
    this.reserved = new Reserved(this)
    this.keyFiller = new KeyFiller(this)
    this.valFiller = new ValFiller(this)
  	
  	this.commentedTerms = new Map()
  	this.joins = new Map()
  	// fillers will track template parsing metadata
    this.fillers = new Map()
    // contexts will track results object metadata
    this.contexts = new Map() 
    this.refresh()
  }

  refresh(opts={}) {
  	Object.assign(this.opts,opts)
    this.errors.clear(this.opts.template["@errmode"])
  	if (this.opts.template['@delimit']) {
  		this.delimit = this.opts.template['@delimit']
  	}  	
    this.commentedTerms.clear()
    this.joins.clear()
    this.fillers.clear()
    this.contexts.clear() 
    
    delete this.tree
    this.tree = this.getEmptyResult()
    this.parseTemplate(this.opts.template, {"@": this.reserved.notDefined})

    if (this.opts.data) {
    	this.add(this.opts.data, false)
    }
    this.errors.log(this.fillers)
  }

  parseTemplate(template, inheritedIgnore, lineage=[]) {
    const filler = Object.create(null)
    filler.inputs = Object.create(null)
    filler["@before"] = this.reserved.trueFxn
    filler["@after"] = this.reserved.trueFxn
    filler["__:"] = []
    filler.errors = []
    const ignore = this.reserved["@ignore"](template, inheritedIgnore, filler)
    filler["@ignore"] = ignore
    this.fillers.set(template, filler)

    const steps = this.steps.map(d => [])
    for(const term in template) {
      const [subterm, symbols, keyTokens, step] = converter.parseTerm(this, term)
      const templateVal = template[term]
      const input = filler.inputs[term] = {
        term,
        subterm,
        symbols,
        keyTokens,
        templateVal,
        lineage: [...lineage, term],
        inheritedIgnore: ignore,
        errors: []
      }

      if (symbols == "@()") {
      	this.reserved.setFxn(subterm, input, filler, templateVal)
      }
      else {
	      input.keyFxn = this.keyFiller.getFxn(subterm, symbols, input, ignore)
	      if (input.keyFxn) {
	        input.valFxn = this.valFiller.getFxn(input, ignore)
	      	if (keyTokens.time == "__:") {
		      	filler["__:"].push(term)
		      }
	      	else {
	      		steps[step].push(term)
	      	}
	      }
	    }
    }
    filler.steps = steps.filter(d => d.length)
  }

  getEmptyResult(branch=null, parent=null, isArray = false) {
  	const result = isArray ? [] : Object.create(null)
  	const context = {
  		branch, // string name where this result will be mounted to the tree
  		parent, 
  		self: result,
  		root: this.tree ? this.tree : result,
  		errors: []
  	}
  	this.contexts.set(result, context)
    return result
  }

  add(rows, refreshErrors = true) {
  	if (refreshErrors) this.errors.clear()
  	this.joins.clear()
    for(const row of rows) {
      this.processRow(row, this.opts.template, this.tree)
      this.joins.clear()
    }
    this.processResult(this.tree)
    if (refreshErrors) this.errors.log()
  }

  processRow(row, template, result) {
  	const context = this.contexts.get(result)
  	const filler = this.fillers.get(template)
  	context.filler = filler
  	if (!filler["@before"](row, context)) return
  	if (filler["@join"] && !filler["@join"](row)) return
  	for(const step of filler.steps) {
	    for(const term of step) { 
	      const input = filler.inputs[term]; 
	      if (input.keyFxn && input.valFxn) {
	        const keys = input.keyFxn(row, context)
	        for(const key of keys) {
	          if (input.valFxn) {
	          	input.valFxn(row, key, result, context)
	          }
	        }
	      }
	    }
	  }
	  filler["@after"](row, context)
	  if (filler["@dist"]) filler["@dist"](context)
	  if (filler["@done"]) context.done = filler["@done"]
  }

  processResult(result) {
  	const context = this.contexts.get(result)
  	this.postLoop(result, context)

  	for(const key in result) {
  		if (result[key] instanceof Set) {
  			result[key] = [...result[key]]
  		}
  		else if (result[key] instanceof Map) {
  			result[key] = [...result[key].entries()]
  		}
  		const value = result[key]
  		if (value) {
  			if (Array.isArray(value)) {
  				// assumes all element values will be the same type
  				if (value[0] && typeof value[0] == "object") {
  					for(const v of value) {
  						this.processResult(v)
  					}
  				}
  			}  
  			else if (typeof value == 'object') {
  				const context = this.contexts.get(value)
  				if (context && context["@dist"]) {
  					context["@dist"](value)
  				}
  				this.processResult(value)
  			}
  		}
  	} 
  	if (context && context.filler) {
  		this.errors.markErrors(result, context);
  	}
  	if (context && context.done) {
  		context.done(result)
  	}
  }

  postLoop(result, context) {
  	if (!context || !context.filler || !context.filler["__:"]) return
  	for(const term of context.filler["__:"]) { 
  		const input = context.filler.inputs[term];
  		if (input.keyFxn && input.valFxn) {
        const keys = input.keyFxn(null, context)
        for(const key of keys) {
          if (input.valFxn) {
          	input.valFxn(null, key, result, context)
          }
        }
      }
  	}
	}
}

Partjson.prototype.converter = converter
