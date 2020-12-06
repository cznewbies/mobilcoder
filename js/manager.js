/** I show and reduce ads. */
class AdManager {
	/**
	 * @param {string} interstitialAdId 
	 */
	constructor(interstitialAdId) {
		this.index = 0;

		// AdMob implementation
		document.addEventListener("deviceready", () => {
			// AdMob options
			admob.setOptions({
				bannerAdId: interstitialAdId,
				interstitialAdId,
				autoShowInterstitial: true
			});

			this.unsafeAd = () => {
				if (this.index % 3 === 0) {
					return admob.requestInterstitialAd();
				}
				this.index = (this.index + 1) % 3;
				return Promise.resolve();
			};
			// file handler
			cordova.openwith.addHandler(intent => {
				if (intent.items.length) {
					cordova.openwith.load(intent.items[0], data => {
						(function() {
							this.actualProject && this.actualProject.destroy();
							this.actualProject = new Project(intent.items[0].name || "Opened file");
							this.actualProject.info.html.code = atob(data);
							this.actualProject.load();
							this.close();
						}).call(ProjectManager);
						if (intent.exit) {
							cordova.openwith.exit();
						}
					});
				} else if (intent.exit) {
					cordova.openwith.exit();
				}
			});
		}, true);
	}

	/**
	 * I can return error in case ad can't be
	 * loaded (e.g. because of no connection)
	 * 
	 * I am overriden in device ready event
	 * because MobilCoder is available on web too.
	 */
	unsafeAd() {
		return Promise.resolve();
	}

