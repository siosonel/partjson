#!/usr/bin/env node

const Partjson = require("../dist/partjson.cjs")
const readline = require("readline")
const readFileSync = require("fs").readFileSync
const path = require("path")

/**
 * Reshape piped rows of data into a desired shape
 *
 *  Usage
 *  $TSV | partjson $template [$externals.js] [> $output.json]
 *  where
 *
 *  $TSV
 *  - tab- (if detected in header line) or comma-separated data string with header
 *
 *  partjson -OR- src/cli.js
 *  - the command
 *
 *  $template
 *  - either a string JSON template or the filename that has it
 *
 *  $externals, optional
 *  - if the template uses functions, this is required
 *
 *  $output
 *  - optional file to save the partjson result
 *  - will print results to stdout/screen if not provided
 *
 * Examples:
 *
 *  # use strings instead of filenames
 *    $ printf "a\tb\n1\t2\n3\t4\n7\t9\n" | ../../src/cli.js '{"a": "+$a", "b": "+$b"}'
 *
 *  # using the local cli.js install within the partjson
 *  # test/testdata folder
 *    $ cat pets.txt | ../../src/cli.js template-bytype.json externals.js > ../../data/reshaped.json
 *
 *  # global install
 *    $ cat pets.txt | partjson template-nested.json externals.js
 *
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

if (!process.argv[2]) throw `missing template argument`

const template = process.argv[2].startsWith("{")
  ? JSON.parse(process.argv[2])
  : readFileSync(process.argv[2], { encoding: "utf8" }).trim()

const externals = process.argv[3]
  ? require(path.join(path.resolve("."), process.argv[3])).externals
  : {}

const pj = new Partjson({
  template,
  "=": externals
})

let header, sep
rl.on("line", line => {
  if (!header) {
    sep = line.includes("\t") ? "\t" : ","
    header = line.split(sep)
  } else {
    const row = {}
    const values = line.split(sep)
    header.forEach(
      (key, i) => (row[key] = isNumeric(values[i]) ? +values[i] : values[i])
    )
    pj.add([row])
  }
})

rl.on("close", () => {
  console.log(JSON.stringify(pj.tree, null, "    "))
})

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}
