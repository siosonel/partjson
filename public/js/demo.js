function expandSymbols() {
	document.querySelectorAll(".nav-symbol").forEach(elem => {
		elem.style.height = "16px"
		elem.style.padding = "2px"
	})
}

function collapseSymbols() {
	document.querySelectorAll(".nav-symbol").forEach(elem => {
		elem.style.height = 0
		elem.style.padding = 0
	})
}

function isNumeric(d) {
	return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
}

function demo(examples, reveal=false) {
	const opts = getOpts()
	const emptyExample = opts.createTemplate()
	const renderedBySymbol = {}
	go()

	function go(){
		examples.forEach(renderExample)
	}

	function renderExample(example,i) {
		const clone = document.importNode(emptyExample.content, true)
		clone.querySelector('.example-div').setAttribute("id", example.id)
		const results = clone.querySelector(".results")
		const fxns = clone.querySelector(".fxns")
		
		// the ParJSON template, not a DOM template
		const template = clone.querySelector(".template")
		template.innerHTML = highlightTokens(example.template)
		
		const tsv = clone.querySelector(".tsv")
		tsv.innerHTML = opts.tsvText

		const title = clone.querySelector('p')
		title.innerHTML = example.title

		const run = getRunFxn({template, tsv, results, title})
		setTryDiv(clone, run, example)

		const inputLabels = clone.querySelectorAll('.inputlabel')
		for(const label of inputLabels) {
			label.onclick = run
		}

		clone.querySelector('.update-btn').onclick = run

		clone.querySelector('.tsv-btn').onclick = ()=>{
			tsv.style.display = tsv.style.display == "block" ? "none" : "block"
			fxns.style.display = "none"
		}

		document.querySelector('#'+example.section).appendChild(clone)

		if (window.location.hash == '#' + example.id) {
			setTimeout(()=>title.scrollIntoView(), 100)
		}

		if (example.symbol && !renderedBySymbol[example.symbol]) {
			const tab = document.createElement('div')
			tab.setAttribute("class", "nav-symbol")
			tab.innerHTML = example.tabLabel ? example.tabLabel : example.symbol
			const navCol = document.querySelector("#nav-col-" + example.tokenType)
			navCol.appendChild(tab)
			
			tab.onclick = () => {
				collapseSymbols()
				window.location.hash = "#" + example.id
				//document.querySelector('#'+example.id).scrollIntoView()
			}

			navCol.querySelector('.nav-tab').onclick = () => {
				collapseSymbols()
				window.location.hash = "#" + example.section
				//document.querySelector('#'+example.section).scrollIntoView()
			}
		}
	}

	function setTryDiv(clone, run, example) {
		const tryDiv = clone.querySelector(".example-try")
		clone.querySelector(".try-btn").onclick = () => {
			const display = tryDiv.style.display != "block" ? "block" : "none"
			tryDiv.style.display = display
			if (display == "none") return
			const fxnStr = run()
			displayFxns(fxnStr, example)
		}
		if (reveal) {
			tryDiv.style.display = "block"
			const fxnStr = run()
			displayFxns(fxnStr, example)
		}
	}

	function getRunFxn(dom) {
		let tracker
		return function() {
			const template = JSON.parse(
				dom.template.innerText
					.trim()
					.replace("&lt;","<")
					.replace("&gt;",">")
			)

			const data = parseTsv(dom.tsv.value.trim())

			if (tracker) {
				tracker.refresh({
					template,
					data,
				})
			}
			else {
				tracker = new Parjson({
					template,
					data,
					fxns: opts.fxns
				})
			}

			dom.results.innerHTML = JSON.stringify(tracker.tree, null, "  ")

			const fxnStr = {}
			for(const templateFiller of tracker.fillers) {
				const [template, filler] = templateFiller
				for(const term in filler.inputs) {
					if (term[0]=="=") {
						const fxnName = term.slice(1,-2)
						if (!fxnStr[fxnName] && tracker.opts.fxns[fxnName]) {
							fxnStr[fxnName] = tracker.opts.fxns[fxnName].toString()
						}
					}
					const templateVal = filler.inputs[term].templateVal
					if (typeof templateVal == "string" && templateVal[0] == "=") {
						const fxnName = templateVal.slice(1,-2)
						if (!fxnStr[fxnName] && tracker.opts.fxns[fxnName]) {
							fxnStr[fxnName] = tracker.opts.fxns[fxnName].toString()
						}
					}
				}
			}
			return fxnStr
		}
	}

	function highlightTokens(str) {
		return JSON.stringify(str, null, "  ")
		.replace(/\"\</g, "\"&lt;")
		.replace(/\"\>/g, "\"&gt;")
		.replace(/\"\&lt\;\$/g, "\"<span class='parjson-token'>&lt;$</span>")
		.replace(/\"\&gt\;\$/g, "\"<span class='parjson-token'>&gt;$</span>")
		.replace(/\"\&lt\;/g, "\"<span class='parjson-token'>&lt;</span>")
		.replace(/\"\&gt\;/g, "\"<span class='parjson-token'>&gt;</span>")
		.replace(/\"\=/g, "\"<span class='parjson-token'>=</span>")
		.replace(/\"\$/g, "\"<span class='parjson-token'>$</span>")
		.replace(/\"\+\$/g, "\"<span class='parjson-token'>+$</span>")
		.replace(/\"\-\$/g, "\"<span class='parjson-token'>-$</span>")
		.replace(/\"\&/g, "\"<span class='parjson-token'>&</span>")
		.replace(/\"\@/g, "\"<span class='parjson-token'>@</span>")
		.replace(/\"\+/g, "\"<span class='parjson-token'>+</span>")
		.replace(/\"\-/g, "\"<span class='parjson-token'>-</span>")
		.replace(/\(\)\"/g, "<span class='parjson-token'>()</span>\"")
		.replace(/\[\]\"/g, "<span class='parjson-token'>[]</span>\"")
		.replace(/\:\ \[\n/g, ": <span class='parjson-token'>[</span>\n")
		.replace(/\ \]\n/g, "<span class='parjson-token'>]</span>\n")
		.replace(/\ \]\,\n/g, "<span class='parjson-token'>]</span>,\n")
		.replace(/\"\#/g, "<span class='parjson-token'>\"#</span>")
	}

	function displayFxns(fxnStr, example) {
		if (!Object.keys(fxnStr).length) return; console.log(fxnStr)
		const node = document.querySelector('#'+example.id).parentNode
		let str = ""
		for(const fxnName in fxnStr) { console.log(fxnName)
			str += "<i class='fxn-keyword'>function&nbsp;</i>"
					+ fxnStr[fxnName]
						.replace(fxnName, "<span class='fxn-name'>"+ fxnName + "</span>")
						.replace(/row/g, "<span class='fxn-arg'>row</span>")
						.replace(/context/g, "<span class='fxn-arg'>context</span>") 
						.replace(/return\ /g, "<span class='fxn-return'>return </span>")
				  +  "\n\n"
		}
console.log(node.querySelector(".fxns-btn"))
		node.querySelector(".fxns").innerHTML = str //JSON.stringify(fxnStr)
		node.querySelector(".fxns-btn").style.display = "inline"
		node.querySelector(".fxns-btn").onclick = ()=>{
			const currDisplay = node.querySelector(".fxns").style.display
			node.querySelector(".fxns").style.display = currDisplay != "block" ? "block" : "none"
			node.querySelector(".tsv").style.display = "none"
		}
	}

	function parseTsv(tsv) {
		const data = []
		const lines = tsv.trim().split('\n');
		const header = lines[0].trim().split('\t');
		const tsvParseErrors = []
		lines.forEach((line, i) => {
			if (i===0 || !line) return
			const d = line
				.trim()
				.split('\t')
				.map(_v=>{
					const v = _v.trim()
					return isNumeric(v) ? +v : v
				})
			if (!d.length) {
				tsvParseErrors.push(`Missing line #${i}.`)
				return
			}
			const c = Object.create(null)
			c['line #'] = i 
			header.map((key, j) => {
				if (key.endsWith("-json")) {
					c[key.slice(0,-5)] = JSON.parse(d[j])
				}
				else {
					c[key] = d[j]
				}
			});

			c.testObj = {}
			data.push(c)
		}); 
		if (tsvParseErrors.length) {
			console.log('Error parsing tsv: ', tsvParseErrors)
		}
		
		return data
	}
}

