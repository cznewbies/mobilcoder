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
		}, true);
	}

	/**
	 * I can return error in case ad can't be
	 * loaded (e.g. because of no connection)
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

var ProjectManager = new (class ProjectManager {
	/**
	 * @param {Project} actualProject 
	 */
	constructor(actualProject) {
		this.actualProject = actualProject;
		this.parent = $("#projects .table-view");
		/* by this token, you can't hack me. that's like
		bill with my name, if you use it, I'll get money */
		this.adManager = new AdManager("ca-app-pub-1393197938476976/1676619570");
		// project editing
		/** @type {"delete" | "rename" | false} */
		this.selecting = false;
		$("#projects header .icon").on("click", ({target}) => {
			this.selecting = target.id;
			$("header, nav, li:not(.project)").css("filter", "blur(2px)");
			console.log("Click to project you want to " + target.id);
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
				console.log("Opened without project");
			}
		});
		this.showProjects();
		$("#new").on("click", async () => {
			if (this.selecting) return;
			const {value} = await Swal.fire({
				input: "text",
				icon: "question",
				title: "Create new project",
				inputPlaceholder: "Name...",
				showCancelButton: true,
				inputValidator: value => (!value.trim() && "You must name the project") || (value === "-mobilcoder-theme"  && "Invalid name") || (this.getAll().some(project => project.name === value) && `Project ${value} already exists`)
			});
			await this.adManager.showAd();
			this.actualProject && this.actualProject.destroy();
			this.actualProject = new Project(value);
			this.actualProject.load();
			Swal.fire({
				icon: "success",
				title: "Project created",
				text: "Load immediately?",
				showCancelButton: true,
				cancelButtonText: "No",
				confirmButtonText: "Yes"
			}).then(({value}) => value && this.close());
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
	close() {
		$("#projects").removeClass("active");
	}
	showProjects() {
		this.get("li.table-view-divider, li.project").remove();
		this.parent.prepend(this.divider("New project").css("margin-top", "43px"));
	
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
				padding: 0,
				transition: "all 0.6s"
			})).append($("<span>").addClass("icon icon-search").css({
				position: "absolute",
				right: "5%",
				fontSize: "inherit",
				padding: "2px"
			}).on("click", ({target}) => {
				const _this = $(target),
				input = _this.siblings("input"),
				open = _this.hasClass("icon-search");
				input.css(open ? {
					width: "100%",
					padding: "0 10px"
				} : {
					width: 0,
					padding: 0
				});
				setTimeout(() => {
					if (open) {
						input.on("input", () => {
							this.parent.children(".project").show().filter((_, el) => !el.childNodes[0].childNodes[0].nodeValue.toLowerCase().includes(input.val().toLowerCase())).hide();
						});
					} else {
						input.off("input");
					}
				}, open ? 600 : 0);
				_this.toggleClass("icon-search icon-close");
			})));
		}
	
		for (const project of projects) {
			const compiler = project.info.js.compiler;	
			this.parent.append(
				$("<li>").addClass("table-view-cell project").append(
					$("<a>").addClass("navigate-right").text(project.name).on("click", async () => {
						if (this.selecting) {
							project[this.selecting]((await Swal.fire({
								input: this.selecting === "delete" ? undefined : "text", showCancelButton: true, icon: "warning",
								title: `${this.selecting[0].toUpperCase()}${this.selecting.substr(1)} project <q>${project.name}</q>`,
								inputValidator(value) {
									return (!value.trim() && "You must name the project")
										|| (value === "-mobilcoder-theme"  && "Invalid name")
										|| (projects.some(project => project.name === value) && `Project <q>${value}</q> already exists`);
								}
							})).value);
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
					}).append(`<span class="badge badge-${compiler.substr(0,2)} badge-${/x/.test(compiler) && "inverted"}">${compiler.toUpperCase()}</span>`)
				)
			);
		}
	}
	getAll() {
		return Object.entries(localStorage).filter(function ([name, value]) {
			return !!localStorage.getItem(name) && (function (data) {
				try {
					JSON.parse(data)
					return true;
				} catch {
					return false;
				}
			})(value) && (function (object, keys) {
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
})(null);