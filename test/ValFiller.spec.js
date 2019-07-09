const tape = require("tape")
const Partjson = require("../dist/partjson.umd")

tape("\n", function(test) {
  test.pass("-***- ValFiller specs -***-")
  test.end()
})

tape("constructor", function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller.Pj,
    filler,
    "should set this.Pj to the Partjson instance"
  )
  test.end()
})

tape(`valFiller.isNumeric`, function(test) {
  const filler = new Partjson()
  test.true(filler.valFiller.isNumeric("99"))
  test.true(filler.valFiller.isNumeric("0"))
  test.false(filler.valFiller.isNumeric(null))
  test.false(filler.valFiller.isNumeric(""))
  test.end()
})

tape(`valFiller.defaultFiller`, function(test) {
  const filler = new Partjson()
  const template = { arr: [], obj: [] }
  const fxn = filler.valFiller.defaultFiller(null, null, template.arr)
  const result = {}
  fxn(null, "arr", result)
  test.notEqual(result.arr, template.arr, "must copy a template array value")
  fxn(null, "obj", result)
  test.notEqual(result.obj, template.obj, "must copy a template object value")
  test.end()
})

tape(`valFiller[","]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = { errors: [], ignore: value => value == "z" }
  const fxn0 = row => row.prop
  const aggrFxn0 = filler.valFiller[","](fxn0, input0)
  const row = { prop: "dataProp" }
  const result = {}
  aggrFxn0(row, "key", result)
  test.equal(
    result.key,
    row.prop,
    `should update the result with the substituted or converted value`
  )
  test.true(!input0.errors.length, "no errors")

  aggrFxn0({ prop: "z" }, "key1", result)
  test.equal(result.key1, undefined, "should ignore a value as specified")
  test.end()
})

tape(`valFiller[",()"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller[","],
    filler.valFiller[",()"],
    `should equal valFiller[","]`
  )
  test.end()
})

tape(`valFiller[",[]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller[","],
    filler.valFiller[",[]"],
    `should equal valFiller[","]`
  )
  test.end()
})

tape(`valFiller[",(]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller[","],
    filler.valFiller[",(]"],
    `should equal valFiller[","]`
  )
  test.end()
})

tape(`valFiller.getArrSeed`, function(test) {
  const filler = new Partjson()
  const seed0 = filler.valFiller.getArrSeed({ templateVal: [, 0] })
  const result0 = {}
  seed0(result0, "key")
  test.true(Array.isArray(result0.key), "should seed an array")

  const seed1 = filler.valFiller.getArrSeed({ templateVal: [, "set"] })
  const result1 = {}
  seed1(result1, "key")
  test.true(result1.key instanceof Set, "should seed a Set")

  const seed2 = {
    total: 3,
    props: ["a"],
    byKey: {
      c: 3
    },
    arr: [{ prop: "d" }]
  }
  const filler2 = new Partjson({
    template: {
      total: "+1",
      props: ["$prop"],
      byKey: {
        $prop: "+1"
      },
      arr: [{ prop: "$prop" }]
    },
    seed: JSON.stringify(seed2)
  })
  test.deepEqual(
    filler2.tree,
    seed2,
    "should use the user-supplied seed for array aggregation"
  )

  const filler2a = new Partjson({
    template: {
      props: ["$prop", "set"]
    },
    seed: JSON.stringify({
      props: ["a"]
    }),
    data: [{ prop: 1 }]
  })
  test.deepEqual(
    filler2a.tree.props,
    new Set(["a"]),
    "should use the user-supplied seed for Set aggregation"
  )

  const filler3 = new Partjson({
    template: {
      $id: ["$prop"]
    },
    data: [
      { id: "a", prop: 0 },
      { id: "a", prop: 1 },
      { id: "b", prop: 0 },
      { id: "b", prop: 1 },
      { id: "b", prop: 2 }
    ]
  })
  test.deepEqual(
    filler3.tree,
    { a: [0, 1], b: [0, 1, 2] },
    "should not share an array value-frequency tracker between results"
  )

  test.end()
})

