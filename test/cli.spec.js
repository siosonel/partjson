const tape = require("tape")
const { exec } = require("child_process")

tape("\n", function(test) {
  test.pass("-***- CLI specs -***-")
  test.end()
})

tape("input as string data", function(test) {
  test.timeoutAfter(200)
  test.plan(3)

  const expected = {
    A: {
      total: 7,
      cat: 2,
      dog: 5
    },
    B: {
      total: 3,
      cat: 3
    }
  }

  const mssg0 = "should accept piped csv-string argument with string template"
  // the test script and src/cli are executed from project root
  exec(
    `printf "key,val,type\nA,2,cat\nB,3,cat\nA,5,dog" | src/cli.js '{"$key":{"total":"+$val","$type":"+$val"}}'`,
    (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        test.fail(mssg0)
      } else {
        test.deepEqual(JSON.parse(stdout), expected, mssg0)
      }
    }
  )

  const mssg1 = "should accept piped tsv-string argument with string template"
  // the test script and src/cli are executed from project root
  exec(
    `printf "key\tval\ttype\nA\t2\tcat\nB\t3\tcat\nA\t5\tdog" | src/cli.js '{"$key":{"total":"+$val","$type":"+$val"}}'`,
    (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        test.fail(mssg1)
      } else {
        test.deepEqual(JSON.parse(stdout), expected, mssg1)
      }
    }
  )

  const mssg2 = "should accept piped tsv-string argument with template filename"
  // the test script and src/cli are executed from project root
  exec(
    `printf "key,val,type\nA,2,cat\nB,3,cat\nA,5,dog" | src/cli.js test/testdata/template-bykeytype.json`,
    (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        test.fail(mssg2)
      } else {
        test.deepEqual(JSON.parse(stdout), expected, mssg2)
      }
    }
  )
})

tape("input as data file", function(test) {
  test.timeoutAfter(200)
  test.plan(2)

  const mssg0 = "should accept a piped data file input without externals"
  // the test script and src/cli are executed from project root
  exec(
    `cat test/testdata/pets.txt | src/cli.js test/testdata/template-bytype.json`,
    (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        test.fail(mssg0)
      } else {
        test.deepEqual(
          JSON.parse(stdout),
          {
            cat: {
              a: 17,
              b: 11
            },
            dog: {
              a: 19,
              b: 22
            },
            bird: {
              a: 3,
              b: 5
            }
          },
          mssg0
        )
      }
    }
  )

  const expected1 = {
    cat: {
      tubby: {
        ab: 14,
        a: 6,
        b: 8
      },
      siamese: {
        ab: 14,
        a: 11,
        b: 3
      }
    },
    dog: {
      lab: {
        ab: 7,
        a: 3,
        b: 4
      },
      maltese: {
        ab: 34,
        a: 16,
        b: 18
      }
    },
    bird: {
      parrot: {
        ab: 8,
        a: 3,
        b: 5
      }
    }
  }

  const mssg1 = "should accept a piped data file input with externals option"
  // the test script and src/cli are executed from project root
  exec(
    `cat test/testdata/pets.txt | src/cli.js test/testdata/template-nested.json test/testdata/externals.js`,
    (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        test.fail(mssg1)
      } else {
        test.deepEqual(JSON.parse(stdout), expected1, mssg1)
      }
    }
  )
})
