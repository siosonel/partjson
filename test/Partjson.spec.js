const tape = require('tape')
// define a window global, which is used in bundles
window = Object.create(null)
const Partjson = require("../dist/partjson.cjs.js")

function getOpts(template={}, _data=null) {
	const data = Array.isArray(_data) 
		? data 
		: [
			{"line #":1,"catname":"Jerry","catsex":"male","owners":"Bob","ownerblock":"A1","huntblock":"B1","huntdate":"2019-01-02 19:25","preytype":"bird","preysubtype":"robin","preymass":0.596,"nested":{"random":{"id":"a10c"}}},
			{"line #":2,"catname":"Jerry","catsex":"male","owners":"Bob","ownerblock":"A1","huntblock":"B4","huntdate":"2019-01-04 20:45","preytype":"mammal","preysubtype":"rat","preymass":0.601,"nested":{"random":{"id":"bkd0"}}},
			{"line #":3,"catname":"Jerry","catsex":"male","owners":"Bob,Jane","ownerblock":"A1","huntblock":"C3","huntdate":"2019-01-07 06:45","preytype":"mammal","preysubtype":"squirel","preymass":0.8,"nested":{"random":{"id":"jjkl"}}},
			{"line #":4,"catname":"Princess","catsex":"female","owners":"Alice,Joe","ownerblock":"C2","huntblock":"C3","huntdate":"2019-01-05 09:45","preytype":"fish","preysubtype":"minnow","preymass":0.1,"nested":{"random":{"id":"hgys"}}},
			{"line #":5,"catname":"Princess","catsex":"female","owners":"Alice,Mike","ownerblock":"C2","huntblock":"C3","huntdate":"2019-01-07 09:45","preytype":"fish","preysubtype":"catfish","preymass":1.6,"nested":{"random":{"id":"irty"}}},
			{"line #":6,"catname":"Princess","catsex":"female","owners":"Alice,Mike","ownerblock":"C2","huntblock":"C3","huntdate":"2019-01-09 09:45","preytype":"amphibian","preysubtype":"frog","preymass":0.7,"nested":{"random":{"id":"34jd"}}}
		];

	return {
		template,
		data,
		"=": {
			prop: "extVal",
			arr: ["a", "b"],
			fxn: (row) => row.dataProp,
			nested: {
				sub: {
					sub: "extVal"
				}
			}
		},
	}
}

tape("A passing test", function(test){
	test.pass("This test will pass.")
	test.end()
});

tape("parseTerm should parse terms correctly", function(test){
	const filler = new Partjson(getOpts({data:[]}))
	const [subterm, symbols, tokens, step] = filler.parseTerm("$prop")
	test.equals(
		symbols, "$", "symbols from a simple term may have subs"
	)
	test.deepEquals(
		[tokens.aggr, tokens.subs, tokens.stem, tokens.conv], 
		["", "$", "prop", ""],
		"tokens from a simple term may have empty aggr and conv"
	)

	const [subterm1, symbols1, tokens1, step1] = filler.parseTerm("<=prop(]")
	test.equals(
		symbols1, "<=(]", "symbols from a complex term may have aggr + subs + conv"
	)
	test.deepEquals(
		[tokens1.aggr, tokens1.subs, tokens1.stem, tokens1.conv], 
		["<", "=", "prop", "(]"],
		"tokens  from a complex must have aggr, subs, stem, conv"
	)
	test.end()
})

tape(`valFiller[""] should substitute the template input term as-is`, function(test){
	const filler = new Partjson(getOpts({data:[]}))
	const fxnStr = filler.valFiller[""]("prop", {}, false)
	test.equals(fxnStr({prop: "val"}), "prop", "should return a string value")
	const fxnNum = filler.valFiller[""](1, {}, false)
	test.equals(fxnNum({prop: "1"}), 1, "should return a numeric value")
	test.end()
})

tape(`valFiller["$"] should substitute a data property`, function(test){
	const filler = new Partjson(getOpts({data:[]}))
	const input0 = {errors: []}
	const fxn0 = filler.valFiller["$"]("$prop", input0, false)
	test.true(
		fxn0({prop: "dataVal"}) === "dataVal" && !input0.errors.length, 
		"should return a string value"
	)
	const propArr = ["a","b"]
	test.true(
		fxn0({prop: propArr}) === propArr && !input0.errors.length, 
		"should return an array value"
	)
	
	const propFxn = () => {}
	test.true(
		fxn0({prop: propFxn}) === propFxn && !input0.errors.length, 
		"should return a function"
	)
	
	const input1 = {errors: []}
	const fxn1 = filler.valFiller["$"]("$prop.sub.sub", input1, false)
	test.true(
		fxn1({prop:{sub:{sub:"dataVal"}}}) === "dataVal" && !input1.errors.length, 
		"should return a nested property value"
	)
	
	const input3 = {errors: []}
	const fxn2 = filler.valFiller["$"]("$fxn", input3, true)
	test.true(
		fxn2({
			prop: "val", 
			fxn: (row)=>row.prop
		}) === "val" && !input3.errors.length, 
	  "should call a data property as a function to get the substituted value"
	)
	test.true(
		fxn2({
			prop: "dataVal", 
			fxn: "not a function"
		}) === undefined && input3.errors.length, 
	  "should show an error when a property is expected to be a function but it's not"
	)

	test.end()
})