tape(`valFiller["[],"]`, function(test) {
  const filler0 = new Partjson({ template: {}, data: [] })
  const input0 = {
    errors: [],
    templateVal: ["$prop", 0],
    ignore: value => value == "z"
  }
  const fxn0 = row => row.prop
  const aggrFxn0 = filler0.valFiller["[],"](fxn0, input0)
  const row = { prop: "dataProp" }
  const result = {}
  aggrFxn0(row, "key", result)
  test.deepEqual(
    result.key,
    [row.prop],
    `should update the result with the substituted or converted value`
  )
  test.true(!input0.errors.length)
  aggrFxn0({ prop: "z" }, "key1", result)
  test.deepEqual(result.key1, undefined, "should ignore a value as specified")

  const input0a = {
    errors: [],
    templateVal: ["$prop", "invalid-option"],
    ignore: value => value == "z"
  }
  const aggrFxn0a = filler0.valFiller["[],"](fxn0, input0a)
  test.equal(
    aggrFxn0a,
    undefined,
    "should not give an aggr fxn when the option is invalid"
  )
  test.deepEqual(
    input0a.errors,
    [["val", "INVALID-[]-OPTION"]],
    `should result in an input error on an invalid option`
  )

  const template = { test: ["$type"] }
  const data = [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  const filler1 = new Partjson({ template, data })
  test.deepEqual(filler1.tree, { test: ["a", "b", "c"] })

  const template2 = { test: ["$type", 2] }
  const data2 = [{ type: "a" }, { type: "a" }, { type: "a" }, { type: "c" }]
  const filler2 = new Partjson({ template: template2, data: data2 })
  test.deepEqual(filler2.tree, { test: ["a", "a", "c"] })

  test.end()
})

tape(`valFiller["[],()"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["[],"],
    filler.valFiller["[],()"],
    `should equal valFiller["[],()"]`
  )
  test.end()
})

tape(`valFiller["[],[]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = {
    errors: [],
    templateVal: ["$prop[]", 0],
    ignore: val => val == "c"
  }
  const context0 = { errors: [] }
  const fxn0 = row => row.prop
  const aggrFxn0 = filler.valFiller["[],[]"](fxn0, input0)
  const row = { prop: ["a", "b", "c"] }
  const result = {}
  aggrFxn0(row, "key", result, context0)
  test.true(Array.isArray(result.key))
  test.equal(result.key[0], row.prop[0])
  test.equal(result.key[1], row.prop[1])
  test.equal(result.key.length, 2, "should not add a key for ignored values")
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller["[],[]"](fxn1, input1)
  const result1 = {}
  const row1a = { prop: 1 }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    context1.errors,
    [[input1, "NON-ARRAY-VALS", row1a]],
    "should error on non-array values"
  )
  test.end()
})

tape(`valFiller["[],(]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["[],[]"],
    filler.valFiller["[],(]"],
    `should equal valFiller["[],[]"]`
  )

  const input0 = {
    errors: [],
    templateVal: ["$prop(]", 0],
    ignore: () => false
  }
  const fxn0 = row => row.prop
  const aggrFxn0 = filler.valFiller["[],(]"](fxn0, input0)
  const context0 = { errors: [] }
  const arr = ["a", "b"]
  const row = { prop: arr }
  const result = {}
  aggrFxn0(row, "key", result, context0)
  test.true(Array.isArray(result.key))
  test.true(result.key[0], arr[0])
  test.true(result.key[1], arr[1])
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)
  test.end()
})

tape(`valFiller["+,"]`, function(test) {
  const filler = new Partjson()
  const input0 = { errors: [], ignore: () => false }
  const context0 = { errors: [] }
  const fxn0 = () => 1
  const aggrFxn0 = filler.valFiller["+,"](fxn0, input0)
  const row0 = {}
  const result0 = {}
  aggrFxn0(row0, "key", result0, context0)
  test.equal(result0.key, 1, `should increment with a constant value`)
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.prop
  const aggrFxn1 = filler.valFiller["+,"](fxn1, input1)
  const row1 = { prop: 3 }
  const result1 = {}
  aggrFxn1(row1, "key", result1, context1)
  test.equal(result1.key, row1.prop, `should increment with a data value`)
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input2 = { errors: [], ignore: () => false }
  const context2 = { errors: [] }
  const fxn2 = row => row.prop
  const aggrFxn2 = filler.valFiller["+,"](fxn2, input2)
  const result2 = {}
  aggrFxn2({ prop: 1 }, "key", result2, context2)
  test.equal(result2.key, 1, `should increment with a data value`)
  aggrFxn2({ prop: "a" }, "key", result2, context2)
  test.deepEqual(
    context2.errors,
    [[input2, "NON-NUMERIC-INCREMENT", { prop: "a" }]],
    "should not increment with a non-numeric value"
  )
  test.end()
})

tape(`valFiller["+,()"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["+,"],
    filler.valFiller["+,()"],
    `should equal valFiller["+,"]`
  )
  test.end()
})

