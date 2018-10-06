const tape = require('tape')
const lib = require('..')

tape("lib returns true", function(test){
	test.equals(lib(true),true)
	test.end()
});

tape("Fake test is false", function(test){
	test.equals(lib(false),false)
	test.end()
});