tape(`valFiller["="] should substitute an external property`, function(test){
	const opts = getOpts({data:[]})
	const ext = opts["="]
	const filler = new Partjson(opts)
	
	const input0 = {errors: []}
	const fxn0 = filler.valFiller["="]("=prop", input0, false)
	test.true(
		fxn0({}) === ext.prop && !input0.errors.length, 
		"should return a string value"
	)

	const input1 = {errors: []}
	const fxn1 = filler.valFiller["="]("=arr", input1, false)
	test.true(
		fxn1({}) === ext.arr && !input1.errors.length, 
		"should return an array value"
	)
	
	const input2 = {errors: []}
	const fxn2 = filler.valFiller["="]("=fxn", input2, false)
	test.true(
		fxn2({}) === ext.fxn && !input2.errors.length, 
		"should return a function"
	)
	
	const input3 = {errors: []}
	const fxn3 = filler.valFiller["="]("=nested.sub.sub", input1, false)
	test.true(
		fxn3({nested:{sub:{sub:"val"}}}) === ext.nested.sub.sub && !input3.errors.length, 
		"should return a nested property value"
	)
	
	const input4 = {errors: []}
	const fxn4 = filler.valFiller["="]("=fxn", input4, true)
	test.true(
		fxn4({dataProp: "dataVal"}) === "dataVal" && !input4.errors.length, 
		"should call an external property as a function to get the substituted value"
	)

	const input5 = {errors: []}
	const fxn5 = filler.valFiller["="]("=arr", input5, true)
	test.true(
		(typeof fxn5 !== "function" || fxn5({}) === undefined) && input5.errors.length, 
		"should show an error when an external property that is not a function has the () symbol"
	)

	test.end()
})

tape(`valFiller["@"] should substitute a context property`, function(test){
	const opts = getOpts({
		template: {
			version: 0.1
		},
		data:[]
	})
	const filler = new Partjson(opts)
	
	const input0 = {errors: []}
	const fxn0 = filler.valFiller["@"]("@", input0, false)
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
	test.true(
		fxn0({}, context) === context.self && !input0.errors.length, 
		"@ should return the result itself"
	)

	const input1 = {errors: []}
	const fxn1 = filler.valFiller["@"]("@branch", input1, false)
	test.true(
		fxn1({}, context) === context.branch && !input1.errors.length, 
		"@branch should return the result's branch"
	)

	const input2 = {errors: []}
	const fxn2 = filler.valFiller["@"]("@parent", input2, false)
	test.true(
		fxn2({}, context) === context.parent && !input2.errors.length, 
		"@parent should return the result's parent"
	)
	
	const input3 = {errors: []}
	const fxn3 = filler.valFiller["@"]("@root", input3, false)
	test.true(
		fxn3({}, context) === context.root && !input3.errors.length, 
		"@root should return the result's root"
	)
	
	const input4 = {errors: []}
	const fxn4 = filler.valFiller["@"]("@parent.nested.val", input4, false)
	test.true(
		fxn4({}, context) === context.parent.nested.val && !input4.errors.length, 
		"@parent.nested.val should get a nested context property"
	)

	filler.contexts.set(context.parent, {root: context.root, self: context.parent})
	filler.contexts.set(context.root, {root: context.root, self: context.root})
	const input5 = {errors: []}
	const fxn5 = filler.valFiller["@"]("@root.fxn", input5, true)
	console.log(fxn5({dataProp: "dataVal"}, context), input5)
	test.true(
		fxn5({dataProp: "dataVal"}, context) === "dataVal" && !input5.errors.length, 
		"@root.fxn should call an external property as a function to get the substituted value"
	)
	
	const input6 = {errors: []}
	const fxn6 = filler.valFiller["@"]("@parent.nested", input6, true)
	test.true(
		(typeof fxn6 !== "function" 
			|| fxn6({dataProp: "dataVal"}, context) === undefined) 
		&& input6.errors.length, 
		"@parent.nested should show an error when a context property that is not a function is called"
	)
	
	test.end()
})

