const tape = require("tape")
const Partjson = require("../dist/partjson.umd")

tape("\n", function(test) {
  test.pass("-***- Partjson specs -***-")
  test.end()
})

tape("constructor", function(test) {
  const Filler = new Partjson()
  test.deepEqual(
    Filler.opts,
    { template: "{}", seed: "{}", "=": {} },
    "should set default opts"
  )
  test.equal(Filler.delimit, ".", "should set a default delimiter")
  test.deepEqual(
    Filler.subsSymbols,
    ["$", "=", "@", "&"],
    "should set substitution symbols"
  )
  test.deepEqual(
    Filler.convSymbols,
    ["()", "[]", "(]"],
    "should set conversion symbols"
  )
  test.deepEqual(
    Filler.aggrSymbols,
    ["+", "-", "<", ">"],
    "should set aggregation symbols"
  )
  test.deepEqual(
    Filler.timeSymbols,
    [
      ":__",
      "_:_",
      "__:",
      "_0:",
      "_1:",
      "_2:",
      "_3:",
      "_4:",
      "_5:",
      "_6:",
      "_7:",
      "_8:",
      "_9:"
    ],
    "should set timing symbols"
  )
  test.deepEqual(Filler.skipSymbols, ["#", "*"], "should set skip symbols")
  test.deepEqual(Filler.steps, [":__", "", "_:_"], "should set ordered steps")
  test.end()
})

tape("refresh", function(test) {
  const template = {
    "@join()": {
      loc: "=loc()"
    },
    "#a": 0,
    $prop: "+1"
  }
  let numCalls = 0
  const Filler = new Partjson({
    template,
    "=": {
      loc: () => {
        numCalls++
        return { city: "Test" }
      }
    }
  })
  test.equal(
    typeof Filler.opts.template,
    "string",
    "should convert the template to string"
  )
  test.notEqual(
    template,
    Filler.template,
    "should preserve the user-supplied template"
  )
  test.true(Filler.commentedTerms instanceof Map)
  test.true(Filler.joins instanceof Map)
  test.true(Filler.fillers instanceof Map)
  test.true(Filler.contexts instanceof Map)
  test.deepEqual(Filler.tree, {})

  const a = { prop: "a" }
  const b = { prop: "b" }
  const c = { prop: "a" }
  const data = [a, b, c]
  Filler.refresh({ data })
  test.equal(Filler.commentedTerms.size, 1, "should track commented terms")
  test.equal(
    numCalls,
    data.length,
    "should call a join function for every data row"
  )
  test.equal(
    Filler.joins.size,
    0,
    "joins should be cleared after a data row iteration"
  )
  test.equal(
    Filler.fillers.size,
    1,
    "should only have a filler for the root tree"
  )
  test.equal(Object.keys(Filler.tree).length, 2, "should have root result keys")

  const prevFiller = Filler.fillers.get(Filler.template)
  const prevResult = Filler.tree
  Filler.refresh({ data: [] })
  test.notEqual(
    prevFiller,
    Filler.fillers.get(Filler.template),
    `should clear fillers after refresh`
  )
  test.notEqual(
    prevResult,
    Filler.tree,
    "should not reuse a result tree on refresh"
  )
  test.equal(
    Object.keys(Filler.tree).length,
    0,
    "should clear root result after refresh"
  )

  const Filler2 = new Partjson({
    template: {
      "@delimit": "|"
    }
  })
  test.equal(
    Filler2.delimit,
    "|",
    "should reset to an optional delimiter chararacter"
  )

  test.end()
})

tape("parseTemplate", function(test) {
  const template = {
    total: "+1",
    child: {
      total: "+1"
    }
  }
  const Filler = new Partjson({ template })
  test.equal(
    Filler.fillers.size,
    2,
    "should create a filler for each (sub)template"
  )

  const filler = Filler.fillers.get(Filler.template.child)
  test.equal(
    Object.keys(filler.inputs).length,
    1,
    "should create an inputs object"
  )
  test.equal(
    filler["@before"],
    Filler.reserved.trueFxn,
    "should create a default @before fxn"
  )
  test.equal(
    filler["@after"],
    Filler.reserved.trueFxn,
    "should create a default @after fxn"
  )
  test.deepEqual(
    filler.postTerms,
    {},
    "should create a default post-loop function tracker"
  )
  test.deepEqual(
    filler.errors,
    [],
    "should create a default filler errors tracker"
  )
  test.deepEqual(
    filler["@ignore"],
    { "@": Filler.reserved.notDefined },
    "should create a default filler ignore object"
  )
  test.true(filler.steps.length > 0, "should set up a filler's steps")

  // simulate what happens when parseTemplate is not called
  Filler.parseTemplate = () => {}
  Filler.refresh()
  test.equal(
    Filler.fillers.size,
    0,
    "should be the only method that creates fillers"
  )
  test.end()
})

