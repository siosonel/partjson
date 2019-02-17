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
	"myTotal": "+@root.myIncrement", 
  rootStuff: {
  	dataSrc: "https://test.ttt/"
  },
  reminder: "v0.5",
  results: {
  	nestedExamples: []
  },
	":__logNumB4": [
		"=nested.numMammalsBefore()",
	],
	"__:logNumAf": [
		"=numMammalsAfter()",
	],
	//"@before()": "=logFishCount()",
	//"@after()": "=logFishCount()",
  "byPreyType": {
    "$preytype": {
      total: "+1",
      mass: "+$preymass",
      lostMass: "#-$preymass",
      massMin: "<$preymass",
      massMax: ">$preymass",
      "rekeyedNested": [{
      	index: "@branch",
      	hunter: "$catname",
  			parentTotal: "@parent.total",
  			"nestedAgain": {
  				"#@dist()": [
  					"@root.results.nestedExamples"
  				], 
  				grandParentTotal: "@parent.@parent.total",
  				parentBranch: "@parent.@branch",
  				grandParentBranch: "@parent.@parent.@branch",
  				version: "@root.reminder",
  				src: "@root.rootStuff.dataSrc"
  			}
      }]
    }
  },
  "#byCat": {
    "$catname": {
      preyTypes: [
      	"$preytype"
      ],
      distinctPreyType: [
      	"$preytype", "distinct"
      ],
      //"rows": ["$"],
      nestedRandomId: [
      	"$.nested.random.id"
      ]
    }
  },
  byOwner: {
  	"@join()": {
  		"loc": "=blockNames()"
  	},
  	"$owners[]": {
  		total: "+1",
  		loss: "-0.5",
  		blockName: "&loc.name",
  		populationReadded: "+&loc.population"
  	},
  },
  blockNames: [
  	"&loc.name",
  	"distinct"
  ],
  uniqueOwners: [
  	"$owners[]", "distinct"
  ],
  repeatOwners: [
  	"$owners[]"
  ],
  "=splitOwners[]": [
  	"test"
  ],
  unsplitOwners: [
  	"$owners"
  ],
  byRandomId: {
  	"$.nested.random.id": "+1"
  },
  roundedPreyMass: [
  	"=roundedPreyMass()"
  ],
  byRoundedPreyMass: {
  	"=roundedPreyMass()": {
  		count: "+1"
  	}
  },
  roundedPreyMassDistinct: [
  	"=roundedPreyMass()", "distinct"
  ],
  involvedLocations: [
  	"=locations[]"
  ],
  distinctLocations: [
  	"=locations[]", "distinct"
  ],
  byComputedLocations: {
  	"=locations[]": {
  		location: "@branch",
  		count: "+1",
  	}
  },
};