export default class ValFiller {
  constructor(Pj) {
    this.Pj = Pj
  }

  getFxn(input, ignore) {
    const type = this.getValType(input.templateVal)
    return this[type + "Filler"](input, ignore, input.templateVal)
  }

  getValType(val) {
    return typeof val == "string"
      ? "str"
      : Array.isArray(val)
      ? "arr"
      : val && typeof val == "object"
      ? "obj"
      : "default"
  }

  strFiller(input, ignore, val, _aggr) {
    const [convFxn, tokens] = this.Pj.converter.default(
      this.Pj,
      input,
      ignore,
      val
    )
    if (!convFxn) return
    const aggr = (_aggr ? _aggr : tokens.aggr) + "," + tokens.conv
    if (aggr in this) {
      return this[aggr](convFxn, input)
    }
  }

  arrFiller(input, ignore, val) {
    const type = this.getValType(val[0])
    return type == "str"
      ? this.strFiller(input, ignore, val[0], "[]")
      : type == "arr"
      ? this["[[,]]"](val[0], input)
      : type == "obj"
      ? this["[{}]"](val[0], input)
      : this.defaultFiller(input, ignore, val)
  }

  objFiller(input, ignore, val) {
    this.Pj.parseTemplate(val, input.inheritedIgnore, input.lineage)
    return (row, key, result) => {
      this.Pj.setResultContext("{}", key, result)
      this.Pj.processRow(row, val, result[key])
    }
  }

  defaultFiller(input, ignore, val) {
    // copy a template value in order to not share
    // it among results, critical for array or object
    // template values
    const json = JSON.stringify(val)
    return (row, key, result) => {
      result[key] = JSON.parse(json)
    }
  }

  getArrSeed(input) {
    const option =
      input.templateVal && input.templateVal.length > 1
        ? input.templateVal[1]
        : 1
    if (option == "set") {
      return (result, key, value) => {
        if (!(key in result)) result[key] = new Set()
        else if (Array.isArray(result[key])) {
          result[key] = new Set(result[key])
        }
        result[key].add(value)
      }
    } else if (option == 0) {
      return (result, key, value) => {
        if (!(key in result)) result[key] = []
        result[key].push(value)
      }
    } else if (this.isNumeric(option)) {
      const tracker = new Map()
      return (result, key, value) => {
        if (!(key in result)) result[key] = []
        if (!tracker.has(result[key])) {
          tracker.set(result[key], new Map())
        }
        const t = tracker.get(result[key])
        if (!t.has(value)) {
          t.set(value, 0)
        }
        const count = t.get(value)
        if (count < option) {
          result[key].push(value)
          t.set(value, count + 1)
        }
      }
    }
  }

  isNumeric(d) {
    return !isNaN(parseFloat(d)) && isFinite(d) && d !== ""
  }
}

/* NO AGGREGATION */
// no conversion
ValFiller.prototype[","] = function(fxn, input) {
  return (row, key, result, context) => {
    const value = fxn(row, context)
    if (input.ignore(value, key, row)) return
    result[key] = value
  }
}
ValFiller.prototype[",()"] = ValFiller.prototype[","]
ValFiller.prototype[",[]"] = ValFiller.prototype[","]
ValFiller.prototype[",(]"] = ValFiller.prototype[","]

/* AGGREGATION into an Array or Set  */
ValFiller.prototype["[],"] = function(fxn, input) {
  const seed = this.getArrSeed(input)
  if (!seed) {
    input.errors.push(["val", "INVALID-[]-OPTION"])
    return
  }
  return (row, key, result, context) => {
    const value = fxn(row, context)
    if (input.ignore(value, key, row, context)) return
    seed(result, key, value)
  }
}

ValFiller.prototype["[],()"] = ValFiller.prototype["[],"]

ValFiller.prototype["[],[]"] = function(fxn, input) {
  const seed = this.getArrSeed(input)
  return (row, key, result, context) => {
    const values = fxn(row, context)
    if (!Array.isArray(values)) {
      context.errors.push([input, "NON-ARRAY-VALS", row])
      return
    }
    for (const value of values) {
      if (input.ignore(value, key, row, context)) continue
      seed(result, key, value)
    }
  }
}

ValFiller.prototype["[],(]"] = ValFiller.prototype["[],[]"]

ValFiller.prototype["[{}]"] = function(template, input) {
  this.Pj.parseTemplate(template, input.inheritedIgnore, input.lineage)
  const option =
    input.templateVal && input.templateVal.length > 1
      ? input.templateVal[1]
      : ""
  if (!option) {
    return (row, key, result) => {
      this.Pj.setResultContext("[]", key, result)
      const item = this.Pj.setResultContext(
        "{}",
        result[key].length,
        result[key]
      )
      this.Pj.processRow(row, template, item)
    }
  } else if (typeof option == "string") {
    //const subInput = this.Pj.fillers.get(template).inputs[option]
    const valFxn = this.getFxn(
      { templateVal: option, errors: [] },
      input.inheritedIgnore
    )
    const tracker = new Map()
    return (row, key, result) => {
      this.Pj.setResultContext("[]", key, result)
      const temp = []
      valFxn(row, 0, temp)
      const val = temp[0]
      if (tracker.has(val)) {
        this.Pj.processRow(row, template, tracker.get(val))
      } else {
        const item = this.Pj.setResultContext(
          "{}",
          result[key].length,
          result[key]
        )
        tracker.set(val, item)
        this.Pj.processRow(row, template, item)
      }
    }
  } else {
    input.errors.push(["val", "INVALID-[{}]-OPTION"])
  }
}

