const tape = require("tape")
const Partjson = require("../dist/partjson.umd")

tape("\n", function(test) {
  test.pass("-***- Err specs -***-")
  test.end()
})

tape("constructor", function(test) {
  const filler = new Partjson()
  const err = filler.errors
  test.equal(err.Pj, filler, "should reference the Pj instance")
  test.true(err.allErrSet instanceof Set, "should set an array error tracker")
  test.equal(
    Object.keys(err.allErrObj).length,
    0,
    "should set an empty error object tracker"
  )
  // modes:
  // "" silent or unmarked
  // {} group errors by message as keys
  // [] simply list errors
  test.deepEqual(
    err.mode,
    {
      input: "{}",
      result: "{}-",
      root: "",
      console: "{}"
    },
    "should set default mode values"
  )
  test.deepEqual(
    err.modeKeys,
    ["input", "result", "root", "console"],
    "should set error mode keys"
  )
  test.end()
})

tape("setMode", function(test) {
  const filler = new Partjson()
  const err = filler.errors
  err.setMode(["", "", "[]", ""])
  test.deepEqual(
    err.mode,
    { input: "", result: "", root: "[]", console: "" },
    "should accept an array as argument"
  )
  err.setMode({ console: "{}", input: "{}", root: "{}" })
  test.deepEqual(
    err.mode,
    { input: "{}", result: "", root: "{}", console: "{}" },
    "should accept an object as argument"
  )

  const log = console.log
  const errs = []
  console.log = output => {
    errs.push(output)
    log(output)
  }
  const filler1 = new Partjson({
    template: {
      "@errmode": ["", "", "", "{}"],
      test: "@unknown"
    },
    data: [{}]
  })
  const err1 = filler1.errors
  err1.markErrors(filler1.tree, filler1.contexts.get(filler1.tree))
  test.equal(errs.length, 1, "should log errors to the console if applicable")
  console.log = log

  const filler2 = new Partjson({
    template: {
      "@errmode": ["", "{}", "", ""],
      test: "@unknown"
    },
    data: [{}]
  })
  test.deepEqual(
    filler2.tree["@errors"],
    { "UNRECOGNIZED-CONTEXT-@unknown": { "@unknown": 1 } },
    "should mark errors in the root result if applicable"
  )

  const filler3 = new Partjson({
    template: {
      "@errmode": ["{}", "", "", ""],
      test: "@unknown"
    },
    data: [{}]
  })
  test.deepEqual(
    filler3.tree,
    { test: "{{ UNRECOGNIZED-CONTEXT-@unknown }} @unknown" },
    "should mark errors in the input key if applicable"
  )
  test.end()
})

tape("clear", function(test) {
  const filler = new Partjson()
  const err = filler.errors
  err.allErrSet.add([])
  err.allErrObj["test"] = "test"
  err.clear(["", "", "[]", ""])
  test.equal(err.allErrSet.size, 0, "should empty the allErrSet tracker")
  test.equal(
    Object.keys(err.allErrObj).length,
    0,
    "should empty the allErrObj tracker"
  )
  test.deepEqual(
    err.mode,
    { input: "", result: "", root: "[]", console: "" },
    "should optionally reset the error mode"
  )
  test.end()
})

