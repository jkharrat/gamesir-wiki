/* Progressive enhancement: theme switching, the mobile nav, section tabs, the
   latency metric switch, and search/model filtering. Every page works without
   this file; it only makes long pages shorter and the controls interactive. */

/* -- Theme switch ---------------------------------------------------------
   The stored choice is already applied by the inline script in <head>; this
   only handles changing it. An explicit choice wins over the OS setting from
   then on, which is why it is written to storage rather than inferred. */
(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  var root = document.documentElement;

  function label() {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    btn.setAttribute("title", "Switch to " + next + " theme");
    btn.setAttribute("aria-label", "Switch to " + next + " theme");
  }

  btn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("gsw-theme", next); } catch (e) {}
    label();
  });

  label();
})();

/* -- Mobile navigation ---------------------------------------------------- */
(function () {
  var btn = document.getElementById("nav-toggle");
  var header = document.getElementById("site-header");
  var nav = document.getElementById("site-nav");
  if (!btn || !header || !nav) return;

  function close() {
    header.classList.remove("nav-open");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", function () {
    var open = header.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded", String(open));
  });

  // Following a link inside the drawer navigates; on a same-page anchor it
  // would otherwise stay open over the section it just jumped to.
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  // Reopening at desktop width would leave the drawer styles applied.
  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) close();
  });
})();

/* -- Section tabs on controller pages ------------------------------------- */
(function () {
  var tabs = document.getElementById("controller-tabs");
  if (!tabs) return;

  var links = Array.prototype.slice.call(tabs.querySelectorAll("[data-tab]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));

  function show(id, scroll) {
    var match = panels.some(function (p) { return p.dataset.panel === id; });
    if (!match) return false;

    panels.forEach(function (p) { p.classList.toggle("is-active", p.dataset.panel === id); });
    links.forEach(function (a) {
      if (a.dataset.tab === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (scroll) tabs.scrollIntoView({ block: "start", behavior: "smooth" });
    document.dispatchEvent(new CustomEvent("sectionschanged"));
    return true;
  }

  tabs.addEventListener("click", function (e) {
    var link = e.target.closest("[data-tab]");
    if (!link) return;
    e.preventDefault();
    if (show(link.dataset.tab, false)) {
      history.replaceState(null, "", "#" + link.dataset.tab);
    }
  });

  // Deep links from the troubleshooting and FAQ indexes point at a panel id.
  window.addEventListener("hashchange", function () {
    show(location.hash.slice(1), true);
  });
  if (location.hash) show(location.hash.slice(1), false);
})();

/* -- Section rail: a dot per section, marking where you are on the page ---- */
(function () {
  var main = document.querySelector("main");
  if (!main) return;

  var rail = document.createElement("nav");
  rail.className = "section-rail";
  rail.setAttribute("aria-label", "Sections on this page");
  document.body.appendChild(rail);

  var items = [];

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function collect() {
    var out = [];
    // Top-level headings only. The h3 cards inside a spec panel sit in a
    // two-column grid, so several share a vertical position and a single
    // column of dots cannot represent them without appearing to skip one.
    Array.prototype.forEach.call(main.querySelectorAll("h2"), function (h) {
      if (!isVisible(h) || h.closest("a, .item, details, table")) return;

      var text = (h.textContent || "").trim();
      if (!text) return;
      if (!h.id) h.id = slugify(text) || "section-" + out.length;
      out.push({ el: h, text: text });
    });
    return out.length >= 2 ? out : [];
  }

  function mark() {
    if (!items.length) return;

    // -1 while still above the first heading, so nothing is falsely marked as
    // the section you are reading.
    var active = -1;
    for (var i = 0; i < items.length; i++) {
      // 140px clears the sticky header, so a heading counts as current once it
      // has scrolled up to just beneath it.
      if (items[i].el.getBoundingClientRect().top <= 140) active = i;
    }
    // At the very bottom the last section is what you are reading, even if its
    // heading never reaches the line.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = items.length - 1;
    }

    items.forEach(function (it, i) {
      it.link.classList.toggle("is-active", i === active);
      if (i === active) it.link.setAttribute("aria-current", "true");
      else it.link.removeAttribute("aria-current");
    });
  }

  function render() {
    var found = collect();
    rail.textContent = "";
    items = [];

    found.forEach(function (s) {
      var link = document.createElement("a");
      link.className = "rail-item";
      link.href = "#" + s.el.id;
      // Collapsed, the visible target is just a dot, so name it for hover and
      // for screen readers.
      link.title = s.text;

      var label = document.createElement("span");
      label.className = "rail-label";
      label.textContent = s.text;

      var dot = document.createElement("span");
      dot.className = "rail-dot";

      link.appendChild(label);
      link.appendChild(dot);
      rail.appendChild(link);
      items.push({ link: link, el: s.el });
    });

    mark();
  }

  var pending = false;
  window.addEventListener(
    "scroll",
    function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        mark();
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", render);
  // Switching a controller-page tab changes which sections exist.
  document.addEventListener("sectionschanged", render);

  render();
})();

/* -- Header highlight follows the section you are reading -----------------
   "Controllers" in the header is an anchor into the home page rather than a
   page of its own, so nothing would ever mark it current. Hand the highlight
   over while that section is the one on screen. */
(function () {
  var nav = document.querySelector(".site-nav");
  var section = document.getElementById("controllers");
  if (!nav || !section) return;

  var home = nav.querySelector('a[href$="index.html"]');
  var link = nav.querySelector('a[href$="index.html#controllers"]');
  if (!home || !link) return;

  var next = document.getElementById("start-here");

  function update() {
    var start = section.getBoundingClientRect().top;
    var end = next ? next.getBoundingClientRect().top : Infinity;
    var inside = start <= 140 && end > 140;

    (inside ? link : home).setAttribute("aria-current", "page");
    (inside ? home : link).removeAttribute("aria-current");
  }

  var pending = false;
  window.addEventListener(
    "scroll",
    function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        update();
      });
    },
    { passive: true }
  );

  update();
})();

/* -- Latency metric switch ------------------------------------------------ */
(function () {
  var group = document.getElementById("metric-switch");
  var table = document.getElementById("latency-pivot");
  if (!group || !table) return;

  group.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-metric]");
    if (!btn) return;
    table.dataset.show = btn.dataset.metric;
    group.querySelectorAll("[data-metric]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b === btn));
    });
  });
})();

