export default class Err {
  constructor(Pj) {
    this.Pj = Pj
    this.allErrSet = new Set()
    this.allErrObj = Object.create(null)
    // modes:
    // "" silent or unmarked
    // {} group errors by message as keys
    // [] simply list errors
    this.mode = {
      input: "{}", // include message directly in input key or values
      result: "{}-", // create an @errors property on result, but exclude those marked in inputs
      root: "", // do not show errorsAll in root object
      console: "{}" // print @errors object in console
    }
    this.modeKeys = ["input", "result", "root", "console"]
    this.setMode()
  }

  setMode(mode = {}) {
    if (Array.isArray(mode)) {
      this.modeKeys.forEach((key, i) => (this.mode[key] = mode[i]))
    } else if (typeof mode == "object") {
      this.modeKeys.forEach(key => {
        if (key in mode) {
          this.mode[key] = mode[key]
        }
      })
    }
  }

  clear(mode = {}) {
    this.allErrSet.clear()
    this.allErrObj = Object.create(null)
    this.setMode(mode)
  }

  markErrors(result, context) {
    if (!context) return
    const currLog = this.mode.result.slice(0, 2) == "[]" ? [] : {}
    for (const term in context.filler.inputs) {
      const input = context.filler.inputs[term]
      for (const err of input.errors) {
        const [type, message, row] = err
        if (type == "key") {
          this.track(currLog, err, input.lineage.join(this.Pj.delimit))
          if (this.mode.input) {
            result["{{ " + message + " }} " + input.term] = input.templateVal
          }
        } else if (type == "val") {
          if (Array.isArray(input.templateVal)) {
            this.track(currLog, err, input.templateVal[0])
            if (this.mode.input) {
              result[input.term] = [
                "{{ " + message + " }} ",
                ...input.templateVal
              ]
            }
          } else if (typeof input.templateVal == "string") {
            this.track(currLog, err, input.templateVal)
            if (this.mode.input) {
              result[input.term] = "{{ " + message + " }} " + input.templateVal
            }
          } else {
            this.track(currLog, err, input.templateVal)
            if (this.mode.input) {
              result[input.term] = "{{ " + message + " }} "
            }
          }
        }
      }
    }

    if (context.errors.length) {
      const log = {}
      result["@errors"] = log
      for (const err of context.errors) {
        const [input, message, row] = err
        this.track(currLog, err, input.term)
        if (!this.mode.input) continue
        const key = "{{ " + message + " }} " + input.term
        if (!(key in log)) log[key] = 0
        log[key] += 1
      }
    }

    if (context.filler.errors.length) {
      for (const err of context.filler.errors) {
        this.track(currLog, err, err[2], false)
      }
    }

    if (Object.keys(currLog).length && this.mode.result) {
      result["@errors"] = currLog
    }
  }

  track(currLog, err, key, marked = true) {
    this.allErrSet.add(err)
    this.trackAsObj(this.allErrObj, err, key)
    if (marked && this.mode.result.slice(-1) == "-") {
      return
    }
    if (Array.isArray(currLog)) {
      currLog.push(err)
    } else {
      this.trackAsObj(currLog, err, key)
    }
  }

  trackAsObj(log, err, key) {
    const [typeOrInput, message, row] = err
    if (!(message in log)) {
      log[message] = Object.create(null)
    }
    if (!(key in log[message])) {
      log[message][key] = row ? [] : 0
    }
    if (row) {
      if (!log[message][key].includes(row)) {
        log[message][key].push(row)
      }
    } else {
      log[message][key] += 1
    }
  }

  log() {
    const allErrArr = [...this.allErrSet]
    if (!allErrArr.length) return
    if (this.mode.root) {
      const mode = this.mode.root
      this.Pj.tree["@errorsAll"] = mode == "[]" ? allErrArr : this.allErrObj
    }
    if (this.mode.console) {
      const mode = this.mode.console.slice(0, 2)
      console.log(mode == "[]" ? allErrArr : this.allErrObj)
    }
  }
}