tape("setResultContext", function(test) {
  const Filler = new Partjson()
  const result = Filler.setResultContext("{}", "test", {})
  test.equal(Object.keys(result).length, 0, "should return an empty object")
  test.true(Filler.contexts.has(result), "should set up the object's context")

  const context = Filler.contexts.get(result)
  test.true(typeof context.branch, "string", "should have context branch")
  test.true(typeof context.parent, "object", "should have context parent")
  test.equal(context.self, result, "should have a context self")
  test.equal(context.root, Filler.tree, "should have a context root")
  test.true(
    Array.isArray(context.errors),
    "should have a context errors tracker"
  )
  test.end()
})

tape("processRow", function(test) {
  const template = {
    total: "+$count"
  }
  const Filler = new Partjson({ template })
  const filler = Filler.fillers.get(Filler.template)
  const result = Filler.setResultContext("{}")
  Filler.processRow({ count: 3 }, Filler.template, result)
  Filler.processRow({ count: 1 }, Filler.template, result)
  test.deepEqual(
    result,
    { total: 4 },
    "should fill a result object with data rows as input"
  )

  const mean = () => {}
  const calc = () => {}
  const compute = () => {}
  const done = () => {}
  const Filler1 = new Partjson({
    template: {
      total: "+$value",
      "__:mean": "=mean()",
      "_1:calc": "=calc()",
      "_1:compute": "=compute()",
      "@done()": "=done()"
    },
    "=": {
      mean,
      calc,
      compute,
      done
    },
    data: [{ value: 3 }]
  })
  test.equal(Filler1.done[0].done, done, "should collect done functions")
  test.equal(
    Filler1.postLoopTerms["__:"].length,
    1,
    "should collect all post-loop contexts"
  )
  test.deepEqual(
    Filler1.contexts.get(Filler1.tree).filler.postTerms["__:"],
    ["__:mean"],
    "should track all post-loop functions"
  )
  test.equal(
    Filler1.postLoopTerms["_1:"].length,
    1,
    "should collect all numbered post-loop contexts"
  )
  test.deepEqual(
    Filler1.contexts.get(Filler1.tree).filler.postTerms["_1:"],
    ["_1:calc", "_1:compute"],
    "should track all numbered post-loop functions"
  )
  test.end()
})

