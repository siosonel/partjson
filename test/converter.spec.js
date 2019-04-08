const tape = require("tape")
const Partjson = require("../dist/partjson.cjs")
const conv = Partjson.prototype.converter

tape("\n", function(test) {
  test.pass("-***- Converter specs -***-")
  test.end()
})

tape("parseTerm", function(test) {
  const Filler = new Partjson()
  const [subterm, symbols, tokens, step] = conv.parseTerm(Filler, "$prop")
  test.equal(tokens.aggr, "")
  test.equal(tokens.subs, "$")
  test.equal(tokens.stem, "prop")
  test.equal(tokens.conv, "")
  test.equal(symbols, "$", "should correctly parse a simple term")

  const [subterm1, symbols1, tokens1, step1] = conv.parseTerm(
    Filler,
    "<=prop(]"
  )
  test.equal(tokens1.aggr, "<")
  test.equal(tokens1.subs, "=")
  test.equal(tokens1.stem, "prop")
  test.equal(tokens1.conv, "(]")
  test.equal(symbols1, "<=(]", "should correctly parse a complex term")

  const [subterm2, symbols2, tokens2, step2] = conv.parseTerm(
    Filler,
    "_:_=prop()"
  )
  test.equal(tokens2.aggr, "")
  test.equal(tokens2.subs, "=")
  test.equal(tokens2.stem, "prop")
  test.equal(tokens2.conv, "()")
  test.equal(tokens2.time, "_:_")
  test.equal(step2, Filler.steps.indexOf("_:_"))
  test.equal(symbols2, "=()", "should correctly parse a timed term")
  test.end()
})

tape(`subs["#"]`, function(test) {
  const Filler = new Partjson({
    template: {
      "#no": {
        no: {
          yes: "test"
        }
      }
    },
    data: [{}, {}]
  })
  test.deepEqual(Filler.tree, {}, "should cause prefixed inputs to be skipped")
  test.end()
})

tape(`subs["*"]`, function(test) {
  const Filler = new Partjson({
    template: {
      no: {
        no: {
          "*yes": "test"
        }
      }
    },
    data: [{}, {}]
  })
  test.deepEqual(Filler.tree, { yes: "test" }, "should skip non-focused inputs")

  // stub
  Filler.converter.subs["*"] = () => {}
  Filler.refresh()
  test.notDeepEqual(
    Filler.tree,
    { yes: "test" },
    "should be the only method that focuses the result on selected inputs"
  )
  test.end()
})

tape(`subs[""]`, function(test) {
  const Filler = new Partjson()
  const input0 = { errors: [] }
  const fxnStr = conv.subs[""](Filler, "prop", input0)
  test.equal(fxnStr({ prop: "val" }), "prop", "should return a string value")
  test.true(!input0.errors.length, "no errors")

  const input1 = { errors: [] }
  const fxnNum = conv.subs[""](Filler, 1, input1)
  test.equal(
    fxnNum({ prop: "1" }),
    1,
    "should substitute the template input term as-is"
  )
  test.true(!input1.errors.length, "no errors")
  test.end()
})

tape(`subs["$"]`, function(test) {
  const Filler = new Partjson()
  const input0 = { errors: [] }
  const fxn0 = conv.subs["$"](Filler, "$prop", input0)
  test.equal(
    fxn0({ prop: "dataVal" }),
    "dataVal",
    "should substitute a data property"
  )
  test.true(!input0.errors.length, "no errors")

  const propArr = ["a", "b"]
  test.equal(fxn0({ prop: propArr }), propArr, "should return an array value")
  test.true(!input0.errors.length, "no errors")

  const propFxn = () => {}
  test.equal(fxn0({ prop: propFxn }), propFxn, "should return a function")
  test.true(!input0.errors.length, "no errors")

  const input1 = { errors: [] }
  const fxn1 = conv.subs["$"](Filler, "$prop.sub.sub", input1)
  test.equal(
    fxn1({ prop: { sub: { sub: "val" } } }),
    "val",
    "should return a nested property value"
  )
  test.true(!input1.errors.length, "no errors")
  test.end()
})

