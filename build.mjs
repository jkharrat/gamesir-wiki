/**
 * Static site generator for the GameSir wiki.
 *
 * Reads data/controllers.json and writes a complete static site to docs/,
 * which is what GitHub Pages serves. No dependencies — run `node build.mjs`.
 *
 * The JSON file is the single source of truth: every page, badge and
 * comparison cell below is derived from it, so adding a controller means
 * editing only the data.
 */

import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  icon,
  platformIcon,
  layoutInfo,
  controllerViews,
  silhouette,
  stickSensorFigure,
  sensorCompareFigures,
  deadzoneFigure,
  triggerFigure,
  dpadFigure,
  faceButtonFigure,
  shoulderFigure,
  rearButtonFigure,
  centreButtonFigure,
  connectionFigure,
  portFigure,
  indicatorFigure,
  gyroFigure,
  rumbleFigure,
  faceplateFigure,
  mappingFigure,
  standaloneSvg,
} from "./src/diagrams.mjs";

const ROOT = import.meta.dirname;
const OUT = path.join(ROOT, "docs");

const SITE_NAME = "GameSir Wiki";

/** Where the source lives. Every contribute and edit link is derived from it. */
const REPO = {
  url: "https://github.com/jkharrat/gamesir-wiki",
  branch: "main",
};

const repoBlob = (file, line = null) =>
  `${REPO.url}/blob/${REPO.branch}/${file}${line ? `#L${line}` : ""}`;
const repoEdit = (file, line = null) =>
  `${REPO.url}/edit/${REPO.branch}/${file}${line ? `#L${line}` : ""}`;
const repoHistory = (file) => `${REPO.url}/commits/${REPO.branch}/${file}`;
const REPO_ISSUES = `${REPO.url}/issues`;
const REPO_NEW_ISSUE = `${REPO.url}/issues/new`;

/**
 * Line numbers behind the "edit this page" links, resolved from the raw files
 * at build time rather than written down. Both files move on nearly every
 * commit, and an anchor that points at the wrong record is worse than no
 * anchor: it invites someone to correct the wrong controller.
 *
 * Assigned once by build() and read by the page functions, which are sync and
 * would otherwise all have to thread it through.
 */
let SRC = { controller: () => null, fn: () => null };

async function readSourceLines() {
  const lineOf = (text, re) => {
    const i = text.split("\n").findIndex((l) => re.test(l));
    return i === -1 ? null : i + 1;
  };

  const json = await readFile(path.join(ROOT, "data", "controllers.json"), "utf8");
  const gen = await readFile(path.join(ROOT, "build.mjs"), "utf8");

  return {
    controller: (id) => lineOf(json, new RegExp(`"id"\\s*:\\s*"${id}"`)),
    fn: (name) => lineOf(gen, new RegExp(`^function ${name}\\(`)),
  };
}

/* -------------------------------------------------------------- helpers -- */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Renders a value, or an italic "not documented" marker when absent. */
const val = (v) =>
  v === null || v === undefined || v === ""
    ? '<span class="spec-val unknown">Not documented</span>'
    : `<span class="spec-val">${esc(v)}</span>`;

const cell = (v) =>
  v === null || v === undefined || v === "" ? '<td class="na">&mdash;</td>' : `<td>${esc(v)}</td>`;

const boolCell = (v) =>
  v ? '<td class="yes">Yes</td>' : '<td class="no">No</td>';

/**
 * Reduces a prose value to something that fits a table cell or a pill: first
 * clause only, trailing parenthetical dropped, then hard-clipped.
 */
const condense = (v, max) => {
  let s = String(v).split(/\.\s+/)[0].replace(/\.$/, "");
  s = s.replace(/\s*\([^)]*\)\s*$/, "");
  return s.length > max ? s.slice(0, max - 1).replace(/[\s,;:—-]+$/, "") + "\u2026" : s;
};

/**
 * Comparison-table cell. Controllers carry curated `short` values for the
 * fields whose full text is prose; anything else gets condensed. Either way
 * the untruncated text stays available as a tooltip, and detail pages always
 * show it in full.
 */
const shortCell = (v, full = v) => {
  if (v === null || v === undefined || v === "") return '<td class="na">&mdash;</td>';

  const shown = condense(v, 40);
  const complete = full === null || full === undefined ? "" : String(full);

  return `<td${shown === complete ? "" : ` title="${esc(complete)}"`}>${esc(shown)}</td>`;
};

/**
 * Glyph for a specification label, keyed by the label itself so the row and
 * comparison-table helpers pick one up without every call site naming it.
 * A block of thirty figures is much faster to scan when each line has a shape
 * as well as a word.
 */
const LABEL_ICONS = {
  Released: "calendar",
  "Launch price": "tag",
  Weight: "weight",
  Dimensions: "ruler",
  Platforms: "gamepad",
  "Configuration app": "app",
  Software: "app",
  Tier: "shield",
  "Sensor technology": "chip",
  "Stick sensor": "chip",
  Resolution: "steps",
  "Stick resolution (claimed)": "steps",
  "Measured resolution": "steps",
  Durability: "shield",
  "Measured center error": "target",
  "Trigger technology": "trigger",
  "Trigger tech": "trigger",
  "Trigger stops": "lock",
  "D-pad": "dpad",
  "Face buttons": "buttons",
  "Rear buttons": "paddle",
  "Extra bumpers": "bumper",
  "Connection modes": "cable",
  "Polling rate (PC)": "bolt",
  "Polling rate (Xbox)": "bolt",
  "Polling (PC)": "bolt",
  "Polling (Xbox)": "bolt",
  "Audio jack": "headset",
  Gyro: "gyro",
  Rumble: "rumble",
  Battery: "battery",
  "Battery capacity": "battery",
  "Claimed battery life": "battery",
  "Swappable faceplates": "plate",
};

const labelIcon = (k) => (LABEL_ICONS[k] ? icon(LABEL_ICONS[k]) : "");

/**
 * Spec rows put the value flush right, which reads well for "2024" or "$79.99"
 * but turns a sourced caveat into a ragged right-aligned paragraph. Anything
 * long stacks under its label and reads left instead.
 */
const row = (k, v) => {
  const long = v !== null && v !== undefined && String(v).length > 32;
  return `<div class="spec-row${long ? " is-long" : ""}"><span class="spec-key">${labelIcon(
    k
  )}${esc(k)}</span>${val(v)}</div>`;
};

/* --------------------------------------------------------------- figures -- */

/**
 * Caps a diagram at a fixed multiple of its own drawing width. Without this a
 * 240-unit close-up and a 400-unit one stretched to the same column would
 * render their labels at noticeably different sizes.
 */
