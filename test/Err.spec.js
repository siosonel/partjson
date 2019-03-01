const tape = require('tape')
const Partjson = require("../dist/partjson.umd.js")

tape("\n", function(test){
	test.pass("-***- Err specs -***-")
	test.end()
});

tape("constructor", function(test){
	const filler = new Partjson()
	const err = filler.errors
	test.equal(err.Tree, filler, "should reference the Tree instance")
  test.true(err.allErrSet instanceof Set, "should set an array error tracker")
  test.equal(Object.keys(err.allErrObj).length, 0, "should set an empty error object tracker")
    // modes: 
    // "" silent or unmarked
    // {} group errors by message as keys
    // [] simply list errors 
  test.deepEqual(
  	err.mode, 
  	{
    	input: "{}", 
    	result: "{}-", 
    	root: "", 
    	console: "{}"
    },
    "should set default mode values"
  )
  test.deepEqual(
  	err.modeKeys, 
  	["input", "result", "root", "console"],
  	"should set error mode keys"
  )
  test.end()
})

tape("setMode", function(test){
	const filler = new Partjson()
	const err = filler.errors
	err.setMode(["","","[]",""])
	test.deepEqual(
		err.mode, 
		{input:"", result:"", root:"[]", console:""},
		"should accept an array as argument"
	)
	err.setMode({console:"{}", input:"{}", root:"{}"})
	test.deepEqual(
		err.mode, 
		{input:"{}", result:"", root:"{}", console:"{}"},
		"should accept an object as argument"
	)
  test.end()
})

tape("clear", function(test){
	const filler = new Partjson()
	const err = filler.errors
	err.allErrSet.add([])
  err.allErrObj["test"] = "test"
  err.clear(["","","[]",""])
  test.equal(err.allErrSet.size, 0, "should empty the allErrSet tracker")
  test.equal(Object.keys(err.allErrObj).length, 0, "should empty the allErrObj tracker")
  test.deepEqual(
  	err.mode,
  	{input:"", result:"", root:"[]", console:""},
  	"should optionally reset the error mode")
 	test.end()
})

tape("markErrors", function(test){
	const filler = new Partjson({
		template: {
			total: "+1",
			a: "@ppparent",
			b: "=fxn()",
			"@errmode": {console:""}
		},
		data: [{}, {}, {}]
	})
	const err = filler.errors
	test.equal(Object.keys(filler.tree).length, 3, "should mark errors")
	test.equal(filler.tree.a.slice(0,3), "{{ ", "should mark a context converter error")
	test.equal(filler.tree.b.slice(0,3), "{{ ", "should mark an external converter error")
	test.equal(filler.tree.total, 3, "should not mark an input with no errors")

	err.markErrors = ()=>{}
	filler.refresh()
	test.equal(
		Object.keys(filler.tree).length, 
		1, 
		"should be the only method that marks errors"
	)
	test.notEqual(Object.keys(filler.tree)[0], 
		"{{ ", 
		"if missing, should have no impact on valid inputs"
	)
	test.end()
})

tape("track", function(test){
	const filler = new Partjson({
		template: {
			"@errmode": {console:""}
		}
	})
	const err = filler.errors
	const arrLog = []
	err.track(arrLog, ["val", "TEST-ERR"], "test", false)
	test.equal(arrLog.length, 1, "should track an error in an array")
	test.equal(err.allErrSet.size, 1, "should track an error in the allErrSet")
	test.equal(Object.keys(err.allErrObj).length, 1, "should track an error in the allErrObj")
	
	const objLog = {}
	err.track(objLog, ["val", "TEST-ERR"], "test", false)
	test.equal(Object.keys(objLog).length, 1, "should track an error in an object")
	test.equal(err.allErrSet.size, 2, "should add an error in the allErrSet")
	test.equal(Object.keys(err.allErrObj).length, 1, "should group errors by key in the allErrObj")
	test.end()
})

tape("trackAsObj", function(test){
	const filler = new Partjson({
		template: {
			"@errmode": {console:""}
		}
	})
	const err = filler.errors
	const objLog = {}
	err.trackAsObj(objLog, ["val", "TEST-ERR"], "a")
	err.trackAsObj(objLog, ["val", "TEST-ERR"], "a")
	err.trackAsObj(objLog, ["val", "TEST-ERR"], "b")
	test.equal(
		Object.keys(objLog).length, 
		1, 
		"should track errors by message in an object"
	)
	test.equal(
		Object.keys(objLog["TEST-ERR"]).length,
		2, 
		"should track errors by message by key in an object"
	)
	test.equal(objLog["TEST-ERR"].a, 2, "should count errors by message by key")
	test.equal(objLog["TEST-ERR"].b, 1, "should count errors by message by key")
	
	err.trackAsObj(objLog, ["val", "TEST-ERR", {}], "c")
	err.trackAsObj(objLog, ["val", "TEST-ERR", {}], "c")
	test.equal(
		Object.keys(objLog["TEST-ERR"].c).length,
		2, 
		"should optionally track data rows by message by key"
	)
	test.end()
})

tape("log", function(test){
	const errmode = {
		input: "",
		console: "", 
		root: "[]"
	}
	const template = {
		total: "+1",
		a: "@ppparent",
		b: "=fxn()",
		"@errmode": errmode
	}
	const filler = new Partjson({
		template,
		data: [{}, {}, {}]
	})

	test.equal(
		filler.tree["@errorsAll"].length, 
		2, 
		"should optionally attach an errorsAll array to the root"
	)

	errmode.root = "{}"
	filler.refresh()
	test.equal(
		Object.keys(filler.tree["@errorsAll"]).length, 
		2, 
		"should optionally attach an errorsAll array to the object"
	)

	test.end()
})
