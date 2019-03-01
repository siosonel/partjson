const tape = require('tape')
const Partjson = require("../dist/partjson.cjs.js")

tape("\n", function(test){
	test.pass("-***- ValFiller specs -***-")
	test.end()
});

tape("constructor", function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(filler.valFiller.Pj, filler, "should set this.Pj to the Partjson instance")
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

tape(`valFiller[","]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: (value)=>value == "z"}
	const fxn0 = (row) => row.prop
	const aggrFxn0 = filler.valFiller[","](fxn0, input0)
	const row = {prop: "dataProp"}
	const result = {}
	aggrFxn0(row, 'key', result)
	test.equal(
		result.key, 
		row.prop, 
		`should update the result with the substituted or converted value`
	)
	test.true(!input0.errors.length, "no errors")

	aggrFxn0({prop: "z"}, "key1", result)
	test.equal(result.key1, undefined, "should ignore a value as specified")
	test.end()
})

tape(`valFiller[",()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller[","],
		filler.valFiller[",()"],
		`should equal valFiller[","]`
	)
	test.end()
})

tape(`valFiller[",[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller[","],
		filler.valFiller[",[]"],
		`should equal valFiller[","]`
	)
	test.end()
})

tape(`valFiller[",(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller[","],
		filler.valFiller[",(]"],
		`should equal valFiller[","]`
	)
	test.end()
})

tape(`valFiller.getSeed`, function(test) {
	const filler = new Partjson()
	const seed0 = filler.valFiller.getSeed("")
	const result0 = {}
	seed0(result0, "key")
	test.true(Array.isArray(result0.key), "should seed an array")

	const seed1 = filler.valFiller.getSeed("distinct")
	const result1 = {}
	seed1(result1, "key")
	test.true(result1.key instanceof Set, "should seed a Set")
	test.equal(seed1.push, seed1.add, "should alias set.add with set.push")
	test.end()
})

tape(`valFiller["[],"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], templateVal: ["$prop"], ignore: (row)=>row.prop == "z"}
	const fxn0 = (row) => row.prop
	const aggrFxn0 = filler.valFiller["[],"](fxn0, input0)
	const row = {prop: "dataProp"}
	const result = {}
	aggrFxn0(row, 'key', result)
	test.true(
		Array.isArray(result.key) && result.key[0] == row.prop,
		`should update the result with the substituted or converted value`
	)
	test.true(!input0.errors.length)

	aggrFxn0({prop:"z"}, "key1", result)
	test.equal(result.key.length, 1, "should ignore a value as specified")

	const template = {test: ["$type", "distinct"]}
	const data = [{type: "a"}, {type: "a"}, {type: "b"}, {type: "c"}]
	const filler1 = new Partjson({template, data})
	test.deepEqual(filler1.tree, {test: ["a","b","c"]})
	test.end()
})

tape(`valFiller["[],()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["[],"],
		filler.valFiller["[],()"],
		`should equal valFiller["[],()"]`
	)
	test.end()
})

tape(`valFiller["[],[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], templateVal: ["$prop[]"], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = (row) => row.prop
	const aggrFxn0 = filler.valFiller["[],[]"](fxn0, input0)
	const row = {prop: ["a","b"]}
	const result = {}
	aggrFxn0(row, 'key', result, context0)
	test.true(Array.isArray(result.key))
	test.true(result.key[0], row.prop[0])
	test.true(result.key[1], row.prop[1])
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["[],(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["[],[]"],
		filler.valFiller["[],(]"],
		`should equal valFiller["[],[]"]`
	)

	const input0 = {errors: [], templateVal: ["$prop(]"], ignore: ()=>false}
	const fxn0 = (row) => row.prop
	const aggrFxn0 = filler.valFiller["[],(]"](fxn0, input0)
	const context0 = {errors: []}
	const arr = ["a","b"]
	const row = {prop: arr}
	const result = {}
	aggrFxn0(row, 'key', result, context0)
	test.true(Array.isArray(result.key))
	test.true(result.key[0], arr[0])
	test.true(result.key[1], arr[1])
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["+,"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = () => 1
	const aggrFxn0 = filler.valFiller["+,"](fxn0, input0)
	const row0 = {}
	const result0 = {}
	aggrFxn0(row0, 'key', result0, context0)
	test.equal(result0.key, 1, `should increment with a constant value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)

	const input1 = {errors: [], ignore: ()=>false}
	const context1 = {errors: []}
	const fxn1 = (row) => row.prop
	const aggrFxn1 = filler.valFiller["+,"](fxn1, input1)
	const row1 = {prop: 3}
	const result1 = {}
	aggrFxn1(row1, 'key', result1, context1)
	test.equal(result1.key, row1.prop, `should increment with a data value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["+,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["+,"],
		filler.valFiller["+,()"],
		`should equal valFiller["+,"]`
	)
	test.end()
})

tape(`valFiller["+,[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = () => [1, 2, 3]
	const aggrFxn0 = filler.valFiller["+,[]"](fxn0, input0)
	const row0 = {}
	const result0 = {}
	aggrFxn0(row0, 'key', result0, context0)
	test.equal(result0.key, 6, `should add all items in an array value to the result`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["+,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["+,[]"],
		filler.valFiller["+,(]"],
		`should equal valFiller["+,[]"]`
	)
	test.end()
})


tape(`valFiller["-,"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = () => 1
	const aggrFxn0 = filler.valFiller["-,"](fxn0, input0)
	const row0 = {}
	const result0 = {}
	aggrFxn0(row0, 'key', result0, context0)
	test.equal(result0.key, -1, `should increment with a constant value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["-,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["-,"],
		filler.valFiller["-,()"],
		`should equal valFiller["-,"]`
	)
	test.end()
})

