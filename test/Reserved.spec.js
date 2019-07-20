const tape = require("tape")
const Partjson = require("../dist/partjson.umd")

tape("\n", function(test) {
  test.pass("-***- Reserved specs -***-")
  test.end()
})

tape("constructor", function(test) {
  const filler = new Partjson()
  test.deepEqual(
    filler.reserved.contexts,
    ["@branch", "@parent", "@root", "@self", "@values", "@key"],
    "should set the reserved contexts"
  )
  test.deepEqual(
    filler.reserved.filters,
    ["@split()", "@before()", "@join()", "@ignore()"],
    "should set the reserved filters"
  )
  test.deepEqual(
    filler.reserved.post,
    ["@after()", "@dist()", "@end()"],
    "should set the reserved post-processing functions"
  )
  test.end()
})

tape("trueFxn", function(test) {
  const filler = new Partjson()
  test.equal(filler.reserved.trueFxn(false), true, "should always return true")
  test.end()
})

tape("notDefined", function(test) {
  const filler = new Partjson()
  test.equal(
    filler.reserved.notDefined(undefined),
    true,
    "should be true for undefined"
  )
  test.equal(
    filler.reserved.notDefined("a"),
    false,
    "should be false for any defined terms"
  )
  test.end()
})

tape(`@split()`, function(test) {
  const Filler = new Partjson({
    template: {
      "@split()": "=split()",
      byKey: {
        "$key0[]": {
          count: "+1",
          total: "+$val",
          sub: {
            "$key1[]": {
              count: "+1",
              total: "+$val"
            }
          }
        }
      }
    },
    "=": {
      split: row => {
        return [row.a, row.b, row.c]
      }
    },
    data: [
      {
        a: { key0: ["a1", "a2"], key1: ["x", "y"], val: 1 },
        b: { key0: ["a1"], key1: ["y", "z"], val: 2 },
        c: { key0: ["a2", "c"], key1: ["z"], val: 4 }
      }
    ]
  })

  test.deepEqual(
    Filler.tree,
    {
      byKey: {
        a1: {
          count: 2,
          total: 3,
          sub: {
            x: { count: 1, total: 1 },
            y: { count: 2, total: 3 },
            z: { count: 1, total: 2 }
          }
        },
        a2: {
          count: 2,
          total: 5,
          sub: {
            x: { count: 1, total: 1 },
            y: { count: 1, total: 1 },
            z: { count: 1, total: 4 }
          }
        },
        c: { count: 1, total: 4, sub: { z: { count: 1, total: 4 } } }
      }
    },
    "should be called before a data row enters the loop"
  )

  test.end()
})

tape(`@before()`, function(test) {
  const opts = {
    template: {
      "@before()": "=fxn()",
      total: "+$test"
    },
    "=": {
      fxn: row => {
        row.test = 1
        return true
      }
    }
  }
  const Filler = new Partjson(opts)
  const input0 = { errors: [] }
  const b4fxn0 = Filler.reserved["@before"]("=fxn()", input0)
  const row = {}
  b4fxn0(row, {})
  test.equal(row.test, 1, "should call an external function")

  Filler.refresh({
    data: [{}, {}, {}]
  })
  test.deepEqual(
    Filler.tree,
    { total: 3 },
    "should be called before a data row enters the loop"
  )

  const Filler2 = new Partjson({
    template: {
      "@before()": "=test()"
    },
    data: [{}]
  })
  test.deepEqual(
    [...Filler2.errors.allErrSet],
    [["val", "MISSING-@before()-FXN", "test"]],
    "should error on a missing join function"
  )

  test.end()
})

tape(`@after()`, function(test) {
  const opts = {
    template: {
      "@after()": "=fxn()",
      total: "+$test"
    },
    data: [{ test: 0 }, { test: 0 }, { test: 0 }],
    "=": {
      fxn: row => (row.test = 1)
    }
  }
  const Filler = new Partjson(opts)
  test.equal(
    Filler.reserved["@before"],
    Filler.reserved["@after"],
    "should use the @before() function generator"
  )

  test.deepEqual(
    Filler.tree,
    { total: 0 },
    "should not be applied to the result"
  )
  test.deepEqual(
    opts.data,
    [{ test: 1 }, { test: 1 }, { test: 1 }],
    "should be called after a data row enters the loop"
  )
  test.end()
})

tape(`@dist()`, function(test) {
  const Filler = new Partjson({
    template: {
      results: [],
      counts: {
        total: "+$test",
        "@dist()": ["@root.results"]
      }
    },
    data: [{ test: 1 }, { test: 2 }, { test: 3 }]
  })
  test.deepEqual(
    Filler.tree.results,
    [{ total: 6 }],
    "should distribute finalized results into an array"
  )
  const context0 = Filler.contexts.get(Filler.tree.counts)
  context0["@dist"](Filler.tree.results[0])
  test.deepEqual(
    Filler.tree.results,
    [{ total: 6 }],
    "should not re-distribute a result into the same target"
  )

  const Filler1 = new Partjson({
    template: {
      results: [],
      counts: {
        total: "+$test",
        "@dist()": "@root.results"
      }
    },
    data: [{ test: 1 }, { test: 2 }, { test: 3 }]
  })
  test.deepEqual(
    Filler.tree.results,
    [{ total: 6 }],
    "should accept a non-array template for a target"
  )

  const Filler2 = new Partjson({
    template: {
      results: {},
      obj: {
        $test: "+1",
        "@dist()": ["@root.results"]
      }
    },
    data: [{ test: 1 }, { test: 2 }, { test: 3 }]
  })
  test.deepEqual(
    Filler2.tree.results,
    {},
    "should not distribute finalized results to a non-array target"
  )
  test.deepEqual(
    Filler2.contexts.get(Filler2.tree.obj).errors[0].slice(1),
    ["NON-ARRAY-DIST-TARGET", "@root.results"],
    "should error on a non-array dist target"
  )

  const Filler3 = new Partjson({
    template: {
      obj: {
        $test: "+1",
        "@dist()": ["@root.results"]
      }
    },
    data: [{ test: 1 }, { test: 2 }, { test: 3 }]
  })
  test.deepEqual(
    Filler3.contexts.get(Filler3.tree.obj).errors[0].slice(1),
    ["MISSING-DIST-TARGET", "@root.results"],
    "shoud error on a missing dist target"
  )
  test.end()
})