// collect variables, functions that have tab
// and spacing requirements here 
function getOpts() {
	return {
		fxns: {
totalMassOverCount(row, context) {
	return context.self.totalPreyMass / context.self.count
},
roundedPreyMass(row, context) {
	return isNumeric(row.preymass) 
	? +row.preymass.toPrecision(2) 
	: null
},
savedDoublePreyMass(row) {
	row.preymass = isNumeric(row.preymass) 
		? 2 * +row.preymass 
		: 0
	return row.preymass
},
savedTriplePreyMass(row) {
	row.preymass = isNumeric(row.preymass) 
		? 3 * +row.preymass 
		: 0
	return row.preymass
},
adjustPreyMass(row) {
	return row.preymass*0.8
},
splitOwners(row) {
	return row.owners.split(",")
},
blockInfo(row) {
	return row.ownerblock[0] == 'C' 
		? {name: "Friendly Neighborhood", population: 630}
		: {name: "Sesame Street", population: 950}
}
},
	
	tsvText: `catname	catsex	owners	ownerblock	huntblock	huntdate	preytype	preysubtype	preymass	nested-json
Jerry	male	Bob	A1	B1	2019-01-02 19:25	bird	robin	0.596	{"random":{"id": "a10c"}}
Jerry	male	Bob	A1	B4	2019-01-04 20:45	mammal	rat	0.601	{"random":{"id": "bkd0"}}
Jerry	male	Bob,Jane	A1	C3	2019-01-07 06:45	mammal	squirel	0.8	{"random":{"id": "jjkl"}}
Princess	female	Alice,Joe	C2	C3	2019-01-05 09:45	fish	minnow	0.1	{"random":{"id": "hgys"}}
Princess	female	Alice,Mike	C2	C3	2019-01-07 09:45	fish	catfish	1.6	{"random":{"id": "irty"}}
Princess	female	Alice,Mike	C2	C3	2019-01-09 09:45	amphibian	frog	0.7	{"random":{"id": "34jd"}}`
,

	createTemplate() {
		const template = document.createElement('template')
		template.setAttribute('id', 'emptyExample')
		template.innerHTML = `<div id="" class="example-div">
	<button class="try-btn">try</button>
	<p class="example-title"></p>
	<div class="example-try">
		<div style="text-align: center">
			<div class='jsondiv'>
				<h3 class='inputlabel'>
					Template
				</h3>
				<pre class='template inputtext' contenteditable="true">
				</pre>
			</div>
			<div class='jsondiv'>
				<h3 class='inputlabel'>
					Result
				</h3>
				<pre class='results inputtext' disabled="true">
				</pre>
			</div>
		</div>
		<div class='btn-div'>
			<button class='tsv-btn'>Data</button>
			<button class='update-btn'>Update</button>
			<button class='fxns-btn' style="display:none">Functions</button>
		</div>
		<code class='fxns'>
		</code>
		<textarea class='tsv'>
		</textarea>
	</div>
</div>`;

			document.body.appendChild(template)
			return document.querySelector('#emptyExample')
		}
	}
}