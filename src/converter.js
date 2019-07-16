export default function converter(Filler, input, ignore, val) {
  const [subterm, symbols, tokens] = parseTerm(Filler, val)
  if (Filler.reserved.opts.includes(subterm)) return []

  const subconv = subterm + tokens.conv
  input.ignore = subconv in ignore ? ignore[subconv] : ignore["@"]
  if (tokens.skip && tokens.skip != "~") {
    subs[tokens.skip](Filler, subterm, input)
    return []
  }
  if (tokens.subs in subs) {
    const subsFxn = subs[tokens.subs](Filler, subterm, input)
    if (!subsFxn) return []
    const convFxn = conv[tokens.conv](subsFxn, input, tokens)
    return [convFxn, tokens]
  }
  input.errors.push(["val", "UNSUPPORTED-SYMBOL-" + tokens.subs])
  return []
}

/*** the heart of the code ***/
export function parseTerm(Filler, term) {
  const skip = Filler.skipSymbols.includes(term[0]) ? term[0] : ""
  const colons = term.slice(skip.length, skip.length + 3)
  const time = Filler.timeSymbols.includes(colons) ? colons : ""
  const start = skip.length + time.length
  const prefix = term[start]
  const suffix = term.slice(-2)
  const aggr =
    Filler.aggrSymbols.includes(prefix) && prefix != term ? prefix : ""
  const conv =
    Filler.convSymbols.includes(suffix) && suffix != term ? suffix : ""
  const subterm =
    aggr && conv
      ? term.slice(start + 1, -2)
      : aggr
      ? term.slice(start + 1)
      : conv
      ? term.slice(start, -2)
      : skip || time
      ? term.slice(start)
      : term
  const subs = Filler.subsSymbols.includes(subterm[0]) ? subterm[0] : ""
  const symbols = aggr + subs + conv
  const stem = subs ? subterm.slice(1) : subterm
  const tokens = { skip, time, aggr, subs, stem, conv, subterm }
  return [subterm, symbols, tokens, Filler.steps.indexOf(time)]
}

export const subs = {
  "#": function(Filler, subterm, input) {
    if (!Filler.commentedTerms.has(input)) {
      Filler.commentedTerms.set(input, [])
    }
    Filler.commentedTerms.get(input).push(subterm)
  },
  "*": function(Filler, subterm, input) {
    Filler.focusTemplate[input.term.slice(1)] = input.templateVal
  },
  "": function(Filler, subterm, input) {
    return Filler.valFiller.isNumeric(subterm) ? () => +subterm : () => subterm
  },
  $: function(Filler, subterm, input) {
    if (subterm == "$" || subterm == "$" + Filler.delimit) {
      return row => row
    } else if (subterm.includes(Filler.delimit)) {
      const nestedProps = subterm.slice(1).split(Filler.delimit)
      if (nestedProps[0] == "") nestedProps.shift()
      const reducer = (d, k) => (d ? d[k] : undefined)
      return row => nestedProps.reduce(reducer, row)
    } else {
      const prop = subterm.slice(1)
      return row => row[prop]
    }
  },
  "=": function(Filler, subterm, input) {
    const nestedProps = subterm.slice(1).split(Filler.delimit)
    const reducer = (d, k) => (d && k in d ? d[k] : undefined)
    const prop = nestedProps.reduce(reducer, Filler.opts["="])
    if (!prop) {
      input.errors.push(["val", "MISSING-EXTERNAL-SUBS"])
      return
    }
    return row => prop
  },
  "@": function(Filler, subterm, input) {
    if (Filler.reserved.opts.includes(subterm)) return
    if (subterm == "@" || subterm == "@" + Filler.delimit) {
      return (row, context) => context.self
    } else if (subterm.includes(Filler.delimit)) {
      const nestedProps = subterm.split(Filler.delimit)
      const reducer = (resultContext, d) => {
        if (
          d[0] == "@" &&
          d.length > 1 &&
          !Filler.reserved.contexts.includes(d)
        ) {
          input.errors.push([
            "val",
            "UNRECOGNIZED-CONTEXT-" + subterm,
            input.lineage.join(".") + "." + d
          ])
          return [null, null]
        }
        const [result, context] = resultContext
        return !result || !d
          ? [null, null]
          : d == "@"
          ? [context.self, context]
          : d == "@values"
          ? [Object.values(result), context]
          : d[0] == "@"
          ? [context[d.slice(1)], Filler.contexts.get(context[d.slice(1)])]
          : [result[d], Filler.contexts.get(result[d])]
      }
      return (row, context) =>
        nestedProps.reduce(reducer, [context.self, context])[0]
    } else if (!Filler.reserved.contexts.includes(subterm)) {
      input.errors.push(["val", "UNRECOGNIZED-CONTEXT-" + subterm])
    } else {
      const prop = subterm.slice(1)
      return (row, context) => context[prop]
    }
  },
  "&": function(Filler, subterm, input) {
    const nestedProps = subterm.slice(1).split(Filler.delimit)
    const alias = nestedProps.shift()
    if (!nestedProps.length) {
      return () => Filler.joins.get(alias)
    } else if (nestedProps.length == 1) {
      const prop = nestedProps[0]
      return () => {
        const join = Filler.joins.get(alias)
        return join ? join[prop] : null
      }
    } else {
      const reducer = (d, k) => (d ? d[k] : null)
      const join = Filler.joins.get(alias)
      return row => nestedProps.reduce(reducer, Filler.joins.get(alias))
    }
  }
}

export const conv = {
  "": function(subsFxn, input, tokens) {
    return subsFxn
  },
  "()": function(subsFxn, input, tokens) {
    if (tokens.subs == "=") {
      const fxn = subsFxn()
      if (typeof fxn !== "function") {
        input.errors.push([
          "val",
          "NOT-A-FUNCTION",
          tokens.subs + tokens.term + tokens.conv
        ])
        return
      }
      return fxn
    } else {
      return (row, context) => {
        const fxn = subsFxn(row, context)
        if (typeof fxn !== "function") {
          input.errors.push(["val", "NOT-A-FUNCTION", row])
          return
        }
        return fxn(row, context)
      }
    }
  }
}
conv["[]"] = conv[""]
conv["(]"] = conv["()"]
