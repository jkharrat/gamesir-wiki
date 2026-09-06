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

const ROOT = import.meta.dirname;
const OUT = path.join(ROOT, "docs");

const SITE_NAME = "GameSir Wiki";

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

const row = (k, v) => `<div class="spec-row"><span class="spec-key">${esc(k)}</span>${val(v)}</div>`;

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
  { href: "compare.html", label: "Compare" },
  { href: "troubleshooting.html", label: "Troubleshooting" },
  { href: "faq.html", label: "FAQ" },
  { href: "about.html", label: "About" },
];

function layout({ title, description, current, base = "", body, bodyEnd = "" }) {
  const nav = NAV.map(
    (n) =>
      `<a href="${base}${n.href}"${n.href === current ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${base}assets/css/style.css">
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${base}index.html">
      <span class="brand-mark">GS</span>
      <span>${SITE_NAME}</span>
    </a>
    <nav class="site-nav">${nav}</nav>
  </div>
</header>

<main>
${body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <p class="disclaimer">
      <strong>Unofficial and community-maintained.</strong> Not affiliated with, endorsed by, or operated by
      GameSir. Specifications are compiled from GameSir's published product pages, manuals and FAQ documents,
      from independent measurement data published by gamepadla.com, and from published reviews &mdash; not from
      first-hand testing, unless a figure says otherwise. Values that could not be verified are marked
      &ldquo;not documented&rdquo; rather than estimated. Manufacturer claims are labelled as claims.
    </p>
    <p class="small">Found an error? Open an issue or a pull request with a source and it will be corrected.</p>
  </div>
</footer>
${bodyEnd}
</body>
</html>
`;
}

/* ----------------------------------------------------------- components -- */

function controllerBadges(c) {
  const b = [];
  if (c.tier) b.push(`<span class="badge tier-${esc(c.tier)}">${esc(tierLabel(c.tier))}</span>`);
  if (c.sticks?.tech)
    b.push(`<span class="badge ${stickBadgeClass(c.sticks.tech)}">${esc(c.sticks.tech)}</span>`);
  if (c.pollingRate?.pc)
    b.push(`<span class="badge badge-info">${esc(String(c.pollingRate.pc).split(" (")[0])}</span>`);
  if (c.gyro?.present) b.push(`<span class="badge">Gyro</span>`);
  if (c.software) b.push(`<span class="badge">${esc(c.software)}</span>`);
  return `<div class="badges">${b.join("")}</div>`;
}

function latencyBars(c) {
  if (!Array.isArray(c.measuredLatency) || !c.measuredLatency.length) return "";

  const SCALE = 16; // ms — full-width reference so bars are comparable across models
  const bars = c.measuredLatency
    .map((l) => {
      const ms = parseMs(l.stick) ?? parseMs(l.button);
      const pct = ms === null ? 0 : Math.min(100, (ms / SCALE) * 100);
      const cls = ms === null ? "" : ms <= 3 ? "is-good" : ms <= 8 ? "is-warn" : "is-bad";
      const nums = [l.button ? `button ${l.button}` : null, l.stick ? `stick ${l.stick}` : null, l.polling]
        .filter(Boolean)
        .join(" \u00b7 ");
      return `<div class="latency-row">
  <div class="latency-head"><span class="latency-mode">${esc(l.mode)}</span><span class="latency-num">${esc(nums)}</span></div>
  <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div></div>
</div>`;
    })
    .join("\n");

  return `<h3 id="latency">Measured latency</h3>
<p class="section-intro small">Bar length reflects stick latency on a fixed 0&ndash;16&nbsp;ms scale, so bars are comparable between models. Measured and published by gamepadla.com; polling rate and latency are measured by different methods and are not the same thing.</p>
<div class="latency-list">
${bars}
</div>`;
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

function pageIndex(data) {
  const cs = data.controllers;

  const cards = cs
    .map(
      (c) => `<a class="controller-card" href="controllers/${esc(c.id)}.html">
  ${controllerBadges(c)}
  <h3>${esc(c.name)}</h3>
  <p class="tagline">${esc(c.tagline)}</p>
  <div class="card-foot">
    <span>${esc(connSummary(c) ?? "")}</span>
    <span>${c.msrp ? esc(c.msrp) : ""}</span>
  </div>
</a>`
    )
    .join("\n");

  const issueCount = cs.reduce((n, c) => n + (c.knownIssues?.length ?? 0), 0);
  const faqCount = cs.reduce((n, c) => n + (c.faq?.length ?? 0), 0);
  const srcCount = new Set(cs.flatMap((c) => (c.sources ?? []).map((s) => s.url))).size;

  const body = `<div class="wrap">
  <section class="hero">
    <h1>A sourced reference for GameSir controllers</h1>
    <p class="lede">
      Specifications, documented fixes and frequently asked questions for ${cs.length} GameSir controllers,
      each traceable to an official manual, an independent measurement, or a published review. Nothing here is
      estimated &mdash; unverified values are left blank on purpose.
    </p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="compare.html">Compare all models</a>
      <a class="btn btn-ghost" href="troubleshooting.html">Troubleshooting index</a>
    </div>
  </section>

  <div class="stat-strip">
    <div class="stat"><div class="stat-value">${cs.length}</div><div class="stat-label">Controllers</div></div>
    <div class="stat"><div class="stat-value">${issueCount}</div><div class="stat-label">Documented fixes</div></div>
    <div class="stat"><div class="stat-value">${faqCount}</div><div class="stat-label">FAQ entries</div></div>
    <div class="stat"><div class="stat-value">${srcCount}</div><div class="stat-label">Cited sources</div></div>
  </div>

  <h2 id="controllers">Controllers</h2>
  <p class="section-intro">Each page covers full specifications, measured performance where independent data exists, documented problems with their fixes, and sources.</p>
  <div class="card-grid">
${cards}
  </div>

  <h2 id="start-here">Start here</h2>
  <p class="section-intro">Three things account for a large share of GameSir support questions.</p>

  <div class="accordion">
    <details class="item">
      <summary>&ldquo;My controller isn't detected by the app&rdquo; &mdash; check which app it needs</summary>
      <div class="item-body">
        <p>GameSir ships two PC applications and they do not cover the same hardware. <strong>GameSir Nexus</strong>
        serves the Xbox-licensed controllers. <strong>GameSir Connect</strong> serves the others, including the
        G7 Pro 8K PC, Tarantula Pro, Cyclone 2, Super Nova, Nova 2 Lite and T3 Lite.</p>
        <p>GameSir has stated publicly that the G7 Pro 8K PC does not work with Nexus. If you have Nexus open and
        the controller never appears, that is expected behaviour rather than a fault. Check your model's page for
        which app it uses.</p>
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

  const body = `<div class="wrap narrow">
  <div class="page-head">
    <p class="breadcrumb"><a href="../index.html">Home</a> / ${esc(c.name)}</p>
    <p class="eyebrow">${esc(tierLabel(c.tier))} &middot; ${esc(c.category ?? "")}</p>
    <h1>${esc(c.fullName ?? c.name)}</h1>
    <p class="lede">${esc(c.tagline)}</p>
    ${controllerBadges(c)}
  </div>

  <h2 id="specs">Specifications</h2>
  <div class="spec-section">
    <h3>Overview</h3>
    <div class="spec-grid">
      ${row("Released", c.releaseYear)}
      ${row("Launch price", c.msrp)}
      ${row("Weight", c.weight)}
      ${row("Dimensions", c.dimensions)}
      ${row("Software", c.software)}
      ${row("Platforms", (c.platforms ?? []).join(", ") || null)}
    </div>

    <h3>Sticks</h3>
    <div class="spec-grid">
      ${row("Sensor technology", s.tech)}
      ${row("Resolution", s.resolution)}
      ${row("Durability", s.durability)}
      ${row("Measured center error", s.measuredCenterError)}
      ${row("Measured resolution", s.measuredResolution)}
    </div>
    ${s.measuredNotes ? `<div class="note"><p>${esc(s.measuredNotes)}</p></div>` : ""}

    <h3>Triggers, D-pad and buttons</h3>
    <div class="spec-grid">
      ${row("Trigger technology", t.tech)}
      ${row("Trigger stops", t.triggerStops === null || t.triggerStops === undefined ? null : t.triggerStops ? "Yes" : "No")}
      ${row("D-pad", c.dpad)}
      ${row("Face buttons", c.faceButtons)}
      ${row("Rear buttons", eb.backButtons)}
      ${row("Extra bumpers", eb.extraBumpers)}
    </div>
    ${t.notes ? `<p class="small text-muted">${esc(t.notes)}</p>` : ""}
    ${eb.notes ? `<p class="small text-muted">${esc(eb.notes)}</p>` : ""}

    <h3>Connectivity and performance</h3>
    <div class="spec-grid">
      ${row("Connection modes", connSummary(c))}
      ${row("Polling rate (PC)", c.pollingRate?.pc)}
      ${row("Polling rate (Xbox)", c.pollingRate?.xbox)}
      ${row("Audio jack", c.audioJack === null || c.audioJack === undefined ? null : c.audioJack ? "3.5 mm" : "None")}
      ${row("Gyro", c.gyro?.present ? "Yes" : c.gyro?.present === false ? "No" : null)}
      ${row("Rumble", c.rumble)}
    </div>
    ${c.connectivity?.notes ? `<div class="note"><p>${esc(c.connectivity.notes)}</p></div>` : ""}
    ${c.pollingRate?.notes ? `<p class="small text-muted">${esc(c.pollingRate.notes)}</p>` : ""}
    ${c.gyro?.notes ? `<p class="small text-muted">Gyro: ${esc(c.gyro.notes)}</p>` : ""}

    <h3>Battery and build</h3>
    <div class="spec-grid">
      ${row("Battery capacity", c.battery?.capacity)}
      ${row("Claimed battery life", c.battery?.claimedLife)}
      ${row("Swappable faceplates", c.faceplates?.swappable === null || c.faceplates?.swappable === undefined ? null : c.faceplates.swappable ? "Yes" : "No")}
    </div>
    ${c.battery?.notes ? `<p class="small text-muted">${esc(c.battery.notes)}</p>` : ""}
    ${c.faceplates?.notes ? `<p class="small text-muted">${esc(c.faceplates.notes)}</p>` : ""}
  </div>

  ${latencyBars(c)}

  ${
    (c.notableFeatures ?? []).length
      ? `<h2 id="features">Notable features</h2>
<ul>
${c.notableFeatures.map((f) => `  <li>${esc(f)}</li>`).join("\n")}
</ul>`
      : ""
  }

  ${
    issues
      ? `<h2 id="issues">Known issues and fixes</h2>
<p class="section-intro">Documented problems with documented solutions. Each entry cites where the fix comes from.</p>
<div class="accordion">
${issues}
</div>`
      : ""
  }

  ${
    faqs
      ? `<h2 id="faq">Frequently asked questions</h2>
<div class="accordion">
${faqs}
</div>`
      : ""
  }

  ${
    sources
      ? `<h2 id="sources">Sources</h2>
<ul class="source-list">
${sources}
</ul>`
      : ""
  }

  <p class="small text-dim">Data last reviewed ${esc(data.meta?.updated ?? "")}. Figures are compiled from the sources above rather than first-hand testing.</p>
</div>`;

  return layout({
    title: `${c.fullName ?? c.name} — specs, fixes and FAQ | ${SITE_NAME}`,
    description: `${c.name}: full specifications, measured performance, documented problems and fixes, and frequently asked questions. ${c.tagline}`,
    current: "",
    base: "../",
    body,
  });
}

function pageCompare(data) {
  const cs = data.controllers;

  const head = cs.map((c) => `<th>${esc(c.name)}</th>`).join("");

  const rows = [
    ["Tier", (c) => tierLabel(c.tier)],
    ["Launch price", (c) => c.msrp],
    ["Released", (c) => c.releaseYear],
    ["Software", (c) => c.software],
    ["Stick sensor", (c) => c.sticks?.tech],
    ["Stick resolution (claimed)", (c) => c.sticks?.resolution],
    ["Measured center error", (c) => c.sticks?.measuredCenterError],
    ["Trigger tech", (c) => c.triggers?.tech],
    ["Trigger stops", (c) => (c.triggers?.triggerStops == null ? null : c.triggers.triggerStops ? "Yes" : "No")],
    ["D-pad", (c) => c.dpad],
    ["Polling (PC)", (c) => c.pollingRate?.pc],
    ["Polling (Xbox)", (c) => c.pollingRate?.xbox],
    ["Connection modes", (c) => connSummary(c)],
    ["Battery", (c) => c.battery?.capacity],
    ["Claimed battery life", (c) => c.battery?.claimedLife],
    ["Weight", (c) => c.weight],
    ["Rear buttons", (c) => c.extraButtons?.backButtons],
    ["Gyro", (c) => (c.gyro?.present == null ? null : c.gyro.present ? "Yes" : "No")],
    ["Audio jack", (c) => (c.audioJack == null ? null : c.audioJack ? "Yes" : "No")],
    ["Swappable faceplates", (c) => (c.faceplates?.swappable == null ? null : c.faceplates.swappable ? "Yes" : "No")],
    ["Platforms", (c) => (c.platforms ?? []).join(", ") || null],
  ]
    .map(
      ([label, fn]) =>
        `<tr><th>${esc(label)}</th>${cs.map((c) => cell(fn(c))).join("")}</tr>`
    )
    .join("\n");

  const body = `<div class="wrap">
  <div class="page-head">
    <p class="eyebrow">Comparison</p>
    <h1>Specification comparison</h1>
    <p class="lede">
      Every documented specification side by side. Em dashes mark values that could not be verified against a
      source &mdash; they are gaps in the documentation, not zeros. Scroll horizontally to see all models; model
      names stay pinned.
    </p>
  </div>

  <div class="note">
    <p><strong>Reading the stick sensor row.</strong> TMR and Hall Effect sticks both sense magnetically and do not
    wear like potentiometer sticks, which is why they are marketed as drift-resistant. That resistance is about
    sensor wear, not about center accuracy &mdash; a magnetic stick can still show a small center error, and
    several of these controllers apply no inner deadzone to hide it.</p>
  </div>

  <div class="table-scroll">
    <table class="spec-table">
      <thead><tr><th>Specification</th>${head}</tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>

  <h2>Measured latency</h2>
  <p class="section-intro">
    Independent measurements published by gamepadla.com, where available. These are averages from a single tested
    unit on a specific firmware, so treat them as indicative rather than exact. Note how much the connection mode
    matters &mdash; on several models the dongle is markedly slower than the cable for stick input.
  </p>
  <div class="table-scroll">
    <table class="spec-table">
      <thead><tr><th>Controller</th><th>Mode</th><th>Button latency</th><th>Stick latency</th><th>Polling</th></tr></thead>
      <tbody>
${cs
  .flatMap((c) =>
    (c.measuredLatency ?? []).map(
      (l) =>
        `<tr><th>${esc(c.name)}</th>${cell(l.mode)}${cell(l.button)}${cell(l.stick)}${cell(l.polling)}</tr>`
    )
  )
  .join("\n") || '<tr><td class="na" colspan="5">No measured latency data recorded yet.</td></tr>'}
      </tbody>
    </table>
  </div>
</div>`;

  return layout({
    title: `Specification comparison — ${SITE_NAME}`,
    description: "Side-by-side specification comparison of GameSir controllers, with unverified values left explicitly blank.",
    current: "compare.html",
    body,
  });
}

function pageTroubleshooting(data) {
  const cs = data.controllers;

  const all = cs.flatMap((c) =>
    (c.knownIssues ?? []).map((i) => ({ ...i, model: c.name, modelId: c.id }))
  );

  const chips = cs
    .map(
      (c) =>
        `<button class="chip" type="button" data-filter="${esc(c.id)}" aria-pressed="false">${esc(c.name)}</button>`
    )
    .join("");

  const items = all
    .map(
      (i) => `<div class="ts-entry" data-model="${esc(i.modelId)}" data-text="${esc(
        (i.symptom + " " + i.cause + " " + i.fix).toLowerCase()
      )}">
${issueItem(i, i.model)}
</div>`
    )
    .join("\n");

  const body = `<div class="wrap narrow">
  <div class="page-head">
    <p class="eyebrow">Troubleshooting</p>
    <h1>Troubleshooting index</h1>
    <p class="lede">
      Every documented problem and fix across all covered controllers, in one searchable list. Each entry cites
      the source of its fix so you can check the original instructions.
    </p>
  </div>

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

  <h2 id="drift">Before you assume the sticks have failed</h2>
  <p class="section-intro">
    Most reported drift on these controllers is not sensor failure. Work through this order before contacting
    support, because the later steps mask the symptom rather than fix it.
  </p>

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

  <h2 id="audio">If your 3.5 mm headset stopped working</h2>
  <p class="section-intro">
    Check your polling rate before troubleshooting the headset. On the G7 and G7 SE, and on the G7 HE, selecting
    a report rate above 250&nbsp;Hz disables the controller's onboard audio entirely &mdash; no game sound and no
    microphone. This is by design rather than a fault, and GameSir support advises locking the rate to 250&nbsp;Hz
    if you use a headset through the controller.
  </p>
  <p class="section-intro">
    It is an easy trap to fall into, because raising the polling rate is one of the first things people do after
    installing the app, and the audio failure shows up later with no obvious connection to it.
  </p>

  <h2 id="all">All documented issues</h2>

  <div class="filter-bar">
    <input class="search-input" id="ts-search" type="search" placeholder="Search symptoms, causes and fixes&hellip;" aria-label="Search troubleshooting entries">
    <span class="result-count" id="ts-count"></span>
  </div>
  <div class="chip-row" id="ts-chips">
    <button class="chip" type="button" data-filter="all" aria-pressed="true">All models</button>
    ${chips}
  </div>

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
    bodyEnd: `<script src="assets/js/filter.js" defer></script>`,
  });
}

