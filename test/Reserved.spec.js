const tape = require('tape')
const Partjson = require("../dist/partjson.cjs.js")

tape("\n", function(test){
	test.pass("-***- Reserved specs -***-")
	test.end()
});

tape("constructor", function(test){
	const filler = new Partjson({})
	test.deepEqual(
		filler.reserved.contexts,
		["@branch", "@parent", "@root", "@self"],
		"should set the reserved contexts"
	)
  test.deepEqual(
		filler.reserved.filters,
		["@before()", "@join()", "@ignore()"],
		"should set the reserved filters"
	)
  test.deepEqual(
		filler.reserved.post, 
		["@after()", "@dist()", "@end()"],
		"should set the reserved post-processing functions"
	)
	test.end()
})

tape("trueFxn", function(test){
	const filler = new Partjson({})
  test.equal(filler.reserved.trueFxn(false), true, "should always return true")
	test.end()
})

tape("notDefined", function(test){
	const filler = new Partjson({})
  test.equal(filler.reserved.notDefined(undefined), true, "should be true for undefined")
  test.equal(filler.reserved.notDefined("a"), false, "should be false for any defined terms")
	test.end()
})

