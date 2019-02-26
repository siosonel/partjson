const tape = require('tape')
const Partjson = require("../dist/partjson.cjs.js")

tape("A passing test", function(test){
	test.pass("This test will pass.")
	test.end()
});

tape(`valFiller[","] should perform no aggregation`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	const input0 = {errors: [], ignore: ()=>false}
	const fxn0 = (row) => row.prop
	const aggrFxn0 = filler.valFiller[","](fxn0, input0)
	const row = {prop: "dataProp"}
	const result = {}
	aggrFxn0(row, 'key', result)
	test.deepEquals(
		[result.key == "dataProp", !input0.errors.length],
		[true, true],
		`"," should update the result with the substituted or converted value`
	)
	test.end()
})

tape(`valFiller[",()"] should be like "," and not aggregate`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[","],
		filler.valFiller[",()"],
		`The prototypes for "," and ",()" should be the same.`
	)
	test.end()
})

tape(`valFiller[",[]"] should be like "," and not aggregate`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[","],
		filler.valFiller[",[]"],
		`The prototypes for "," and ",[]" should be the same.`
	)
	test.end()
})

tape(`valFiller[",(]"] should be like "," and not aggregate`, function(test){
	const filler = new Partjson({template: {}, data:[]})
	test.equals(
		filler.valFiller[","],
		filler.valFiller[",(]"],
		`The prototypes for "," and ",(]" should be the same.`
	)
	test.end()
})
