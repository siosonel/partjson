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

function toggleNavBar() {
	const cls = window.event.target.className
	if (cls == "nav-tab" || cls == 'nav-symbol' || cls == 'nav-page') {
		return
	}
	const navSymbol = document.querySelector(".nav-symbol")
	if (!navSymbol) return
	const ht = parseFloat(navSymbol.style.height)
	if (isNaN(ht) || ht === 0) {
		expandSymbols()
	}
	else {
		collapseSymbols()
	}
}

document.querySelector(".nav-top").onclick = toggleNavBar

function isNumeric(d) {
	return !isNaN(parseFloat(d)) && isFinite(d) && d!==''
}

function demo(examples, reveal=false) {
	const opts = getOpts()
	const renderedBySymbol = {}
	go()
  document.querySelector(".nav-bar").style.opacity = 1

	function go(){
		examples.forEach(renderExample)
	}

	function renderExample(example,i) {
		const dom = opts.setExampleDiv(example)
		dom.template.innerHTML = highlightTokens(example.template)
		dom.tsv.innerHTML = opts.tsvText
		dom.title.innerHTML = example.title

		const run = getRunFxn(dom)

		dom.updateBtn.onclick = run
		for(const label of dom.inputLabels) {
			label.onclick = run
		}

		dom.tsvBtn.onclick = ()=>{
			dom.tsv.style.display = dom.tsv.style.display == "block" ? "none" : "block"
			dom.fxns.style.display = "none"
		}

		dom.tryBtn.onclick = () => {
			const display = dom.tryDiv.style.display != "block" ? "block" : "none"
			dom.tryDiv.style.display = display
			if (display == "none") return
			const fxnStr = run()
			displayFxns(fxnStr, example)
		}

		if (reveal) {
			dom.tryDiv.style.display = "block"
			const fxnStr = run()
			displayFxns(fxnStr, example)
		}

		if (window.location.hash == '#' + example.id) { 
			setTimeout(()=>dom.title.scrollIntoView(), 100)
		} 
		else if (window.location.hash == '#' + example.section) {
			document.getElementById(example.section).scrollIntoView()
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
		if (!Object.keys(fxnStr).length) return; 
		const div = document.querySelector('#'+example.id)
		if (!div) return
		let str = ""
		for(const fxnName in fxnStr) {
			str += "<i class='fxn-keyword'>function&nbsp;</i>"
					+ fxnStr[fxnName]
						.replace(fxnName, "<span class='fxn-name'>"+ fxnName + "</span>")
						.replace(/row/g, "<span class='fxn-arg'>row</span>")
						.replace(/context/g, "<span class='fxn-arg'>context</span>") 
						.replace(/return\ /g, "<span class='fxn-return'>return </span>")
				  +  "\n\n"
		}
		div.querySelector(".fxns").innerHTML = str
		div.querySelector(".fxns-btn").style.display = "inline"
		div.querySelector(".fxns-btn").onclick = ()=>{
			const currDisplay = div.querySelector(".fxns").style.display
			div.querySelector(".fxns").style.display = currDisplay != "block" ? "block" : "none"
			div.querySelector(".tsv").style.display = "none"
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

setExampleDiv(example) {
		const child = document.createElement('div')
		child.setAttribute('id', example.id); //console.log(div.id)
		child.setAttribute('class', 'example-div')
		child.innerHTML = `
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
	</div>`;

			const div = document.getElementById(example.section).appendChild(child); 
			return {
				div,
				title: div.querySelector('p'),
				// the ParJSON template, not a DOM template
				template: div.querySelector(".template"),
				results: div.querySelector(".results"),
				tsv: div.querySelector(".tsv"),
				fxns: div.querySelector(".fxns"),
				inputLabels: div.querySelectorAll('.inputlabel'),
				updateBtn: div.querySelector('.update-btn'),
				tsvBtn: div.querySelector('.tsv-btn'),
				tryDiv: div.querySelector('.example-try'),
				tryBtn: div.querySelector('.try-btn')
			}
		}
	}
}