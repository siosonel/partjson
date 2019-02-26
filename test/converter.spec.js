const tape = require('tape')
const Partjson = require("../dist/partjson.cjs")
const conv = Partjson.prototype.converter

tape("A passing test", function(test){
	test.pass("This test will pass.")
	test.end()
})

tape("parseTerm should parse terms correctly", function(test){
  const Filler = new Partjson({template:{}, data:[]})
	const [subterm, symbols, tokens, step] = conv.parseTerm(Filler, "$prop")
	test.equals(
		symbols, "$", "symbols from a simple term may have subs"
	)
	test.deepEquals(
		[tokens.aggr, tokens.subs, tokens.stem, tokens.conv], 
		["", "$", "prop", ""],
		"tokens from a simple term may have empty aggr and conv"
	)

	const [subterm1, symbols1, tokens1, step1] = conv.parseTerm(Filler, "<=prop(]")
	test.equals(
		symbols1, "<=(]", "symbols from a complex term may have aggr + subs + conv"
	)
	test.deepEquals(
		[tokens1.aggr, tokens1.subs, tokens1.stem, tokens1.conv], 
		["<", "=", "prop", "(]"],
		"tokens  from a complex may have aggr, subs, stem, conv"
	)
	test.end()
})

tape(`subs[""] should substitute the template input term as-is`, function(test){
	const Filler = new Partjson({template:{}, data:[]})
	const fxnStr = conv.subs[""](Filler, "prop", {})
	test.equals(fxnStr({prop: "val"}), "prop", "should return a string value")
	
	const fxnNum = conv.subs[""](Filler, 1, {})
	test.equals(fxnNum({prop: "1"}), 1, "should return a numeric value")
	test.end()
})

tape(`subs["$"] should substitute a data property`, function(test){
	const Filler = new Partjson({template:{}, data:[]})
	const input0 = {errors: []}
	const fxn0 = conv.subs["$"](Filler, "$prop", input0)
	test.deepEquals(
		[fxn0({prop: "dataVal"}) === "dataVal", !input0.errors.length],
		[true, true],
		"should return a string value"
	)

	const propArr = ["a","b"]
	test.deepEquals(
		[fxn0({prop: propArr}) === propArr, !input0.errors.length],
		[true, true],
		"should return an array value"
	)
	
	const propFxn = () => {}
	test.deepEquals(
		[fxn0({prop: propFxn}) === propFxn, !input0.errors.length],
		[true, true], 
		"should return a function"
	)
	
	const input1 = {errors: []}
	const fxn1 = conv.subs["$"](Filler, "$prop.sub.sub", input1)
	test.deepEquals(
		[fxn1({prop:{sub:{sub:"dataVal"}}}) === "dataVal", !input1.errors.length],
		[true, true], 
		"should return a nested property value"
	)
	test.end()
})

tape(`subs["="] should substitute an external property`, function(test){
	const opts = {
		template:{}, 
		data:[{}], 
		"=": {
			prop: "extVal",
			arr: ["a", "b"],
			fxn: (row) => row.dataProp,
			nested: {
				sub: {
					sub: "extVal"
				}
			}
		}
	}
	const ext = opts["="]
	const Filler = new Partjson(opts)
	
	const input0 = {errors: []}
	const fxn0 = conv.subs["="](Filler, "=prop", input0)
	test.deepEquals(
		[fxn0({}) === ext.prop, !input0.errors.length],
		[true, true],
		"should return a string value"
	)

	const input1 = {errors: []}
	const fxn1 = conv.subs["="](Filler, "=arr", input1)
	test.deepEquals(
		[fxn1({}) === ext.arr, !input1.errors.length],
		[true, true], 
		"should return an array value"
	)
	
	const input2 = {errors: []}
	const fxn2 = conv.subs["="](Filler, "=fxn", input2)
	test.deepEquals(
		[fxn2({}) === ext.fxn, !input2.errors.length],
		[true, true],
		"should return a function"
	)
	
	const input3 = {errors: []}
	const fxn3 = conv.subs["="](Filler, "=nested.sub.sub", input1)
	test.deepEquals(
		[fxn3({nested:{sub:{sub:"val"}}}) === ext.nested.sub.sub, !input3.errors.length],
		[true, true],
		"should return a nested property value"
	)

	test.end()
})

tape(`subs["@"] should substitute a context property`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
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
		Filler: {
			errors: []
		}
	}
	const input0 = {errors: []}
	const fxn0 = conv.subs["@"](Filler, "@", input0)
	test.deepEquals(
		[fxn0({}, context) === context.self, !input0.errors.length],
		[true, true], 
		"@ should return the result itself"
	)

	const input1 = {errors: []}
	const fxn1 = conv.subs["@"](Filler, "@branch", input1)
	test.deepEquals(
		[fxn1({}, context) === context.branch, !input1.errors.length],
		[true, true], 
		"@branch should return the result's branch"
	)

	const input2 = {errors: []}
	const fxn2 = conv.subs["@"](Filler, "@parent", input2)
	test.deepEquals(
		[fxn2({}, context) === context.parent, !input2.errors.length],
		[true, true], 
		"@parent should return the result's parent"
	)
	
	const input3 = {errors: []}
	const fxn3 = conv.subs["@"](Filler, "@root", input3)
	test.deepEquals(
		[fxn3({}, context) === context.root, !input3.errors.length],
		[true, true], 
		"@root should return the result's root"
	)
	
	const input4 = {errors: []}
	const fxn4 = conv.subs["@"](Filler, "@parent.nested.val", input4)
	test.deepEquals(
		[fxn4({}, context) === context.parent.nested.val, !input4.errors.length],
		[true, true], 
		"@parent.nested.val should get a nested context property"
	)

	test.end()
})

tape(`conv[""] should not convert a substituted property`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: []}
	const fxn0 = conv.subs["$"](Filler, "$prop", input0)
	test.deepEquals(
		[conv.conv[""](fxn0, input0) === fxn0, !input0.errors.length],
		[true, true],
		`"." on $prop should return the substitution function`
	)
	test.end()
})

tape(`conv["[]"] should be like "." and not convert to a function`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
	test.equals(
		conv.conv[""], conv.conv["[]"], `conv[""] == conv["[]"]`
	)
	test.end()
})

tape(`conv["()"] should convert a substituted property into a function`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: []}
	const fxn0 = conv.subs["$"](Filler, "$fxn", input0)
	const convFxn0 = conv.conv["()"](fxn0, input0)
	const fxn = (row) => row.prop
	const row = {fxn, prop: "dataProp"}
	const rowFxn = convFxn0(row)
	test.deepEquals(
		[rowFxn === fxn, !input0.errors.length],
		[true, true],
		`"()" should convert the substituted property into a function`
	)
	test.deepEquals(
		[rowFxn(row) === "dataProp", !input0.errors.length],
		[true, true],
		`"()" on $fxn should give a data function that returns the expected result`
	)

	const input1 = {errors: []}
	const fxn1 = conv.subs["$"](Filler, "$prop", input0)
	const convFxn1 = conv.conv["()"](fxn1, input0)
	test.deepEquals(
		[typeof convFxn1 != "function" || convFxn1(row) === undefined, input0.errors.length > 0],
		[true, true],
		`"()" on a non-function $prop should give an error`
	)
	test.end()
})

tape(`conv["(]"] should convert like ()`, function(test){
	test.equals(
		conv.conv["()"], conv.conv["(]"], `conv["(]"] == conv["()"]`
	)
	test.end()
})