function pageFaq(data) {
  const cs = data.controllers;

  const all = cs.flatMap((c) => (c.faq ?? []).map((f) => ({ ...f, model: c.name, modelId: c.id })));

  const chips = cs
    .map(
      (c) =>
        `<button class="chip" type="button" data-filter="${esc(c.id)}" aria-pressed="false">${esc(c.name)}</button>`
    )
    .join("");

  const items = all
    .map(
      (f) => `<div class="ts-entry" data-model="${esc(f.modelId)}" data-text="${esc(
        (f.q + " " + f.a).toLowerCase()
      )}">
${faqItem(f, f.model)}
</div>`
    )
    .join("\n");

  const body = `<div class="wrap narrow">
  <div class="page-head">
    <p class="eyebrow">FAQ</p>
    <h1>Frequently asked questions</h1>
    <p class="lede">
      Questions collected from GameSir's official FAQ pages and manuals, grouped across every covered model and
      searchable in one place. Each answer links to its source.
    </p>
  </div>

  <div class="filter-bar">
    <input class="search-input" id="ts-search" type="search" placeholder="Search questions and answers&hellip;" aria-label="Search FAQ entries">
    <span class="result-count" id="ts-count"></span>
  </div>
  <div class="chip-row" id="ts-chips">
    <button class="chip" type="button" data-filter="all" aria-pressed="true">All models</button>
    ${chips}
  </div>

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
    bodyEnd: `<script src="assets/js/filter.js" defer></script>`,
  });
}

function pageAbout(data) {
  const notes = (data.meta?.sourceNotes ?? []).map((n) => `<li>${esc(n)}</li>`).join("\n");

  const body = `<div class="wrap narrow">
  <div class="page-head">
    <p class="eyebrow">About</p>
    <h1>About this reference</h1>
    <p class="lede">What this site is, where its numbers come from, and how to correct them.</p>
  </div>

  <h2>What this is</h2>
  <p>
    An unofficial, community-maintained reference for GameSir controllers. It exists because the useful
    information is scattered across product pages, per-edition manuals, separate FAQ documents, independent
    measurement sites and forum threads &mdash; and because the same handful of questions get asked repeatedly.
  </p>
  <p>
    This site is not affiliated with, endorsed by, or operated by GameSir.
  </p>

  <h2>Where the numbers come from</h2>
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

  <h2>How gaps are handled</h2>
  <p>
    Where a value could not be verified against a source, it is left blank and marked
    &ldquo;not documented&rdquo; rather than filled with a plausible estimate. A visible gap is more useful than a
    confident guess, because a guess in a troubleshooting guide costs someone real time.
  </p>
  ${notes ? `<ul>\n${notes}\n</ul>` : ""}

  <h2>Corrections</h2>
  <p>
    Corrections are welcome and wanted, especially from people who own the hardware. Open an issue or a pull
    request with a source, or with a description of what your own unit does and how you tested it. First-hand
    measurements are valuable precisely because this site has none &mdash; they will be credited and labelled as
    such.
  </p>

  <p class="small text-dim">Data last reviewed ${esc(data.meta?.updated ?? "")}.</p>
</div>`;

  return layout({
    title: `About — ${SITE_NAME}`,
    description: "How this GameSir reference is sourced, what it does not claim, and how to submit corrections.",
    current: "about.html",
    body,
  });
}

/* ----------------------------------------------------------------- build -- */

const FILTER_JS = `/* Client-side search and model filtering for the troubleshooting and FAQ pages. */
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
`;

async function build() {
  const data = JSON.parse(await readFile(path.join(ROOT, "data", "controllers.json"), "utf8"));

  // Fail loudly on duplicate ids rather than silently overwriting a page.
  const ids = data.controllers.map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`Duplicate controller ids: ${[...new Set(dupes)].join(", ")}`);

  data.controllers.sort((a, b) => a.name.localeCompare(b.name));

  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(path.join(OUT, "controllers"), { recursive: true });
  await mkdir(path.join(OUT, "assets", "js"), { recursive: true });

  await cp(path.join(ROOT, "src", "assets", "css"), path.join(OUT, "assets", "css"), {
    recursive: true,
  });
  await writeFile(path.join(OUT, "assets", "js", "filter.js"), FILTER_JS);

  // Tells GitHub Pages to serve the directory as-is instead of running Jekyll.
  await writeFile(path.join(OUT, ".nojekyll"), "");

  await writeFile(path.join(OUT, "index.html"), pageIndex(data));
  await writeFile(path.join(OUT, "compare.html"), pageCompare(data));
  await writeFile(path.join(OUT, "troubleshooting.html"), pageTroubleshooting(data));
  await writeFile(path.join(OUT, "faq.html"), pageFaq(data));
  await writeFile(path.join(OUT, "about.html"), pageAbout(data));

  for (const c of data.controllers) {
    await writeFile(path.join(OUT, "controllers", `${c.id}.html`), pageController(c, data));
  }

  const issues = data.controllers.reduce((n, c) => n + (c.knownIssues?.length ?? 0), 0);
  const faqs = data.controllers.reduce((n, c) => n + (c.faq?.length ?? 0), 0);

  console.log(
    `Built ${data.controllers.length + 5} pages -> docs/\n` +
      `  ${data.controllers.length} controllers, ${issues} documented issues, ${faqs} FAQ entries`
  );
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