tape(`valFiller["-,[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = () => [1, 2, 3]
	const aggrFxn0 = filler.valFiller["-,[]"](fxn0, input0)
	const row0 = {}
	const result0 = {}
	aggrFxn0(row0, 'key', result0, context0)
	test.equal(result0.key, -6, `should increment with a constant value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["-,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["-,[]"],
		filler.valFiller["-,(]"],
		`should equal valFiller["-,[]"]`
	)
	test.end()
})

tape(`valFiller["<,"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = (row) => row.val 
	const aggrFxn0 = filler.valFiller["<,"](fxn0, input0)
	const result0 = {}
	aggrFxn0({val:1}, 'key', result0, context0)
	aggrFxn0({val:3}, 'key', result0, context0)
	aggrFxn0({val:2}, 'key', result0, context0)
	test.equal(result0.key, 3, `should find the maximum`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["<,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["<,"],
		filler.valFiller["<,()"],
		`should equal valFiller["<,"]`
	)
	test.end()
})

tape(`valFiller["<,[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = (row) => row.val
	const aggrFxn0 = filler.valFiller["<,[]"](fxn0, input0)
	const result0 = {}
	aggrFxn0({val: [1,2]}, 'key', result0, context0)
	aggrFxn0({val: [3,0]}, 'key', result0, context0)
	aggrFxn0({val: [5,2]}, 'key', result0, context0)
	test.equal(result0.key, 5, `should spread values to find maximum`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["<,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller["<,[]"],
		filler.valFiller["<,(]"],
		`should equal valFiller["<,[]"]`
	)
	test.end()
})

tape(`valFiller[">,"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = (row) => row.val 
	const aggrFxn0 = filler.valFiller[">,"](fxn0, input0)
	const result0 = {}
	aggrFxn0({val:3}, 'key', result0, context0)
	aggrFxn0({val:1}, 'key', result0, context0)
	aggrFxn0({val:2}, 'key', result0, context0)
	test.equal(result0.key, 1, `should find the minimum value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller[">,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equal(
		filler.valFiller[">,"],
		filler.valFiller[">,()"],
		`should equal valFiller[">,"]`
	)
	test.end()
})

tape(`valFiller[">,[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const context0 = {errors: []}
	const fxn0 = (row) => row.val
	const aggrFxn0 = filler.valFiller[">,[]"](fxn0, input0)
	const result0 = {}
	aggrFxn0({val: [1,2]}, 'key', result0, context0)
	aggrFxn0({val: [3,0]}, 'key', result0, context0)
	aggrFxn0({val: [5,2]}, 'key', result0, context0)
	test.equal(result0.key, 0, `should spread values to find the minimum`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller[">,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
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
	const ignore = {"@": (value) => typeof value === "undefined"}
	const input0 = {errors: []}
	const fxn0 = filler.valFiller.strFiller(input0, ignore, "$prop")
	const result = {}
	fxn0({prop:"a"}, "key", result)
	test.equal(result.key, "a", "should return a string filler")
	test.end()
})

tape(`valFiller.arrFiller`, function(test) {
	const filler = new Partjson()
	const ignore = {"@": (value) => typeof value === "undefined"}
	const templateVal = ["$prop"]
	const input0 = {errors: [], templateVal}
	const fxn0 = filler.valFiller.arrFiller(input0, ignore, templateVal)
	const result = {test:[]}
	fxn0({prop:"a"}, "test", result)
	test.equal(result.test[0], "a", "should return an array filler")
	test.end()
})

tape(`valFiller.objFiller`, function(test) {
	const filler = new Partjson()
	const ignore = {"@": (value) => typeof value === "undefined"}
	const templateVal = {"$prop": "+1"}
	const input0 = {errors: [], templateVal, inheritedIgnore: ignore}
	const fxn0 = filler.valFiller.objFiller(input0, ignore, templateVal)
	const result = {}
	fxn0({prop:"a"}, "key", result)
	fxn0({prop:"b"}, "key", result)
	test.deepEqual(result, {key:{a:1,b:1}}, "should return an object filler")
	test.end()
})

tape(`valFiller.defaultFiller`, function(test) {
	const filler = new Partjson()
	const ignore = {"@": (value) => typeof value === "undefined"}
	const templateVal = 99
	const input0 = {errors: [], templateVal, inheritedIgnore: ignore}
	const fxn0 = filler.valFiller.defaultFiller(input0, ignore, templateVal)
	const result = {}
	fxn0({prop:"a"}, "key", result)
	test.equal(result.key, 99, "should return the unmodified template value")
	test.end()
})

tape(`valFiller[{}]`, function(test) {
	const template = {
		test: [{
			"$type": "+1"
		}]
	}
	const data = [
		{type: "a"},
		{type: "a"},
		{type: "b"},
		{type: "c"}
	]
	const filler = new Partjson({template, data})
	test.deepEqual(
		filler.tree, 
		{test:[{a:1}, {a:1}, {b:1}, {c:1}]},
		`should collect objects within an array`
	)
	test.end()
})

tape(`valFiller[[,]]`, function(test) {
	const template0 = {
		test: [["$type", "+1"]]
	}
	const data = [
		{type: "a"},
		{type: "a"},
		{type: "b"},
		{type: "c"}
	]
	const filler0 = new Partjson({template: template0, data})
	test.deepEqual(
		filler0.tree, 
		{test:[["a",1], ["a",1], ["b",1], ["c",1]]},
		`should create an array of arrays`
	)

	const template1 = {
		test: [["$type", "+1"], "map"]
	}
	const filler1 = new Partjson({template: template1, data})
	test.deepEqual(
		filler1.tree, 
		{test:[["a",2], ["b",1], ["c",1]]},
		`should create a map`
	)
	test.end()
})
