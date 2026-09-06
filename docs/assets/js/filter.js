/* Client-side search and model filtering for the troubleshooting and FAQ pages. */
(function () {
  var search = document.getElementById("ts-search");
  var chipRow = document.getElementById("ts-chips");
  var list = document.getElementById("ts-list");
  var count = document.getElementById("ts-count");
  var empty = document.getElementById("ts-empty");
  if (!list) return;

  var entries = Array.prototype.slice.call(list.querySelectorAll(".ts-entry"));
  var activeModel = "all";

  function apply() {
    var q = (search && search.value || "").trim().toLowerCase();
    var shown = 0;

    entries.forEach(function (el) {
      var matchesModel = activeModel === "all" || el.dataset.model === activeModel;
      var matchesText = !q || (el.dataset.text || "").indexOf(q) !== -1;
      var visible = matchesModel && matchesText;
      el.hidden = !visible;
      if (visible) shown++;
    });

    if (count) {
      count.textContent = shown === entries.length
        ? entries.length + " entries"
        : shown + " of " + entries.length;
    }
    if (empty) empty.hidden = shown !== 0;
  }

  if (search) search.addEventListener("input", apply);

  if (chipRow) {
    chipRow.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      activeModel = btn.dataset.filter;
      chipRow.querySelectorAll(".chip").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c === btn));
      });
      apply();
    });
  }

  apply();
})();