const sized = (markup, k = 1.35) => {
  const w = Number(/viewBox="0 0 ([\d.]+)/.exec(markup)?.[1] ?? 400);
  return markup.replace("<svg ", `<svg style="max-width:${Math.round(w * k)}px" `);
};

/** Figure with an optional caption. `label` is bolded as a lead-in. */
const fig = (markup, { label = null, text = null, cls = "" } = {}) => {
  const caption =
    label || text
      ? `<figcaption>${label ? `<strong>${esc(label)}.</strong> ` : ""}${
          text ? esc(text) : ""
        }</figcaption>`
      : "";
  return `<figure class="fig${cls ? ` ${cls}` : ""}">${sized(markup)}${caption}</figure>`;
};

/** Platform list as icon chips. Sits under the badges in a page head. */
const platformStrip = (c) =>
  (c.platforms ?? []).length
    ? `<ul class="platform-strip">${c.platforms
        .map((p) => `<li>${platformIcon(p)}${esc(p)}</li>`)
        .join("")}</ul>`
    : "";

/**
 * Long prose notes sit behind a toggle. Inline they dwarfed the specs they
 * annotate and left the spec cards at wildly uneven heights.
 */
const noteDetail = (label, text) =>
  text
    ? `<details class="spec-note"><summary>${esc(label)}</summary><p>${esc(text)}</p></details>`
    : "";

/** Wraps <kbd> around button-combo notation so procedures are scannable. */
const kbdify = (text) =>
  esc(text).replace(
    /\b((?:View|Menu|Mode|Home|Share|Xbox|A|B|X|Y|LT|RT|M|D-pad)(?:\s*\+\s*(?:View|Menu|Mode|Home|Share|Xbox|A|B|X|Y|LT|RT|M|D-pad|Up|Down|Left|Right|the\s+\w+))+)/g,
    (m) => `<kbd>${m}</kbd>`
  );

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Pulls the leading number out of strings like "2.43 ms avg". */
const parseMs = (s) => {
  const m = /([\d.]+)\s*ms/.exec(String(s ?? ""));
  return m ? parseFloat(m[1]) : null;
};

/** Full-width reference for every latency bar, so bars compare across models. */
const MS_SCALE = 16;

/** Colour band for a latency figure. Thresholds are editorial, not sourced. */
const msClass = (ms) => (ms === null ? "" : ms <= 3 ? "is-good" : ms <= 8 ? "is-warn" : "is-bad");

/**
 * Connection families used as the columns of the latency comparison. Measured
 * entries name their mode in prose ("2.4 GHz dongle (XInput)"), so they are
 * matched by keyword. A controller can have several entries in one family —
 * the Kaleid is measured at three different report rates over cable — so
 * callers get the whole list and decide what to show.
 */
const MODE_FAMILIES = [
  { key: "wired", label: "Wired", icon: "cable", test: /wired|cable/i },
  { key: "dongle", label: "2.4 GHz", icon: "wifi", test: /2\.4|dongle|receiver/i },
  { key: "bluetooth", label: "Bluetooth", icon: "bluetooth", test: /bluetooth|\bbt\b/i },
];

const familyOf = (mode) => MODE_FAMILIES.find((f) => f.test.test(String(mode ?? "")))?.key ?? null;

/**
 * Topic buckets for the troubleshooting and FAQ indexes. Sixty issues and
 * seventy-five questions in one list is unusable without a way to narrow it,
 * and "which controller" is only half of how people arrive — the other half
 * is "my headset stopped working". Entries can land in several buckets.
 */
const TOPICS = [
  { key: "detection", label: "Not detected", test: /not detect|does not detect|invisible|no input|not recognis|does not appear|which app|nexus or|wrong (one|app)/i },
  { key: "sticks", label: "Sticks & drift", test: /drift|dead ?zone|center|centre|calibrat|stick (sensor|range|resolution)|twitchy/i },
  { key: "audio", label: "Audio & mic", test: /headset|audio|microphone|\bmic\b|3\.5 ?mm|earphone|volume/i },
  { key: "connection", label: "Connection drops", test: /disconnect|reconnect|drop out|pair|bluetooth|dongle|2\.4 ?ghz|receiver|wired or wireless/i },
  { key: "buttons", label: "Buttons & triggers", test: /back button|rear button|paddle|bumper|d-pad|face button|trigger|hair trigger|double.?click|remap|turbo/i },
  { key: "power", label: "Power & firmware", test: /firmware|brick|power on|power off|will not turn|won't turn|unresponsive|reset|battery|charg/i },
  { key: "polling", label: "Polling rate", test: /polling|report rate|1000 ?hz|8000 ?hz|250 ?hz/i },
  { key: "profiles", label: "Profiles & mapping", test: /profile|configuration [1-4]|preset|mapping|gyro|light|rgb|led/i },
  // Deliberately narrow: matching "Steam" or "Android" loosely would sweep in
  // most of the list and make the bucket useless.
  { key: "platforms", label: "Platform support", test: /platform|compatib|work(s)? with (xbox|switch|ios|android|steam)|steam input|desktop layout/i },
];

/** Space-separated topic keys for an entry, for the client-side filter. */
const topicsFor = (...text) => {
  const blob = text.filter(Boolean).join(" ");
  return TOPICS.filter((t) => t.test.test(blob)).map((t) => t.key);
};

/** Topic dropdown options, counting how many entries land in each bucket. */
function topicOptions(entries, allLabel) {
  const counts = new Map();
  for (const e of entries) for (const k of e.topics) counts.set(k, (counts.get(k) ?? 0) + 1);

  return [`<option value="all">${esc(allLabel)}</option>`]
    .concat(
      TOPICS.filter((t) => counts.get(t.key)).map(
        (t) => `<option value="${t.key}">${esc(t.label)} (${counts.get(t.key)})</option>`
      )
    )
    .join("\n        ");
}

/** Model dropdown options. A controller with no entries would filter to nothing. */
function modelOptions(entries, controllers) {
  const counts = new Map();
  for (const e of entries) counts.set(e.modelId, (counts.get(e.modelId) ?? 0) + 1);

  return [`<option value="all">All models</option>`]
    .concat(
      controllers
        .filter((c) => counts.get(c.id))
        .map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${counts.get(c.id)})</option>`)
    )
    .join("\n        ");
}

/**
 * Filter toolbar for the troubleshooting and FAQ indexes. Both dimensions were
 * chip rows, which wrapped to five ragged lines and pushed the list itself
 * below the fold; native selects keep the same information on one line.
 */
function filterToolbar({ topicLabel, topicAllLabel, entries, controllers, placeholder, searchAria }) {
  return `<div class="filter-bar">
    <div class="filter-field is-search">
      <label class="filter-label" for="ts-search">Search</label>
      <input class="search-input" id="ts-search" type="search" placeholder="${placeholder}" aria-label="${esc(searchAria)}">
    </div>

    <div class="filter-field is-select">
      <label class="filter-label" for="ts-topic">${esc(topicLabel)}</label>
      <select class="filter-select" id="ts-topic">
        ${topicOptions(entries, topicAllLabel)}
      </select>
    </div>

    <div class="filter-field is-select">
      <label class="filter-label" for="ts-model">Model</label>
      <select class="filter-select" id="ts-model">
        ${modelOptions(entries, controllers)}
      </select>
    </div>

    <div class="filter-actions">
      <span class="result-count" id="ts-count"></span>
      <button class="filter-clear" type="button" id="ts-clear" hidden>Clear filters</button>
    </div>
  </div>`;
}

/** Groups a controller's latency entries by connection family, fastest first. */
function latencyByFamily(c) {
  const out = {};
  for (const l of c.measuredLatency ?? []) {
    const key = familyOf(l.mode);
    if (!key) continue;
    (out[key] ??= []).push(l);
  }
  for (const list of Object.values(out)) {
    list.sort(
      (a, b) =>
        (parseMs(a.stick) ?? parseMs(a.button) ?? Infinity) -
        (parseMs(b.stick) ?? parseMs(b.button) ?? Infinity)
    );
  }
  return out;
}

const stickBadgeClass = (tech = "") => {
  const t = tech.toLowerCase();
  if (t.includes("tmr")) return "badge-tmr";
  if (t.includes("hall")) return "badge-hall";
  if (t.includes("potentiometer")) return "badge-pot";
  return "";
};

const tierLabel = (tier) =>
  ({ flagship: "Flagship", "high-end": "High-end", "mid-range": "Mid-range", entry: "Entry level" }[tier] ?? tier ?? "");

/** Short human summary of which connection modes exist. */
const connSummary = (c) => {
  const parts = [];
  if (c.connectivity?.wired) parts.push("Wired");
  if (c.connectivity?.dongle24g) parts.push("2.4 GHz");
  if (c.connectivity?.bluetooth) parts.push("Bluetooth");
  return parts.length ? parts.join(" / ") : null;
};

/* ---------------------------------------------------------------- layout -- */

const NAV = [
  { href: "index.html", label: "Home" },
  { href: "index.html#controllers", label: "Controllers" },
  { href: "compare.html", label: "Compare" },
  { href: "latency.html", label: "Latency" },
  { href: "troubleshooting.html", label: "Troubleshooting" },
  { href: "faq.html", label: "FAQ" },
  { href: "about.html", label: "About" },
];

/**
 * Footer link columns. Grouped by intent rather than mirroring the nav.
 *
 * `to` is an absolute URL that leaves the site as-is; `href` is site-relative
 * and gets the page's `base` prefix, which would otherwise turn a GitHub link
 * on a controller page into `../https://github.com/...`.
 */
const FOOTER_COLS = [
  {
    title: "Reference",
    links: [
      { href: "index.html#controllers", label: "All controllers" },
      { href: "compare.html", label: "Specification comparison" },
      { href: "latency.html", label: "Measured latency" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "troubleshooting.html", label: "Troubleshooting index" },
      { href: "troubleshooting.html#drift", label: "Stick drift checklist" },
      { href: "faq.html", label: "Frequently asked questions" },
    ],
  },
  {
    title: "Contribute",
    links: [
      { to: REPO.url, label: "Source on GitHub" },
      { to: repoBlob("data/controllers.json"), label: "The data file" },
      { to: REPO_ISSUES, label: "Open issues" },
      { to: REPO_NEW_ISSUE, label: "Report an error" },
    ],
  },
  {
    title: "This wiki",
    links: [
      { href: "about.html", label: "About &amp; sourcing" },
      { href: "about.html#contributing", label: "How to contribute" },
      { href: "about.html#gaps", label: "How gaps are handled" },
    ],
  },
];

/**
 * Brand mark. A ring with an off-centre dot — a thumbstick resting away from
 * centre, which is the single subject this site keeps coming back to. Drawn
 * inline so it can pick up the theme's brand colour instead of baking one in.
 */
const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="var(--brand)"/>
        <circle cx="16" cy="16" r="8.4" fill="none" stroke="var(--brand-ink)" stroke-width="2.5" opacity=".85"/>
        <circle cx="19.4" cy="12.6" r="3.3" fill="var(--brand-ink)"/>
      </svg>`;

const ICON_MOON = `<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
const ICON_SUN = `<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>`;
const ICON_MENU = `<svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
const ICON_CLOSE = `<svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

/**
 * The GitHub mark, the one borrowed logo on the site. It earns its place: it
 * is the fastest way to say "this is editable source, not a storefront", and
 * it is recognised without a label in a way no house-drawn glyph would be.
 */
const ICON_GITHUB = `<svg class="icon-github" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a5.6 5.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 8 0z"/></svg>`;

/**
 * Applied before first paint so a stored light theme does not flash dark. Also
 * sets the `js` class the stylesheet uses to decide whether panels may
 * collapse — if scripting is off, the page stays one long readable document.
 */
const THEME_BOOT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("gsw-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}d.setAttribute("data-theme",t);}catch(e){d.setAttribute("data-theme","dark");}d.className+=" js";})();`;

/**
 * Wraps a page in the shared chrome.
 *
 * `source` names the file the page's content actually comes from, so the
 * footer can point a would-be contributor at the record rather than at the
 * repository root. Prose pages are generated from build.mjs; anything built
 * out of per-controller records points at the data file instead.
 */
function layout({ title, description, current, base = "", body, bodyEnd = "", source = null }) {
  const nav = NAV.map(
    (n) =>
      `<a href="${base}${n.href}"${n.href === current ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("");

  const footerCols = FOOTER_COLS.map(
    (col) => `      <div class="footer-col">
        <h3>${col.title}</h3>
        <ul>
${col.links
  .map((l) =>
    l.to
      ? `          <li><a href="${l.to}" rel="noopener" target="_blank">${l.label}</a></li>`
      : `          <li><a href="${base}${l.href}">${l.label}</a></li>`
  )
  .join("\n")}
        </ul>
      </div>`
  ).join("\n");

  const pageFoot = source
    ? `<div class="wrap">
  <div class="page-foot">
    <a class="edit-link" href="${repoEdit(source.file, source.line)}" rel="noopener" target="_blank">
      ${ICON_GITHUB}<span>Edit this page on GitHub</span>
    </a>
    <p class="page-foot-note">
      ${source.note} <a href="${repoBlob(source.file, source.line)}" rel="noopener" target="_blank">View source</a>
      &middot; <a href="${repoHistory(source.file)}" rel="noopener" target="_blank">Revision history</a>
      &middot; <a href="${REPO_NEW_ISSUE}" rel="noopener" target="_blank">Report an error</a>
    </p>
  </div>
</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0b0b0d">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/css/style.css">
<script>${THEME_BOOT}</script>
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header" id="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${base}index.html">
      ${BRAND_MARK}
      <span>GameSir <span class="brand-sub">Wiki</span></span>
    </a>

    <nav class="site-nav" id="site-nav" aria-label="Main">${nav}</nav>

    <div class="header-actions">
      <a class="repo-link" href="${REPO.url}" rel="noopener" target="_blank" title="View the source and contribute on GitHub">
        ${ICON_GITHUB}<span>Edit on GitHub</span>
      </a>
      <button class="icon-btn theme-toggle" id="theme-toggle" type="button" aria-label="Switch between dark and light theme">${ICON_MOON}${ICON_SUN}</button>
      <button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Menu">${ICON_MENU}${ICON_CLOSE}</button>
    </div>
  </div>
</header>

<main id="main">
${body}
${pageFoot}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="${base}index.html">
          ${BRAND_MARK}
          <span>GameSir <span class="brand-sub">Wiki</span></span>
        </a>
        <p class="footer-tag">An open, unofficial wiki that anyone can edit. Every specification traces back to a published source, anything that could not be verified is left blank on purpose, and the whole site is a handful of text files on GitHub.</p>
        <a class="footer-repo" href="${REPO.url}" rel="noopener" target="_blank">${ICON_GITHUB}<span>${REPO.url.replace(
    /^https:\/\//,
    ""
  )}</span></a>
      </div>
${footerCols}
    </div>

    <div class="footer-bottom">
      <p class="disclaimer">
        <strong>Unofficial and community-maintained.</strong> Not affiliated with, endorsed by, or operated by
        GameSir, and nothing here is for sale. Specifications are compiled from GameSir's published product
        pages, manuals and FAQ documents, from independent measurement data published by gamepadla.com, and from
        published reviews &mdash; not from first-hand testing, unless a figure says otherwise. Values that could
        not be verified are marked &ldquo;not documented&rdquo; rather than estimated. Manufacturer claims are
        labelled as claims. Prices are recorded as historical launch figures, not current offers.
      </p>
      <p class="footer-meta">
        Found an error? <a href="${REPO_NEW_ISSUE}" rel="noopener" target="_blank">Open an issue</a> or send a
        pull request with a source and it will be corrected. Contributors are credited in the
        <a href="${REPO.url}/graphs/contributors" rel="noopener" target="_blank">commit history</a>.
      </p>
    </div>
  </div>
</footer>
${bodyEnd}
<script src="${base}assets/js/filter.js" defer></script>
</body>
</html>
`;
}

/**
 * Full-bleed masthead for an inner page. Sits outside the content column so
 * its background reaches both edges of the viewport.
 */
function pageHead({ narrow = true, breadcrumb = "", eyebrow = "", heading, lede = "", extra = "" }) {
  return `<section class="page-head">
  <div class="wrap${narrow ? " narrow" : ""}">
    ${breadcrumb}${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
    <h1>${heading}</h1>
    ${lede}${extra}
  </div>
</section>`;
}

/** Centred section heading with a supporting line, for the index-style pages. */
const sectionHead = (id, heading, intro) =>
  `<div class="section-head">
    <h2 id="${id}">${heading}</h2>
    <p class="section-intro">${intro}</p>
  </div>`;

/**
 * The wiki's own status box. These are the same counts the home page used to
 * set in 30px numerals, which read as a sales figure; as a labelled table of
 * how much has been written and when it was last checked, the identical data
 * says "here is the state of the project" instead.
 */
const wikiStatus = ({ articles, fixes, faqs, sources, updated }) => `<aside class="wiki-status">
  <h2>State of the wiki</h2>
  <dl>
    <div><dt>Articles</dt><dd>${articles} controllers</dd></div>
    <div><dt>Documented fixes</dt><dd>${fixes}</dd></div>
    <div><dt>Answered questions</dt><dd>${faqs}</dd></div>
    <div><dt>Cited sources</dt><dd>${sources}</dd></div>
    <div><dt>Estimated figures</dt><dd>None &mdash; gaps stay visible</dd></div>
    <div><dt>Last reviewed</dt><dd><time datetime="${esc(updated ?? "")}">${esc(
  updated ?? "unknown"
)}</time></dd></div>
  </dl>
  <p class="wiki-status-foot">
    Counts are generated from <a href="${repoBlob(
      "data/controllers.json"
    )}" rel="noopener" target="_blank">the data file</a> on every build, so this box cannot drift from the pages
    it describes.
  </p>
</aside>`;

/* ----------------------------------------------------------- components -- */

/**
 * Badges must stay pill-sized, so they read from the curated `short` values
 * rather than the prose fields, which run to whole paragraphs on some models.
 *
 * `max` trims the row for the card grid, where five badges wrap onto a second
 * line and turn an otherwise scannable grid into noise. The first three carry
 * what actually separates one model from another; the page head shows them all.
 */
function controllerBadges(c, { max = Infinity } = {}) {
  const b = [];
  const pill = (text, cls = "badge", title = null) =>
    b.push(
      `<span class="${cls}"${title && title !== text ? ` title="${esc(title)}"` : ""}>${esc(
        condense(text, 22)
      )}</span>`
    );

  if (c.tier) pill(tierLabel(c.tier), `badge tier-${esc(c.tier)}`);
  const sticks = c.short?.sticks ?? c.sticks?.tech;
  if (sticks) pill(sticks, `badge ${stickBadgeClass(sticks)}`, c.sticks?.tech);
  const polling = c.short?.polling ?? c.pollingRate?.pc;
  if (polling) pill(polling, "badge badge-info", c.pollingRate?.pc);
  if (c.gyro?.present) pill("Gyro");
  const software = c.short?.software ?? c.software;
  if (software) pill(software, "badge", c.software);

  return `<div class="badges">${b.slice(0, max).join("")}</div>`;
}

/**
 * One controller's measured latency as a compact table. Stacking a labelled
 * bar per mode made this the tallest block on the page for no extra
 * information, so the figures sit in columns with the bar as a fifth column.
 */
function latencyTable(c) {
  if (!Array.isArray(c.measuredLatency) || !c.measuredLatency.length) {
    return `<p class="text-muted">No independent latency measurement has been published for this model.</p>`;
  }

  const rows = c.measuredLatency
    .map((l) => {
      const ms = parseMs(l.stick) ?? parseMs(l.button);
      // No bar at all when there is no figure — an empty track reads as a
      // measured zero.
      const bar =
        ms === null
          ? '<td class="na">&mdash;</td>'
          : `<td class="bar-cell"><span class="bar-track"><span class="bar-fill ${msClass(
              ms
            )}" style="width:${Math.min(100, (ms / MS_SCALE) * 100).toFixed(1)}%"></span></span></td>`;

      return `<tr><th>${esc(l.mode)}</th>${cell(l.button)}${cell(l.stick)}${cell(l.polling)}${bar}</tr>`;
    })
    .join("\n");

  return `<div class="table-scroll">
  <table class="spec-table latency-table">
    <thead><tr><th>Connection mode</th><th>Button</th><th>Stick</th><th>Polling</th><th>Stick latency</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>
<p class="small text-dim">Bars use a fixed 0&ndash;16&nbsp;ms scale so they compare with every other page on this site; a full-width bar exceeds 16&nbsp;ms. Measured and published by gamepadla.com from a single unit on one firmware. Polling rate and latency are measured by different methods and are not the same thing. <a href="../latency.html">Compare against every other model</a>.</p>`;
}