tape("markErrors", function(test) {
  const filler = new Partjson({
    template: {
      total: "+1",
      a: "@ppparent",
      b: "=fxn()",
      "@errmode": { console: "" }
    },
    data: [{}, {}, {}]
  })
  const err = filler.errors
  test.equal(Object.keys(filler.tree).length, 3, "should mark errors")
  test.equal(
    filler.tree.a.slice(0, 3),
    "{{ ",
    "should mark a context converter error"
  )
  test.equal(
    filler.tree.b.slice(0, 3),
    "{{ ",
    "should mark an external converter error"
  )
  test.equal(filler.tree.total, 3, "should not mark an input with no errors")

  err.markErrors = () => {}
  filler.refresh()
  test.equal(
    Object.keys(filler.tree).length,
    1,
    "should be the only method that marks errors"
  )
  test.notEqual(
    Object.keys(filler.tree)[0],
    "{{ ",
    "if missing, should have no impact on valid inputs"
  )

  const filler1 = new Partjson()
  const result1 = {}
  const err1 = [{ term: "key" }, "ERR-TEST", {}]
  const context1 = { filler: { inputs: [], errors: [] }, errors: [err1] }
  filler1.errors.markErrors(result1, context1)
  test.deepEqual(
    result1,
    { "@errors": { "{{ ERR-TEST }} key": 1 } },
    "should mark context errors by default"
  )

  const filler2 = new Partjson({
    template: { "@errmode": { context: "{}" } }
  })
  const result2 = {}
  const err2 = [{ term: "term" }, "ERR-TEST", "test"]
  const context2 = { filler: { inputs: [], errors: [err2] }, errors: [] }
  filler2.errors.markErrors(result2, context2)
  test.equal(
    filler2.errors.allErrSet.has(err2),
    true,
    "should track filler errors in a Set"
  )
  test.deepEqual(
    filler2.errors.allErrObj,
    { "ERR-TEST": { test: ["test"] } },
    "should track filler errors in an object"
  )

  const filler3 = new Partjson()
  const result3 = {}
  const err3 = ["val", "ERR-TEST", "test"]
  const context3 = {
    filler: {
      inputs: {
        key: {
          term: "key",
          templateVal: 99,
          errors: [err3]
        }
      },
      errors: []
    },
    errors: []
  }
  filler3.errors.markErrors(result3, context3)
  test.equal(
    filler3.errors.allErrSet.has(err3),
    true,
    "should track input errors in a Set, where the input templateVal is a number"
  )
  test.deepEqual(
    filler3.errors.allErrObj,
    { "ERR-TEST": { "99": ["test"] } },
    "should track input errors in an object, where the input templateVal is a number"
  )
  test.deepEqual(
    result3,
    { key: "{{ ERR-TEST }} " },
    "should track input errors in the result, where the input templateVal is a number"
  )

  const filler4 = new Partjson({
    template: {
      "@errmode": { input: "{}" }
    }
  })
  const result4 = {}
  const err4 = ["val", "ERR-TEST", "test"]
  const context4 = {
    filler: {
      inputs: {
        key: {
          term: "key",
          templateVal: ["test"],
          errors: [err4]
        }
      },
      errors: []
    },
    errors: []
  }
  filler4.errors.markErrors(result4, context4)
  test.equal(
    filler4.errors.allErrSet.has(err4),
    true,
    "should track input errors in a Set, where the input templateVal is an array"
  )
  test.deepEqual(
    filler4.errors.allErrObj,
    { "ERR-TEST": { test: ["test"] } },
    "should track input errors in an object, where the input templateVal is an array"
  )
  test.deepEqual(
    result4,
    { key: ["{{ ERR-TEST }} ", "test"] },
    "should track input errors in the result, where the input templateVal is an array"
  )

  const filler5 = new Partjson({
    template: {
      "@errmode": { input: "{}" }
    }
  })
  const result5 = {}
  const err5 = ["key", "ERR-TEST", "test"]
  const context5 = {
    filler: {
      inputs: {
        key: {
          lineage: ["key"],
          term: "key",
          templateVal: ["test"],
          errors: [err5]
        }
      },
      errors: []
    },
    errors: []
  }
  filler5.errors.markErrors(result5, context5)
  test.equal(
    filler5.errors.allErrSet.has(err5),
    true,
    "should track input errors in a Set, where the input type is a 'key'"
  )
  test.deepEqual(
    filler5.errors.allErrObj,
    { "ERR-TEST": { key: ["test"] } },
    "should track input errors in an object, where the input type is a 'key'"
  )
  test.deepEqual(
    result5,
    { "{{ ERR-TEST }} key": ["test"] },
    "should track input errors in the result, where the input type is a 'key'"
  )
  test.equal(
    filler5.errors.markErrors({}, null),
    undefined,
    "should not process on an empty context"
  )

  const filler6 = new Partjson({
    template: {
      "@errmode": { input: "", root: "{}" },
      decr: "-$val"
    },
    data: [{ val: 1 }, { val: 2 }, { val: "c" }]
  })
  test.deepEqual(
    filler6.tree,
    {
      decr: -3,
      "@errors": {},
      "@errorsAll": {
        "NON-NUMERIC-DECREMENT": {
          decr: [{ val: "c" }]
        }
      }
    },
    "should optionally not mark input errors"
  )

  test.end()
})

tape("track", function(test) {
  const filler = new Partjson({
    template: {
      "@errmode": { console: "" }
    }
  })
  const err = filler.errors
  const arrLog = []
  err.track(arrLog, ["val", "TEST-ERR"], "test", false)
  test.equal(arrLog.length, 1, "should track an error in an array")
  test.equal(err.allErrSet.size, 1, "should track an error in the allErrSet")
  test.equal(
    Object.keys(err.allErrObj).length,
    1,
    "should track an error in the allErrObj"
  )

  const objLog = {}
  err.track(objLog, ["val", "TEST-ERR"], "test", false)
  test.equal(
    Object.keys(objLog).length,
    1,
    "should track an error in an object"
  )
  test.equal(err.allErrSet.size, 2, "should add an error in the allErrSet")
  test.equal(
    Object.keys(err.allErrObj).length,
    1,
    "should group errors by key in the allErrObj"
  )
  test.end()
})

tape("trackAsObj", function(test) {
  const filler = new Partjson({
    template: {
      "@errmode": { console: "" }
    }
  })
  const err = filler.errors
  const objLog = {}
  err.trackAsObj(objLog, ["val", "TEST-ERR"], "a")
  err.trackAsObj(objLog, ["val", "TEST-ERR"], "a")
  err.trackAsObj(objLog, ["val", "TEST-ERR"], "b")
  test.equal(
    Object.keys(objLog).length,
    1,
    "should track errors by message in an object"
  )
  test.equal(
    Object.keys(objLog["TEST-ERR"]).length,
    2,
    "should track errors by message by key in an object"
  )
  test.equal(objLog["TEST-ERR"].a, 2, "should count errors by message by key")
  test.equal(objLog["TEST-ERR"].b, 1, "should count errors by message by key")

  err.trackAsObj(objLog, ["val", "TEST-ERR", {}], "c")
  err.trackAsObj(objLog, ["val", "TEST-ERR", {}], "c")
  test.equal(
    Object.keys(objLog["TEST-ERR"].c).length,
    2,
    "should optionally track data rows by message by key"
  )
  test.end()
})

tape("log", function(test) {
  const errmode = {
    input: "",
    console: "",
    root: "[]"
  }
  const template = {
    total: "+1",
    a: "@ppparent",
    b: "=fxn()",
    "@errmode": errmode
  }
  const filler = new Partjson({
    template,
    data: [{}, {}, {}]
  })

  test.deepEqual(
    filler.tree["@errorsAll"],
    [
      ["val", "UNRECOGNIZED-CONTEXT-@ppparent"],
      ["val", "MISSING-EXTERNAL-SUBS"]
    ],
    "should optionally attach an errorsAll array to the root"
  )

  errmode.root = "{}"
  filler.refresh()
  test.equal(
    Object.keys(filler.tree["@errorsAll"]).length,
    2,
    "should optionally attach an errorsAll array to the root"
  )

  test.end()
})
