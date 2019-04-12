const tape = require("tape")
const Partjson = require("../dist/partjson.umd")

tape("\n", function(test) {
  test.pass("-***- KeyFiller specs -***-")
  test.end()
})

tape("constructor", function(test) {
  const filler = new Partjson()
  const kf = filler.keyFiller
  test.equal(kf.Pj, filler, "should set this.Pj to the Partjson instance")
  test.true(kf.allowedKeyTypes instanceof Set, "should set allowedKeyTypes")
  test.true(kf.allowedKeyTypes.has("string"), "should allow string keys")
  test.true(kf.allowedKeyTypes.has("number"), "should allow number keys")
  test.end()
})

tape(`getAllowedKeys`, function(test) {
  const filler = new Partjson()
  const input0 = { errors: [], ignore: value => value == "z" }
  const context0 = { errors: [] }
  const keys0 = filler.keyFiller.getAllowedKeys(
    ["a", undefined],
    {},
    input0,
    context0
  )
  test.deepEqual(keys0, ["a"], "should filter out unallowed keys")
  test.equal(input0.errors.length, 0)
  test.equal(context0.errors.length, 1)

  const input1 = { errors: [], ignore: value => value == "z" }
  const context1 = { errors: [] }
  const keys1 = filler.keyFiller.getAllowedKeys(
    ["a", "z"],
    {},
    input1,
    context1
  )
  test.deepEqual(keys0, ["a"], "should filter out ignored keys")
  test.equal(input1.errors.length, 0)
  test.equal(context1.errors.length, 0)

  const input2 = { errors: [], ignore: value => value == "z" }
  const context2 = { errors: [] }
  const keys2 = filler.keyFiller.getAllowedKeys("a", {}, input2, context2)
  test.equal(input2.errors.length, 0)
  test.deepEqual(
    context2.errors,
    [["key", "NON-ARRAY-KEYS", {}]],
    "should error on non-array keys"
  )
  test.end()
})

tape(`keyFiller[""]`, function(test) {
  const filler = new Partjson()
  const fxn0 = () => "a"
  const input0 = { errors: [], ignore: () => false }
  const keyFxn0 = filler.keyFiller[""](fxn0, input0)
  test.deepEqual(
    keyFxn0({}, {}),
    ["a"],
    "should wrap the substituted key in an array"
  )
  test.true(!input0.errors.length)
  test.end()
})

tape(`keyFiller["()"]`, function(test) {
  const filler = new Partjson()
  test.equal(filler.keyFiller[""], filler.keyFiller[""], `should equal [""]`)
  test.end()
})

tape(`keyFiller["[]"]`, function(test) {
  const filler = new Partjson()
  const fxn0 = () => ["a", "b"]
  const input0 = { errors: [], ignore: () => false }
  const keyFxn0 = filler.keyFiller["[]"](fxn0, input0)
  test.deepEqual(keyFxn0({}, {}), ["a", "b"], "should return an array")
  test.true(!input0.errors.length)
  test.end()
})

tape(`keyFiller["(]"]`, function(test) {
  const filler = new Partjson()
  test.equal(
    filler.keyFiller["(]"],
    filler.keyFiller["[]"],
    `should equal ["[]"]`
  )
  test.end()
})

tape(`getFxn`, function(test) {
  const filler = new Partjson()
  const ignore = { "@": () => false }
  const term = "$prop"
  const input0 = { errors: [], term }
  const fxn0 = filler.keyFiller.getFxn(input0, ignore)
  test.deepEqual(
    fxn0({ prop: "a" }),
    ["a"],
    "should return an array of one key"
  )
  test.end()
})