/* ------------------------------------------------------- hardware figures -- */

/** Clips prose to fit a caption without cutting mid-word. */
const clip = (v, max) => {
  const s = String(v ?? "");
  return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "\u2026";
};

const stickKind = (tech) => {
  const t = String(tech ?? "").toLowerCase();
  if (t.includes("tmr")) return "tmr";
  if (t.includes("hall")) return "hall";
  if (t.includes("potentiometer")) return "pot";
  return null;
};

/**
 * The labelled controller diagram: three views, a readout naming whatever the
 * pointer or keyboard is on, and a legend that is also where the readout gets
 * its text, so the drawing and the prose cannot drift apart.
 *
 * With scripting off, every view stays on the page under its own heading and
 * every legend is visible, which is a complete description of the hardware —
 * the script only collapses it into one view at a time.
 */
function layoutSection(c, { id = "layout", heading = "Controller layout", intro, note } = {}) {
  const views = controllerViews(c);

  const switcher = views
    .map(
      (v, i) =>
        `<button class="chip" type="button" data-view="${esc(v.id)}" aria-pressed="${
          i === 0 ? "true" : "false"
        }">${esc(v.label)}</button>`
    )
    .join("\n        ");

  const stage = views
    .map(
      (v, i) =>
        `      <div class="diagram-view${i === 0 ? " is-active" : ""}" data-view="${esc(v.id)}">
        <h3>${esc(v.label)} view</h3>
${v.svg}
      </div>`
    )
    .join("\n");

  const legends = views
    .map(
      (v, i) =>
        `    <ul class="diagram-legend${i === 0 ? " is-active" : ""}" data-view="${esc(v.id)}">
${v.parts
  .map(
    (p) =>
      `      <li class="legend-item" data-part="${esc(p.id)}"><span class="legend-name">${esc(
        p.label
      )}</span><span class="legend-desc">${esc(p.desc)}</span></li>`
  )
  .join("\n")}
    </ul>`
    )
    .join("\n");

  return `<section class="layout-section" data-layout aria-labelledby="${esc(id)}">
  <div class="layout-head">
    <h2 id="${esc(id)}">${esc(heading)}</h2>
    <div class="metric-switch view-switch" role="group" aria-label="Choose a view of the controller">
        ${switcher}
    </div>
    ${intro ? `<p class="section-intro">${intro}</p>` : ""}
  </div>

  <div class="diagram-figure">
    <div class="diagram-stage">
${stage}
    </div>

    <div class="diagram-readout is-idle" data-readout aria-live="polite">
      <span class="readout-name">Every control, named</span>
      <p class="readout-desc">Point at, tap or tab to any part of the diagram and it is explained here. The full list is below, so nothing depends on hovering.</p>
    </div>

${legends}
  </div>

  <p class="small text-dim diagram-note">${
    note ??
    "Schematic drawing. It shows which controls this model has and where they sit relative to each other, taken from the same sourced record as the specifications below &mdash; it is not a scale drawing, and no GameSir artwork is reproduced."
  }</p>
</section>`;
}

/**
 * Component close-ups. Each figure is paired with what the sources actually
 * say about that part on this model, so the drawing explains the mechanism and
 * the caption carries the documented detail.
 */
function componentFigures(c) {
  const s = c.sticks ?? {};
  const t = c.triggers ?? {};
  const eb = c.extraButtons ?? {};
  const L = layoutInfo(c);
  const out = [];
  const add = (markup, label, textValue) => {
    if (markup) out.push(fig(markup, { label, text: textValue ? clip(textValue, 260) : null }));
  };

  const kind = stickKind(s.tech);
  if (kind) {
    add(
      stickSensorFigure(kind),
      "Sticks",
      [s.tech, s.resolution && `${s.resolution}`].filter(Boolean).join(". ")
    );
  }

  add(dpadFigure({ fenced: /fenced/i.test(String(c.dpad)) }), "D-pad", c.dpad);

  add(
    faceButtonFigure({ swap: !!L.faceSwap || /nintendo layout/i.test(String(c.faceButtons)) }),
    "Face buttons",
    c.faceButtons
  );

  add(
    shoulderFigure({ mini: (eb.extraBumpers ?? 0) >= 2 }),
    "Bumpers and triggers",
    t.tech ?? "Bumpers report as pressed or not pressed; triggers report how far they have travelled."
  );

  if (t.triggerStops !== null && t.triggerStops !== undefined) {
    add(triggerFigure(t.triggerStops), t.triggerStops ? "Trigger stops" : "Trigger travel", t.notes);
  }

  if ((eb.backButtons ?? 0) >= 1) {
    add(
      rearButtonFigure({ count: eb.backButtons, latches: L.latches ?? null }),
      "Rear buttons",
      eb.notes
    );
  }

  add(
    centreButtonFigure({ variant: L.centre === "nintendo" ? "nintendo" : "xbox", mode: L.mode ?? "M" }),
    "Centre cluster",
    "Every documented button combination on this page is built from these controls, which is why the calibration and reset procedures are so easy to get wrong on the ones that moved."
  );

  if (eb.remappable) {
    add(
      mappingFigure({ mode: L.mode ?? "M" }),
      "Mapping a rear button",
      "The gesture is the same across this range: hold the modifier with the button you are assigning, then press the control it should copy."
    );
  }

  add(connectionFigure(c), "Connection modes", c.connectivity?.notes);
  add(
    portFigure({ audioJack: !!c.audioJack }),
    "Ports",
    c.audioJack
      ? "Audio and microphone pass through the controller, so a report rate above 250 Hz can silence a headset on several models in this range."
      : "Audio goes through the host device on this model."
  );

  if (c.rumble) add(rumbleFigure(c.rumble), "Rumble", c.rumble);
  if (c.gyro?.present) add(gyroFigure(), "Gyro", c.gyro.notes);
  if (c.faceplates?.swappable) add(faceplateFigure(), "Faceplate", c.faceplates.notes);

  return out;
}

/**
 * Notable features, with the hardware they describe drawn beside them. Only
 * the features that map onto a drawing become callouts; the rest stay a list,
 * because a decorative figure next to "1000 Hz polling" would be noise.
 */
function featureCallouts(c) {
  const s = c.sticks ?? {};
  const t = c.triggers ?? {};
  const eb = c.extraButtons ?? {};
  const L = layoutInfo(c);

  const matchers = [
    {
      test: /tmr|hall effect stick|mag-res|stick|deadzone|trajector/i,
      figure: () => (stickKind(s.tech) ? stickSensorFigure(stickKind(s.tech)) : null),
    },
    { test: /trigger/i, figure: () => triggerFigure(!!t.triggerStops) },
    {
      test: /rear|back button|paddle|bumper/i,
      figure: () => rearButtonFigure({ count: eb.backButtons ?? 2, latches: L.latches ?? null }),
    },
    { test: /faceplate/i, figure: () => faceplateFigure() },
    { test: /gyro/i, figure: () => gyroFigure() },
    { test: /layout|nintendo|rotat|swap/i, figure: () => faceButtonFigure({ swap: true }) },
    { test: /macro|remap|profile/i, figure: () => mappingFigure({ mode: L.mode ?? "M" }) },
    { test: /d-pad/i, figure: () => dpadFigure({ fenced: /fenced/i.test(String(c.dpad)) }) },
    { test: /wireless|tri-mode|2\.4|bluetooth|dongle/i, figure: () => connectionFigure(c) },
    { test: /rumble|vibrat/i, figure: () => rumbleFigure(c.rumble) },
  ];

  const used = new Set();
  const callouts = [];
  const rest = [];

  for (const feature of c.notableFeatures ?? []) {
    const m = matchers.find((x, i) => !used.has(i) && x.test.test(feature));
    const drawing = m?.figure();
    if (!m || !drawing) {
      rest.push(feature);
      continue;
    }
    used.add(matchers.indexOf(m));
    callouts.push(`<div class="callout">
      <div class="callout-media">${sized(drawing, 1.25)}</div>
      <div class="callout-body"><h3>${esc(feature)}</h3><p>${esc(
      calloutNote(feature, c)
    )}</p></div>
    </div>`);
  }

  return { callouts, rest };
}

/**
 * The sentence under a feature callout. It points at the sourced field the
 * feature came from rather than adding a claim of its own; where there is
 * nothing extra to say it explains what the drawing is showing.
 */
