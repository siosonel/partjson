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
});