tape(`subs["="]`, function(test) {
  const opts = {
    template: {},
    data: [{}],
    "=": {
      prop: "extVal",
      arr: ["a", "b"],
      fxn: row => row.dataProp,
      nested: {
        sub: {
          sub: "extVal"
        }
      }
    }
  }
  const ext = opts["="]
  const Filler = new Partjson(opts)

  const input0 = { errors: [] }
  const fxn0 = conv.subs["="](Filler, "=prop", input0)
  test.equal(fxn0({}), ext.prop, "should return an external string value")
  test.true(!input0.errors.length, "no errors")

  const input1 = { errors: [] }
  const fxn1 = conv.subs["="](Filler, "=arr", input1)
  test.equal(fxn1({}), ext.arr, "should return an external array value")
  test.true(!input1.errors.length, "no errors")

  const input2 = { errors: [] }
  const fxn2 = conv.subs["="](Filler, "=fxn", input2)
  test.equal(fxn2({}), ext.fxn, "should return an external function")
  test.true(!input2.errors.length, "no errors")

  const input3 = { errors: [] }
  const fxn3 = conv.subs["="](Filler, "=nested.sub.sub", input1)
  test.equal(
    fxn3({}),
    ext.nested.sub.sub,
    "should return an external nested value"
  )
  test.true(!input3.errors.length, "no errors")
  test.end()
})

tape(`subs["@"]`, function(test) {
  const Filler = new Partjson()
  const context = {
    self: {},
    branch: "test",
    parent: {
      fxn: (row, context) => row.dataProp,
      nested: {
        val: "parentSubVal"
      }
    },
    root: {
      fxn: (row, context) => row.dataProp
    },
    filler: {
      errors: []
    }
  }
  const input0 = { errors: [] }
  const fxn0 = conv.subs["@"](Filler, "@", input0)
  test.equal(
    fxn0({}, context),
    context.self,
    "@ should return the result itself"
  )
  test.true(!input0.errors.length, "no errors")

  const input1 = { errors: [] }
  const fxn1 = conv.subs["@"](Filler, "@branch", input1)
  test.equal(
    fxn1({}, context),
    context.branch,
    "@branch should return the branch name"
  )
  test.true(!input1.errors.length, "no errors")

  const input2 = { errors: [] }
  const fxn2 = conv.subs["@"](Filler, "@parent", input2)
  test.equal(
    fxn2({}, context),
    context.parent,
    "@parent should return the parent"
  )
  test.true(!input2.errors.length, "no errors")

  const input3 = { errors: [] }
  const fxn3 = conv.subs["@"](Filler, "@root", input3)
  test.equal(fxn3({}, context), context.root, "@root should return the root")
  test.true(!input3.errors.length, "no errors")

  const input4 = { errors: [] }
  const fxn4 = conv.subs["@"](Filler, "@parent.nested.val", input4)
  test.equal(
    fxn4({}, context),
    context.parent.nested.val,
    "should return a nested context value"
  )
  test.true(!input4.errors.length, "no errors")

  const input5 = { errors: [] }
  const fxn5 = conv.subs["@"](Filler, "@unknown", input5)
  test.equal(typeof fxn5, "undefined", "@unknown should return undefined")
  test.true(input5.errors.length > 0, "has errors")

  const Filler1 = new Partjson({
    template: {
      "__:arrs": "@.byKey.@values",
      byKey: {
        $key: ["$"]
      }
    },
    data: [{ key: "a" }, { key: "a" }, { key: "b" }, { key: "c" }]
  })
  test.deepEqual(
    Filler1.tree.arrs,
    [[{ key: "a" }, { key: "a" }], [{ key: "b" }], [{ key: "c" }]],
    "@values should return a result's Object.values"
  )
  test.end()
})

tape(`conv[""]`, function(test) {
  const Filler = new Partjson()
  const input0 = { errors: [] }
  const fxn0 = conv.subs["$"](Filler, "$prop", input0)
  test.equal(
    conv.conv[""](fxn0, input0),
    fxn0,
    "should return the unmodified substitution function"
  )
  test.true(!input0.errors.length, "no errors")
  test.end()
})

tape(`conv["[]"]`, function(test) {
  const Filler = new Partjson({ template: {}, data: [] })
  test.equal(conv.conv[""], conv.conv["[]"], `should equal conv["[]"]`)
  test.end()
})

tape(`conv["()"]`, function(test) {
  const Filler = new Partjson()
  const input0 = { errors: [] }
  const subsFxn0 = conv.subs["$"](Filler, "$fxn", input0)
  const convFxn0 = conv.conv["()"](subsFxn0, input0, {})
  const fxn = row => row.prop
  const row = { fxn, prop: "dataProp" }
  const value = convFxn0(row)
  test.equal(
    value,
    "dataProp",
    "should call the substituted property as a function"
  )
  test.true(!input0.errors.length, "no errors")

  const input1 = { errors: [] }
  const subsFxn1 = conv.subs["$"](Filler, "$prop", input0)
  const convFxn1 = conv.conv["()"](subsFxn1, input1, {})
  test.equal(
    convFxn1({ prop: 1 }),
    undefined,
    "should error on a non-function $prop"
  )
  test.true(input1.errors.length > 0, "has errors")
  test.end()
})

tape(`conv["(]"]`, function(test) {
  test.equal(conv.conv["()"], conv.conv["(]"], `should equal conv["()"]`)
  test.end()
})