function calloutNote(feature, c) {
  const f = feature.toLowerCase();
  if (/trigger/.test(f) && c.triggers?.notes) return clip(c.triggers.notes, 220);
  if (/rear|back button|paddle|bumper/.test(f) && c.extraButtons?.notes)
    return clip(c.extraButtons.notes, 220);
  if (/faceplate/.test(f) && c.faceplates?.notes) return clip(c.faceplates.notes, 220);
  if (/gyro/.test(f) && c.gyro?.notes) return clip(c.gyro.notes, 220);
  if (/tmr|hall|stick|deadzone|trajector/.test(f) && c.sticks?.measuredNotes)
    return clip(c.sticks.measuredNotes, 220);
  if (/rumble|vibrat/.test(f) && c.rumble) return clip(c.rumble, 220);
  if (/wireless|tri-mode|2\.4|bluetooth|dongle/.test(f) && c.connectivity?.notes)
    return clip(c.connectivity.notes, 220);
  return "Drawn from this model's documented control list; see the specification panel for the sourced figures.";
}

function issueItem(iss, modelName = null) {
  return `<details class="item">
  <summary>${esc(iss.symptom)}${modelName ? ` <span class="badge">${esc(modelName)}</span>` : ""}</summary>
  <div class="item-body">
    <div class="qa-block"><span class="qa-label">Likely cause</span>${kbdify(iss.cause)}</div>
    <div class="qa-block"><span class="qa-label">Fix</span>${kbdify(iss.fix)}</div>
    ${iss.sourceUrl ? `<p class="small text-dim">Source: <a href="${esc(iss.sourceUrl)}" rel="nofollow noopener" target="_blank">${esc(new URL(iss.sourceUrl).hostname)}</a></p>` : ""}
  </div>
</details>`;
}

function faqItem(f, modelName = null) {
  return `<details class="item">
  <summary>${esc(f.q)}${modelName ? ` <span class="badge">${esc(modelName)}</span>` : ""}</summary>
  <div class="item-body">
    <p>${kbdify(f.a)}</p>
    ${f.sourceUrl ? `<p class="small text-dim">Source: <a href="${esc(f.sourceUrl)}" rel="nofollow noopener" target="_blank">${esc(new URL(f.sourceUrl).hostname)}</a></p>` : ""}
  </div>
</details>`;
}

/* ---------------------------------------------------------------- pages -- */

/**
 * Stand-in controller for the home page's anatomy diagram. It carries the
 * union of the controls this range uses so the drawing can name all of them,
 * and it is labelled as generic on the page — it is a vocabulary reference,
 * not a claim about any product.
 */
const REFERENCE_PAD = {
  id: "reference",
  name: "A modern gamepad",
  sticks: {},
  triggers: { triggerStops: true },
  extraButtons: { backButtons: 2, extraBumpers: 2, remappable: true },
  connectivity: { wired: true, dongle24g: true, bluetooth: true },
  audioJack: true,
  faceplates: { swappable: false },
  short: {},
};

function pageIndex(data) {
  const cs = data.controllers;

  const cards = cs
    .map((c) => {
      // The media panel stands in for the product shot this site deliberately
      // does not carry, so it shows the one thing that identifies the model:
      // its designation, with the brand prefix dropped as redundant here.
      const mark = c.name.replace(/^GameSir\s+/i, "");

      // How well documented the article is, where a shop would put the price.
      // It is the more useful number here and it sets the right expectation:
      // this is an index of articles, and some are thinner than others.
      const srcN = (c.sources ?? []).length;

      return `<a class="controller-card tint-${esc(c.tier ?? "entry")}" href="controllers/${esc(c.id)}.html">
  <span class="card-media" aria-hidden="true">${silhouette(c)}<span class="card-mark">${esc(
        mark
      )}</span></span>
  <span class="card-body">
    ${controllerBadges(c, { max: 3 })}
    <h3>${esc(c.name)}</h3>
    <span class="tagline">${esc(c.tagline)}</span>
    <span class="card-foot">
      <span>${esc(connSummary(c) ?? "")}</span>
      <span class="card-cited">${srcN} ${srcN === 1 ? "source" : "sources"}</span>
    </span>
  </span>
</a>`;
    })
    .join("\n");

  const issueCount = cs.reduce((n, c) => n + (c.knownIssues?.length ?? 0), 0);
  const faqCount = cs.reduce((n, c) => n + (c.faq?.length ?? 0), 0);
  const srcCount = new Set(cs.flatMap((c) => (c.sources ?? []).map((s) => s.url))).size;

  const body = `<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Unofficial &middot; Community-maintained &middot; Not for sale</p>
    <h1>A sourced reference for GameSir controllers</h1>
    <p class="lede">
      Specifications, documented fixes and frequently asked questions for ${cs.length} GameSir controllers,
      each traceable to an official manual, an independent measurement, or a published review. Nothing here is
      estimated &mdash; unverified values are left blank on purpose.
    </p>

    <div class="hero-notice">
      ${ICON_GITHUB}
      <div>
        <p><strong>Anyone can edit this wiki.</strong> It is a handful of plain text files on GitHub, not a
        product page. Every article links to the exact file and line its content comes from, so a correction is
        a two-minute edit rather than an email to nobody.</p>
        <p class="hero-notice-links">
          <a href="${REPO.url}" rel="noopener" target="_blank">Browse the source</a>
          <a href="${repoBlob("data/controllers.json")}" rel="noopener" target="_blank">See the data file</a>
          <a href="about.html#contributing">How to contribute</a>
        </p>
      </div>
    </div>
  </div>
</section>

<div class="wrap">
  ${wikiStatus({
    articles: cs.length,
    fixes: issueCount,
    faqs: faqCount,
    sources: srcCount,
    updated: data.meta?.updated,
  })}

  ${sectionHead(
    "controllers",
    "Controller articles",
    `One article per model, ${cs.length} so far. Each covers full specifications, measured performance where independent data exists, documented problems with their fixes, and the sources behind every figure. A model that is missing is a gap in the wiki, not a verdict on the hardware.`
  )}
  <div class="card-grid">
${cards}
  </div>

  <p class="index-cta">
    Own something that isn't here, or spotted a figure that's wrong?
    <a href="${REPO_NEW_ISSUE}" rel="noopener" target="_blank">Open an issue</a> or
    <a href="${repoEdit("data/controllers.json")}" rel="noopener" target="_blank">edit the data file directly</a>.
    First-hand measurements are especially wanted, because this wiki has none of its own.
  </p>

  ${sectionHead(
    "anatomy",
    "Anatomy of a controller",
    "The vocabulary the rest of this site uses. Every model page carries the same diagram drawn for that specific controller, including its back."
  )}
  ${layoutSection(REFERENCE_PAD, {
    id: "reference-layout",
    heading: "The controls, named",
    intro:
      "A generic layout rather than any one product: the offset sticks, the ABXY cluster, the centre row and the rear paddles that the models covered here share. Where a specific controller differs &mdash; no rear latches, a rotating button cluster, no wireless at all &mdash; its own page says so.",
    note: "Generic schematic. It is not a drawing of any particular GameSir product; see a model page for that model's own layout.",
  })}

  ${sectionHead(
    "start-here",
    "Start here",
    "Three things account for a large share of GameSir support questions."
  )}

  <div class="accordion">
    <details class="item">
      <summary>&ldquo;My controller isn't detected by the app&rdquo; &mdash; check which app it needs</summary>
      <div class="item-body">
        <p>GameSir ships two PC applications and they do not cover the same hardware.
        <strong>GameSir Nexus</strong> handles the Xbox-licensed controllers &mdash; per GameSir's downloads page
        that means the G7 Pro and its licensed editions, G7 SE, G7 HE, T7, T7 Pro, Kaleid, Kaleid Flux and
        Tarantula Pro for Xbox. <strong>GameSir Connect</strong> handles the rest, including the G7 Pro 8K PC
        editions, Tarantula 8K PC, Tegenaria Lite, Super Nova, Nova Lite 2 and Cyclone 2.</p>
        <p>The trap is that a model name can appear in both families. <em>Tarantula Pro for Xbox</em> uses Nexus,
        while the multiplatform <em>Tarantula Pro</em> and the <em>Tarantula 8K PC</em> use Connect. Installing
        Nexus and waiting for a Connect device to appear is one of the most common reasons a controller is never
        detected &mdash; and it is expected behaviour, not a fault.</p>
        <p>On mobile, the separate <strong>GameSir app</strong> covers models including the Super Nova, Nova Lite,
        Nova Lite 2, G8 series and X-series. Check your model's page for which app applies.</p>
      </div>
    </details>

    <details class="item">
      <summary>&ldquo;My drift-proof controller is drifting&rdquo; &mdash; usually configuration, not hardware</summary>
      <div class="item-body">
        <p>Hall Effect and TMR sticks sense magnetically with no physical contact, so they do not develop drift the
        way potentiometer sticks do. When a controller like this appears to drift, the cause is usually that no
        inner deadzone is being applied, leaving the stick's natural center error visible to the game.</p>
        <p>A misconfigured anti-deadzone produces the same symptom. GameSir's own documentation notes that improper
        anti-deadzone configuration &ldquo;may appear similar to stick drift&rdquo;. Set it back to zero before
        assuming the hardware has failed. See <a href="troubleshooting.html#drift">the drift section</a>.</p>
      </div>
    </details>

    <details class="item">
      <summary>&ldquo;It shows up as an Xbox 360 Controller and disconnects&rdquo; &mdash; that's intended</summary>
      <div class="item-body">
        <p>Running a high polling rate or keyboard/mouse bindings requires the controller to switch protocol from
        GIP (Xbox Gaming Device) to XInput. Windows renames the device accordingly and the controller briefly
        disconnects during the switch. This is normal, not a fault.</p>
      </div>
    </details>
  </div>
</div>`;

  return layout({
    title: `${SITE_NAME} — sourced specs, fixes and FAQ for GameSir controllers`,
    description: `Community-maintained reference covering specifications, documented fixes and FAQs for ${cs.length} GameSir controllers, with every figure traced to a source.`,
    current: "index.html",
    body,
    source: {
      file: "build.mjs",
      line: SRC.fn("pageIndex"),
      note: "This page's wording is generated by build.mjs; the controller list comes from the data file.",
    },
  });
}