tape("add", function(test) {
  const Filler = new Partjson({
    template: {
      total: "+1",
      byType: {
        $type: "+1",
        "@dist()": ["@root.subtotals"]
      },
      subtotals: []
    }
  })
  const rows = [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  Filler.add(rows)
  test.deepEqual(
    Filler.tree,
    {
      total: 4,
      byType: { a: 2, b: 1, c: 1 },
      subtotals: [{ a: 2, b: 1, c: 1 }]
    },
    "should process data rows"
  )
  Filler.add([{ type: "a", count: 1 }])
  test.deepEqual(
    Filler.tree,
    {
      total: 5,
      byType: { a: 3, b: 1, c: 1 },
      subtotals: [{ a: 3, b: 1, c: 1 }]
    },
    "should not redistribute results when called for separate data"
  )

  const mean = (row, context) => context.self.total / context.self.count
  const calc = (row, context) => 2 * context.self.mean
  const compute = (row, context) => 0.5 * context.self.mean
  const sum = (row, context) => context.self.calc + context.self.compute
  const done = result => (result.final = result.sum + result.mean)
  const Filler1 = new Partjson({
    template: {
      total: "+$value",
      count: "+1",
      "__:mean": "=mean()",
      "_1:calc": "=calc()",
      "_1:compute": "=compute()",
      "_2:sum": "=sum()",
      "@done()": "=done()"
    },
    "=": {
      mean,
      calc,
      compute,
      sum,
      done
    },
    data: [{ value: 3 }, { value: 1 }, { value: 2 }]
  })
  test.equal(
    Filler1.tree.mean,
    2,
    "should fill unnumbered post-loop inputs first"
  )
  test.equal(
    Filler1.tree.calc,
    4,
    "should fill numbered post-loop inputs after unnumbered"
  )
  test.equal(
    Filler1.tree.compute,
    1,
    "should fill similarly numbered post-loop inputs in the same order"
  )
  test.equal(
    Filler1.tree.sum,
    5,
    "should fill numbered post-loop inputs in increasing order"
  )
  test.equal(Filler1.tree.final, 7, "should execute a done function at the end")
  test.end()
})

tape("postLoop", function(test) {
  const Filler = new Partjson({
    template: {
      total: "+$count",
      byType: {
        $type: {
          total: "+$count",
          "__:pct": "=pct()"
        }
      }
    },
    data: [
      { type: "a", count: 1 },
      { type: "a", count: 1 },
      { type: "b", count: 4 },
      { type: "c", count: 4 }
    ],
    "=": {
      pct(row, context) {
        return context.self.total / context.root.total
      }
    }
  })
  test.deepEqual(
    Filler.tree.byType,
    {
      a: { total: 2, pct: 0.2 },
      b: { total: 4, pct: 0.4 },
      c: { total: 4, pct: 0.4 }
    },
    "should apply a function after all the data rows have been looped through"
  )

  // simulate what happens when postLoop is not called
  Filler.postLoop = () => {}
  Filler.refresh()
  test.deepEqual(
    Filler.tree.byType,
    { a: { total: 2 }, b: { total: 4 }, c: { total: 4 } },
    "should be the only method that applies post-loop functions"
  )

  test.end()
})

tape("processResult", function(test) {
  const Filler = new Partjson({
    template: {
      total: "+$count",
      distinct: ["$type", "set"],
      child: {
        map: [["$type", "+$count"], "map"],
        branch: "@bbranch"
      },
      "@errmode": {
        console: ""
      }
    }
  })
  const data = [
    { type: "a", count: 1 },
    { type: "a", count: 1 },
    { type: "b", count: 4 },
    { type: "c", count: 4 }
  ]
  Filler.refresh({ data })

  test.true(
    Filler.tree.distinct instanceof Set,
    "should not convert a Set to an array"
  )
  test.true(
    Filler.tree.child.branch.startsWith("{{ "),
    "should mark errors by default"
  )

  // simulate what happens when processResult is not called
  Filler.processResult = () => {}
  Filler.refresh({ data })
  test.true(
    Filler.tree.distinct instanceof Set,
    "should be the only method that converts a result Set into an array"
  )
  test.true(
    !Filler.tree.child.branch,
    "should be the only method that calls the errors marker"
  )
  test.end()
})

tape("copyResult", function(test) {
  const seed = JSON.stringify({
    total: 3,
    props: ["a"],
    byKey: {
      c: 3
    },
    arrsByProp: {},
    map: [["d", 3]]
  })
  const Filler = new Partjson({
    template: {
      "__:arrsObj": "@.arrsByProp.@values",
      "__:arrsArr": "@.propsByProp.@values",
      total: "+1",
      props: ["$prop"],
      byKey: {
        $prop: "+1"
      },
      arrsByProp: {
        $prop: ["$"]
      },
      propsByProp: {
        $prop: ["$prop", 0]
      },
      map: [["$prop", "+1"], "map"]
    },
    seed
  })

  test.deepEqual(
    Filler.copyResult(),
    JSON.parse(seed),
    "should copy the initial seed"
  )

  Filler.add([{ prop: "c" }, { prop: "b" }])
  const copy = Filler.copyResult()
  test.deepEqual(
    copy.arrsObj,
    [[{ prop: "c" }], [{ prop: "b" }]],
    "should copy an array of array of objects"
  )
  test.deepEqual(copy.arrsArr, [["c"], ["b"]], "should copy an array of arrays")
  test.equal(copy.total, 5, "should copy a numeric result")
  test.deepEqual(copy.props, ["a", "c", "b"], "should copy an array")
  test.deepEqual(copy.byKey, { c: 4, b: 1 }, "should copy an object")
  test.deepEqual(
    copy.arrsByProp,
    { c: [{ prop: "c" }], b: [{ prop: "b" }] },
    "should copy an object that has array of objects as values"
  )
  test.deepEqual(
    copy.propsByProp,
    { c: ["c"], b: ["b"] },
    "should copy an object that has array of strings as values"
  )
  test.deepEqual(
    copy.map,
    [["d", 3], ["c", 1], ["b", 1]],
    "should convert a Map instance to an array of [key, value]"
  )
  test.deepEqual(
    Filler.copyResult(),
    {
      arrsObj: [[{ prop: "c" }], [{ prop: "b" }]],
      arrsArr: [["c"], ["b"]],
      total: 5,
      props: ["a", "c", "b"],
      byKey: { c: 4, b: 1 },
      arrsByProp: { c: [{ prop: "c" }], b: [{ prop: "b" }] },
      propsByProp: { c: ["c"], b: ["b"] },
      map: [["d", 3], ["c", 1], ["b", 1]]
    },
    "should copy early results"
  )

  Filler.add([{ prop: "b" }, { prop: "d" }])

  test.deepEqual(
    Filler.copyResult(),
    {
      arrsObj: [
        [{ prop: "c" }],
        [{ prop: "b" }, { prop: "b" }],
        [{ prop: "d" }]
      ],
      arrsArr: [["c"], ["b", "b"], ["d"]],
      total: 7,
      props: ["a", "c", "b", "d"],
      byKey: { c: 4, b: 2, d: 1 },
      arrsByProp: {
        c: [{ prop: "c" }],
        b: [{ prop: "b" }, { prop: "b" }],
        d: [{ prop: "d" }]
      },
      propsByProp: { c: ["c"], b: ["b", "b"], d: ["d"] },
      map: [["d", 4], ["c", 1], ["b", 2]]
    },
    "should copy later results"
  )

  test.end()
})
