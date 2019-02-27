const tape = require('tape')
const Partjson = require("../dist/partjson.cjs.js")

tape("\n", function(test){
	test.pass("-***- ValFiller specs -***-")
	test.end()
});

tape(`valFiller[","]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const fxn0 = (row) => row.prop
	const aggrFxn0 = filler.valFiller[","](fxn0, input0)
	const row = {prop: "dataProp"}
	const result = {}
	aggrFxn0(row, 'key', result)
	test.equals(
		result.key, 
		row.prop, 
		`should update the result with the substituted or converted value`
	)
	test.true(!input0.errors.length, "no errors")
	test.end()
})

tape(`valFiller[",()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[","],
		filler.valFiller[",()"],
		`should equal valFiller[","]`
	)
	test.end()
})

tape(`valFiller[",[]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[","],
		filler.valFiller[",[]"],
		`should equal valFiller[","]`
	)
	test.end()
})

tape(`valFiller[",(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[","],
		filler.valFiller[",(]"],
		`should equal valFiller[","]`
	)
	test.end()
})

tape(`valFiller["[],"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], templateVal: ["$prop"], ignore: ()=>false}
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

	const template = {test: ["$type", "distinct"]}
	const data = [{type: "a"}, {type: "a"}, {type: "b"}, {type: "c"}]
	const filler1 = new Partjson({template, data})
	test.deepEquals(filler1.tree, {test: ["a","b","c"]})
	test.end()
})

tape(`valFiller["[],()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(
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
	test.equals(result0.key, 1, `should increment with a constant value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)

	const input1 = {errors: [], ignore: ()=>false}
	const context1 = {errors: []}
	const fxn1 = (row) => row.prop
	const aggrFxn1 = filler.valFiller["+,"](fxn1, input1)
	const row1 = {prop: 3}
	const result1 = {}
	aggrFxn1(row1, 'key', result1, context1)
	test.equals(result1.key, row1.prop, `should increment with a data value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["+,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, 6, `should add all items in an array value to the result`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["+,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, -1, `should increment with a constant value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["-,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, -6, `should increment with a constant value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["-,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, 3, `should find the maximum`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["<,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, 5, `should spread values to find maximum`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller["<,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, 1, `should find the minimum value`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller[">,()"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
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
	test.equals(result0.key, 0, `should spread values to find the minimum`)
	test.true(!input0.errors.length && !context0.errors.length, `no errors`)
	test.end()
})

tape(`valFiller[">,(]"]`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[">,[]"],
		filler.valFiller[">,(]"],
		`should equal valFiller[">,[]"]`
	)
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
	test.deepEquals(
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
	test.deepEquals(
		filler0.tree, 
		{test:[["a",1], ["a",1], ["b",1], ["c",1]]},
		`should create an array of arrays`
	)

	const template1 = {
		test: [["$type", "+1"], "map"]
	}
	const filler1 = new Partjson({template: template1, data})
	test.deepEquals(
		filler1.tree, 
		{test:[["a",2], ["b",1], ["c",1]]},
		`should create a map`
	)
	test.end()
})
