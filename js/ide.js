window.alert = async (a) => await window.parent.Swal.fire(`Code ${document.title} says:`, a);

window.confirm = async (a) => (await window.parent.Swal.fire({
	title: `Code ${document.title} asks:`,
	text: a,
	showCancelButton: true
})).value;

window.prompt = async (a, b) => (await window.parent.Swal.fire({
	title: `Code ${document.title} asks:`,
	text: a,
	input: "text",
	inputValue: b
})).value;

var console = {
    element: window.parent.document.querySelector("#console"),
    no_data: '<li class="table-view-cell" style="color: gray;">No data</li>',
	error(...data) {
		this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
		this.element.innerHTML += `<li class="table-view-cell" style="color: red;">Error: ${data.join("<br />")}</li>`
	},
	warn(...data) {
		this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
		this.element.innerHTML += `<li class="table-view-cell" style="color: yellow;">Warning: ${data.join("<br />")}</li>`
	},
	log(...data) {	
        this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
		this.element.innerHTML += `<li class="table-view-cell">${data.join("<br />")}</li>`
	},
	info(...data) {
        this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
		this.element.innerHTML += `<li class="table-view-cell">${data.join("<br />")}</li>`
	},
	trace(...data) {
        this.element.innerHTML = this.element.innerHTML.replace(this.no_data, "");
		this.element.innerHTML += `<li class="table-view-cell">${data.join("<br />")}</li>`
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
	console.error(message, `At ${getOrder(line)} column`, `and ${getOrder(column)} column `);
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
					`<code class="lang-html" style="display: block; white-space: nowrap; overflow-x: auto;">&lt;script src="${responseURL}" crossorigin>&lt;/script></code>`,
					"info"
				);
				window.parent.Prism.highlightElement(window.parent.document.querySelector("#swal2-content>code"));
			};
			console.element.appendChild(link);
			console.element.appendChild(createText(" instead"));
		} else if (status === 404) {
			if (packageName.startsWith("@types/")) {
				console.warn(`Package <q>${packageName}</q> isn't supported because it's typing package`);
			} else if (/assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|https|net|os|punycode|querystring|readline|stream|string_decoder|tls|tty|url|util|v8|vm|zlib|timers|path/.test(packageName)) {
				console.warn(`Package <q>${packageName}</q> isn't supported because it's backend`);
			} else if (packageName.startsWith("@babel/")) {
				console.warn("Compiler already uses Babel. Don't use it.")
			} else if (/node-sass|react|react-dom/.includes(packageName)) {
				console.warn(`Package <q>${packageName}</q> is built-in by compiler. Don't use it`);
			} else {
				console.warn(`Package <q>${packageName}</q> doesn't exist`);
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