function pageController(c, data) {
  const s = c.sticks ?? {};
  const t = c.triggers ?? {};
  const eb = c.extraButtons ?? {};

  const issues = (c.knownIssues ?? []).map((i) => issueItem(i)).join("\n");
  const faqs = (c.faq ?? []).map((f) => faqItem(f)).join("\n");

  const sources = (c.sources ?? [])
    .map(
      (src) =>
        `<li><a href="${esc(src.url)}" rel="nofollow noopener" target="_blank">${esc(src.label)}</a></li>`
    )
    .join("\n");

  // Panels rather than one continuous page: a fully documented controller runs
  // to ~25 spec rows, 8 issues, 9 FAQ entries and 16 sources, which is far too
  // much to scroll through when you arrived looking for one button combination.
  const components = componentFigures(c);
  const { callouts, rest } = featureCallouts(c);

  const panels = [
    {
      id: "specs",
      label: "Specifications",
      html: `<h2>Specifications</h2>
  <p class="section-intro">Values that could not be verified against a source read &ldquo;not documented&rdquo; rather than being estimated.</p>
  <div class="spec-columns">
    <div class="spec-card">
      <h3>${icon("gamepad")}Overview</h3>
      <div class="spec-grid">
        ${row("Released", c.releaseYear)}
        ${row("Launch price", c.short?.msrp ?? c.msrp)}
        ${row("Weight", c.short?.weight ?? c.weight)}
        ${row("Dimensions", c.dimensions)}
        ${row("Platforms", c.short?.platforms ?? ((c.platforms ?? []).join(", ") || null))}
        ${row("Configuration app", c.short?.software ?? c.software)}
      </div>
      ${noteDetail(
        "Conflicting published weights",
        c.short?.weight && c.weight !== c.short.weight ? c.weight : null
      )}
      ${noteDetail("Which app, and the exact platform wording", c.software)}
    </div>

    <div class="spec-card">
      <h3>${icon("stick")}Sticks</h3>
      <div class="spec-grid">
        ${row("Sensor technology", s.tech)}
        ${row("Resolution", s.resolution)}
        ${row("Durability", s.durability)}
        ${row("Measured center error", s.measuredCenterError)}
        ${row("Measured resolution", s.measuredResolution)}
      </div>
      ${noteDetail("How these measurements were arrived at", s.measuredNotes)}
    </div>

    <div class="spec-card">
      <h3>${icon("trigger")}Triggers, D-pad and buttons</h3>
      <div class="spec-grid">
        ${row("Trigger technology", t.tech)}
        ${row("Trigger stops", t.triggerStops === null || t.triggerStops === undefined ? null : t.triggerStops ? "Yes" : "No")}
        ${row("D-pad", c.short?.dpad ?? c.dpad)}
        ${row("Face buttons", c.faceButtons)}
        ${row("Rear buttons", eb.backButtons)}
        ${row("Extra bumpers", eb.extraBumpers)}
      </div>
      ${noteDetail("Trigger detail", t.notes)}
      ${noteDetail("Mapping the extra buttons", eb.notes)}
    </div>

    <div class="spec-card">
      <h3>${icon("cable")}Connectivity</h3>
      <div class="spec-grid">
        ${row("Connection modes", connSummary(c))}
        ${row("Polling rate (PC)", c.short?.polling ?? c.pollingRate?.pc)}
        ${row("Polling rate (Xbox)", c.pollingRate?.xbox)}
        ${row("Audio jack", c.audioJack === null || c.audioJack === undefined ? null : c.audioJack ? "3.5 mm" : "None")}
        ${row("Gyro", c.gyro?.present ? "Yes" : c.gyro?.present === false ? "No" : null)}
        ${row("Rumble", c.rumble)}
      </div>
      ${noteDetail("Which modes work on which platform", c.connectivity?.notes)}
      ${noteDetail("Polling rate caveats", c.pollingRate?.notes)}
      ${noteDetail("Gyro detail", c.gyro?.notes)}
    </div>

    <div class="spec-card">
      <h3>${icon("battery")}Battery and build</h3>
      <div class="spec-grid">
        ${row("Battery capacity", c.battery?.capacity)}
        ${row("Claimed battery life", c.short?.claimedLife ?? c.battery?.claimedLife)}
        ${row("Swappable faceplates", c.faceplates?.swappable === null || c.faceplates?.swappable === undefined ? null : c.faceplates.swappable ? "Yes" : "No")}
      </div>
      ${noteDetail("Battery detail", c.battery?.notes)}
      ${noteDetail("Faceplate detail", c.faceplates?.notes)}
    </div>
  </div>`,
    },
    {
      id: "components",
      label: "Components",
      count: components.length,
      html: components.length
        ? `<h2>Component by component</h2>
  <p class="section-intro">What each part of this controller is and what it does, with the documented detail for this model beside it. The drawings explain the mechanism; the captions carry the sourced specifics.</p>
  <div class="figure-grid">
${components.join("\n")}
  </div>`
        : "",
    },
    {
      id: "performance",
      label: "Performance",
      html: `<h2>Measured performance</h2>
  <p class="section-intro">Independent measurement, kept separate from the manufacturer's own figures above.</p>
  ${latencyTable(c)}`,
    },
    {
      id: "features",
      label: "Features",
      count: (c.notableFeatures ?? []).length,
      html: (c.notableFeatures ?? []).length
        ? `<h2>Notable features</h2>
  <p class="section-intro">The features that separate this model from its siblings, each shown against the part of the hardware it refers to.</p>
${
  callouts.length
    ? `  <div class="callout-grid">
${callouts.join("\n")}
  </div>`
    : ""
}
${
  rest.length
    ? `  <ul class="feature-rest">
${rest.map((f) => `    <li>${esc(f)}</li>`).join("\n")}
  </ul>`
    : ""
}`
        : "",
    },
    {
      id: "issues",
      label: "Problems",
      count: (c.knownIssues ?? []).length,
      html: issues
        ? `<h2>Known issues and fixes</h2>
  <p class="section-intro">Documented problems with documented solutions. Each entry cites where the fix comes from.</p>
  <div class="accordion">
${issues}
  </div>`
        : "",
    },
    {
      id: "faq",
      label: "FAQ",
      count: (c.faq ?? []).length,
      html: faqs
        ? `<h2>Frequently asked questions</h2>
  <div class="accordion">
${faqs}
  </div>`
        : "",
    },
    {
      id: "sources",
      label: "Sources",
      count: (c.sources ?? []).length,
      html: sources
        ? `<h2>Sources</h2>
  <p class="section-intro">Everything on this page traces back to one of these.</p>
  <ul class="source-list">
${sources}
  </ul>`
        : "",
    },
  ].filter((p) => p.html);

  const tabs = panels
    .map(
      (p, i) =>
        `<a href="#${p.id}" data-tab="${p.id}"${i === 0 ? ' aria-current="true"' : ""}>${esc(
          p.label
        )}${p.count ? `<span class="tab-count">${p.count}</span>` : ""}</a>`
    )
    .join("");

  const sections = panels
    .map(
      (p, i) =>
        `<section class="tab-panel${i === 0 ? " is-active" : ""}" id="${p.id}" data-panel="${p.id}">
  ${p.html}
</section>`
    )
    .join("\n");

  // Reaching a controller page previously meant going back to the home page
  // grid, so every page carries its neighbours and the full list.
  const siblings = data.controllers;
  const at = siblings.findIndex((x) => x.id === c.id);
  const prev = siblings[(at - 1 + siblings.length) % siblings.length];
  const next = siblings[(at + 1) % siblings.length];

  const others = siblings
    .filter((x) => x.id !== c.id)
    .map(
      (x) =>
        `<a class="switch-item" href="${esc(x.id)}.html">
      <span class="switch-name">${esc(x.name)}</span>
      <span class="switch-meta">${[x.short?.sticks, x.short?.msrp]
        .filter(Boolean)
        .map(esc)
        .join(" &middot; ")}</span>
    </a>`
    )
    .join("\n");

  const body = `${pageHead({
    breadcrumb: `<p class="breadcrumb"><a href="../index.html">Home</a> / <a href="../index.html#controllers">Controllers</a> / ${esc(
      c.name
    )}</p>`,
    eyebrow: `${tierLabel(c.tier)} \u00b7 ${c.category ?? ""}`,
    heading: esc(c.fullName ?? c.name),
    lede: `<p class="lede">${esc(c.tagline)}</p>`,
    extra: controllerBadges(c) + platformStrip(c),
  })}

<div class="wrap narrow">
  ${layoutSection(c, {
    intro:
      "Every control this model has, front, back and along the top edge. The rear view is where the models in this range differ most from each other.",
  })}

  <div class="tabs-dock">
    <nav class="tabs" id="controller-tabs" aria-label="Sections of this page">${tabs}</nav>
  </div>

${sections}

  <nav class="pager" aria-label="Nearby controllers">
    <a class="pager-link" href="${esc(prev.id)}.html" rel="prev">
      <span class="pager-dir">&larr; Previous</span>
      <span class="pager-name">${esc(prev.name)}</span>
    </a>
    <a class="pager-link is-next" href="${esc(next.id)}.html" rel="next">
      <span class="pager-dir">Next &rarr;</span>
      <span class="pager-name">${esc(next.name)}</span>
    </a>
  </nav>

  <details class="switcher">
    <summary>Jump to another controller</summary>
    <div class="switch-grid">
${others}
    </div>
    <p class="small text-dim">Or <a href="../compare.html">compare all ${siblings.length} side by side</a>.</p>
  </details>

  <p class="small text-dim">Data last reviewed ${esc(data.meta?.updated ?? "")}. Figures are compiled from the sources above rather than first-hand testing.</p>
</div>`;

  return layout({
    title: `${c.fullName ?? c.name} — specs, fixes and FAQ | ${SITE_NAME}`,
    description: `${c.name}: full specifications, measured performance, documented problems and fixes, and frequently asked questions. ${c.tagline}`,
    current: "",
    base: "../",
    body,
    source: {
      file: "data/controllers.json",
      line: SRC.controller(c.id),
      note: `Everything on this page comes from the <code>${esc(
        c.id
      )}</code> record in the data file.`,
    },
  });
}

function pageCompare(data) {
  const cs = data.controllers;

  const head = cs
    .map((c) => `<th><a href="controllers/${esc(c.id)}.html">${esc(c.name)}</a></th>`)
    .join("");

  // [label, short value, full value for the tooltip]. Where a controller has
  // no curated short value the full one is condensed instead.
  const rows = [
    ["Tier", (c) => tierLabel(c.tier)],
    ["Launch price", (c) => c.short?.msrp, (c) => c.msrp],
    ["Released", (c) => c.releaseYear],
    ["Software", (c) => c.short?.software, (c) => c.software],
    ["Stick sensor", (c) => c.short?.sticks, (c) => c.sticks?.tech],
    ["Stick resolution (claimed)", (c) => c.short?.resolution, (c) => c.sticks?.resolution],
    ["Measured center error", (c) => c.short?.centerError, (c) => c.sticks?.measuredCenterError],
    ["Trigger tech", (c) => c.short?.triggers, (c) => c.triggers?.tech],
    ["Trigger stops", (c) => (c.triggers?.triggerStops == null ? null : c.triggers.triggerStops ? "Yes" : "No")],
    ["D-pad", (c) => c.short?.dpad, (c) => c.dpad],
    ["Polling (PC)", (c) => c.short?.polling, (c) => c.pollingRate?.pc],
    ["Polling (Xbox)", (c) => c.pollingRate?.xbox],
    ["Connection modes", (c) => connSummary(c)],
    ["Battery", (c) => c.battery?.capacity],
    ["Claimed battery life", (c) => c.short?.claimedLife, (c) => c.battery?.claimedLife],
    ["Weight", (c) => c.weight],
    ["Rear buttons", (c) => c.extraButtons?.backButtons],
    ["Gyro", (c) => (c.gyro?.present == null ? null : c.gyro.present ? "Yes" : "No")],
    ["Audio jack", (c) => (c.audioJack == null ? null : c.audioJack ? "Yes" : "No")],
    ["Swappable faceplates", (c) => (c.faceplates?.swappable == null ? null : c.faceplates.swappable ? "Yes" : "No")],
    ["Platforms", (c) => c.short?.platforms, (c) => (c.platforms ?? []).join(", ") || null],
  ]
    .map(([label, shortFn, fullFn]) => {
      const cells = cs
        .map((c) => {
          const full = fullFn ? fullFn(c) : shortFn(c);
          return shortCell(shortFn(c) ?? full, full);
        })
        .join("");
      return `<tr><th><span class="th-label">${labelIcon(label)}${esc(
        label
      )}</span></th>${cells}</tr>`;
    })
    .join("\n");

  const body = `${pageHead({
    narrow: false,
    eyebrow: "Comparison",
    heading: "Specification comparison",
    lede: `<p class="lede">
      Every documented specification side by side. Em dashes mark values that could not be verified against a
      source &mdash; they are gaps in the documentation, not zeros. Scroll horizontally to see all models; model
      names stay pinned.
    </p>
    <p class="lede small">
      Values are abbreviated here to keep the table scannable. Hover a shortened cell for the full text, or open
      the model page for the complete entry with its caveats and sources.
    </p>`,
  })}

<div class="wrap">
  <div class="note">
    <p><strong>Reading the stick sensor row.</strong> TMR and Hall Effect sticks both sense magnetically and do not
    wear like potentiometer sticks, which is why they are marketed as drift-resistant. That resistance is about
    sensor wear, not about center accuracy &mdash; a magnetic stick can still show a small center error, and
    several of these controllers apply no inner deadzone to hide it.</p>
  </div>

  <div class="figure-grid">
${sensorCompareFigures()
  .map(({ kind, svg: markup }) =>
    fig(markup, {
      label:
        kind === "pot"
          ? "Potentiometer"
          : kind === "hall"
          ? "Hall Effect"
          : "TMR (tunnel magnetoresistance)",
      text:
        kind === "pot"
          ? "A wiper drags along a resistive track. The contact point is also the wear point, which is where classic stick drift comes from."
          : kind === "hall"
          ? "A magnet on the stick shaft is read by a sensor beneath it. Nothing touches, so there is no wear path — but the sensor still has a resting value, and that value is rarely exactly zero."
          : "The same contactless arrangement as Hall Effect, using a magnetoresistive sensor that the manufacturers rate for finer resolution. Drift resistance comes from the same property: no contact.",
    })
  )
  .join("\n")}
  </div>

  <div class="table-scroll">
    <table class="spec-table">
      <thead><tr><th>Specification</th>${head}</tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>

  <div class="note see-also">
    <p><strong>See also: measured latency.</strong> Latency needs a second dimension &mdash; every controller is
    measured separately over cable, dongle and Bluetooth &mdash; so it does not fit a column here. A separate
    page compares all ${cs.filter((c) => (c.measuredLatency ?? []).length).length} measured models by connection
    mode: <a href="latency.html">Measured latency</a>.</p>
  </div>
</div>`;

  return layout({
    title: `Specification comparison — ${SITE_NAME}`,
    description: "Side-by-side specification comparison of GameSir controllers, with unverified values left explicitly blank.",
    current: "compare.html",
    body,
    source: {
      file: "data/controllers.json",
      note: "Every cell in this table is read from the data file; the rows themselves are defined in build.mjs.",
    },
  });
}

