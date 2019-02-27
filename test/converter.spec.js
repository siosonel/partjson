const tape = require('tape')
const Partjson = require("../dist/partjson.cjs")
const conv = Partjson.prototype.converter

tape("A passing test", function(test){
	test.pass("This test will pass.")
	test.end()
})

tape("parseTerm", function(test){
  const Filler = new Partjson({template:{}, data:[]})
	const [subterm, symbols, tokens, step] = conv.parseTerm(Filler, "$prop")
	test.equal(tokens.aggr, "")
	test.equal(tokens.subs, "$")
	test.equal(tokens.stem, "prop")
	test.equal(tokens.conv, "")
	test.equal(symbols, "$", "should correctly parse a simple term")

	const [subterm1, symbols1, tokens1, step1] = conv.parseTerm(Filler, "<=prop(]")
	test.equal(tokens1.aggr, "<")
	test.equal(tokens1.subs, "=")
	test.equal(tokens1.stem, "prop")
	test.equal(tokens1.conv, "(]")
	test.equal(symbols1, "<=(]", "should correctly parse a complex term")
	test.end()
})

tape(`subs[""]`, function(test){
	const Filler = new Partjson({template:{}, data:[]})
	const fxnStr = conv.subs[""](Filler, "prop", {})
	test.equal(fxnStr({prop: "val"}), "prop", "should return a string value")
	const fxnNum = conv.subs[""](Filler, 1, {})
	test.equal(fxnNum({prop: "1"}), 1, "should substitute the template input term as-is")
	test.end()
})

tape(`subs["$"]`, function(test){
	const Filler = new Partjson({template:{}, data:[]})
	const input0 = {errors: []}
	const fxn0 = conv.subs["$"](Filler, "$prop", input0)
	test.true(!input0.errors.length, "no errors")
	test.equal(fxn0({prop: "dataVal"}), "dataVal", "should substitute a data property")

	const propArr = ["a","b"]
	test.true(!input0.errors.length, "no errors")
	test.equal(fxn0({prop: propArr}), propArr, "should return an array value")
	
	const propFxn = () => {}
	test.true(!input0.errors.length, "no errors")
	test.equal(fxn0({prop: propFxn}), propFxn, "should return a function")
	
	const input1 = {errors: []}
	const fxn1 = conv.subs["$"](Filler, "$prop.sub.sub", input1)
	test.true(!input1.errors.length, "no errors")
	test.equal(fxn1({prop:{sub:{sub:"val"}}}), "val", "should return a nested property value")
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
	test.true(!input0.errors.length, "no errors")
	test.equal(fxn0({}), ext.prop, "should return a string value")

	const input1 = {errors: []}
	const fxn1 = conv.subs["="](Filler, "=arr", input1)
	test.true(!input1.errors.length, "no errors")
	test.equal(fxn1({}), ext.arr, "should return an array value")
	
	const input2 = {errors: []}
	const fxn2 = conv.subs["="](Filler, "=fxn", input2)
	test.true(!input2.errors.length, "no errors")
	test.equal(fxn2({}), ext.fxn,"should return a function")
	
	const input3 = {errors: []}
	const fxn3 = conv.subs["="](Filler, "=nested.sub.sub", input1)
	test.true(!input3.errors.length, "no errors")
	test.equal(fxn3({}), ext.nested.sub.sub, "should return an external nested value")
	test.end()
})

tape(`subs["@"]`, function(test){
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
		filler: {
			errors: []
		}
	}
	const input0 = {errors: []}
	const fxn0 = conv.subs["@"](Filler, "@", input0)
	test.true(!input0.errors.length, "no errors")
	test.equal(fxn0({}, context), context.self,"@ should return the result itself")

	const input1 = {errors: []}
	const fxn1 = conv.subs["@"](Filler, "@branch", input1)
	test.true(!input1.errors.length, "no errors")
	test.equal(fxn1({}, context), context.branch, "@branch should return the branch")

	const input2 = {errors: []}
	const fxn2 = conv.subs["@"](Filler, "@parent", input2)
	test.true(!input2.errors.length, "no errors")
	test.equal(fxn2({}, context), context.parent, "@parent should return the parent")
	
	const input3 = {errors: []}
	const fxn3 = conv.subs["@"](Filler, "@root", input3)
	test.true(!input3.errors.length, "no errors")
	test.equal(fxn3({}, context), context.root, "@root should return the root")
	
	const input4 = {errors: []}
	const fxn4 = conv.subs["@"](Filler, "@parent.nested.val", input4)
	test.true(!input4.errors.length, "no errors")
	test.equal(fxn4({}, context), context.parent.nested.val, "should return a nested context value")

	test.end()
})

tape(`conv[""]`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: []}
	const fxn0 = conv.subs["$"](Filler, "$prop", input0)
	test.equal(conv.conv[""](fxn0, input0), fxn0, "should not convert a substituted property")
	test.true(!input0.errors.length, "no errors")
	test.end()
})

tape(`conv["[]"]`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
	test.equal(conv.conv[""], conv.conv["[]"], `should equal conv["[]"]`)
	test.end()
})

tape(`conv["()"]`, function(test){
	const Filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: []}
	const fxn0 = conv.subs["$"](Filler, "$fxn", input0)
	const convFxn0 = conv.conv["()"](fxn0, input0, {})
	const fxn = (row) => row.prop
	const row = {fxn, prop: "dataProp"}
	const value = convFxn0(row)
	test.true(!input0.errors.length, "no errors")
	test.equal(value, "dataProp", "should call the substituted property as a function")

	const input1 = {errors: []}
	const fxn1 = conv.subs["$"](Filler, "$prop", input0)
	const convFxn1 = conv.conv["()"](fxn1, input0, {})
	test.true(!input1.errors.length, "no errors")
	test.equal(convFxn1(row), undefined, "on a non-function $prop should give an error")
	test.end()
})

tape(`conv["(]"]`, function(test){
	test.equal(
		conv.conv["()"], conv.conv["(]"], `should equal conv["()"]`
	)
	test.end()
})