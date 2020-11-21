/**
 * @typedef {"html" | "css" | "js"} Language
 * @typedef {Record<Language, Record<"code" | "compiler", string>>} ProjectInfo
 * @typedef {Record<Language, ReturnType<CodeJar<HTMLPreElement>>>} EditorCache
 */

/** Simple class which can save progress */
class Project {
	/**
	 * @param {string} name 
	 */
	constructor(name) {
		/** @type {ProjectInfo} */
		this.info = {
			html: {
				code: this.createHTMLDocument(name),
				compiler: "html" // null
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
		this.serializer = new XMLSerializer();
		this.parser = new DOMParser();
		this.iFrame = document.querySelector("iframe");
		this.name = name;
		/** @type {EditorCache} */
		this.editors = {};
		this.createDocument = this.createDocument.bind(this);
	}
	/**
	 * @param {string|false} name 
	 */
	rename(name) {
		if (!name) {
			// do nothing
		} else if (!!localStorage.getItem(this.name)) {
			localStorage.removeItem(this.name);
			this.name = name;
			this.save();
		}
		else {
			this.name = name;
		}
	}
	destroy() { // I destroy my elements
		$(window).off("toggle");
		$(".control-content").each((i, el) => {
			if (i > 2) return;
			$(el).children("pre").remove();
			this.editors[el.id].destroy();
		});
		$('a[href="#output"]').off("click", this.createDocument);
		$(".on").removeClass("on");
	}
	load() {
		const _this = this;
		$(".control-content").each(function () {
			if (this.id.length < 6) {
				const code = $("<pre></pre>"),
				togglesCount = {
					html: 0,
					css: 1,
					js: 2
				};
				code.addClass("language-" + this.id);
				code.css("height", `calc(100vh - ${170 + togglesCount[this.id] * 43}px)`);
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
			}
		});
		$(window).on("toggle", () => {
			this.info.js.compiler = this.getScriptType();
			this.info.css.compiler = this.getStyleType();
			$("#js>pre")[0].className = "language-" + this.getScriptType();
			$("#css>pre")[0].className = "language-" + this.getStyleType();
			$('a[href="#js"]').html(this.getScriptType());
			Prism.highlightElement($("#js>pre")[0]);
			$('a[href="#css"]').html(this.getStyleType());
			Prism.highlightElement($("#css>pre")[0]);
			this.save();
		});
		$('a[href="#output"], a[href="#compile"]').on("click", async () => {
			const blob = new Blob((await this.compiled()).split(/\r?\n/), {
				type: "text/html",
				endings: "native"
			});
			$(".icon-download").attr("href", URL.createObjectURL(blob)).attr("download", this.filify(this.name || "Untitled") + ".html");
		});
		$('a[href="#output"]').on("click", this.createDocument);
		const output = CodeJar($("#compile>pre"), Prism.highlightElement);
		$("#compile>pre").removeAttr("contenteditable");
		$('a[href="#compile"]').on("click", async () => output.updateCode(await this.compiled()));
		$(`.is-${this.info.js.compiler}, .is-${this.info.css.compiler}`).addClass("on");
		$(window).trigger("toggle");
		this.save();
	}
	getScriptType() {
		const isTypeScript = $(".is-ts").hasClass("on");
		const isReact = $(".is-jsx").hasClass("on");
		return (isTypeScript ? "ts" : "js") + (isReact ? 'x' : "");
	}
	getStyleType() {
		return ($(".is-scss").hasClass("on") ? 's' : "") + "css";
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
	save() {
		localStorage.setItem(this.name, JSON.stringify(this.info));
	}
	/**
	 * @param {boolean} sure 
	 */
	"delete"(sure) {
		if (sure) {
			localStorage.removeItem(this.name);
		}
	}
	/**
	 * @param {string} js 
	 * @param {(error: string) => string} reject
	 * @param {"js"|"jsx"|"ts"|"tsx"} type
	 */
	compileJS(js, reject, type) {
		const presets = ["es2017"];
		/[tj]sx/.test(type) && presets.push("react");
		/tsx?/.test(type) && presets.push("typescript");
		try {
			return Babel.transform(js, {
				presets,
				plugins: [
					'transform-class-properties',
					'transform-object-rest-spread',
					'syntax-optional-catch-binding'
				],
				minified: true // use speed
			}).code;
		}
		catch (err) {
			return reject(err.message);
		}
	}
	/**
	 * @param {string} css
	 * @returns {Promise<string>}
	 */
	compileCSS(css) {
		return new Promise(resolve => {
			Sass.compile(css, {
				style: Sass.style.compressed
			}, code => resolve(code.text));
		});
	}
	async compiled() {
		const {html: {code: html}, css: {code: css}, js: {code: uncompiled, compiler} } = this.info,
		javascript = this.compileJS(uncompiled, message => `/* ${message.replace(/\/\*|\*\//gm, "")} */`, compiler);
		const newDocument = this.parser.parseFromString(html, "text/html"), script = document.createElement("script");
		script.innerHTML = javascript;
		const style = document.createElement("style");
		style.innerHTML = (await this.compileCSS(css)) || "/* ERROR or EMPTY */";
		if (/[tj]sx/.test(this.info.js)) {
			const react = document.createElement("script");
			react.src = "https://unpkg.com/react@17/umd/react.production.min.js";
			const reactDOM = document.createElement("script");
			reactDOM.src = react.src.replace(/react/g, "react-dom");
			react.crossOrigin = reactDOM.crossOrigin = "true";
			newDocument.head.appendChild(react);
			newDocument.head.appendChild(reactDOM);
		}
		newDocument.head.appendChild(style);
		newDocument.body.appendChild(script);
		return [
			"<!-- Generated by MobilCoder -->",
			this.serializer.serializeToString(newDocument)
		].join("\n");
	}
	async createDocument() {
		document.querySelector("#console").innerHTML = "";
		const {html: {code: html}, css: {code: css, compiler: isSass}, js: {code: js, compiler} } = this.info;
		// open parser because I want to append style and script
		const newDocument = this.parser.parseFromString(html, "text/html");
		// create <script> element and write data
		const script = document.createElement("script");
		script.innerHTML = this.compileJS(
			js, /* JSON.stringify encodes quotes (" => \") and
			wrap the whole string between double quotes (") */
			message => `console.error(${JSON.stringify(message)});`,
			compiler
		);
		// and now create <style>
		const style = document.createElement("style");
		style.innerHTML = isSass === "css" ? css : await this.compileCSS(css);
		// Sass.js doesn't report complete error with message but returns undefined (stupid).
		if (style.innerHTML === "undefined" && !!css.trim()) {
			script.innerHTML += "console.warn('Stylesheet didn\\'t apply because there is an error or it\\'s only empty rulesets.')";
		}
		/* creating an implementation of JavaScript */
		const ideJS = document.createElement("script");
		ideJS.src = "data:application/javascript;base64,d2luZG93LmFsZXJ0ID0gYXN5bmMgKGEpID0+IGF3YWl0IHdpbmRvdy5wYXJlbnQuU3dhbC5maXJlKGBDb2RlICR7ZG9jdW1lbnQudGl0bGV9IHNheXM6YCwgYSk7Cgp3aW5kb3cuY29uZmlybSA9IGFzeW5jIChhKSA9PiAoYXdhaXQgd2luZG93LnBhcmVudC5Td2FsLmZpcmUoewoJdGl0bGU6IGBDb2RlICR7ZG9jdW1lbnQudGl0bGV9IGFza3M6YCwKCXRleHQ6IGEsCglzaG93Q2FuY2VsQnV0dG9uOiB0cnVlCn0pKS52YWx1ZTsKCndpbmRvdy5wcm9tcHQgPSBhc3luYyAoYSwgYikgPT4gKGF3YWl0IHdpbmRvdy5wYXJlbnQuU3dhbC5maXJlKHsKCXRpdGxlOiBgQ29kZSAke2RvY3VtZW50LnRpdGxlfSBhc2tzOmAsCgl0ZXh0OiBhLAoJaW5wdXQ6ICJ0ZXh0IiwKCWlucHV0VmFsdWU6IGIKfSkpLnZhbHVlOwoKdmFyIGNvbnNvbGUgPSB7CiAgICBlbGVtZW50OiB3aW5kb3cucGFyZW50LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoIiNjb25zb2xlIiksCiAgICBub19kYXRhOiAnPGxpIGNsYXNzPSJ0YWJsZS12aWV3LWNlbGwiIHN0eWxlPSJjb2xvcjogZ3JheTsiPk5vIGRhdGE8L2xpPicsCgllcnJvciguLi5kYXRhKSB7CgkJdGhpcy5lbGVtZW50LmlubmVySFRNTCA9IHRoaXMuZWxlbWVudC5pbm5lckhUTUwucmVwbGFjZSh0aGlzLm5vX2RhdGEsICIiKTsKCQl0aGlzLmVsZW1lbnQuaW5uZXJIVE1MICs9IGA8bGkgY2xhc3M9InRhYmxlLXZpZXctY2VsbCIgc3R5bGU9ImNvbG9yOiByZWQ7Ij5FcnJvcjogJHtkYXRhLmpvaW4oIjxiciAvPiIpfTwvbGk+YAoJfSwKCXdhcm4oLi4uZGF0YSkgewoJCXRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MLnJlcGxhY2UodGhpcy5ub19kYXRhLCAiIik7CgkJdGhpcy5lbGVtZW50LmlubmVySFRNTCArPSBgPGxpIGNsYXNzPSJ0YWJsZS12aWV3LWNlbGwiIHN0eWxlPSJjb2xvcjogeWVsbG93OyI+V2FybmluZzogJHtkYXRhLmpvaW4oIjxiciAvPiIpfTwvbGk+YAoJfSwKCWxvZyguLi5kYXRhKSB7CQogICAgICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MLnJlcGxhY2UodGhpcy5ub19kYXRhLCAiIik7CgkJdGhpcy5lbGVtZW50LmlubmVySFRNTCArPSBgPGxpIGNsYXNzPSJ0YWJsZS12aWV3LWNlbGwiPiR7ZGF0YS5qb2luKCI8YnIgLz4iKX08L2xpPmAKCX0sCglpbmZvKC4uLmRhdGEpIHsKICAgICAgICB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MID0gdGhpcy5lbGVtZW50LmlubmVySFRNTC5yZXBsYWNlKHRoaXMubm9fZGF0YSwgIiIpOwoJCXRoaXMuZWxlbWVudC5pbm5lckhUTUwgKz0gYDxsaSBjbGFzcz0idGFibGUtdmlldy1jZWxsIj4ke2RhdGEuam9pbigiPGJyIC8+Iil9PC9saT5gCgl9LAoJdHJhY2UoLi4uZGF0YSkgewogICAgICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MLnJlcGxhY2UodGhpcy5ub19kYXRhLCAiIik7CgkJdGhpcy5lbGVtZW50LmlubmVySFRNTCArPSBgPGxpIGNsYXNzPSJ0YWJsZS12aWV3LWNlbGwiPiR7ZGF0YS5qb2luKCI8YnIgLz4iKX08L2xpPmAKCX0sCgljbGVhcigpIHsKCQl0aGlzLmVsZW1lbnQuaW5uZXJIVE1MID0gbm9fZGF0YTsKCX0KfTsKCndpbmRvdy5vbmVycm9yID0gZnVuY3Rpb24gKG1lc3NhZ2UsIF8sIGxpbmUsIGNvbHVtbikgewoJZnVuY3Rpb24gZ2V0T3JkZXIobnVtYmVyKSB7CgkJcmV0dXJuIChudW1iZXIgKyAxKSArIChbCgkJCSJzdCIsICJuZCIsICJyZCIKCQldW251bWJlcl0gfHwgInRoIik7Cgl9Cgljb25zb2xlLmVycm9yKG1lc3NhZ2UsIGBBdCAke2dldE9yZGVyKGxpbmUpfSBjb2x1bW5gLCBgYW5kICR7Z2V0T3JkZXIoY29sdW1uKX0gY29sdW1uIGApOwp9CgpmdW5jdGlvbiByZXF1aXJlKHBhY2thZ2VOYW1lKSB7Cgljb25zb2xlLmVycm9yKCdOb2RlLmpzIGlzIG5vdCBzdXBwb3J0ZWQnKTsKCWNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpOwoJeGhyLm9wZW4oIlBPU1QiLCAiaHR0cHM6Ly91bnBrZy5jb20vIiArIHBhY2thZ2VOYW1lKTsKCXhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7CgkJY29uc3Qge3N0YXR1cywgcmVzcG9uc2VVUkx9ID0geGhyOwoJCWlmIChzdGF0dXMgPT09IDAgfHwgKHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgNDAwKSkgewoJCQlmdW5jdGlvbiBjcmVhdGVUZXh0KHRleHQpIHsKCQkJCXZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgic3BhbiIpOwoJCQkJc3Bhbi5zdHlsZS5jb2xvciA9ICJ5ZWxsb3ciOwoJCQkJc3Bhbi5pbm5lclRleHQgPSB0ZXh0OwoJCQkJcmV0dXJuIHNwYW47CgkJCX0KCQkJY29uc29sZS5lbGVtZW50LmFwcGVuZENoaWxkKGNyZWF0ZVRleHQoIlVzZSBVTlBLRyB1cmwgIikpOwoJCQljb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiYSIpOwoJCQlsaW5rLmlubmVyVGV4dCA9IHJlc3BvbnNlVVJMOwoJCQlsaW5rLm9uY2xpY2sgPSAoKSA9PiB7CgkJCQl3aW5kb3cucGFyZW50LlN3YWwuZmlyZSgKCQkJCQkiVXNlIHRoZSBjb2RlIiwKCQkJCQlgPGNvZGUgY2xhc3M9ImxhbmctaHRtbCIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyB3aGl0ZS1zcGFjZTogbm93cmFwOyBvdmVyZmxvdy14OiBhdXRvOyI+Jmx0O3NjcmlwdCBzcmM9IiR7cmVzcG9uc2VVUkx9IiBjcm9zc29yaWdpbj4mbHQ7L3NjcmlwdD48L2NvZGU+YCwKCQkJCQkiaW5mbyIKCQkJCSk7CgkJCQl3aW5kb3cucGFyZW50LlByaXNtLmhpZ2hsaWdodEVsZW1lbnQod2luZG93LnBhcmVudC5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCIjc3dhbDItY29udGVudD5jb2RlIikpOwoJCQl9OwoJCQljb25zb2xlLmVsZW1lbnQuYXBwZW5kQ2hpbGQobGluayk7CgkJCWNvbnNvbGUuZWxlbWVudC5hcHBlbmRDaGlsZChjcmVhdGVUZXh0KCIgaW5zdGVhZCIpKTsKCQl9IGVsc2UgaWYgKHN0YXR1cyA9PT0gNDA0KSB7CgkJCWlmIChwYWNrYWdlTmFtZS5zdGFydHNXaXRoKCJAdHlwZXMvIikpIHsKCQkJCWNvbnNvbGUud2FybihgUGFja2FnZSA8cT4ke3BhY2thZ2VOYW1lfTwvcT4gaXNuJ3Qgc3VwcG9ydGVkIGJlY2F1c2UgaXQncyB0eXBpbmcgcGFja2FnZWApOwoJCQl9IGVsc2UgaWYgKC9hc3NlcnR8YnVmZmVyfGNoaWxkX3Byb2Nlc3N8Y2x1c3RlcnxjcnlwdG98ZGdyYW18ZG5zfGRvbWFpbnxldmVudHN8ZnN8aHR0cHxodHRwc3xuZXR8b3N8cHVueWNvZGV8cXVlcnlzdHJpbmd8cmVhZGxpbmV8c3RyZWFtfHN0cmluZ19kZWNvZGVyfHRsc3x0dHl8dXJsfHV0aWx8djh8dm18emxpYnx0aW1lcnN8cGF0aC8udGVzdChwYWNrYWdlTmFtZSkpIHsKCQkJCWNvbnNvbGUud2FybihgUGFja2FnZSA8cT4ke3BhY2thZ2VOYW1lfTwvcT4gaXNuJ3Qgc3VwcG9ydGVkIGJlY2F1c2UgaXQncyBiYWNrZW5kYCk7CgkJCX0gZWxzZSBpZiAocGFja2FnZU5hbWUuc3RhcnRzV2l0aCgiQGJhYmVsLyIpKSB7CgkJCQljb25zb2xlLndhcm4oIkNvbXBpbGVyIGFscmVhZHkgdXNlcyBCYWJlbC4gRG9uJ3QgdXNlIGl0LiIpCgkJCX0gZWxzZSBpZiAoL25vZGUtc2Fzc3xyZWFjdHxyZWFjdC1kb20vLmluY2x1ZGVzKHBhY2thZ2VOYW1lKSkgewoJCQkJY29uc29sZS53YXJuKGBQYWNrYWdlIDxxPiR7cGFja2FnZU5hbWV9PC9xPiBpcyBidWlsdC1pbiBieSBjb21waWxlci4gRG9uJ3QgdXNlIGl0YCk7CgkJCX0gZWxzZSB7CgkJCQljb25zb2xlLndhcm4oYFBhY2thZ2UgPHE+JHtwYWNrYWdlTmFtZX08L3E+IGRvZXNuJ3QgZXhpc3RgKTsKCQkJfQoJCX0KCX0KCXhoci5zZW5kKG51bGwpOwoJdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKCJVbmNhdWdodCBSZWZlcmVuY2VFcnJvcjogcmVxdWlyZSBpcyBub3QgZGVmaW5lZCIpOwp9OwoKT2JqZWN0LmRlZmluZVByb3BlcnR5KGRvY3VtZW50LCAidGl0bGUiLCB7CglnZXQoKSB7CgkJcmV0dXJuIHdpbmRvdy5wYXJlbnQuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInRpdGxlIikuaW5uZXJUZXh0OwogICAgfSwKICAgIHNldCh0aXRsZSkgewogICAgICAgIHdpbmRvdy5wYXJlbnQuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInRpdGxlIikuaW5uZXJUZXh0ID0gdGl0bGU7CiAgICB9LAogICAgY29uZmlndXJhYmxlOiB0cnVlCn0pOw==";
		// code: see ide.js
		const ideCSS = document.createElement("style");
		ideCSS.innerHTML = "html{font-family:Arial,Helvetica,sans-serif}*{box-sizing: border-box;}";
		// use React because Babel compiles JSX to React.createElement
		if (/[tj]sx/.test(this.getScriptType())) {
			const react = document.createElement("script");
			react.src = "data:application/javascript;base64,dmFyIHtSZWFjdCwgUmVhY3RET019ID0gd2luZG93LnBhcmVudDs=";
			// code: var {React, ReactDOM} = window.parent;
			newDocument.head.appendChild(react);
		}
		// appending
		newDocument.head.appendChild(style);
		newDocument.head.appendChild(ideCSS);
		newDocument.body.appendChild(script);
		newDocument.head.appendChild(ideJS);
		(function ide() {
			// setting title
			$("#title").text(newDocument.title || "Document");
			// controling console in implementation
			$("#console").html('<li class="table-view-cell" style="color: gray;">No data</li>');
		})();
		// Set the iframe's src to about:blank so
		// that it conforms to the same-origin policy 
		this.iFrame.src = this.iFrame.src;
		// Set the iframe's new HTML
		this.iFrame.contentDocument.open();
		this.iFrame.contentDocument.write(this.serializer.serializeToString(newDocument));
		this.iFrame.contentDocument.close();
	}
	filify(name) {
		return name.replace(/[\/\\\:\*\?\"\'\<\>\|\s]/g, "-").replace(/^\-+|\-+$/g, "");
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
	/**
	 * @param {string} name
	 */
	toSavableProject(name) {
		const result = new Project(name || this.name);
		result.info = this.info;
		return result;
	}
}