ValFiller.prototype["[[,]]"] = function(templates, input) {
  const fillers = []
  for (const templateVal of templates) {
    const inputCopy = Object.assign({}, input, { templateVal })
    fillers.push(this.getFxn(inputCopy, input.inheritedIgnore))
  }
  const option = input.templateVal[1] ? input.templateVal[1] : ""
  if (option != "map") {
    return (row, key, result) => {
      if (!(key in result)) result[key] = []
      const items = []
      for (const i in fillers) {
        fillers[+i](row, +i, items)
      }
      result[key].push(items)
    }
  } else {
    return (row, key, result) => {
      if (!(key in result)) {
        result[key] = new Map()
      } else if (!(result[key] instanceof Map)) {
        result[key] = new Map(result[key])
      }
      const temp = []
      fillers[0](row, 0, temp)
      if (result[key].has(temp[0])) {
        temp[1] = result[key].get(temp[0])
      }
      fillers[1](row, 1, temp)
      result[key].set(temp[0], temp[1])
    }
  }
}

/* AGGREGATION by OPERATOR */
ValFiller.prototype["+,"] = function(fxn, input) {
  return (row, key, result, context) => {
    if (!(key in result)) {
      result[key] = 0
    }
    const value = fxn(row, context)
    if (input.ignore(value, key, row, context)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-INCREMENT", row])
      return
    }
    result[key] += +value
  }
}

ValFiller.prototype["+,()"] = ValFiller.prototype["+,"]

ValFiller.prototype["+,[]"] = function(fxn, input) {
  return (row, key, result, context) => {
    if (!(key in result)) {
      result[key] = 0
    }
    const values = fxn(row, context)
    if (!Array.isArray(values)) {
      input.errors.push(["val", "NON-ARRAY-VALS", row])
      return
    }
    for (const value of values) {
      if (input.ignore(value, key, row, context)) continue
      if (!this.isNumeric(value)) {
        context.errors.push([input, "NON-NUMERIC-INCREMENT", row])
        continue
      }
      result[key] += +value
    }
  }
}

ValFiller.prototype["+,(]"] = ValFiller.prototype["+,[]"]

ValFiller.prototype["-,"] = function(fxn, input) {
  return (row, key, result, context) => {
    if (!(key in result)) {
      result[key] = 0
    }
    const value = fxn(row, context)
    if (input.ignore(value, key, row, context)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-DECREMENT", row])
      return
    }
    result[key] += -value
  }
}

ValFiller.prototype["-,()"] = ValFiller.prototype["-,"]

ValFiller.prototype["-,[]"] = function(fxn, input) {
  return (row, key, result, context) => {
    const values = fxn(row, context)
    if (!Array.isArray(values)) {
      input.errors.push(["val", "NON-ARRAY-VALS", row])
      return
    }
    if (!(key in result)) {
      result[key] = 0
    }
    for (const value of values) {
      if (input.ignore(value, key, row, context)) continue
      result[key] += -value
    }
  }
}

ValFiller.prototype["-,(]"] = ValFiller.prototype["-,[]"]

ValFiller.prototype["<,"] = function(fxn, input) {
  return (row, key, result, context) => {
    const value = +fxn(row, context)
    if (input.ignore(value, key, row, context)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-THAN", row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    } else if (result[key] < value) {
      result[key] = value
    }
  }
}

ValFiller.prototype["<,()"] = ValFiller.prototype["<,"]

ValFiller.prototype["<,[]"] = function(fxn, input) {
  return (row, key, result, context) => {
    const values = fxn(row, context)
    if (!Array.isArray(values)) {
      input.errors.push(["val", "NON-ARRAY-VALS", row])
      return
    }
    for (const value of values) {
      if (input.ignore(value, key, row, context)) return
      if (!this.isNumeric(value)) {
        context.errors.push([input, "NON-NUMERIC-THAN", row])
        return
      }
      const val = +value
      if (!(key in result)) {
        result[key] = val
      } else if (result[key] < val) {
        result[key] = val
      }
    }
  }
}

ValFiller.prototype["<,(]"] = ValFiller.prototype["<,[]"]

ValFiller.prototype[">,"] = function(fxn, input) {
  return (row, key, result, context) => {
    const value = +fxn(row, context)
    if (input.ignore(value, key, row, context)) return
    if (!this.isNumeric(value)) {
      context.errors.push([input, "NON-NUMERIC-THAN", row])
      return
    }
    if (!(key in result)) {
      result[key] = value
    } else if (result[key] > value) {
      result[key] = value
    }
  }
}

ValFiller.prototype[">,()"] = ValFiller.prototype[">,"]

ValFiller.prototype[">,[]"] = function(fxn, input) {
  return (row, key, result, context) => {
    const values = fxn(row, context)
    if (!Array.isArray(values)) {
      input.errors.push(["val", "NON-ARRAY-VALS", row])
      return
    }
    for (const value of values) {
      if (input.ignore(value, key, row, context)) return
      if (!this.isNumeric(value)) {
        context.errors.push([input, "NON-NUMERIC-THAN", row])
        return
      }
      const val = +value
      if (!(key in result)) {
        result[key] = val
      } else if (result[key] > val) {
        result[key] = val
      }
    }
  }
}

ValFiller.prototype[">,(]"] = ValFiller.prototype[">,[]"]