/**
 * Latency gets its own page because the flat "one row per controller per mode"
 * table it used to live in ran to 22 rows. Pivoting connection mode into the
 * columns brings the comparison down to one row per controller without
 * dropping a figure, and a metric switch keeps button, stick and polling all
 * reachable in the same space.
 */
function pageLatency(data) {
  const cs = data.controllers;
  const measured = cs.filter((c) => (c.measuredLatency ?? []).length);

  const metricCell = (entries) => {
    if (!entries?.length) return '<td class="na">&mdash;</td>';

    const best = entries[0];
    const spans = [
      ["stick", best.stick],
      ["button", best.button],
      ["polling", best.polling],
    ]
      .map(([metric, value]) => {
        if (!value) return `<span class="metric" data-metric="${metric}"><span class="na">&mdash;</span></span>`;

        const ms = metric === "polling" ? null : parseMs(value);
        const bar =
          ms === null
            ? ""
            : `<span class="bar-track"><span class="bar-fill ${msClass(ms)}" style="width:${Math.min(
                100,
                (ms / MS_SCALE) * 100
              ).toFixed(1)}%"></span></span>`;
        return `<span class="metric" data-metric="${metric}"><span class="metric-num">${esc(
          value
        )}</span>${bar}</span>`;
      })
      .join("");

    // The Kaleid is measured at three report rates over one cable; flag that
    // the cell is showing only the fastest of several configurations.
    const more =
      entries.length > 1
        ? `<span class="metric-more" title="${esc(
            entries.map((e) => e.mode).join(" / ")
          )}">fastest of ${entries.length}</span>`
        : "";

    return `<td class="metric-cell">${spans}${more}</td>`;
  };

  // gamepadla did not measure every metric on every pad — several models have
  // button latency but no stick figure. Counting them lets the switch say so,
  // so an empty column reads as "not measured" rather than "no data exists".
  const METRICS = [
    { key: "stick", label: "Stick latency" },
    { key: "button", label: "Button latency" },
    { key: "polling", label: "Polling rate" },
  ];

  const metricCounts = Object.fromEntries(
    METRICS.map((m) => [
      m.key,
      measured.filter((c) => (c.measuredLatency ?? []).some((l) => l[m.key])).length,
    ])
  );

  const metricChips = METRICS.map(
    (m, i) =>
      `      <button class="chip" type="button" data-metric="${m.key}" aria-pressed="${
        i === 0 ? "true" : "false"
      }">${m.label} <span class="tab-count">${metricCounts[m.key]}</span></button>`
  ).join("\n");

  const pivot = measured
    .map((c) => {
      const byFamily = latencyByFamily(c);
      return `<tr><th><a href="controllers/${esc(c.id)}.html">${esc(c.name)}</a></th>${MODE_FAMILIES.map(
        (f) => metricCell(byFamily[f.key])
      ).join("")}</tr>`;
    })
    .join("\n");

  // Fastest documented figure per connection family, for the summary strip.
  const fastest = MODE_FAMILIES.map((f) => {
    let best = null;
    for (const c of measured) {
      for (const l of latencyByFamily(c)[f.key] ?? []) {
        const ms = parseMs(l.stick) ?? parseMs(l.button);
        if (ms !== null && (best === null || ms < best.ms)) best = { ms, name: c.name, id: c.id };
      }
    }
    return { ...f, best };
  });

  const strip = fastest
    .map(
      (f) => `<div class="stat">
      <div class="stat-label">${icon(f.icon)}Fastest on ${esc(f.label.toLowerCase())}</div>
      <div class="stat-value small-value">${
        f.best ? `${f.best.ms} ms` : "&mdash;"
      }</div>
      <div class="stat-label">${
        f.best ? `<a href="controllers/${esc(f.best.id)}.html">${esc(f.best.name)}</a>` : "no data"
      }</div>
    </div>`
    )
    .join("\n");

  const detail = measured
    .map(
      (c) => `<details class="item">
  <summary>${esc(c.name)} <span class="badge">${(c.measuredLatency ?? []).length} measurements</span></summary>
  <div class="item-body">
${latencyTable(c).replace(/\.\.\/latency\.html/g, "#top")}
  </div>
</details>`
    )
    .join("\n");

  const noData = cs.filter((c) => !(c.measuredLatency ?? []).length);

  const body = `${pageHead({
    narrow: false,
    eyebrow: "Performance",
    heading: "Measured latency",
    lede: `<p class="lede">
      Independent latency measurements published by gamepadla.com, compared across every model covered here.
      Connection mode is the largest single factor &mdash; on several controllers the dongle is markedly slower
      than the cable for stick input, which is not something manufacturer specifications tell you.
    </p>`,
  })}

<div class="wrap" id="top">
  <div class="stat-strip">
${strip}
  </div>

  <h2 id="by-mode">Compared by connection mode</h2>
  <p class="section-intro">
    One row per controller, with each connection family in its own column. Switch which figure you are comparing
    without the table growing.
  </p>

  <div class="toolbar">
    <div class="metric-switch" id="metric-switch" role="group" aria-label="Choose which figure to compare">
${metricChips}
    </div>
  </div>

  <p class="small text-dim">
    Not every metric was measured for every controller. gamepadla published button latency for all
    ${measured.length}, but stick latency for only ${metricCounts.stick} of them, so some rows are empty in the
    stick view and populated in the others.
  </p>

  <div class="table-scroll">
    <table class="spec-table pivot-table" id="latency-pivot" data-show="stick">
      <thead><tr><th>Controller</th>${MODE_FAMILIES.map(
        (f) => `<th><span class="th-label">${icon(f.icon)}${esc(f.label)}</span></th>`
      ).join("")}</tr></thead>
      <tbody>
${pivot}
      </tbody>
    </table>
  </div>

  <p class="small text-dim">
    Each cell shows the fastest documented figure for that connection family. Bars use a fixed
    0&ndash;16&nbsp;ms scale; a full-width bar exceeds 16&nbsp;ms. Green is at or under 3&nbsp;ms, amber to
    8&nbsp;ms, red above &mdash; those bands are our editorial reading, not gamepadla's.
  </p>

  <div class="note">
    <p><strong>Read these as indicative, not exact.</strong> Every figure is an average from a single tested
    unit on one firmware version, and gamepadla's own results move between firmware revisions. Differences of a
    millisecond or two between models are inside the noise; the difference between a cable and Bluetooth is not.</p>
  </div>

  <h2 id="all">Every measurement</h2>
  <p class="section-intro">
    The pivot above collapses each connection family to its fastest result. Expand a controller for the full
    set, including the slower configurations.
  </p>
  <div class="accordion">
${detail}
  </div>

  ${
    noData.length
      ? `<h2 id="unmeasured">Not independently measured</h2>
<p class="section-intro">No published latency measurement exists for ${
          noData.length === 1 ? "this model" : "these models"
        }, so nothing is shown rather than an estimate: ${noData
          .map((c) => `<a href="controllers/${esc(c.id)}.html">${esc(c.name)}</a>`)
          .join(", ")}.</p>`
      : ""
  }
</div>`;

  return layout({
    title: `Measured controller latency compared — ${SITE_NAME}`,
    description:
      "Independent button and stick latency measurements for GameSir controllers, compared by connection mode, with polling rates and the caveats that apply.",
    current: "latency.html",
    body,
    source: {
      file: "data/controllers.json",
      note: "Figures live in each controller's <code>measuredLatency</code> array. New measurements are welcome if you can say how you took them.",
    },
  });
}

