const tape = require('tape')
const Partjson = require("../dist/partjson.cjs.js")

tape("\n", function(test){
	test.pass("-***- Partjson specs -***-")
	test.end()
});

tape("constructor", function(test){
	const filler = new Partjson()
	test.deepEqual(filler.opts, {template:{}, "=":{}},"should set default opts")
	test.equal(filler.delimit, ".", "should set a default delimiter")
	test.deepEqual(filler.subsSymbols, ["$", "=", "@", "&"], "should set substitution symbols")
	test.deepEqual(filler.convSymbols, ["()", "[]", "(]"], "should set conversion symbols")
	test.deepEqual(filler.aggrSymbols, ["+", "-", "<", ">"], "should set aggregation symbols")
	test.deepEqual(filler.timeSymbols, [":__", "_:_", "__:"], "should set timing symbols")
	test.deepEqual(filler.skipSymbols, ["#"], "should set skip symbols")
	/*
	
	*/
	test.deepEqual(filler.steps, [":__", "", "_:_"], "should set ordered steps")
	test.end()
})

tape("refresh", function(test){
	const template = {
		"@join()": {
			loc: "=loc()"
		},
		"#a": 0,
		"$prop": "+1"
	}
	const filler = new Partjson({
		template,
		"=": {
			loc: ()=>{return {city: "Test"}}
		}
	})
	test.true(filler.commentedTerms instanceof WeakMap)
  test.true(filler.joins instanceof Map)
  test.true(filler.fillers instanceof Map)
  test.true(filler.contexts instanceof WeakMap)
  test.deepEqual(filler.tree, {})

  const a = {prop: "a"}
  const b = {prop: "b"}
  const c = {prop: "a"}
  
  filler.refresh({
  	data: [a, b, c]
  })
  const commented = []
  let input
  for(const f of filler.fillers) {
  	input = f[1].inputs["#a"]
  	if (input && filler.commentedTerms.get(input)) {
  		commented.push(...filler.commentedTerms.get(input))
  	}
  }
  test.equal(commented.length, 1, "should track commented terms")
	test.equal(filler.joins.size, 0, "joins should be cleared after a data row iteration")
	test.equal(filler.fillers.size, 1, "should only have a filler for the root tree")
  test.equal(Object.keys(filler.tree).length, 2, "should have root result keys")

  const prevFillers = filler.fillers
	filler.refresh({data:[]})
	let input1
  for(const f of filler.fillers) {
  	input1 = f[1].inputs["#a"]
  	if (input1 && filler.commentedTerms.get(input1)) {
  		commented.push(...filler.commentedTerms.get(input1))
  	}
  }
  test.notEqual(input, input1, `should clear inputs after refresh`)
  test.notEqual(prevFillers, filler.fillers, `should clear fillers after refresh`)
  test.equal(Object.keys(filler.tree).length, 0, "should clear root result after refresh")

	test.end()
})
