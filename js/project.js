/**
 * @typedef {"html" | "css" | "js" | "md"} Language
 * @typedef {Record<Language, Record<"code" | "compiler", string>>} ProjectInfo
 * @typedef {Record<Language, CodeJarPrototype} EditorCache
 */

/** Simple class which can save progress */
class Project {
	/**
	 * @param {string} name 
	 */
	constructor(name) {
		this.serializer = new XMLSerializer();
		this.parser = new DOMParser();
		/** @type {ProjectInfo} */
		this.info = {
			html: {
				code: this.createHTMLDocument(name),
				compiler: null
			},
			// Markdown is the new one because
			md: {
				code: "#" + name,
				compiler: null
			},
			css: {
				code: "body, html {\n\t\n}",
				compiler: "css"
			},
			js: {
				code: "// JavaScript goes here",
				compiler: "js"
			}
		};
		this.iFrame = document.querySelector("iframe");
		this.name = name;
		/** @type {EditorCache} */
		this.editors = {};
		this.createFrameContent = this.createFrameContent.bind(this);
	}
	// Visual \\
	destroy() { // I destroy my elements
		$(window).off("toggle");
		$(".control-content").each((i, el) => {
			if (i > 2) return;
			$(el).children("pre").remove();
			this.editors[el.id].destroy();
		});
		$('a[href="#output"]').off("click", this.createFrameContent);
		$(".on").removeClass("on").children().css({
			transform: "translate3d(0,0,0)"
		});
		this.iFrame.srcdoc = '<!DOCTYPE html><html lang="en"><head><title>Plain Project</title></head><body></body><html>';
	}
	load() {
		const _this = this;
		$(".control-content").each(function() {
			if (this.id.length < 6) {
				const code = $("<pre></pre>").addClass("language-" + this.id);
				const togglesCount = {
					html: 1,
					css: 3,
					js: 2
				};
				const height = `calc(100vh - ${170 + togglesCount[this.id] * 43}px)`;
				code.css("height", height);
				$(this).prepend(code);
				const editor = CodeJar(code, Prism.highlightElement);
				editor.updateCode(_this.info[this.id].code);
				if (this.id === "html") {
					code.attr("autofocus", "autofocus");
				}
				editor.onUpdate(code => {
					_this.info[this.id].code = code;
					_this.save();
				});
				_this.editors[this.id] = editor;
				if (this.id === "html") {
					const _code = $("<pre></pre>").addClass("language-markdown").css({height, display: "none"});
					//const _code = $("<pre></pre>").addClass("language-markdown").css("height", height).hide();
					$(this).prepend(_code);
					const _editor = CodeJar(_code, Prism.highlightElement);
					_editor.updateCode(_this.info.md.code);
					_editor.onUpdate(code => {
						_this.info.md.code = code;
						_this.save();
					});
					_this.editors.md = _editor;
				}
			}
		});
		$(".toggle").on("toggle", function({detail: {isActive}}) {
			if ($(this).hasClass("is-markdown")) {
				$("#html>pre").toggle();
				$('a[href="#html"]').html(isActive ? "md" : "html");
				this.info.html.compiler = isActive ? "markdown" : null;
			}
			const css = _this.getStyleType();
			const js = _this.getScriptType();
			_this.info.js.compiler = js;
			_this.info.css.compiler = css;
			$("#js>pre")[0].className = "language-" + js;
			$("#css>pre")[0].className = "language-" + css;
			$('a[href="#js"]').html(js);
			Prism.highlightElement($("#js>pre")[0]);
			$('a[href="#css"]').html(css);
			Prism.highlightElement($("#css>pre")[0]);
			_this.save();
		});
		$('a[href="#output"], a[href="#compile"]').on("click", async () => {
			const blob = new Blob((await this.compiled()).split(/\r?\n/), {
				type: "text/html",
				endings: "native"
			});
			$(".icon-download").attr("href", URL.createObjectURL(blob)).attr("download", this.filify(this.name) + ".html");
		});
		$('nav>a[href="#output"]').on("click", this.createFrameContent);
		const output = CodeJar($("#compile>pre"), Prism.highlightElement);
		$("#compile>pre").removeAttr("contenteditable");
		$('a[href="#compile"]').on("click", async () => output.updateCode(await this.compiled()));
		$(`.is-${this.info.js.compiler}, .is-${this.info.css.compiler}, .is-${this.info.html.compiler}`).addClass("on").children().removeAttr("style");
		$(window).trigger("toggle");
		this.save();
	}
	// Storage actions \\
	save() {
		localStorage.setItem(this.name, JSON.stringify(this.info));
	}
	/**
	 * @param {string|false} name 
	 */
	rename(name) {
		if (name && localStorage.getItem(this.name)) {
			localStorage.removeItem(this.name);
			this.name = name;
			this.save();
		}
		else if (name) {
			this.name = name;
		}
	}
	filify(name) {
		return name.replace(/[\/\\\:\*\?\"\'\<\>\|\s]/g, "-").replace(/^\-+|\-+$/g, "");
	}
	/**
	 * @param {boolean} sure 
	 */
	"delete"(sure) {// delete is keyword but I use ES2019
		if (sure) {
			localStorage.removeItem(this.name);
		}
	}
	// Compiling \\
	getScriptType() {
		const isTypeScript = $(".is-ts").hasClass("on");
		const isReact = $(".is-jsx").hasClass("on");
		// this is condition! Not your if-else or switch (true) {}
		return (isTypeScript ? "ts" : "js") + (isReact ? 'x' : "");
	}
	getStyleType() {
		const isSass = $(".is-sass").hasClass("on");
		const isSCSS = $(".is-scss").eq(1).hasClass("on");
		const isLess = $(".is-less").hasClass("on");
		// I am condition master!
		return (isSass ? 's' + (isSCSS ? 'c' : 'a') : (isLess ? "le" : 'c')) + "ss";
	}
	/** @type {ProjectInfo} */
	/**
	 * @param {string} name 
	 */
	createHTMLDocument(name) {
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>${name}</title>
		</head>
		<body>
			
		</body>
		</html>`.split("		").join("");
	}
	compileHTML() { // simpliest compiler API I found. But that was last one
		return $(".is-markdown").hasClass("on") ? marked(this.info.md.code, "Maruku") : this.info.html.code;
	}
	/**
	 * @param {string} js 
	 * @param {(error: string) => string} reject
	 * @param {"js"|"jsx"|"ts"|"tsx"} type
	 * @param {boolean} minify
	 */
	compileJS(js, reject, type, minify) {
		const presets = ["es2017"];
		/[tj]sx/.test(type) && presets.push("react");
		/tsx?/.test(type) && presets.push("typescript");
		try {
			return Babel.transform(js, {
				presets,
				plugins: [
					'transform-class-properties',
					'transform-object-rest-spread',
					'syntax-optional-catch-binding',
				],
				minified: minify,
				comments: !minify
			}).code;
		}
		catch (error) {
			return reject(error.message);
		}
	}
	/**
	 * @param {string} css
	 * @param {boolean} compress
	 * @returns {Promise<string>}
	 */
	async compileCSS(css, compress) {
		if (this.info.css.compiler === "css") {
			return new Promise(resolve => resolve(css));
		}
		if (this.info.css.compiler === "less") {
			try {
				return (await less.render(css, {compress})).css;
			} catch (e) { // throw this to main thread for IDE console
				throw e;
			}
		}
		return new Promise((resolve, reject) => {
			Sass.compile(css, compress ? {
				style: Sass.style.compressed,
				indentedSyntax: this.info.css.compiler === "sass"
			} : ({status, text, formatted}) => {
				if (status === 0) {
					resolve(text);
				} else {
					reject(new SyntaxError(formatted));
				}
			}, compress && (({status, text, formatted}) => {
				if (status === 0) {
					resolve(text);
				} else {
					reject(new SyntaxError(formatted));
				}
			}));
		});
	}
	async compiled() {
		let {html: {code: html}, css: {code: css}, js: {code: uncompiled, compiler}} = this.info;
		const javascript = this.compileJS(uncompiled, error => `/* ${error} */`, compiler);
		const newDocument = this.parser.parseFromString(this.compileHTML(html), "text/html");
		const script = this.createCDATA("script", javascript);
		const style = this.createCDATA("style", await (async () => {
			try {
				return await this.compileCSS(css) || "";
			} catch (error) {
				return `/* ${error} */`;
			}
		})());
		if (/[tj]sx/.test(this.info.js)) {
			const react = document.createElement("script");
			react.src = "https://unpkg.com/react@17/umd/react.production.min.js";
			const reactDOM = document.createElement("script");
			reactDOM.src = react.src.replace(/react/g, "react-dom");
			react.crossOrigin = reactDOM.crossOrigin = "true";
			newDocument.head.appendChild(react);
			newDocument.head.appendChild(reactDOM);
		}
		if (style.innerHTML) {
			newDocument.head.appendChild(style);
		}
		if (newDocument.body.firstChild) {
			newDocument.body.insertBefore(script, newDocument.body.firstChild);
		} else {
			newDocument.body.appendChild(script);
		}
		return this.stringifyDocument(newDocument);
	}
	async createFrameContent() {
		const {
			html: {code: html},
			css: {code: css},
			js: {code: uncompiled, compiler}
		} = this.info;
		const js = this.compileJS(
			uncompiled, /* JSON.stringify encodes quotes (" => \")
			and wrap the whole string between double quotes (") */
			error => `console.error(${JSON.stringify(error)});`,
			compiler, true // use speed
		);
		// open parser because I want to append style and script
		const newDocument = this.parser.parseFromString(this.compileHTML(html), "text/html");
		// and now create <style>
		const style = this.createCDATA("style", await (async () => {
			try {
				return (await this.compileCSS(css)) || (function() {

				});
			} catch (error) {
				js += `console.error(${JSON.stringify(error.message)});`;
				return "";
			}
		})());
		// create <script> element and write data
		const script = this.createCDATA("script", js);
		/* creating an implementation of JavaScript */
		const ideJS = this.createCDATA("script", `			
			var console = {
				element: window.parent.document.querySelector("#console"),
				no_data: '<li class="table-view-cell" style="color: gray;">No data</li>',
				error(...data) {
					if (data.length === 0) return;
					this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
					this.element.innerHTML += \`<li class="table-view-cell" style="color: red;">Error: \${data.join("<br />")}</li>\`
				},
				warn(...data) {
					if (data.length === 0) return;
					this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
					this.element.innerHTML += \`<li class="table-view-cell" style="color: yellow;">Warning: \${data.join("<br />")}</li>\`
				},
				log(...data) {
					if (data.length === 0) return;
					this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
					this.element.innerHTML += \`<li class="table-view-cell">\${data.join("<br />")}</li>\`
				},
				info(...data) {
					if (data.length === 0) return;
					this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
					this.element.innerHTML += \`<li class="table-view-cell">\${data.join("<br />")}</li>\`
				},
				trace() {
					try {
						throw new Error();
					} catch (e) {
						//const [_, line, col] = /(\d+):(\d+)$/gm.exec(e.stack);
						parent.console.log(e.stack);
						this.log("Trace", "line " + line, "column " + col);
					}
				},
				clear() {
					this.element.innerHTML = no_data;
				}
			};
			
			window.onerror = function (message, _, line, column) {
				function getOrder(number) {
					return (number + 1) + ([
						"st", "nd", "rd"
					][number] || "th");
				}
				console.error(message, \`At \${getOrder(line)} column\`, \`and \${getOrder(column)} column \`);
			}
			
			function require(packageName) {
				console.error('Node.js is not supported');
				const xhr = new XMLHttpRequest();
				xhr.open("POST", "https://unpkg.com/" + packageName);
				xhr.onreadystatechange = function () {
					const {status, responseURL} = xhr;
					if (status === 0 || (status >= 200 && status < 400)) {
						function createText(text) {
							var span = document.createElement("span");
							span.style.color = "yellow";
							span.innerText = text;
							return span;
						}
						console.element.appendChild(createText("Use UNPKG url "));
						const link = document.createElement("a");
						link.innerText = responseURL;
						link.onclick = () => {
							window.parent.Swal.fire(
								"Use the code",
								\`<code class="lang-html" style="display: block; white-space: nowrap; overflow-x: auto;">&lt;script src="\${responseURL}" crossorigin>&lt;/script></code>\`,
								"info"
							);
							window.parent.Prism.highlightElement(window.parent.document.querySelector("#swal2-content>code"));
						};
						console.element.appendChild(link);
						console.element.appendChild(createText(" instead"));
					} else if (status === 404) {
						if (packageName.startsWith("@types/")) {
							console.warn(\`Package <q>\${packageName}</q> isn't supported because it's typing package\`);
						} else if (/assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|https|net|os|punycode|querystring|readline|stream|string_decoder|tls|tty|url|util|v8|vm|zlib|timers|path/.test(packageName)) {
							console.warn(\`Package <q>\${packageName}</q> isn't supported because it's backend\`);
						} else if (packageName.startsWith("@babel/")) {
							console.warn("Compiler already uses Babel. Don't use it.")
						} else if (/node-sass|react|react-dom/.includes(packageName)) {
							console.warn(\`Package <q>\${packageName}</q> is built-in by compiler. Don't use it\`);
						} else {
							console.warn(\`Package <q>\${packageName}</q> doesn't exist\`);
						}
					}
				}
				xhr.send(null);
				throw new ReferenceError("Uncaught ReferenceError: require is not defined");
			};
			
			Object.defineProperty(document, "title", {
				get() {
					return window.parent.document.getElementById("title").innerText;
				},
				set(title) {
					window.parent.document.getElementById("title").innerText = title;
				},
				configurable: true
			});
		`);
		const ideCSS = this.createCDATA("style", "html{font-family:Arial,Helvetica,sans-serif}*{box-sizing:border-box;}");
		// use React because Babel compiles JSX to React.createElement
		if (/[tj]sx/.test(compiler)) {
			newDocument.head.appendChild(this.createCDATA("script", "var {React, ReactDOM} = window.parent;"));
		}
		// appending
		newDocument.head.appendChild(ideCSS);
		newDocument.head.appendChild(style);
		newDocument.head.appendChild(ideJS);
		if (newDocument.body.firstChild) {
			newDocument.body.insertBefore(script, newDocument.body.firstChild);
		} else {
			newDocument.body.appendChild(script);
		}
		if (!newDocument.title) {
			newDocument.head.appendChild(this.createCDATA("script", "console.warn('Valid document must have title');"));
		}
		// setting title
		$("#title").text(newDocument.title || "[no title]");
		// controling console in implementation
		$("#console").html('<li class="table-view-cell" style="color: gray;">No data</li>');
		// Appending whole the HTML to iFrame
		this.iFrame.srcdoc = this.stringifyDocument(newDocument);
	}
	/**
	 * 
	 * @param {"style" | "script"} nodeName 
	 */
	createCDATA(nodeName, content) {
		const result = document.createElement(nodeName);
		result.textContent = content;
		return result;
		/*
		 * This method is very useful, more than you think 
		 * Example code: createCDATA("div", "&").innerHTML => &amp;
		 */
	}
	/**
	 * @param {Document} document 
	 */
	stringifyDocument(document) {
		document.insertBefore(new Comment("Generated with MobilCoder"), document.documentElement);
		return (document.doctype ? this.serializer.serializeToString(document.doctype) : "<!DOCTYPE html>") + "\n" + document.documentElement.outerHTML;
	}
}

/** Project without saving */
class PlainProject extends Project {
	constructor() {
		super("Plain Project");
		this.load();
	}
	save() {
		// don't save.
	}
	toSavableProject(name = this.name) {
		const result = new Project(name);
		result.info = this.info;
		result.save();
		return result;
	}
}