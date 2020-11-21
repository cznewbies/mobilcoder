$("nav>.control-item").each((i, el) => {
	$(el).css("text-transform", i > 2 ? "capitalize" : "uppercase");
	$(el).html($(el).attr("href").substr(1));
});

$("nav.segmented-control>a").on("click", function () {
	if ($(this).attr("href") === "#compile" || $('#compile').hasClass("active")) {
		$(".bar-footer-secondary").toggle();
	}
});

$("header>.btn").css("text-transform", "capitalize").html(i => ["light", "dark"][i]);

for (const char of "{}[]();,<>?'\"") {
	$("div>.segmented-control").append($("<a>").text(char).addClass("control-item").on("mousedown", event => {
		event.preventDefault();
		insert(char);
	}));
}

$("header>.btn").on("click", function() {
	if (!$(this).hasClass("active")) {
		$("#mode").attr("href", `css/${this.id}.css`);
		$(".btn").toggleClass("active");
		localStorage.setItem("-mobilcoder-theme", "#" + this.id);
	}
});

$(localStorage["-mobilcoder-theme"] || "#light").trigger("click");
$("div").eq(0).hide();