tape(`valFiller["+,[]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = {
    errors: [],
    ignore: val => val == 4
  }
  const context0 = { errors: [] }
  const fxn0 = () => [1, 2, 3, 4]
  const aggrFxn0 = filler.valFiller["+,[]"](fxn0, input0)
  const row0 = {}
  const result0 = {}
  aggrFxn0(row0, "key", result0, context0)
  test.equal(
    result0.key,
    6,
    `should add all non-ignored items in an array value to the result`
  )
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller["+,[]"](fxn1, input1)
  const result1 = {}
  const row1a = { val: 1 }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    input1.errors,
    [["val", "NON-ARRAY-VALS", row1a]],
    "should error on non-array values"
  )

  const input2 = { errors: [], ignore: () => false }
  const context2 = { errors: [] }
  const fxn2 = row => row.prop
  const aggrFxn2 = filler.valFiller["+,[]"](fxn2, input2)
  const result2 = {}
  aggrFxn2({ prop: [1] }, "key", result2, context2)
  test.equal(result2.key, 1, `should increment with a data value`)
  aggrFxn2({ prop: ["a"] }, "key", result2, context2)
  test.deepEqual(
    context2.errors,
    [[input2, "NON-NUMERIC-INCREMENT", { prop: ["a"] }]],
    "should not increment with a non-numeric value"
  )

  test.end()
})

tape(`valFiller["+,(]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["+,[]"],
    filler.valFiller["+,(]"],
    `should equal valFiller["+,[]"]`
  )
  test.end()
})

tape(`valFiller["-,"]`, function(test) {
  const filler = new Partjson()
  const input0 = { errors: [], ignore: () => {} }
  const context0 = { errors: [] }
  const fxn0 = () => 1
  const aggrFxn0 = filler.valFiller["-,"](fxn0, input0)
  const result0 = {}
  aggrFxn0({}, "key", result0, context0)
  test.equal(result0.key, -1, `should increment with a constant value`)
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: val => val == 2 }
  const context1 = { errors: [] }
  const fxn1 = () => 2
  const aggrFxn1 = filler.valFiller["-,"](fxn1, input1)
  const result1 = {}
  aggrFxn1({}, "key", result1, context1)
  test.equal(result1.key, 0, `should not increment with an ignored value`)
  test.true(!input1.errors.length && !context1.errors.length, `no errors`)

  test.end()
})

tape(`valFiller["-,()"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["-,"],
    filler.valFiller["-,()"],
    `should equal valFiller["-,"]`
  )
  test.end()
})

tape(`valFiller["-,[]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = { errors: [], ignore: val => val == 4 }
  const context0 = { errors: [] }
  const fxn0 = () => [1, 2, 3, 4]
  const aggrFxn0 = filler.valFiller["-,[]"](fxn0, input0)
  const row0 = {}
  const result0 = {}
  aggrFxn0(row0, "key", result0, context0)
  aggrFxn0(row0, "key", result0, context0)
  test.equal(
    result0.key,
    -12,
    `should increment with all non-ignored constant value`
  )
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller["-,[]"](fxn1, input1)
  const result1 = {}
  const row1a = { val: 1 }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    input1.errors,
    [["val", "NON-ARRAY-VALS", row1a]],
    "should error on non-array values"
  )

  test.end()
})

tape(`valFiller["-,(]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["-,[]"],
    filler.valFiller["-,(]"],
    `should equal valFiller["-,[]"]`
  )
  test.end()
})

tape(`valFiller["<,"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = { errors: [], ignore: val => val == 4 }
  const context0 = { errors: [] }
  const fxn0 = row => row.val
  const aggrFxn0 = filler.valFiller["<,"](fxn0, input0)
  const result0 = {}
  aggrFxn0({ val: 1 }, "key", result0, context0)
  aggrFxn0({ val: 3 }, "key", result0, context0)
  aggrFxn0({ val: 2 }, "key", result0, context0)
  aggrFxn0({ val: 4 }, "key", result0, context0)
  test.equal(result0.key, 3, `should find the maximum non-ignored value`)
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller["<,"](fxn1, input1)
  const result1 = {}
  const row1a = { val: ["a"] }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    context1.errors,
    [[input1, "NON-NUMERIC-THAN", row1a]],
    "should error on non-numeric values"
  )
  test.end()
})

