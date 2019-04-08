export default class Reserved {
  constructor(Pj) {
    this.Pj = Pj
    this.opts = ["@delimit", "@errmode"]
    this.contexts = ["@branch", "@parent", "@root", "@self", "@values"]
    this.filters = ["@before()", "@join()", "@ignore()"]
    this.post = ["@after()", "@dist()", "@end()"]
    this.terms = [...this.opts, ...this.contexts, ...this.filters, ...this.post]
  }

  setFxn(subterm, input, filler, templateVal) {
    if (this[subterm]) {
      filler[subterm] = this[subterm](templateVal, input, filler)
    } else {
      input.errors.push("key", "UNRECOGNIZED-RESERVED-" + term)
    }
  }

  trueFxn() {
    return true
  }

  notDefined(value) {
    return typeof value === "undefined"
  }
}

Reserved.prototype["@before"] = function(subterm, input) {
  const fxn = this.Pj.opts["="][subterm.slice(1, -2)]
  if (!fxn) {
    input.errors.push(["val", "MISSING-"+input.term+"-FXN"])
    return this.trueFxn
  } else return fxn
}

Reserved.prototype["@after"] = Reserved.prototype["@before"]
Reserved.prototype["@done"] = Reserved.prototype["@before"]

Reserved.prototype["@join"] = function(joins, input, filler) {
  return row => {
    let ok = true
    for (const alias in joins) {
      const fxnName = joins[alias].slice(1, -2)
      const fxn = this.Pj.opts["="][fxnName]
      if (!fxn) {
        input.errors.push(["val", "MISSING-@join-FXN", fxnName])
      } else {
        const keyVals = fxn(row)
        if (keyVals) this.Pj.joins.set(alias, keyVals)
        else ok = false
      }
    }
    return ok
  }
}

Reserved.prototype["@dist"] = function(_subterm, input) {
  const subterm = Array.isArray(_subterm) ? _subterm[0] : _subterm
  const subsFxn = this.Pj.converter.subs["@"](this.Pj, subterm)
  return context => {
    context["@dist"] = result => {
      const target = subsFxn(null, context)
      if (!target) {
        context.errors.push([input, "MISSING-DIST-TARGET", subterm])
      } else if (Array.isArray(target)) {
        if (!target.includes(result)) {
          target.push(result)
        }
      } else {
        target[subterm] = result
      }
    }
  }
}

Reserved.prototype["@ignore"] = function(template, inheritedIgnore, filler) {
  if (!template["@ignore()"]) {
    return inheritedIgnore
  }
  const nonObj =
    Array.isArray(template["@ignore()"]) ||
    typeof template["@ignore()"] == "string"
  const ignore = nonObj ? { "@": template["@ignore()"] } : template["@ignore()"]

  const fxns = {}
  for (const term in ignore) {
    const ignoreVal = ignore[term]
    if (Array.isArray(ignoreVal)) {
      fxns[term] = value => ignoreVal.includes(value)
    } else if (typeof ignoreVal == "string" && ignoreVal[0] == "=") {
      const fxn = this.Pj.opts["="][ignoreVal.slice(1, -2)]
      if (!fxn) {
        filler.errors.push(["val", "MISSING-@ignore()-FXN", ignoreVal])
        fxns[term] = this.notDefined
      } else {
        fxns[term] = fxn
      }
    } else {
      filler.errors.push(["val", "UNSUPPORTED-@ignore()-VALUE", ignoreVal])
      fxns[term] = this.notDefined
    }
  }

  return nonObj ? fxns : Object.assign({}, inheritedIgnore, fxns)
}
