# Partjson

Reshape data rows into partitioned summary values and collections, using a JSON-based template.

[![Build Status](https://travis-ci.com/siosonel/partjson.svg?branch=master)](https://travis-ci.com/siosonel/partjson)
[![npm version](https://badge.fury.io/js/partjson.svg)](https://www.npmjs.com/package/partjson)

## Documentation and Demonstration

https://siosonel.github.io/partjson/

### CLI examples

```bash
npm install -g partjson

printf "key,val,type\nA,2,cat\nB,3,cat\nA,5,dog" | src/cli.js '{"$key":{"total":"+$val","$type":"+$val"}}'
{
    "A": {
        "total": 7,
        "cat": 2,
        "dog": 5
    },
    "B": {
        "total": 3,
        "cat": 3
    }
} 
```

### Javascript
```
import Partjson from 'partjson'

const pj = new Partjson({
	template: {
		"$key":{
			total: "+$val",
			byType: {
				"$type": "+$val"
			}
		}
	}
})

pj.add(`key,val,type
A,2,cat
B,3,cat
A,5,dog
`)

console.log(pj.tree)
/*
{
  "A": {
    "total": 7,
    "byType": {
    	"cat": 2,
    	"dog": 5
    }
  },
  "B": {
    "total": 3,
    "byType": {
   	 	"cat": 3
   	}
  }
}
*/
```

## Develop

Clone this repository and install its dependencies:

```bash
git clone git@github.com:siosonel/partjson.git
cd partjson
npm install 
```

`npm run dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

`npm test` tests the umd build.

`npm run prettify` runs prettify and npm test.

`npm run report` runs creates a coverage report in ./coverage/index.html.

`npm run build` outputs the library to `dist` in cjs (for Node), esm (for import), and umd (for browser script).

## License

[MIT](LICENSE).
