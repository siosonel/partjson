(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.Parjson = factory());
}(this, (function () { 'use strict';

  class KeyFiller { 
    constructor(Tree) {
      this.Tree = Tree;
      this.ignoredVals = Tree.opts.ignoredVals;
      this.allowedKeyTypes = new Set(["string", "number", "undefined"]);
    }

    getFxn(subterm, symbols, input) {
  		if (this.Tree.reservedOpts.includes(subterm)) return
      if (input.keyTokens.skip) {
      	this["#"](subterm, input);
      }
      else if (input.keyTokens.subs in this.Tree.valueFiller) {
  	  	const subsFxn = this.Tree.valueFiller[input.keyTokens.subs](subterm, input);
  	  	if (!subsFxn) {
  	  		input.errors.push(["key", "UNSUPPORTED-KEY-SUBSTITUTION"]);
  	  		return
  	  	}
  	  	const conv = input.keyTokens.conv ? input.keyTokens.conv : "''";
  	  	if (this[conv]) {
  	  		return this[conv](subsFxn, input)
  	  	}
  	  	else {
  	  		input.errors.push(["key", "UNSUPPORTED-KEY-CONVERSION"]);
  	  		return
  	  	}
  	  }
      else if (symbols in this) {
        return this[symbols](subterm, input)
      }
      else {
        input.errors.push(["key", "UNSUPPORTED-KEY-SYMBOL"]);
      } 
    }

    getAllowedKeys(keys, row, input, context) {
    	if (!Array.isArray(keys)) {
    		context.errors.push(["key", "ERR-NON-ARRAY-KEYS", row]);
    		return []
      }
    	const allowed = [];
  		for(const key of keys) {
    		if (!this.ignoredVals.includes(key)) {
    			if (!this.allowedKeyTypes.has(typeof key)) {
  	      	context.errors.push([input, "INVALID-RESULT-KEY", row]);
  	    	}
  	    	else {
  	   			allowed.push(key);
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
  };
      
  KeyFiller.prototype["()"] = function(subsFxn, input) {
  	return (row, context) => {
    	return this.getAllowedKeys([subsFxn(row, context)], row, input, context)
    }
  };

  KeyFiller.prototype["[]"] = function(subsFxn, input) {
  	return (row, context) => {
    	return this.getAllowedKeys(subsFxn(row, context), row, input, context)
    }
  };

  KeyFiller.prototype["#"] = function(subterm, input) {
  	if (!this.Tree.commentedTerms.has(input)) {
  		this.Tree.commentedTerms.set(input, {
  			keys: new Set(),
  			values: new Set()
  		});
  	}
    this.Tree.commentedTerms.get(input).keys.add(subterm);
  };

  class ValueFiller {
    constructor(Tree) {
      this.Tree = Tree;
      this.ignoredVals = this.Tree.opts.ignoredVals;
    }

    getFxn(input, ignoredVals) {
    	if (typeof input.templateVal=='string') {
        return this.getStringFiller(input, ignoredVals)
      }
      else if (Array.isArray(input.templateVal)) {
        return this.getArrayFiller(input, ignoredVals)
      }
      else if (input.templateVal && typeof input.templateVal == 'object') {
        return this.getObjectFiller(input)
      }
      else {
        return (row, key, result) => {
        	result[key] = input.templateVal;
        }
      }
    }

    getStringFiller(input, ignoredVals) {
      const [subterm, symbols, tokens] = this.Tree.parseTerm(input.templateVal);
      const subconv = subterm + tokens.conv;
      input.ignoredVals = subconv in ignoredVals ? ignoredVals[subconv] : ignoredVals["@"];
      const subsToken = tokens.skip ? symbols : tokens.subs;
      if (subsToken in this) {
      	const subsFxn = this[subsToken](subterm, input);
      	if (subsFxn) {
        	const conv = tokens.conv ? tokens.conv : "''";
        	return this[tokens.aggr + conv] ? this[tokens.aggr + conv](subsFxn, input) : null
        }
      }
      else {
        input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE-SYMBOL']);
      }
    }

    getArrayFiller(input, ignoredVals) { 
      if (!input.templateVal[0]) {
      	return (row, key, result) => {
      		result[key] = input.templateVal;
      	}
      }
      else if (typeof input.templateVal[0] == 'string') {
        const [subterm, symbols, tokens] = this.Tree.parseTerm(input.templateVal[0]);
      	const subconv = subterm + tokens.conv;
      	input.ignoredVals = subconv in ignoredVals ? ignoredVals[subconv] : ignoredVals["@"];
        const subsToken = tokens.skip ? symbols : tokens.subs;
        if (subsToken in this) {
        	const subsFxn = this[subsToken](subterm, input);
        	if (subsFxn) {
        		const conv = tokens.conv ? tokens.conv : "''";
        		return this["["+ conv +"]"](subsFxn, input)
        	}
        }
  	    else {
  	      input.errors.push(['val', 'UNSUPPORTED-TEMPLATE-VALUE-SYMBOL']);
  	    }
      }
      else if (Array.isArray(input.templateVal[0])) {
      	return this["[[,]]"](input.templateVal[0], input)
      }
      else if (input.templateVal[0] && typeof input.templateVal[0] == 'object') {
        return this["[{}]"](input.templateVal[0], input)
      }
      else {
      	input.errors.push("val", "UNSUPPORTED-TEMPLATE-VALUE");
      }
    }

    getObjectFiller(input) {
    	this.Tree.parseTemplate(input.templateVal, input.inheritedIgnored, input.lineage);
      return (row, key, result) => {
        if (!(key in result)) {
          result[key] = this.Tree.getEmptyResult(key, result);
        }
        const context = this.Tree.contexts.get(result[key]);
        this.Tree.processRow(row, input.templateVal, result[key]);
      }
    }

    isNumeric(d) {
      return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
    }
  }

  ValueFiller.prototype["#"] = function(subterm, input) {
  	if (!this.Tree.commentedTerms.has(input)) {
  		this.Tree.commentedTerms.set(input, {
  			keys: new Set(),
  			values: new Set()
  		});
  	}
    this.Tree.commentedTerms.get(input).values.add(subterm);
  };

  /* Substitution Functions */
  ValueFiller.prototype[""] = function(subterm, input) {
    return this.isNumeric(subterm) 
      ? () => +subterm
      : () => subterm
  };

  ValueFiller.prototype["$"] = function(subterm, input) {
    if (subterm == "$" || subterm == "$" + this.Tree.userDelimit) {
    	return (row) => row
    }
    else if (subterm.includes(this.Tree.userDelimit)) {
    	const nestedProps = subterm.slice(1).split(this.Tree.userDelimit);
    	if (nestedProps[0] == "") nestedProps.shift();
      const reducer = (d,k) => d ? d[k] : null;
      return (row) => nestedProps.reduce(reducer, row)
    }
    else {
  	  const prop = subterm.slice(1);
  	  return (row) => row[prop]
  	}
  };

  ValueFiller.prototype["="] = function(subterm, input) {
    const nestedProps = subterm.slice(1).split(this.Tree.treeDelimit);
    const reducer = (d,k) => d && k in d ? d[k] : null;
    const fxn = nestedProps.reduce(reducer, this.Tree.opts["="]);
    if (!fxn) {
    	input.errors.push(["val", "ERR-MISSING-FXN"]);
    }
    else {
    	return fxn //do not call yet
    }
  };

  ValueFiller.prototype["@"] = function(subterm, input) {
  	if (this.Tree.reservedOpts.includes(subterm)) return
    if (subterm == "@" || subterm == "@" + this.Tree.treeDelimit) {
    	return (row, context) => context.self
    }
    else if (subterm.includes(this.Tree.treeDelimit)) {
    	const nestedProps = subterm.split(this.Tree.treeDelimit);
      const reducer = (resultContext, d) => {
      	const [result, context] = resultContext;
       	return !result || !d 
      		? null
      		: d == "@"
      			? [context.self, context]
      			: d[0] == "@"
      				? [context[d.slice(1)], this.Tree.contexts.get(context[d.slice(1)])]
      				: !result
      					? [null, null]
      					: [result[d], this.Tree.contexts.get(result[d])]
      };
      return (row, context) => {
      	return nestedProps.reduce(reducer, [context.self, context])[0]
      }
    }
    else {
  	  const prop = subterm.slice(1);
  	  return (row, context) => context[prop]
  	}
  };

  ValueFiller.prototype["&"] = function(subterm, input) {
    const nestedProps = subterm.slice(1).split(this.Tree.userDelimit);
    const alias = nestedProps.shift();
    if (!nestedProps.length) {
    	return () => this.Tree.joins.get(alias)
    }
    else if (nestedProps.length == 1) {
    	const prop = nestedProps[0];
  	  return () => {
  	  	const join = this.Tree.joins.get(alias);
  	  	return join ? join[prop] : null
  	  }
    }
    else {
    	const reducer = (d,k) => d ? d[k] : null;
    	const join = this.Tree.joins.get(alias);
      return (row) => nestedProps.reduce(reducer, this.Tree.joins.get(alias))	 
    }
  };

  /* No aggregation */
  ValueFiller.prototype["''"] = function(subsFxn, input) {
   	return (row, key, result, context) => {
   		const value = subsFxn(row, context);
   		if (input.ignoredVals(value, key, row)) return
   		result[key] = value;
   	}
  };

  ValueFiller.prototype["()"] = ValueFiller.prototype["''"];

  ValueFiller.prototype["[]"] = ValueFiller.prototype["''"];

  /* Aggregation into an array or set collection */
  ValueFiller.prototype["['']"] = function(subsFxn, input) {
    const option = input.templateVal[1] ? input.templateVal[1] : "";
    if (!option || option != "distinct") {
  		return (row, key, result, context) => {
  	  	if (!(key in result)) result[key] = [];
  	  	const value = subsFxn(row, context);
   			if (input.ignoredVals(value, key, row, context)) return
  	  	result[key].push(value);
  	  }
  	}
  	else {
  		return (row, key, result, context) => {
  	  	if (!(key in result)) result[key] = new Set();
  	 		const value = subsFxn(row, context);
  	 		if (input.ignoredVals(value, key, row, context)) return
  	  	result[key].add(value);
  	  }
  	}
  };

  ValueFiller.prototype["[()]"] = ValueFiller.prototype["['']"];

  ValueFiller.prototype["[[]]"] = function(subsFxn, input) {
    const option = input.templateVal[1] ? input.templateVal[1] : "";
    if (!option || option != "distinct") {
  		return (row, key, result, context) => {
  	    const values = subsFxn(row, context);
  	    if (!Array.isArray(values)) {
  	    	context.errors.push([input, "ERR-NON-ARRAY-VALS", row]);
  	    }
  	    else {
  	    	if (!(key in result)) result[key] = [];
  	    	for(const value of values) {
  			 		if (input.ignoredVals(value, key, row, context)) return
  		    	result[key].push(...values);
  		    }
  	    }
  	  }
  	}
  	else {
  		return (row, key, result, context) => {
  	    const values = subsFxn(row, context);
  	    if (!Array.isArray(values)) {
  	    	context.errors.push([input, "ERR-NON-ARRAY-VALS", row]);
  	    }
  	    else {
  	    	if (!(key in result)) result[key] = new Set();
  	    	for(const value of values) {
  			 		if (input.ignoredVals(value, key, row, context)) return
  	    		result[key].add(value);
  	    	}
  	    }
  	  }
  	}
  };

  ValueFiller.prototype["[{}]"] = function (template, input) {
    this.Tree.parseTemplate(template, input.inheritedIgnored, input.lineage);
    const filler = this.Tree.fillers.get(template);
    return (row, key, result) => {
      if (!(key in result)) {
      	result[key] = this.Tree.getEmptyResult(key, result, true);
      }
      const item = this.Tree.getEmptyResult(result[key].length, result);
      this.Tree.processRow(row, template, item);
      result[key].push(item);
    }
  };

  ValueFiller.prototype["[[,]]"] = function (templates, input) {
    const fillers = [];
    for(const templateVal of templates) {
    	const inputCopy = Object.assign({}, input, {templateVal});
    	fillers.push(this.getFxn(inputCopy, input.inheritedIgnored));
    }
    const option = input.templateVal[1] ? input.templateVal[1] : "";
    if (!option || option != "map") {
  	  return (row, key, result) => {
  	  	if (!(key in result)) result[key] = [];
  	  	const items = [];
  	  	for(const i in fillers) {
  	  		fillers[+i](row, +i, items);
  	  	}
  	  	result[key].push(items);
  	  }
  	}
  	else {
  		return (row, key, result) => {
  	  	if (!(key in result)) result[key] = new Map();
  	  	const temp = [];
  	  	fillers[0](row, 0, temp);
  	  	if (result[key].has(temp[0])) {
  	  		temp[1] = result[key].get(temp[0]);
  	  	}
  	  	fillers[1](row, 1, temp);
  	  	result[key].set(temp[0], temp[1]);
  	  }
  	}
  };

  /* Operator aggregation */
  ValueFiller.prototype["+''"] = function(subsFxn, input) { 
    return (row, key, result, context) => {
      if (!(key in result)) result[key] = 0;
  		const value = subsFxn(row, context);
  		if (input.ignoredVals(value, key, row, context)) return
      result[key] += value;
    }
  };

  ValueFiller.prototype["+()"] = ValueFiller.prototype["+''"]; 

  ValueFiller.prototype["-''"] = function(subsFxn, input) {
    return (row, key, result, context) => {
      if (!(key in result)) result[key] = 0;
  		const value = subsFxn(row, context);
  		if (input.ignoredVals(value, key, row, context)) return
      result[key] -= value;
    }
  };

  ValueFiller.prototype["-()"] = ValueFiller.prototype["-''"];

  ValueFiller.prototype["<''"] = function(subsFxn, input) {
    return (row, key, result, context) => {
      const value = +subsFxn(row, context);
  		if (input.ignoredVals(value, key, row, context)) return
      if (!this.isNumeric(value)) {
        context.errors.push([input, "NON-NUMERIC-THAN", row]);
        return
      }
      if (!(key in result)) {
        result[key] = value;
      }
      else if (result[key] < value) {
        result[key] = value;
      }
    }
  };

  ValueFiller.prototype["<()"] = ValueFiller.prototype["<''"];

  ValueFiller.prototype[">''"] = function(subsFxn, input) {
    return (row, key, result, context) => {
      const value = +subsFxn(row, context);
  		if (input.ignoredVals(value, key, row, context)) return
      if (!this.isNumeric(value)) {
        context.errors.push([input, "NON-NUMERIC-THAN", row]);
        return
      }
      if (!(key in result)) {
        result[key] = value;
      }
      else if (result[key] > value) {
        result[key] = value;
      }
    }
  };

  ValueFiller.prototype[">()"] = ValueFiller.prototype[">''"];

  class Err {
  	constructor() {
      this.errors = new Set();
      this.resultLog = Object.create(null);
      this.quiet = false;
    }

    clear() {
    	this.errors.clear();
      this.resultLog = Object.create(null);
    }

    log(fillers) {
    	if (Object.keys(this.resultLog).length) {
        console.log(this.resultLog);
      }
    }

    markErrors(result, context) { 
    	if (!context) return;
    	const log = this.resultLog;
    	for(const term in context.filler.inputs) {
    		const input = context.filler.inputs[term];
  			for(const err of input.errors) {
  				const [type, message, row] = err;
  				if (!(message in log)) {
  	        log[message] = Object.create(null);
  	      }
  	      const key = JSON.stringify(input.lineage);
  	      if (!(key in log[message])) {
  	        log[message][key] = row ? [] : 0;
  	      }
  	      if (row) log[message][key].push(row);
  	      else log[message][key] += 1;

  	      if (type == "key") {
  	      	result["{{ " + message + " }} " + input.term] = input.templateVal;
  	      }
  	      else if (type == "val") {
  	      	if (Array.isArray(input.templateVal)) {
  	      		result[input.term] = ["{{ " + message + " }} ", ...input.templateVal];
  	      	}
  	      	else if (typeof input.templateVal == "string")  {
  	      		result[input.term] = "{{ " + message + " }} " + input.templateVal;
  	      	}
  	      	else {
  	      		result[input.term] = "{{ " + message + " }} ";
  	      	}
  	      }
  			}
    	}

    	if (context.errors.length) {
    		const log = {};
    		result["@errors"] = log;  		
    		for(const err of context.errors) {
    			const [input, message, row] = err;
    			const key = "{{ " + message + " }} " + input.term;
    			if (!(key in log)) log[key] = 0;
  	      log[key] += 1;
    		}
    	}

    	if (context.filler.errors.length) {
    		if (!result["@errors"]) {
    			result["@errors"] = {};
    		}
    		for(const err of context.filler.errors) {
    			const key = err[1];
    			if (!(key in result['@errors'])) {
    				result['@errors'][key] = [];
    			}
    			result["@errors"][key].push(err.slice(2));
    		}
    	}
    }
  }

  /*
  -------
  Parjson
  -------
  This is a ParJSON template filler. It processes
  rows of data into a well-defined tree of 
  data collections and aggregated results
  that matches the shape of the input template.

  This implementation passes once over all data 
  rows. It is thus suitable for partitioning and 
  aggregating streaming data. It may also be used
  to parallelize data processing. 

  See parjson.html for an example template.

  See parjson.readme.txt for more information
  */

  class Parjson {
    constructor(opts={}) {
      this.defaultOpts = {
        template: {},
        "=": {},
        ignoredVals: []
      };

      this.opts = Object.assign(
        this.defaultOpts,
        opts 
      );

      this.userDelimit = ".";
      this.treeDelimit = ".";
      this.subsSymbols = ["$", "=", "@", "&"];
      this.convSymbols = ["()", "[]"]; //, "{}"]
      this.aggrSymbols = ["+", "-", "<", ">"];
      this.timeSymbols = [":__", "_:_", "__:"];
      this.skipSymbols = ["#"];
      this.reservedOpts = ["@userDelimit", "@treeDelimit"];
      this.reservedFxns = ["@before()", "@after()", "@dist()", "@join()"];
      this.reservedContexts = ["@branch", "@parent", "@root", "@self"];
      this.reservedTerms = [
        ...this.reservedOpts,
        ...this.reservedFxns,
      	...this.reservedContexts
      ];
      this.steps = [":__", "", "_:_"];
      this.errors = new Err(this);
      this.keyFiller = new KeyFiller(this);
      this.valueFiller = new ValueFiller(this);
      this.refresh();
    }

    refresh(opts={}) {
      this.errors.clear();
    	Object.assign(this.opts,opts);
    	if (this.opts.template['@userDelimit']) {
    		this.userDelimit = this.opts.template['@userDelimit'];
    	}
    	if (this.opts.template['@treeDelimit']) {
    		this.treeDelimit = this.opts.template['@treeDelimit'];
    	}
    	
    	//console.clear()
    	delete this.commentedTerms;
    	this.commentedTerms = new WeakMap();

    	delete this.joins;
    	this.joins = new Map();
    	
    	// fillers will track template parsing metadata
    	delete this.fillers;
      this.fillers = new Map();
      
      // contexts will track results object metadata
      delete this.context;
      this.contexts = new WeakMap(); 
      
      delete this.tree;
      this.tree = this.getEmptyResult();
      this.parseTemplate(this.opts.template, {"@": this.falseFxn});

      if (this.opts.data) {
      	this.add(this.opts.data, false);
      }
      this.errors.log(this.fillers);
    }

    parseTemplate(template, inheritedIgnored, lineage=[]) {
      const filler = Object.create(null);
      filler.inputs = Object.create(null);
      filler["@before"] = this.trueFxn;
      filler["@after"] = this.trueFxn;
      filler["__:"] = [];
      filler.errors = [];
      const ignoredVals = this["@ignoredVals"](template, inheritedIgnored, filler);
      filler["@ignoredVals"] = ignoredVals;
      this.fillers.set(template, filler);

      const steps = this.steps.map(d => []);
      for(const term in template) {
        const [subterm, symbols, keyTokens, step] = this.parseTerm(term);
        const templateVal = template[term];
        const input = filler.inputs[term] = {
          term,
          subterm,
          symbols,
          keyTokens,
          templateVal,
          lineage: [...lineage, term],
          inheritedIgnored: ignoredVals,
          errors: []
        };

        if (symbols == "@()") {
        	if (this[subterm]) {
        		filler[subterm] = this[subterm](template[term], input, filler);
        	}
        	else {
        		input.errors.push('key', "UNRECOGNIZED-RESERVED-"+term);
        	}
        }
        else {
  	      input.keyFxn = this.keyFiller.getFxn(subterm, symbols, input);
  	      if (input.keyFxn) {
  	        input.valFxn = this.valueFiller.getFxn(input, ignoredVals);
  	      	if (keyTokens.time == "__:") {
  		      	filler["__:"].push(term);
  		      }
  	      	else {
  	      		steps[step].push(term);
  	      	}
  	      }
  	    }
      }
      filler.steps = steps.filter(d => d.length);
    }

    /*** the heart of the code ***/
    parseTerm(term) {
    	const skip = this.skipSymbols.includes(term[0]) ? "#" : "";
    	const colons = term.slice(0,3);
    	const time = this.timeSymbols.includes(colons) ? colons : "";
    	const start = skip.length + time.length;
      const prefix = term[start];
      const suffix = term.slice(-2);
      const aggr = this.aggrSymbols.includes(prefix) ? prefix : "";
      const conv = this.convSymbols.includes(suffix) ? suffix : "";
      const subterm = aggr && conv 
        ? term.slice(start + 1, -2)
        : aggr 
          ? term.slice(start + 1)
          : conv 
            ? term.slice(start, -2)
            : time 
            	? term.slice(start)
            	: term;
      const subs = this.subsSymbols.includes(subterm[0]) ? subterm[0] : "";
      const symbols = skip ? skip : aggr + subs + conv;
      const stem = subs ? subterm.slice(1) : subterm;
      const tokens = {skip, time, aggr, subs, stem, conv, subterm};
      return [subterm, symbols, tokens, this.steps.indexOf(time)]
    }

    getEmptyResult(branch=null, parent=null, isArray = false) {
    	const result = isArray ? [] : Object.create(null);
    	const context = {
    		branch, // string name where this result will be mounted to the tree
    		parent, 
    		self: result,
    		root: this.tree ? this.tree : result,
    		errors: []
    	};
    	this.contexts.set(result, context);
      return result
    }

    add(rows, refreshErrors = true) {
    	if (refreshErrors) error.clear();
    	this.joins.clear();
      for(const row of rows) {
        this.processRow(row, this.opts.template, this.tree);
        this.joins.clear();
      }
      this.processResult(this.tree);
      if (refreshErrors) this.errors.log();
    }

    processRow(row, template, result) {
    	const context = this.contexts.get(result);
    	const filler = this.fillers.get(template);
    	context.filler = filler;
    	if (!filler["@before"](row, result, context)) return
    	if (filler["@join"] && !filler["@join"](row)) return
    	for(const step of filler.steps) {
  	    for(const term of step) { 
  	      const input = filler.inputs[term]; 
  	      if (input.keyFxn && input.valFxn) {
  	        const keys = input.keyFxn(row, context);
  	        for(const key of keys) {
  	          if (input.valFxn) {
  	          	input.valFxn(row, key, result, context);
  	          }
  	        }
  	      }
  	    }
  	  }
  	  filler["@after"](row, result, context);
  	  if (filler["@dist"]) filler["@dist"](context);
    }

    processResult(result) {
    	const context = this.contexts.get(result);
    	if (context) {
  	  	for(const term of context.filler["__:"]) { 
  	  		const input = context.filler.inputs[term];
  	  		if (input.keyFxn && input.valFxn) {
  	        const keys = input.keyFxn(null, context);
  	        for(const key of keys) {
  	          if (input.valFxn) {
  	          	input.valFxn(null, key, result, context);
  	          }
  	        }
  	      }
  	  	}
  	  }

    	for(const key in result) {
    		if (result[key] instanceof Set) {
    			result[key] = [...result[key]];
    		}
    		else if (result[key] instanceof Map) {
    			result[key] = [...result[key].entries()];
    		}
    		const value = result[key];
    		if (value) {
    			if (Array.isArray(value)) {
    				// assumes all element values will be the same type
    				if (value[0] && typeof value[0] == "object") {
    					for(const v of value) {
    						this.processResult(v);
    					}
    				}
    			}  
    			else if (typeof value == 'object') {
    				const context = this.contexts.get(value);
    				if (context && context["@dist"]) {
    					context["@dist"](value);
    				}
    				this.processResult(value);
    			}
    		}
    	}
    	this.errors.markErrors(result, context);
    }

    trueFxn() {
    	return true
    }

    falseFxn() {
    	return false
    }

    isNumeric(d) {
      return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
    }
  }

  Parjson.prototype["@before"] = function (subterm, input) {
  	const fxn = this.opts["="][subterm.slice(1,-2)];
  	if (!fxn) {
  		input.errors.push(["val", "MISSING-@before-FXN"]);
  		return this.trueFxn
  	}
  	else return fxn
  };

  Parjson.prototype["@after"] = function (subterm, input) {
  	const fxn = this.opts["="][subterm.slice(1,-2)];
  	if (!fxn) {
  		input.errors.push(["val", "MISSING-@after-FXN"]);
  		return this.trueFxn
  	}
  	else return fxn
  };

  Parjson.prototype["@join"] = function (joins, input, filler) {
  	return (row) => {
  		let ok = true;
  		for(const alias in joins) {
  			const fxn = this.opts["="][joins[alias].slice(1,-2)];
  			if (!fxn) {
  				input.errors.push(["val", "MISSING-@join-FXN"]);
  			}
  			else {
  				const keyVals = fxn(row);
  				if (keyVals) this.joins.set(alias, keyVals);
  				else ok = false;
  			}
  		}
  		return ok
  	}
  };

  Parjson.prototype["@dist"] = function (_subterm, input) {
  	const subterm = Array.isArray(_subterm) ? _subterm[0] : _subterm;
  	const subsFxn = this.valueFiller["@"](subterm);
  	return (context) => {
  	  context["@dist"] = (result) => {
  	  	const target = subsFxn(null, context);
  	  	if (!target) {
  	  		context.errors.push([input, "MISSING-DIST-TARGET"]);
  	  	}
  	  	else if (Array.isArray(target)) {
  	  		target.push(result);
  	  	}
  	    else {
  	    	target[subterm] = result;
  	    }
  	  };
    }
  };


  Parjson.prototype["@ignoredVals"] = function (template, inheritedIgnored, filler) {
  	if (!template["@ignoredVals()"]) {
  		return inheritedIgnored
  	}
  	const nonObj = Array.isArray(template["@ignoredVals()"]) 
  		|| typeof template["@ignoredVals()"] == "string";
  	const ignoredVals = nonObj
  		? {"@": template["@ignoredVals()"]}
  		: template["@ignoredVals()"];

  	const fxns = {};
  	for(const term in ignoredVals) {
  		const ignoredVal = ignoredVals[term];
  		if (Array.isArray(ignoredVal)) {
  			fxns[term] = (value) => ignoredVal.includes(value);
  		}
  		else if (typeof ignoredVal == 'string' && ignoredVal[0] == "=") {
  			const fxn = this.opts["="][ignoredVal.slice(1,-2)];
    	  if (!fxn) {
    	  	filler.errors.push(["val", "MISSING-@ignoredVals()-FXN", ignoredVal]);
    	  	fxns[term] = this.falseFxn;
    	  }
    	  else {
    	  	fxns[term] = fxn;
    		}
  		} 
  		else {
  			filler.errors.push(["val", "UNSUPPORTED-@ignoredVals()-VALUE", ignoredVal]);
    	  fxns[term] = this.falseFxn;
  		}
  	}

  	return nonObj ? fxns : Object.assign({}, inheritedIgnored, fxns)
  };

  return Parjson;

})));