tape(`valFiller["<,()"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["<,"],
    filler.valFiller["<,()"],
    `should equal valFiller["<,"]`
  )
  test.end()
})

tape(`valFiller["<,[]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = { errors: [], ignore: val => val == 9 }
  const context0 = { errors: [] }
  const fxn0 = row => row.val
  const aggrFxn0 = filler.valFiller["<,[]"](fxn0, input0)
  const result0 = {}
  aggrFxn0({ val: [1, 2] }, "key", result0, context0)
  aggrFxn0({ val: [3, 0] }, "key", result0, context0)
  aggrFxn0({ val: [5, 2] }, "key", result0, context0)
  aggrFxn0({ val: [9] }, "key", result0, context0)
  test.equal(
    result0.key,
    5,
    `should spread values to find the maximum non-ignored value`
  )
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller["<,[]"](fxn1, input1)
  const result1 = {}
  const row1a = { val: 1 }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    input1.errors,
    [["val", "NON-ARRAY-VALS", row1a]],
    "should error on non-array values"
  )
  const row1b = { val: ["a"] }
  aggrFxn1(row1b, "key", result1, context1)
  test.deepEqual(
    context1.errors,
    [[input1, "NON-NUMERIC-THAN", row1b]],
    "should error on non-numeric values"
  )

  test.end()
})

tape(`valFiller["<,(]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller["<,[]"],
    filler.valFiller["<,(]"],
    `should equal valFiller["<,[]"]`
  )
  test.end()
})

tape(`valFiller[">,"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = { errors: [], ignore: val => val == -1 }
  const context0 = { errors: [] }
  const fxn0 = row => row.val
  const aggrFxn0 = filler.valFiller[">,"](fxn0, input0)
  const result0 = {}
  aggrFxn0({ val: 3 }, "key", result0, context0)
  aggrFxn0({ val: 1 }, "key", result0, context0)
  aggrFxn0({ val: 2 }, "key", result0, context0)
  aggrFxn0({ val: -1 }, "key", result0, context0)
  test.equal(result0.key, 1, `should find the minimum non-ignored value`)
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller[">,"](fxn1, input1)
  const result1 = {}
  const row1a = { val: ["a"] }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    context1.errors,
    [[input1, "NON-NUMERIC-THAN", row1a]],
    "should error on non-numeric values"
  )
  test.end()
})

tape(`valFiller[">,()"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller[">,"],
    filler.valFiller[">,()"],
    `should equal valFiller[">,"]`
  )
  test.end()
})

tape(`valFiller[">,[]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  const input0 = { errors: [], ignore: val => val == -1 }
  const context0 = { errors: [] }
  const fxn0 = row => row.val
  const aggrFxn0 = filler.valFiller[">,[]"](fxn0, input0)
  const result0 = {}
  aggrFxn0({ val: [1, 2] }, "key", result0, context0)
  aggrFxn0({ val: [3, 0] }, "key", result0, context0)
  aggrFxn0({ val: [5, 2] }, "key", result0, context0)
  aggrFxn0({ val: [-1] }, "key", result0, context0)
  test.equal(
    result0.key,
    0,
    `should spread values to find the minimum non-ignored value`
  )
  test.true(!input0.errors.length && !context0.errors.length, `no errors`)

  const input1 = { errors: [], ignore: () => false }
  const context1 = { errors: [] }
  const fxn1 = row => row.val
  const aggrFxn1 = filler.valFiller[">,[]"](fxn1, input1)
  const result1 = {}
  const row1a = { val: 1 }
  aggrFxn1(row1a, "key", result1, context1)
  test.deepEqual(
    input1.errors,
    [["val", "NON-ARRAY-VALS", row1a]],
    "should error on non-array values"
  )
  const row1b = { val: ["a"] }
  aggrFxn1(row1b, "key", result1, context1)
  test.deepEqual(
    context1.errors,
    [[input1, "NON-NUMERIC-THAN", row1b]],
    "should error on non-numeric values"
  )

  test.end()
})

tape(`valFiller[">,(]"]`, function(test) {
  const filler = new Partjson({ template: {}, data: [] })
  test.equal(
    filler.valFiller[">,[]"],
    filler.valFiller[">,(]"],
    `should equal valFiller[">,[]"]`
  )
  test.end()
})