/* -- Search, topic and model filtering ------------------------------------ */
(function () {
  var search = document.getElementById("ts-search");
  var modelSelect = document.getElementById("ts-model");
  var topicSelect = document.getElementById("ts-topic");
  var clear = document.getElementById("ts-clear");
  var list = document.getElementById("ts-list");
  var count = document.getElementById("ts-count");
  var empty = document.getElementById("ts-empty");
  if (!list) return;

  var entries = Array.prototype.slice.call(list.querySelectorAll(".ts-entry"));

  function apply() {
    var q = (search && search.value || "").trim().toLowerCase();
    var model = modelSelect ? modelSelect.value : "all";
    var topic = topicSelect ? topicSelect.value : "all";
    var shown = 0;

    entries.forEach(function (el) {
      var matchesModel = model === "all" || el.dataset.model === model;
      var matchesTopic =
        topic === "all" ||
        (" " + (el.dataset.topics || "") + " ").indexOf(" " + topic + " ") !== -1;
      var matchesText = !q || (el.dataset.text || "").indexOf(q) !== -1;
      var visible = matchesModel && matchesTopic && matchesText;
      el.hidden = !visible;
      if (visible) shown++;
    });

    if (count) {
      count.textContent = shown === entries.length
        ? entries.length + " entries"
        : shown + " of " + entries.length;
    }
    if (empty) empty.hidden = shown !== 0;
    if (clear) clear.hidden = !q && model === "all" && topic === "all";
  }

  if (search) search.addEventListener("input", apply);
  [modelSelect, topicSelect].forEach(function (sel) {
    if (sel) sel.addEventListener("change", apply);
  });

  if (clear) {
    clear.addEventListener("click", function () {
      if (search) search.value = "";
      if (modelSelect) modelSelect.value = "all";
      if (topicSelect) topicSelect.value = "all";
      apply();
      if (search) search.focus();
    });
  }

  // Not just an initial count: browsers restore select and search values on a
  // back-navigation or reload, so the list has to be re-filtered to match.
  apply();
})();
