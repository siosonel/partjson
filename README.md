# ParJSON

Partition rows of data into a well-defined
tree structure of aggregated values and
collections, using a JSON-based processing
directive syntax.

```js
test()
```

## Getting started

Clone this repository and install its dependencies:

```bash
git clone ssh://git@cmpb-devops.stjude.org:5002/esioson/parjson.git
cd parjson
npm install
# set git-ignored patterns 
```

`npm run build` builds the library to `dist`, generating three files:

* `dist/parjson.cjs.js`
    A CommonJS bundle, suitable for use in Node.js, that `require`s the external dependency. This corresponds to the `"main"` field in package.json
* `dist/parjson.esm.js`
    an ES module bundle, suitable for use in other people's libraries and applications, that `import`s the external dependency. This corresponds to the `"module"` field in package.json
* `dist/parjson.umd.js`
    a UMD build, suitable for use in any environment (including the browser, as a `<script>` tag), that includes the external dependency. This corresponds to the `"browser"` field in package.json

`npm run dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

`npm test` builds the library, then tests it.

## Variations

* [babel](https://github.com/rollup/rollup-starter-lib/tree/babel) — illustrates writing the source code in ES2015 and transpiling it for older environments with [Babel](https://babeljs.io/)
* [buble](https://github.com/rollup/rollup-starter-lib/tree/buble) — similar, but using [Bublé](https://buble.surge.sh/) which is a faster alternative with less configuration



## License

[MIT](LICENSE).
