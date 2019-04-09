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
    ["@branch", "@parent", "@root", "@self", "@values"],
    "should set the reserved contexts"
  )
  test.deepEqual(
    filler.reserved.filters,
    ["@before()", "@join()", "@ignore()"],
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
  const opts = {
    template: {
      results: [],
      counts: {
        total: "+$test",
        "@dist()": ["@root.results"]
      }
    },
    data: [{ test: 1 }, { test: 2 }, { test: 3 }]
  }
  const Filler = new Partjson(opts)
  test.deepEqual(
    Filler.tree.results,
    [{ total: 6 }],
    "should distribute finalized results"
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
  test.end()
})