function pageTroubleshooting(data) {
  const cs = data.controllers;

  const all = cs.flatMap((c) =>
    (c.knownIssues ?? []).map((i) => ({
      ...i,
      model: c.name,
      modelId: c.id,
      topics: topicsFor(i.symptom, i.cause, i.fix),
    }))
  );

  const items = all
    .map(
      (i) => `<div class="ts-entry" data-model="${esc(i.modelId)}" data-topics="${esc(
        i.topics.join(" ")
      )}" data-text="${esc((i.symptom + " " + i.cause + " " + i.fix).toLowerCase())}">
${issueItem(i, i.model)}
</div>`
    )
    .join("\n");

  const body = `${pageHead({
    eyebrow: "Troubleshooting",
    heading: "Troubleshooting index",
    lede: `<p class="lede">
      Every documented problem and fix across all covered controllers, in one searchable list. Each entry cites
      the source of its fix so you can check the original instructions.
    </p>`,
  })}

<div class="wrap narrow">
  <div class="note danger">
    <p><strong>Calibration procedures are not interchangeable between G7 models.</strong> The direction matters,
    so check which one applies to your controller before holding any button combination.</p>
    <p>On the <strong>G7, G7 SE and G7 HE</strong>, calibration is entered by holding
    <kbd>View + Menu + Xbox</kbd> <em>while inserting the USB-C cable</em>. On the <strong>G7 Pro</strong>,
    it is entered by holding <kbd>View + Xbox + Menu</kbd> <em>while already connected</em>.</p>
    <p>GameSir explicitly warns that applying the older hold-while-plugging-in procedure to a G7 Pro puts that
    controller into firmware update mode instead, leaving it unable to power on normally. Recovery requires a
    manual firmware upgrade from a Windows PC. Older guides and videos still circulate the wrong sequence.</p>
  </div>

  <div class="figure-grid">
${fig(centreButtonFigure({ variant: "xbox", mode: "M" }), {
  label: "Where those buttons are",
  text: "View, the guide button and Menu sit in the centre row, with Share below and the M modifier under that. Every procedure on this page is a combination of these five and one other control.",
})}
${fig(indicatorFigure(), {
  label: "What the indicator is telling you",
  text: "The patterns are consistent across this range even though the exact meanings are per-model: a slow blink means the controller is waiting for you inside a setting mode, and a double blink is normally a refusal rather than a confirmation.",
})}
  </div>

  <div class="note danger">
    <p><strong>Never cross-flash Kaleid firmware.</strong> GameSir sells three different controllers under the
    Kaleid name &mdash; the <em>T4 Kaleid</em> (T4K), the <em>Kaleid</em> (K1) and the <em>Kaleid Flux</em>
    (K1&nbsp;Flux) &mdash; and each takes its own firmware.</p>
    <p>GameSir warns that installing the wrong file will likely brick the controller, and that flashing K1
    firmware onto a T4 Kaleid leaves it unusable and unrecoverable. Always use the upgrader published for your
    exact model. The K1 and K1 Flux look nearly identical, so confirm which one you own before downloading
    anything.</p>
  </div>

  <h2 id="drift">Before you assume the sticks have failed</h2>
  <p class="section-intro">
    Most reported drift on these controllers is not sensor failure. Work through this order before contacting
    support, because the later steps mask the symptom rather than fix it.
  </p>

  ${fig(deadzoneFigure(), {
    label: "The same stick, sitting still, three ways",
    text: "A magnetic stick has a resting value and it is rarely exactly zero, so a controller that applies no inner deadzone reports that error to the game. An inner deadzone hides it at the cost of precision; an anti-deadzone does the opposite, deliberately reporting movement while the stick is centred — which is indistinguishable from drift if it is set too high.",
  })}

  <div class="accordion">
    <details class="item" open>
      <summary>1. Rule out anti-deadzone first</summary>
      <div class="item-body">
        <p>GameSir's documentation states that improper anti-deadzone configuration &ldquo;may appear similar to
        stick drift&rdquo;. Anti-deadzone exists to cancel out a game's own built-in deadzone by reporting slight
        stick movement when the stick is centered &mdash; which is indistinguishable from drift if set too high.</p>
        <p>Set <em>Anti-deadzone &rarr; Initial</em> back to 0 in the GameSir app and retest. If you have ever
        adjusted this to fight an unresponsive game, this is the most likely cause.</p>
      </div>
    </details>

    <details class="item">
      <summary>2. Check whether you are in Raw (zero deadzone) mode</summary>
      <div class="item-body">
        <p>Several models toggle between a Raw stick trajectory with zero deadzone and a Circular trajectory. Raw is
        more sensitive and exposes the stick's natural center error directly to the game. If drift appeared without
        explanation, an accidental toggle is worth ruling out. The exact button combination varies by model &mdash;
        check your model page.</p>
      </div>
    </details>

    <details class="item">
      <summary>3. Recalibrate &mdash; with the faceplate installed</summary>
      <div class="item-body">
        <p>On models with swappable faceplates, GameSir specifies that calibration must be performed with the
        faceplate installed, because calibrating without it produces incorrect range values. This is easy to get
        wrong on a controller designed to have its faceplate removed.</p>
        <p>Rotate the sticks slowly and steadily. GameSir notes that faster rotation during calibration yields
        higher resulting sensitivity, so a rushed calibration can leave the sticks feeling twitchy.</p>
      </div>
    </details>

    <details class="item">
      <summary>4. Only then add a small deadzone in software</summary>
      <div class="item-body">
        <p>If a small center error remains, add the smallest inner deadzone that stops the drift. Every point you
        add is precision you give up, which matters most in games with low native deadzones.</p>
        <p>In Steam, a deadzone set under calibration will not apply until you enable it in the game's controller
        configuration: set <em>Enable Deadzone</em> to <em>Configuration</em>, then raise <em>Deadzone Inner</em>.
        Setting a value without switching this over is why people conclude Steam's deadzone slider does nothing.</p>
      </div>
    </details>
  </div>

  <h2 id="audio">If your headset or trigger vibration stopped working</h2>
  <p class="section-intro">
    Check your polling rate before troubleshooting either one. Across the G7 SE, G7 HE and Kaleid family,
    selecting a report rate above 250&nbsp;Hz disables the controller's onboard 3.5&nbsp;mm audio entirely
    &mdash; no game sound and no microphone. On the Kaleid, running at 1000&nbsp;Hz additionally disables native
    trigger vibration. Both are by design rather than faults, and GameSir advises returning the rate to
    250&nbsp;Hz if you use a headset through the controller.
  </p>
  <p class="section-intro">
    It is an easy trap to fall into, because raising the polling rate is one of the first things people do after
    installing the app, and the audio failure surfaces later with no obvious connection to it.
  </p>
  <p class="section-intro">
    The trade-off is real in both directions, though. On the Kaleid, gamepadla measured average stick latency of
    7.62&nbsp;ms at 1000&nbsp;Hz, 14.21&nbsp;ms at 500&nbsp;Hz and 27.22&nbsp;ms at 250&nbsp;Hz &mdash; same
    controller, same cable, only the report rate changed. So the safe setting for headset users is also
    substantially the slowest one.
  </p>

  <h2 id="all">All documented issues</h2>

  ${filterToolbar({
    topicLabel: "Symptom",
    topicAllLabel: "All symptoms",
    entries: all,
    controllers: cs,
    placeholder: "Search symptoms, causes and fixes&hellip;",
    searchAria: "Search troubleshooting entries",
  })}

  <div class="accordion" id="ts-list">
${items}
  </div>
  <div class="empty-state" id="ts-empty" hidden>No entries match that search.</div>
</div>`;

  return layout({
    title: `Troubleshooting index — ${SITE_NAME}`,
    description: "Searchable index of documented GameSir controller problems and their fixes, with sources.",
    current: "troubleshooting.html",
    body,
    source: {
      file: "data/controllers.json",
      note: "Each entry is a <code>knownIssues</code> record on the controller it affects. If a fix worked for you and isn't here, add it.",
    },
  });
}

function pageFaq(data) {
  const cs = data.controllers;

  const all = cs.flatMap((c) =>
    (c.faq ?? []).map((f) => ({
      ...f,
      model: c.name,
      modelId: c.id,
      topics: topicsFor(f.q, f.a),
    }))
  );

  const items = all
    .map(
      (f) => `<div class="ts-entry" data-model="${esc(f.modelId)}" data-topics="${esc(
        f.topics.join(" ")
      )}" data-text="${esc((f.q + " " + f.a).toLowerCase())}">
${faqItem(f, f.model)}
</div>`
    )
    .join("\n");

  const body = `${pageHead({
    eyebrow: "FAQ",
    heading: "Frequently asked questions",
    lede: `<p class="lede">
      Questions collected from GameSir's official FAQ pages and manuals, grouped across every covered model and
      searchable in one place. Each answer links to its source.
    </p>`,
  })}

<div class="wrap narrow">
  <h2 id="reading-the-combos">Reading the button combinations</h2>
  <p class="section-intro">
    Most answers below are a button combination. Two figures cover nearly all of them: which control is which, and
    the remapping gesture that every model in this range shares.
  </p>

  <div class="figure-grid">
${fig(centreButtonFigure({ variant: "xbox", mode: "M" }), {
  label: "The centre row",
  text: "Xbox-style models name these View, Menu, guide and Share; the multiplatform ones use Minus, Plus, Home and Screenshot for the same positions. M is the modifier the on-controller procedures start from.",
})}
${fig(mappingFigure({ mode: "M" }), {
  label: "Assigning a rear button",
  text: "Hold M together with the rear button until the indicator blinks slowly, press the control it should copy, and the indicator returns to solid. Repeating the hold and pressing the rear button itself clears the assignment again.",
})}
  </div>

  <h2 id="all-questions">Every question</h2>

  ${filterToolbar({
    topicLabel: "Topic",
    topicAllLabel: "All topics",
    entries: all,
    controllers: cs,
    placeholder: "Search questions and answers&hellip;",
    searchAria: "Search FAQ entries",
  })}

  <div class="accordion" id="ts-list">
${items}
  </div>
  <div class="empty-state" id="ts-empty" hidden>No questions match that search.</div>
</div>`;

  return layout({
    title: `FAQ — ${SITE_NAME}`,
    description: "Searchable FAQ for GameSir controllers, compiled from official manuals and FAQ pages with sources.",
    current: "faq.html",
    body,
    source: {
      file: "data/controllers.json",
      note: "Each question is a <code>faq</code> record on the controller it applies to. Questions you had to answer the hard way are worth adding.",
    },
  });
}

function pageAbout(data) {
  const notes = (data.meta?.sourceNotes ?? []).map((n) => `<li>${esc(n)}</li>`).join("\n");

  const body = `${pageHead({
    eyebrow: "About",
    heading: "About this reference",
    lede: `<p class="lede">What this site is, where its numbers come from, and how to correct them.</p>`,
  })}

<div class="wrap narrow">
  <h2 id="what-this-is">What this is</h2>
  <p>
    An unofficial, community-maintained wiki about GameSir controllers. It exists because the useful information
    is scattered across product pages, per-edition manuals, separate FAQ documents, independent measurement
    sites and forum threads &mdash; and because the same handful of questions get asked repeatedly.
  </p>
  <p>
    This site is not affiliated with, endorsed by, or operated by GameSir. Nothing here is sold, sponsored or
    affiliate-linked, and there is no advertising: links to manufacturer pages exist so you can check a figure
    against its source. Where a launch price is recorded it is there as a dated historical fact, because price
    is part of how these models are positioned against each other &mdash; not because anything is on offer.
  </p>

  <h2 id="who-writes-it">Who writes it</h2>
  <p>
    Whoever turns up. The entire site is a data file, a generator and a stylesheet in a public Git repository, so
    editing it needs no account with anyone but GitHub and no permission from a maintainer. Every page carries an
    &ldquo;Edit this page on GitHub&rdquo; link at the bottom that opens the exact file &mdash; and, on a
    controller page, the exact line &mdash; that its content came from.
  </p>
  <p>
    Contributions are attributed the ordinary way, through the
    <a href="${REPO.url}/graphs/contributors" rel="noopener" target="_blank">commit history</a>. There is no
    editorial board to convince; the only real rule is the one below about sources.
  </p>

  <h2 id="sourcing">Where the numbers come from</h2>
  <p>Specifications are compiled from published sources, in this order of preference:</p>
  <ol>
    <li>GameSir's official product pages, per-model manuals and FAQ documents</li>
    <li>Independent measurements published by <a href="https://gamepadla.com" rel="nofollow noopener" target="_blank">gamepadla.com</a>, which documents its methodology and test hardware</li>
    <li>Published reviews from established outlets</li>
    <li>Community troubleshooting threads &mdash; used only for problem reports, never for specifications</li>
  </ol>

  <div class="note warn">
    <p><strong>These figures are not first-hand testing.</strong> Nothing here was measured by the maintainers
    unless a figure explicitly says so. Manufacturer claims are labelled as claims. Independent measurements come
    from single tested units on specific firmware versions and can vary between units.</p>
  </div>

  <h2 id="diagrams">The diagrams</h2>
  <p>
    Every diagram on this site is original line art, drawn from primitives by the site generator and coloured from
    the same palette as the pages around it. None of it is GameSir photography, a GameSir render, or a trace of
    either, and no GameSir logo or marketing asset is reproduced anywhere.
  </p>
  <p>
    The controller views are <strong>schematics, not scale drawings</strong>. Which controls appear on a model's
    diagram comes from the same sourced record as its specification table, so a diagram will show two rear
    paddles and no latches when that is what the sources document &mdash; but the contours, spacing and
    proportions are drawn for clarity and should not be measured. Where a control is documented as absent, the
    diagram marks the absence rather than quietly leaving it out.
  </p>
  <p>
    The drawings are also written out as standalone SVG files under
    <code>assets/gamesir/</code> &mdash; controller views, component close-ups and the site's own mark &mdash; so
    they can be reused or corrected independently of the pages that embed them.
  </p>

  <h2 id="gaps">How gaps are handled</h2>
  <p>
    Where a value could not be verified against a source, it is left blank and marked
    &ldquo;not documented&rdquo; rather than filled with a plausible estimate. A visible gap is more useful than a
    confident guess, because a guess in a troubleshooting guide costs someone real time.
  </p>
  ${notes ? `<ul>\n${notes}\n</ul>` : ""}

  <h2 id="contributing">How to contribute</h2>
  <p>
    Corrections are welcome and wanted, especially from people who own the hardware. There are three ways in,
    roughly in order of effort:
  </p>
  <ol>
    <li>
      <strong>Report it and let someone else write it.</strong>
      <a href="${REPO_NEW_ISSUE}" rel="noopener" target="_blank">Open an issue</a> saying what is wrong, or which
      controller is missing. A rough note with a link is more useful than nothing, and you do not need to know
      how the site is built.
    </li>
    <li>
      <strong>Edit a page in the browser.</strong> Use the &ldquo;Edit this page on GitHub&rdquo; link at the
      foot of any page. GitHub will fork the repository and open a pull request for you; nothing needs to be
      installed and nothing can be broken irreversibly.
    </li>
    <li>
      <strong>Edit the data and rebuild.</strong> Clone the repository, change
      <a href="${repoBlob(
        "data/controllers.json"
      )}" rel="noopener" target="_blank"><code>data/controllers.json</code></a>, run <code>node build.mjs</code>
      and commit the regenerated <code>docs/</code> alongside it. There are no dependencies to install.
    </li>
  </ol>
  <p>
    The one thing a change does need is a source: a link, a manual, a measurement, or a description of what your
    own unit does and how you tested it. First-hand measurements are valuable precisely because this wiki has
    none of its own &mdash; they will be credited and labelled as such. A change that adds a figure with no way
    to check it is the one kind that gets turned away, because that is the failure mode this site exists to
    avoid.
  </p>
  <p class="contrib-links">
    <a class="btn btn-ghost" href="${REPO.url}" rel="noopener" target="_blank">${ICON_GITHUB}<span>Browse the repository</span></a>
    <a class="btn btn-ghost" href="${REPO_ISSUES}" rel="noopener" target="_blank">Open issues</a>
  </p>

  <p class="small text-dim">Data last reviewed ${esc(data.meta?.updated ?? "")}.</p>
</div>`;

  return layout({
    title: `About — ${SITE_NAME}`,
    description: "How this GameSir reference is sourced, what it does not claim, and how to submit corrections.",
    current: "about.html",
    body,
    source: {
      file: "build.mjs",
      line: SRC.fn("pageAbout"),
      note: "This page is prose held in build.mjs.",
    },
  });
}

