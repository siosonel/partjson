const template0 = {
	"$": "test",
	"$testObj": "test",
  rootStuff: {
  	dataSrc: "https://test.ttt/"
  },
  reminder: "v0.5",
  results: {
  	nestedExamples: []
  },
	":__logNumB4": [
		"=numMammalsBefore()",
	],
	"__:logNumAf": [
		"=numMammalsAfter()",
	],
	"@before()": "=logFishCount()",
	"@after()": "=logFishCount()",
  "byPreyType": {
    "$preytype": {
      total: "+1",
      mass: "+$preymass",
      lostMass: "#-$preymass",
      massMin: "<$preymass",
      massMax: ">$preymass",
      addedb4: "$rowBefore",
      addedAfter: "$rowAfter",
      "rekeyedNested": [{
      	index: "@branch",
      	hunter: "$catname",
  			parentTotal: "@parent.$total",
  			"nestedAgain": {
  				"#@dist()": [
  					"@root.$results.$nestedExamples"
  				], 
  				grandParentTotal: "@parent.parent.$total",
  				parentBranch: "@parent.branch",
  				grandParentBranch: "@parent.parent.branch",
  				version: "@root.$reminder",
  				src: "@root.$rootStuff.$dataSrc"
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
      	"$preytype", 
      	"distinct"
      ],
      "rows": ["$"],
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
  		blockName: "&loc.name"
  	}
  },
  uniqueOwners: [
  	"$owners[]", 
  	"distinct---"
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
  	"=roundedPreyMass()",
  	"distinct"
  ],
  involvedLocations: [
  	"=locations[]"
  ],
  distinctLocations: [
  	"=locations[]",
  	"distinct"
  ],
  byComputedLocations: {
  	"=locations[]": {
  		location: "@branch",
  		count: "+1",

  		/*
  		time0: [ "_::=test0" ],
  		time1: [ ":_:=test1" ],
  		time2: [ "::_=test2" ],

  		timeA: [ "_::$testA" ],
  		timeB: [ ":_:$testB" ],
  		timeC: [ "::_$testC" ],


  		timeX: [ "__:=testx" ],
  		timeY: [ "_:_=testy" ],
  		timeZ: [ ":__=testz" ],
  		timeX: [ "__:=testx" ],
  		timeY: [ "_:_=testy" ],
  		timeZ: [ ":__=testz" ],
			*/


  		// * Callbacks
  		// @before(row)
  		// @after(row, @parent)    "__:"
  		// @end(all-result)

  		// * Built-ins
  		// "@dist()": ["@root@.final"]
  	}
  },
  /*
  tentative: {
  	dataProp: "$property",
  	d1: "$",
  	d2: "$.",
  	d2a: "$propnext/then"
  	d3: "$.prop.next.then",
  	d4: "$$prop$next$then",
  	d5: "$|prop|next|then",
  }
  */
};