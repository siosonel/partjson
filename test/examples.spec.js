const tape = require("tape")
const Partjson = require("../dist/partjson.umd")
const jsonData = JSON.stringify([
  { sample: "sj01", gene: "TP53", mclass: "F" },
  { sample: "sj01", gene: "NRAS", mclass: "M" },
  { sample: "sj01", gene: "KRAS", mclass: "N" },
  { sample: "sj02", gene: "FLT3", mclass: "L" },
  { sample: "sj02", gene: "MYC", mclass: "F" },
  { sample: "sj03", gene: "DUX4", mclass: "P" },
  { sample: "sj03", gene: "TP53", mclass: "F" }
])

tape("\n", function(test) {
  test.pass("-***- Examples -***-")
  test.end()
})

tape("Example 1", function(test) {
  const pj = new Partjson({
    template: {
      numHits: "+1",
      bySample: {
        $sample: {
          numHits: "+1",
          genes: ["$gene"],
          byClass: {
            $mclass: "+1"
          }
        }
      },
      byGene: {
        $gene: {
          numHits: "+1",
          samples: ["$sample"],
          byClass: {
            $mclass: "+1"
          }
        }
      },
      incr: "+=numArr[]",
      "_1:results": "@.bySample.@values"
    },
    data: JSON.parse(jsonData),
    "=": {
      numArr: [1, 2]
    }
  })
  test.equal(pj.tree.numHits, 7, "should calc the correct overall numHits")
  test.deepEqual(
    Object.keys(pj.tree.bySample),
    ["sj01", "sj02", "sj03"],
    "should have the correct sample keys"
  )
  test.deepEqual(
    Object.values(pj.tree.bySample).map(d => d.numHits),
    [3, 2, 2],
    "should have the correct numHits by sample"
  )
  test.deepEqual(
    Object.values(pj.tree.bySample).map(d => d.genes),
    [["TP53", "NRAS", "KRAS"], ["FLT3", "MYC"], ["DUX4", "TP53"]],
    "should have the correct gene list by sample"
  )
  test.deepEqual(
    Object.values(pj.tree.bySample).map(d => d.byClass),
    [{ F: 1, M: 1, N: 1 }, { L: 1, F: 1 }, { P: 1, F: 1 }],
    "should have the correct mutation class counts by sample"
  ) /*
  test.deepEqual(
    Object.values(pj.tree.bySample).map(d => d.classStr),
    [],
    "should have the correct string aggregation of mutation class by sample"
  ) */
  test.deepEqual(
    Object.keys(pj.tree.byGene),
    ["TP53", "NRAS", "KRAS", "FLT3", "MYC", "DUX4"],
    "should have the correct gene keys"
  )
  test.deepEqual(
    Object.values(pj.tree.byGene).map(d => d.numHits),
    [2, 1, 1, 1, 1, 1],
    "should have the correct counts by gene"
  )
  test.deepEqual(
    Object.values(pj.tree.byGene).map(d => d.samples),
    [["sj01", "sj03"], ["sj01"], ["sj01"], ["sj02"], ["sj02"], ["sj03"]],
    "should have the correct sample list by gene"
  )
  test.deepEqual(
    Object.values(pj.tree.byGene).map(d => d.byClass),
    [{ F: 2 }, { M: 1 }, { N: 1 }, { L: 1 }, { F: 1 }, { P: 1 }],
    "should have the correct mutation class counts by sample"
  )
  test.equal(
    pj.tree.incr,
    21,
    "should increment on distirbuted array numeric values"
  )
  test.deepEqual(
    pj.tree.results,
    [
      {
        numHits: 3,
        genes: ["TP53", "NRAS", "KRAS"],
        byClass: { F: 1, M: 1, N: 1 }
      },
      {
        numHits: 2,
        genes: ["FLT3", "MYC"],
        byClass: { L: 1, F: 1 }
      },
      {
        numHits: 2,
        genes: ["DUX4", "TP53"],
        byClass: { P: 1, F: 1 }
      }
    ],
    "should fill post-loop inputs"
  )
  test.end()
})