/* ----------------------------------------------------------------- build -- */

const FILTER_JS = `/* Progressive enhancement: theme switching, the mobile nav, section tabs, the
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

/* -- Controller layout diagrams -------------------------------------------
   Two jobs: switch between the front, back and top views, and read out
   whichever control the pointer or the keyboard is on. The readout text is
   taken from the legend already in the page rather than a second copy of the
   descriptions, so the two can never disagree. With this file absent, every
   view and every legend simply stays on the page. */
(function () {
  var sections = document.querySelectorAll("[data-layout]");
  if (!sections.length) return;

  Array.prototype.forEach.call(sections, function (section) {
    var readout = section.querySelector("[data-readout]");
    var idle = readout ? readout.innerHTML : "";
    var switcher = section.querySelector(".view-switch");
    var views = section.querySelectorAll(".diagram-view");
    var legends = section.querySelectorAll(".diagram-legend");

    function each(list, fn) {
      Array.prototype.forEach.call(list, fn);
    }

    function activeLegend() {
      return section.querySelector(".diagram-legend.is-active");
    }

    function highlight(id) {
      each(section.querySelectorAll("[data-part]"), function (el) {
        el.classList.toggle("is-active", el.dataset.part === id);
      });

      var legend = activeLegend();
      var source = legend && legend.querySelector('[data-part="' + id + '"]');
      if (!readout || !source) return;

      var name = source.querySelector(".legend-name");
      var desc = source.querySelector(".legend-desc");
      readout.classList.remove("is-idle");
      readout.innerHTML =
        '<span class="readout-name"></span><p class="readout-desc"></p>';
      readout.querySelector(".readout-name").textContent = name ? name.textContent : "";
      readout.querySelector(".readout-desc").textContent = desc ? desc.textContent : "";
    }

    function reset() {
      each(section.querySelectorAll("[data-part]"), function (el) {
        el.classList.remove("is-active");
      });
      if (readout) {
        readout.innerHTML = idle;
        readout.classList.add("is-idle");
      }
    }

    // Delegated, so it covers both the shapes in the drawing and the rows of
    // the legend, in both directions.
    ["mouseover", "focusin"].forEach(function (evt) {
      section.addEventListener(evt, function (e) {
        var target = e.target.closest ? e.target.closest("[data-part]") : null;
        if (target) highlight(target.dataset.part);
        else if (evt === "mouseover") reset();
      });
    });

    ["mouseleave", "focusout"].forEach(function (evt) {
      section.addEventListener(evt, reset);
    });

    // Touch: there is no hover, so a tap has to do the same thing.
    section.addEventListener("click", function (e) {
      var target = e.target.closest ? e.target.closest("[data-part]") : null;
      if (target) highlight(target.dataset.part);
    });

    if (!switcher) return;

    switcher.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-view]");
      if (!btn) return;

      var want = btn.dataset.view;
      each(switcher.querySelectorAll("[data-view]"), function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      each(views, function (v) {
        v.classList.toggle("is-active", v.dataset.view === want);
      });
      each(legends, function (l) {
        l.classList.toggle("is-active", l.dataset.view === want);
      });
      reset();
    });
  });
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
`;

/**
 * Writes every diagram out as a standalone SVG file as well as inlining it.
 * The inline copies are what the pages render; these are the reusable library —
 * organised by subject, each carrying its own palette so it stands up outside
 * the site, and each with a <desc> stating that it is a schematic rather than
 * product photography.
 */
async function writeDiagramAssets(data) {
  const base = path.join(OUT, "assets", "gamesir");
  const dirs = ["controllers", "buttons", "diagrams", "logos"];
  for (const d of dirs) await mkdir(path.join(base, d), { recursive: true });

  let count = 0;
  const put = async (dir, name, markup, title, width) => {
    await writeFile(path.join(base, dir, `${name}.svg`), standaloneSvg(markup, { title, width }));
    count++;
  };

  for (const c of data.controllers) {
    for (const v of controllerViews(c)) {
      await put(
        "controllers",
        `${c.id}-${v.id}`,
        v.svg,
        `${c.name} — ${v.label.toLowerCase()} layout schematic`,
        900
      );
    }
    await put("controllers", `${c.id}-outline`, silhouette(c), `${c.name} — outline`, 480);
    await put(
      "diagrams",
      `${c.id}-connections`,
      connectionFigure(c),
      `${c.name} — supported connection modes`,
      640
    );
  }

  const buttons = {
    dpad: [dpadFigure(), "D-pad: four switches, eight directions"],
    "dpad-fenced": [dpadFigure({ fenced: true }), "Fenced D-pad"],
    abxy: [faceButtonFigure(), "ABXY cluster in the Xbox arrangement"],
    "abxy-layouts": [faceButtonFigure({ swap: true }), "ABXY in the Xbox and Nintendo arrangements"],
    shoulders: [shoulderFigure(), "Bumpers and triggers"],
    "shoulders-mini": [shoulderFigure({ mini: true }), "Bumpers, triggers and mini bumpers"],
    "rear-buttons": [rearButtonFigure(), "Rear paddles"],
    "rear-buttons-latched": [
      rearButtonFigure({ latches: true }),
      "Rear paddles with mechanical lock sliders",
    ],
    "centre-xbox": [centreButtonFigure({ variant: "xbox" }), "Centre cluster, Xbox naming"],
    "centre-multiplatform": [
      centreButtonFigure({ variant: "nintendo" }),
      "Centre cluster, multiplatform naming",
    ],
    mapping: [mappingFigure(), "Mapping a rear button in three steps"],
    ports: [portFigure({ audioJack: true }), "USB-C port and 3.5 mm headset jack"],
  };
  for (const [name, [markup, title]] of Object.entries(buttons)) {
    await put("buttons", name, markup, title, 620);
  }

  const diagrams = {
    "stick-potentiometer": [stickSensorFigure("pot"), "Potentiometer stick, in cross-section"],
    "stick-hall-effect": [stickSensorFigure("hall"), "Hall Effect stick, in cross-section"],
    "stick-tmr": [stickSensorFigure("tmr"), "TMR stick, in cross-section"],
    deadzone: [deadzoneFigure(), "Centre error, inner deadzone and anti-deadzone compared"],
    trigger: [triggerFigure(false), "Analog trigger travel"],
    "trigger-stops": [triggerFigure(true), "Trigger travel shortened by a stop"],
    indicator: [indicatorFigure(), "Controller indicator patterns"],
    gyro: [gyroFigure(), "Gyroscope axes"],
    "rumble-two-motors": [rumbleFigure("one in each grip"), "Two rumble motors"],
    "rumble-four-motors": [
      rumbleFigure("one in each grip and one in each trigger"),
      "Four rumble motors",
    ],
    faceplate: [faceplateFigure(), "Magnetic faceplate lifting off the shell"],
    "reference-layout": [
      controllerViews(REFERENCE_PAD)[0].svg,
      "Generic gamepad layout, front view",
    ],
  };
  for (const [name, [markup, title]] of Object.entries(diagrams)) {
    await put("diagrams", name, markup, title, 720);
  }

  // The site's own mark, not anyone else's. Kept here so the pages and the
  // asset library are drawing the same thing.
  await writeFile(
    path.join(base, "logos", "gamesir-wiki-mark.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256" role="img" aria-label="GameSir Wiki mark">
  <title>GameSir Wiki mark</title>
  <desc>Mark of the unofficial community-maintained GameSir Wiki. Not a GameSir trademark.</desc>
  <rect width="32" height="32" rx="8" fill="#e5343c"/>
  <circle cx="16" cy="16" r="8.4" fill="none" stroke="#fff" stroke-width="2.5" opacity=".85"/>
  <circle cx="19.4" cy="12.6" r="3.3" fill="#fff"/>
</svg>
`
  );
  count++;

  await writeFile(
    path.join(base, "README.md"),
    `# Diagram assets

Original schematic line art generated by \`build.mjs\` from \`src/diagrams.mjs\`. Regenerated on
every build, so edit the generator rather than these files.

- \`controllers/\` — front, back and top-edge schematics plus a plain outline, one set per model
- \`buttons/\` — close-ups of individual controls
- \`diagrams/\` — mechanisms and concepts: stick sensing, deadzones, trigger travel, indicators
- \`logos/\` — this site's own mark

These are schematics, not product photography, and no GameSir artwork, render or logo is
reproduced in any of them. GameSir product names and trademarks belong to their owner.
`
  );

  return count;
}

async function build() {
  const data = JSON.parse(await readFile(path.join(ROOT, "data", "controllers.json"), "utf8"));

  // Fail loudly on duplicate ids rather than silently overwriting a page.
  const ids = data.controllers.map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`Duplicate controller ids: ${[...new Set(dupes)].join(", ")}`);

  data.controllers.sort((a, b) => a.name.localeCompare(b.name));

  // Resolved before any page is rendered, because the footer edit links on
  // every one of them are built from it.
  SRC = await readSourceLines();

  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(path.join(OUT, "controllers"), { recursive: true });

  // Copies the whole asset tree — stylesheet and favicon — rather than naming
  // each one, so adding an asset needs no change here.
  await cp(path.join(ROOT, "src", "assets"), path.join(OUT, "assets"), { recursive: true });

  await mkdir(path.join(OUT, "assets", "js"), { recursive: true });
  await writeFile(path.join(OUT, "assets", "js", "filter.js"), FILTER_JS);

  // Tells GitHub Pages to serve the directory as-is instead of running Jekyll.
  await writeFile(path.join(OUT, ".nojekyll"), "");

  await writeFile(path.join(OUT, "index.html"), pageIndex(data));
  await writeFile(path.join(OUT, "compare.html"), pageCompare(data));
  await writeFile(path.join(OUT, "latency.html"), pageLatency(data));
  await writeFile(path.join(OUT, "troubleshooting.html"), pageTroubleshooting(data));
  await writeFile(path.join(OUT, "faq.html"), pageFaq(data));
  await writeFile(path.join(OUT, "about.html"), pageAbout(data));

  for (const c of data.controllers) {
    await writeFile(path.join(OUT, "controllers", `${c.id}.html`), pageController(c, data));
  }

  const assets = await writeDiagramAssets(data);

  const issues = data.controllers.reduce((n, c) => n + (c.knownIssues?.length ?? 0), 0);
  const faqs = data.controllers.reduce((n, c) => n + (c.faq?.length ?? 0), 0);

  console.log(
    `Built ${data.controllers.length + 6} pages -> docs/\n` +
      `  ${data.controllers.length} controllers, ${issues} documented issues, ${faqs} FAQ entries\n` +
      `  ${assets} diagram assets -> docs/assets/gamesir/`
  );
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