	async showAd() {
		try {
			await this.unsafeAd();
		} catch {}
	}
}
var ProjectManager = new (class ProjectManager { // I am global for developers
	/**
	 * @param {Project} actualProject 
	 */
	constructor(actualProject) {
		this.actualProject = actualProject;
		this.parent = $("#projects .table-view").css("margin-bottom", "50px");
		/* by this token, you can't hack me. that's like
		bill with my name, if you use it, I'll get money */
		this.adManager = new AdManager("ca-app-pub-1393197938476976/1676619570");
		// project editing
		/** @type {"delete" | "rename" | false} */
		this.selecting = false;
		$("#projects header .icon").on("click", ({target}) => {
			if (this.selecting) return; this.selecting = target.id;
			$("header, nav, li:not(.project)").css("filter", "blur(2px)");
			this.info("Choose the project you want to " + target.id);
		});

		// updating output
		const output = CodeJar($("#compile>pre"), Prism.highlightElement);
		$("#compile>pre").removeAttr("contenteditable");
		$('a[href="#compile"]').on("click", async () => output.updateCode(await this.actualProject.compiled()));

		// handling new projects
		$('a[href="#projects"]:not(#close)').on("click", this.showProjects.bind(this));
		$('#close, #info a[href="#info"], a[href="#output"]').on("click", async () => {
			if (!this.actualProject) {
				await this.adManager.showAd();
				this.actualProject = new PlainProject();
				this.info("Opened without project");
			}
		});
		this.showProjects();
		$("#new").on("click", async () => {
			if (this.selecting) return;
			const name = await this.getProjectName("Create new project");
			if (!name) return;
			await this.adManager.showAd();
			this.actualProject && this.actualProject.destroy();
			this.actualProject = new Project(name);
			this.actualProject.load();
			Swal.fire({
				icon: "success",
				title: "Project created",
				text: "Load immediately?",
				showCancelButton: true,
				cancelButtonText: "No",
				confirmButtonText: "Yes"
			}).then(({value}) => value ? this.close() : this.info("Then tap to <q>Code</q>", this.showProjects));
		});
		$("#plain").on("click", async () => {
			await this.adManager.showAd();
			this.actualProject && this.actualProject.destroy();
			this.actualProject = new PlainProject();
			this.close();
		});
	}
	/**
	 * @param {string} querySelector 
	 */
	get(querySelector) {
		return this.parent.children(querySelector);
	}
	/**
	 * @param {string} name 
	 */
	divider(name) {
		return $("<li>").addClass("table-view-divider").html(name);
	}
	toggle(on = false) {
		return $("<div>").addClass("toggle" + (on ? " on" : "")).append($("<div>").addClass("toggle-handle"));
	}
	close() {
		$("#projects").removeClass("active");
	}
	showProjects() {
		this.get("li.table-view-divider, li.project, li.settings").remove();
		this.parent.prepend(this.divider("New project"));


		$("#plain").html(this.actualProject instanceof PlainProject ? "Reset code" : "Continue without project");

		if (this.actualProject instanceof PlainProject) {
			this.parent.append(
				$("<li>").addClass("table-view-cell settings").append(
					$("<a>").addClass("navigate-right").html("Save actual progress").on("click", async () => {
						const name = await this.getProjectName("Save actual code...");
						if (name) {
							this.actualProject = this.actualProject.toSavableProject(name);
							this.showProjects();
						}
					})
				)
			);
		}

		this.parent.append(
			this.divider("Settings"),
			$("<li>").addClass("table-view-cell settings").text("Dark theme").append(
				this.toggle(
					$("#mode").attr("href").includes("dark")
				).on("toggle", ({detail: {isActive}}) => $(isActive ? "#dark" : "#light").trigger("click"))
			),
		);

		const projects = this.getAll();
		if (projects.length) {
			this.parent.append(this.divider("Already created").append($("<input>").attr({
				type: "search",
				placeholder: "Search projects..."
			}).css({
				position: "absolute",
				right: 0, top: 0,
				height: "100%",
				width: 0,
				padding: 0
			}).on("keyup paste", function() {
				$(".project").show(200).filter((_, el) => !new RegExp(`\\b${this.value.trim()}`, "i").test(el.childNodes[0].childNodes[0].nodeValue)).hide(200);
			}).on("blur", () => $(".project").show(200))).append($("<span>").addClass("icon icon-search").css({
				position: "absolute",
				right: "5%",
				fontSize: "inherit",
				padding: "2px"
			}).one("click", function toggleInput() {
				const open = $(this).hasClass("icon-search");
				$(this).toggleClass("icon-search icon-close").siblings("input").val("").animate(
					{
						width: open ? "100%" : 0,
						padding: open ? "0 10px" : 0
					},
					600
				).trigger(open ? "focus" : "blur");
				setTimeout(() => $(this).one("click", toggleInput), 600);
			})));
		}

		for (const project of projects) {
			const compiler = project.info.js.compiler;
			this.parent.append(
				$("<li>").addClass("table-view-cell project").append(
					$("<a>").addClass("navigate-right").text(project.name).on("click", async () => {
						if (this.selecting) {
							const title = `${this.selecting[0].toUpperCase()}${this.selecting.substr(1)} project <q>${project.name}</q>`;
							project[this.selecting](this.selecting === "delete" ? (await Swal.fire({
								showCancelButton: true,
								icon: "warning", title,
							})).value : await this.getProjectName(title));
							this.selecting = false;
							$("header, nav, li").css("filter", "");
							this.showProjects();
						} else {
							await this.adManager.showAd();
							this.actualProject && this.actualProject.destroy();
							this.actualProject = project;
							this.actualProject.load();
							this.close();
						}
					}).append(`<span class="badge badge-${compiler.substr(0, 2)} badge-${/x/.test(compiler) && "inverted"}">${compiler.toUpperCase()}</span>`)
				)
			);
		}
	}
	getAll() {
		return Object.entries(localStorage).filter(function([name, value]) {
			return !!localStorage.getItem(name) && (function(data) {
				try {
					JSON.parse(data);
					return true;
				} catch {
					return false;
				}
			})(value) && (function(object, keys) {
				for (const key of keys) {
					if (!object.hasOwnProperty(key)) {
						return false;
					}
				}
				return true;
			})(JSON.parse(value), ["js", "css", "html"]);
		}).map(([name, data]) => this.load(name, JSON.parse(data)));
	}
	/**
	 * @param {string} name 
	 * @param {ProjectInfo} info 
	 */
	load(name, info) {
		const result = new Project(name);
		result.info = info;
		return result;
	}
	/**
	 * @param {string} title 
	 */
	info(title, callback = () => {}) {
		Swal.fire({
			toast: true, icon: "info",
			showConfirmButton: false,
			timer: 1000, title,
			position: "bottom"
		});
		callback.call(this); // I call after showing, not hiding popup
	}
	/**
	 * @param {string} title 
	 * @returns {Promise<string>}
	 */
	async getProjectName(title) {
		return (await Swal.fire({
			input: "text",
			icon: "question", title,
			inputPlaceholder: "Name...",
			showCancelButton: true,
			inputValidator: value => (!value.trim() && "You must name the project") || (value === "-mobilcoder-theme" && "Invalid name") || (this.getAll().some(project => project.name === value) && `Project ${value} already exists`)
		})).value;
	}
})(null);