tape(`valFiller.getValType`, function(test) {
  const filler = new Partjson()
  const getValType = filler.valFiller.getValType
  test.equal(getValType("string"), "str")
  test.equal(getValType([]), "arr")
  test.equal(getValType({}), "obj")
  test.notEqual(getValType(null), "obj")
  test.equal(getValType(undefined), "default")
  test.equal(getValType(1), "default", "give the correct custom type")
  test.end()
})

tape(`valFiller.strFiller`, function(test) {
  const filler = new Partjson()
  const ignore = { "@": value => typeof value === "undefined" }
  const input0 = { errors: [] }
  const fxn0 = filler.valFiller.strFiller(input0, ignore, "$prop")
  const result = {}
  fxn0({ prop: "a" }, "key", result)
  test.equal(result.key, "a", "should return a string filler")

  const input1 = { errors: [] }
  test.equal(
    filler.valFiller.strFiller(input1, ignore, "$prop", ".."),
    undefined,
    "should not return a function for unknown aggr symbol"
  )
  test.equal(input1.errors.length, 0, "no errors")
  test.end()
})

tape(`valFiller.arrFiller`, function(test) {
  const filler = new Partjson()
  const ignore = { "@": value => typeof value === "undefined" }
  const templateVal = ["$prop", 0]
  const input0 = { errors: [], templateVal }
  const fxn0 = filler.valFiller.arrFiller(input0, ignore, templateVal)
  const result = {}
  fxn0({ prop: "a" }, "test", result)
  test.equal(result.test[0], "a", "should return an array filler")

  const templateVal1 = ["$prop"]
  const input1 = { errors: [], templateVal: templateVal1 }
  const fxn1 = filler.valFiller.arrFiller(input1, ignore, templateVal1)
  const result1 = {}
  fxn1({ prop: "a" }, "test", result1)
  test.equal([...result1.test][0], "a", "should return an array filler")
  test.end()
})

tape(`valFiller.objFiller`, function(test) {
  const filler = new Partjson()
  const ignore = { "@": value => typeof value === "undefined" }
  const templateVal = { $prop: "+1" }
  const input0 = { errors: [], templateVal, inheritedIgnore: ignore }
  const fxn0 = filler.valFiller.objFiller(input0, ignore, templateVal)
  const result = {}
  fxn0({ prop: "a" }, "key", result)
  fxn0({ prop: "b" }, "key", result)
  test.deepEqual(
    result,
    { key: { a: 1, b: 1 } },
    "should return an object filler"
  )
  test.end()
})

tape(`valFiller.defaultFiller`, function(test) {
  const filler = new Partjson()
  const ignore = { "@": value => typeof value === "undefined" }
  const templateVal = 99
  const input0 = { errors: [], templateVal, inheritedIgnore: ignore }
  const fxn0 = filler.valFiller.defaultFiller(input0, ignore, templateVal)
  const result = {}
  fxn0({ prop: "a" }, "key", result)
  test.equal(result.key, 99, "should return the unmodified template value")
  test.end()
})

