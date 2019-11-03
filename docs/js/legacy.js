/*

[skip] [timing] [aggregation] [substitution]    stem     [conversion]
  #      :__         +              $         [delimit]       ()
         _:_         -              =                         []
         __:         >              &                         {}
                     <              @
                    [ ] 
*/

const template0 = {
  ":__myIncrement": 0.5,
  myTotal: "+@root.myIncrement",
  rootStuff: {
    dataSrc: "https://test.ttt/"
  },
  reminder: "v0.5",
  results: {
    nestedExamples: []
  },
  ":__logNumB4": ["=nested.numMammalsBefore()"],
  "_:_logNumAf": ["=numMammalsAfter()"],
  //"@before()": "=logFishCount()",
  //"@after()": "=logFishCount()",
  byPreyType: {
    $preytype: {
      total: "+1",
      mass: "+$preymass",
      lostMass: "#-$preymass",
      massMax: "<$preymass",
      massMin: ">$preymass",
      rekeyedNested: [
        {
          index: "@branch",
          hunter: "$catname",
          parentTotal: "@parent.total",
          nestedAgain: {
            "#@dist()": ["@root.results.nestedExamples"],
            grandParentTotal: "@parent.@parent.total",
            parentBranch: "@parent.@branch",
            grandParentBranch: "@parent.@parent.@branch",
            version: "@root.reminder",
            src: "@root.rootStuff.dataSrc"
          }
        }
      ]
    }
  },
  "#byCat": {
    $catname: {
      preyTypes: ["$preytype"],
      distinctPreyType: ["$preytype"],
      //"rows": ["$"],
      nestedRandomId: ["$.nested.random.id"]
    }
  },
  byOwner: {
    "@join()": {
      loc: "=blockNames()"
    },
    "$owners[]": {
      total: "+1",
      loss: "-0.5",
      blockName: "&loc.name",
      populationReadded: "+&loc.population"
    }
  },
  blockNames: ["&loc.name", "distinct"],
  uniqueOwners: ["$owners[]"],
  repeatOwners: ["$owners[]", 0],
  "=splitOwners[]": ["test"],
  unsplitOwners: ["$owners"],
  byRandomId: {
    "$.nested.random.id": "+1"
  },
  roundedPreyMass: ["=roundedPreyMass()"],
  byRoundedPreyMass: {
    "=roundedPreyMass()": {
      count: "+1"
    }
  },
  roundedPreyMassDistinct: ["=roundedPreyMass()"],
  involvedLocations: ["=locations[]"],
  distinctLocations: ["=locations[]"],
  byComputedLocations: {
    "=locations[]": {
      location: "@branch",
      count: "+1"
    }
  }
}