tape(`@done()`, function(test) {
  const resultsArr = []
  const opts = {
    template: {
      "@done()": "=fxn()",
      total: "+$test"
    },
    data: [{ test: 0 }, { test: 0 }, { test: 0 }],
    "=": {
      fxn: result => resultsArr.push(result)
    }
  }
  const Filler = new Partjson(opts)
  test.equal(
    Filler.reserved["@before"],
    Filler.reserved["@done"],
    "should use the @before() function generator"
  )
  test.equal(
    Filler.tree,
    resultsArr[0],
    "should be called after the results have been finalized"
  )
  test.end()
})

tape(`@join()`, function(test) {
  const resultsArr = []
  const opts = {
    template: {
      "@join()": {
        loc: "=loc()"
      },
      byCity: {
        "&loc.name": "+1"
      }
    },
    data: [{ city: 0 }, { city: 0 }, { city: 1 }, { city: 20 }],
    "=": {
      loc: row => {
        return row.city == 0
          ? { name: "abc" }
          : row.city == 1
          ? { name: "xyz" }
          : null
      }
    }
  }
  const Filler = new Partjson(opts)
  test.deepEqual(
    Filler.tree,
    { byCity: { abc: 2, xyz: 1 } },
    "should filter and join data to a row"
  )

  const Filler2 = new Partjson({
    template: {
      "@join()": {
        test: "=test()"
      }
    },
    data: [{}]
  })
  test.deepEqual(
    [...Filler2.errors.allErrSet],
    [["val", "MISSING-@join-FXN", "test"]],
    "should error on a missing join function"
  )
  test.end()
})

tape(`@ignore()`, function(test) {
  const resultsArr = []
  const opts = {
    template: {
      "@ignore()": [20],
      byCount: "+$count",
      usingFxn: {
        "@ignore()": "=below10()",
        total: "+$count"
      },
      usingObj: {
        "@ignore()": {
          count: "=above9()"
        },
        total: "+$count"
      },
      byInherit: {
        total: "+$count"
      }
    },
    data: [{ count: 1 }, { count: 2 }, { count: 3 }, { count: 20 }],
    "=": {
      below10: value => value < 10,
      above9: value => value > 9
    }
  }
  const Filler = new Partjson(opts)
  test.equal(Filler.tree.byCount, 6, "should filter if value is in array")
  test.deepEqual(
    Filler.tree.usingFxn,
    { total: 20 },
    "should filter by function and override ancestor ignore"
  )
  test.deepEqual(
    Filler.tree.usingObj,
    { total: 6 },
    "should filter by specific object key-values and overide ancestor ignore"
  )
  test.deepEqual(
    Filler.tree.byInherit,
    { total: 6 },
    "should inherit ancestor ignore unless overriden"
  )

  const Filler1 = new Partjson({
    template: {
      "@ignore()": "=fxn()",
      "@errmode": { root: {} },
      test: "+1"
    },
    data: [{}]
  })
  test.deepEqual(
    Filler1.tree["@errors"],
    { "MISSING-@ignore()-FXN": { "=fxn()": ["=fxn()"] } },
    "should error on a missing ignore function"
  )

  const Filler2 = new Partjson({
    template: {
      "@ignore()": 9,
      "@errmode": { console: "" },
      test: "+1"
    },
    data: [{}]
  })
  test.deepEqual(
    [...Filler2.errors.allErrSet],
    [["val", "UNSUPPORTED-@ignore()-VALUE", 9]],
    "should error on unsupported @ignore template value"
  )
  test.end()
})

tape("setFxn", function(test) {
  const fxn1 = () => {}
  const fxn2 = () => {}
  const fxn3 = () => {}
  const template = {
    "@before()": "=fxn1()",
    "@after()": "=fxn2()",
    "@done()": "=fxn3()"
  }
  const Filler = new Partjson({
    template,
    "=": { fxn1, fxn2, fxn3 }
  })
  const filler = Filler.fillers.get(Filler.template)
  test.equal(filler["@before"], fxn1, "should set the @before() function")
  test.equal(filler["@after"], fxn2, "should set the @after() function")
  test.equal(filler["@done"], fxn3, "should set the @done() function")

  // simulate what happens when setFxn is not called
  Filler.reserved.setFxn = () => {}
  Filler.refresh()
  const filler1 = Filler.fillers.get(Filler.template)
  test.notEqual(
    filler1["@before"],
    fxn1,
    "should be the only method that sets the @before() function"
  )
  test.notEqual(
    filler1["@after"],
    fxn2,
    "should be the only method that sets the @after() function"
  )
  test.notEqual(
    filler1["@done"],
    fxn3,
    "should be the only method that sets the @done() function"
  )

  const Filler1 = new Partjson()
  const input1 = { errors: [] }
  Filler1.reserved.setFxn("unknown", input1, {}, "")
  test.deepEqual(
    input1.errors,
    [["key", "UNRECOGNIZED-RESERVED-unknown"]],
    "should error on unknown reserved term"
  )

  test.end()
})