tape.only(`valFiller[{}]`, function(test) {
  const filler = new Partjson({
    template: {
      test: [
        {
          $type: "+1"
        }
      ]
    },
    data: [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  })
  test.deepEqual(
    filler.tree,
    { test: [{ a: 1 }, { a: 1 }, { b: 1 }, { c: 1 }] },
    `should collect objects within an array`
  )

  const filler1 = new Partjson({
    template: {
      test: [
        {
          name: "$type",
          total: "+1"
        },
        "$type"
      ]
    },
    data: [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  })
  test.deepEqual(
    filler1.tree,
    {
      test: [
        { name: "a", total: 2 },
        { name: "b", total: 1 },
        { name: "c", total: 1 }
      ]
    },
    `should collect unique-by-key-value objects within an array`
  )

  const filler2 = new Partjson({
    template: {
      "@join()": {
        test: "=val()"
      },
      test: [
        {
          type: "$type",
          total: "+1",
          sub: [
            {
              val: "&test.val",
              total: "+1",
              sub: [
                {
                  category: "$category",
                  total: "+1"
                },
                "$category"
              ]
            },
            "&test.val"
          ]
        },
        "$type"
      ]
    },
    data: [
      { type: "a", category: "x" },
      { type: "a", category: "x" },
      { type: "b", category: "x" },
      { type: "c", category: "x" }
    ],
    "=": {
      val(row) {
        return row.type == "c" ? { val: "c" } : { val: "ab" }
      }
    }
  })
  test.deepEqual(
    filler2.tree,
    {
      test: [
        {
          type: "a",
          total: 2,
          sub: [
            {
              val: "ab",
              total: 2,
              sub: [
                {
                  category: "x",
                  total: 2
                }
              ]
            }
          ]
        },
        {
          type: "b",
          total: 1,
          sub: [
            {
              val: "ab",
              total: 1,
              sub: [
                {
                  category: "x",
                  total: 1
                }
              ]
            }
          ]
        },
        {
          type: "c",
          total: 1,
          sub: [
            {
              val: "c",
              total: 1,
              sub: [
                {
                  category: "x",
                  total: 1
                }
              ]
            }
          ]
        }
      ]
    },
    `should collect unique-by-joined-value objects within nested arrays`
  )

  const filler4 = new Partjson({
    template: {
      test: [
        {
          name: "$type",
          total: "+1"
        },
        []
      ]
    },
    data: [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  })
  test.deepEqual(
    [...filler4.errors.allErrSet],
    [["val", "INVALID-[{}]-OPTION"]],
    "should error on invalid option for an array collection of objects"
  )

  const filler5 = new Partjson({
    template: {
      test: [
        {
          name: "$type",
          total: "+1"
        },
        "+$type()"
      ]
    },
    data: [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  })
  test.deepEqual(
    [...filler5.errors.allErrSet],
    [["val", "INVALID-[{}]-OPTION-TOKEN"]],
    "should error on invalid option token for an array collection of objects"
  )

  const filler6 = new Partjson({
    template: {
      "@join()": {
        test: "=val()"
      },
      test: [
        {
          type: "@key",
          total: "+1",
          sub: [
            {
              val: "@key",
              total: "+1",
              sub: [
                {
                  category: "@key",
                  total: "+1"
                },
                "$category[]"
              ]
            },
            "&test.val[]"
          ]
        },
        "$type"
      ]
    },
    data: [
      { type: "a", category: ["x", "y"] },
      { type: "a", category: ["x", "z"] },
      { type: "b", category: ["x"] },
      { type: "c", category: ["x", "w", "v"] }
    ],
    "=": {
      val(row) {
        return row.type == "c" ? { val: ["r", "s"] } : { val: ["t"] }
      }
    }
  })
  test.deepEqual(
    filler6.tree,
    {
      test: [
        {
          type: "a",
          total: 2,
          sub: [
            {
              val: "t",
              total: 2,
              sub: [
                { category: "x", total: 2 },
                { category: "y", total: 1 },
                { category: "z", total: 1 }
              ]
            }
          ]
        },
        {
          type: "b",
          total: 1,
          sub: [{ val: "t", total: 1, sub: [{ category: "x", total: 1 }] }]
        },
        {
          type: "c",
          total: 1,
          sub: [
            {
              val: "r",
              total: 1,
              sub: [
                { category: "x", total: 1 },
                { category: "w", total: 1 },
                { category: "v", total: 1 }
              ]
            },
            {
              val: "s",
              total: 1,
              sub: [
                { category: "x", total: 1 },
                { category: "w", total: 1 },
                { category: "v", total: 1 }
              ]
            }
          ]
        }
      ]
    },
    `should collect unique-by-joined-array-of-values objects within nested array`
  )

  test.end()
})

tape(`valFiller[[,]]`, function(test) {
  const template0 = {
    test: [["$type", "+1"]]
  }
  const data = [{ type: "a" }, { type: "a" }, { type: "b" }, { type: "c" }]
  const filler0 = new Partjson({ template: template0, data })
  test.deepEqual(
    filler0.tree,
    { test: [["a", 1], ["a", 1], ["b", 1], ["c", 1]] },
    `should create an array of arrays`
  )

  const template1 = {
    test: [["$type", "+1"], "map"]
  }
  const filler1 = new Partjson({ template: template1, data })
  test.deepEqual(
    filler1.tree,
    { test: new Map([["a", 2], ["b", 1], ["c", 1]]) },
    `should create a map`
  )
  const filler2 = new Partjson({
    template: template1,
    data,
    arrayedValues: true
  })
  test.deepEqual(
    filler2.tree,
    { test: new Map([["a", 2], ["b", 1], ["c", 1]]) },
    `should create a map`
  )
  test.end()
})
