export default function converter(Filler, input, ignore, val) { 
  const [subterm, symbols, tokens] = parseTerm(Filler, val)
  if (Filler.reservedOpts.includes(subterm)) return []
  
  const subconv = subterm + tokens.conv
  input.ignore = subconv in ignore ? ignore[subconv] : ignore["@"]
  if (tokens.subs in subs) {
  	const subsFxn = subs[tokens.subs](Filler, subterm, input)
  	const convFxn = conv[tokens.conv](subsFxn, input)
  	return [convFxn, tokens]
  }
  input.errors.push(['val', 'UNSUPPORTED-SYMBOL-'+ token.subs])
  return []
}

/*** the heart of the code ***/
export function parseTerm(Filler, term) {
	const skip = Filler.skipSymbols.includes(term[0]) ? "#" : ""
	const colons = term.slice(0,3)
	const time = Filler.timeSymbols.includes(colons) ? colons : "";
	const start = skip.length + time.length
  const prefix = term[start]
  const suffix = term.slice(-2)
  const aggr = Filler.aggrSymbols.includes(prefix) ? prefix : ""
  const conv = Filler.convSymbols.includes(suffix) ? suffix : ""
  const subterm = aggr && conv 
    ? term.slice(start + 1, -2)
    : aggr 
      ? term.slice(start + 1)
      : conv 
        ? term.slice(start, -2)
        : time 
        	? term.slice(start)
        	: term;
  const subs = Filler.subsSymbols.includes(subterm[0]) ? subterm[0] : ""
  const symbols = skip ? skip : aggr + subs + conv
  const stem = subs ? subterm.slice(1) : subterm
  const tokens = {skip, time, aggr, subs, stem, conv, subterm}
  return [subterm, symbols, tokens, Filler.steps.indexOf(time)]
}

export const subs = {
	"#": function(Filler, subterm, input) {
		if (!Filler.commentedTerms.has(input)) {
			Filler.commentedTerms.set(input, {
				keys: new Set(),
				values: new Set()
			})
		}
	  Filler.commentedTerms.get(input).values.add(subterm)
	},
	"": function(Filler, subterm, input) {
	  return Filler.isNumeric(subterm) 
	    ? () => +subterm
	    : () => subterm
	},
	"$": function(Filler, subterm, input) {
	  if (subterm == "$" || subterm == "$" + Filler.userDelimit) {
	  	return (row) => row
	  }
	  else if (subterm.includes(Filler.userDelimit)) {
	  	const nestedProps = subterm.slice(1).split(Filler.userDelimit)
	  	if (nestedProps[0] == "") nestedProps.shift()
	    const reducer = (d,k) => d ? d[k] : null
	    return (row) => nestedProps.reduce(reducer, row)
	  }
	  else {
		  const prop = subterm.slice(1)
		  return (row) => row[prop]
		}
	},
	"=": function(Filler, subterm, input) {
	  const nestedProps = subterm.slice(1).split(Filler.treeDelimit)
	  const reducer = (d,k) => d && k in d ? d[k] : null
	  const prop = nestedProps.reduce(reducer, Filler.opts["="])
	  if (!prop) {
	  	input.errors.push(["val", "MISSING-EXTERNAL-SUBS"])
	  	return
	  }
	  return (row) => prop
	},
	"@": function(Filler, subterm, input) {
		if (Filler.reservedOpts.includes(subterm)) return
	  if (subterm == "@" || subterm == "@" + Filler.treeDelimit) {
	  	return (row, context) => context.self
	  }
	  else if (subterm.includes(Filler.treeDelimit)) {
	  	const nestedProps = subterm.split(Filler.treeDelimit)
	    const reducer = (resultContext, d) => {
	    	if (d[0] == "@" && d.length > 1 && !Filler.reservedContexts.includes(d)) {
	    		input.errors.push(["val", "UNRECOGNIZED-CONTEXT", input.lineage.join(".")+"."+d])
	    		return [null, null]
	    	}
	    	const [result, context] = resultContext
	     	return !result || !d 
	    		? [null, null]
	    		: d == "@"
	    			? [context.self, context]
	    			: d[0] == "@"
	    				? [context[d.slice(1)], Filler.contexts.get(context[d.slice(1)])]
	    				: !result
	    					? [null, null]
	    					: [result[d], Filler.contexts.get(result[d])]
	    }
	  	return (row, context) => nestedProps.reduce(reducer, [context.self, context])[0]
	  }
	  else if (!Filler.reservedContexts.includes(subterm)) {
	  	input.errors.push(["val", "UNRECOGNIZED-CONTEXT"])
	  }
	  else { 
		  const prop = subterm.slice(1)
		  return (row, context) => context[prop]
		}
	},
	"&": function(Filler, subterm, input) {
	  const nestedProps = subterm.slice(1).split(Filler.userDelimit)
	  const alias = nestedProps.shift()
	  if (!nestedProps.length) {
	  	return () => Filler.joins.get(alias)
	  }
	  else if (nestedProps.length == 1) {
	  	const prop = nestedProps[0]
	  	return () => {
		  	const join = Filler.joins.get(alias)
		  	return join ? join[prop] : null
		  }
	  }
	  else {
	  	const reducer = (d,k) => d ? d[k] : null
	  	const join = Filler.joins.get(alias)
	    return (row) => nestedProps.reduce(reducer, Filler.joins.get(alias))
	  }
	}
}

export const conv = {
	"": function(subsFxn, input) {
		return subsFxn
	},
	"()": function(subsFxn, input) {
		return (row, context) => {
			const fxn = subsFxn(row, context)
			if (typeof fxn !== "function") {
				input.errors.push(["val", "NOT-A-FUNCTION", row])
				return
			}
			return fxn
		} 
	}
}
conv["[]"] = conv[""]
conv["(]"] =  conv["()"]
