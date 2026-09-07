# GameSir Wiki

An unofficial, community-maintained reference for GameSir controllers: specifications,
documented problems and their fixes, and frequently asked questions, with a source behind
every figure.

Not affiliated with, endorsed by, or operated by GameSir.

## What makes this different

Most controller pages either reprint marketing copy or guess. Two rules keep this one
honest:

1. **Every specification cites a source.** Official manuals and FAQ pages first, then
   independent measurements from [gamepadla.com](https://gamepadla.com), then published
   reviews. Community threads are used for problem reports only, never for specs.
2. **Gaps stay visible.** A value nobody has published renders as "not documented" instead
   of a plausible-looking estimate. A wrong number in a troubleshooting guide costs
   somebody an afternoon.

Manufacturer claims are labelled as claims. Nothing here is first-hand testing unless a
figure says so.

Nothing is sold, sponsored or affiliate-linked. Launch prices are recorded as dated
historical facts, since price is part of how these models line up against each other.

## Structure

```
data/controllers.json    Single source of truth — all content lives here
build.mjs                Zero-dependency generator (templates and client JS live inline)
src/schema.mjs           The shape a controller record may take, and the checker for it
src/diagrams.mjs         SVG line art: controller views, component close-ups, icons
src/og-image.html        Source artwork for the social preview image
src/assets/              Stylesheet, favicon and og-image.png, copied verbatim into docs/assets/
docs/                    Generated output (this is what GitHub Pages serves)
docs/assets/gamesir/     Diagrams also written out as standalone SVG files
docs/sitemap.xml         Generated from the same page list the build writes
docs/404.html            Served for any unknown path
```

Everything in `docs/` is generated. Never edit it by hand; edit the JSON and rebuild.

## Design

One stylesheet, `src/assets/css/style.css`, with no build step and no framework. Every
colour, size and radius is a custom property declared at the top, so the dark and light
themes are override blocks rather than parallel rulesets. The theme follows the operating
system by default and remembers an explicit choice in `localStorage`.

Typography is a system-font stack, which renders on first paint and needs no network
request. There is no product photography anywhere: the hero is a masked grid and a
brand-tinted glow, controller cards pair a typographic panel with the model's own outline,
and hardware is documented with the schematics described below.

Scripting is progressive enhancement only. With JavaScript off, every page is still a
complete document — panels do not collapse, and the filters just sit there.

## Tone

A reference about consumer hardware drifts towards looking like a shop, because it borrows
its conventions from the same places. The layout pushes back on that deliberately:

- **No page has a call-to-action button.** The largest type anywhere is a page title, so
  the home page cannot outrank the articles.
- **The home page is a masthead, not a hero.** Left-aligned, with the open-contribution
  notice where the primary and secondary buttons would sit.
- **Card corners show citation counts, not prices.** A bold price in the corner of a tile
  is the strongest storefront cue on a page, and how well sourced an article is happens to
  be the more useful number.
- **Counts are stated, not celebrated.** The home page figures live in a labelled "state of
  the wiki" box rather than a strip of oversized numerals.
- **Every page ends with an edit link.** The footer names the file — and on a controller
  page, the line — the content came from.

That last one is enforced in code: `readSourceLines()` in `build.mjs` resolves line numbers
out of the raw files at build time, so an anchor cannot go stale and send a contributor to
the wrong record.

## Diagrams

`src/diagrams.mjs` draws every illustration from SVG primitives: front, back and top-edge
views of each controller, close-ups of each component, and the small icons beside spec rows
and table headers. Nothing is traced from a photograph or a render.

Which controls a model's diagram shows comes from that model's record in
`data/controllers.json`, so a diagram cannot claim hardware the spec table does not, and so
does what several of them look like: a fenced D-pad gets its ring, a membrane pad is one
moulded piece where a micro-switch pad is four keys, and a record that says the switch type
is not documented gets the neutral shape rather than the one that sentence mentions. Each
control carries its own name and description, which is what the readout beside the diagram
shows on hover or focus. A small `LAYOUT` table in the module holds the few placement facts
the JSON has no field for — which family the shell belongs to, what the centre buttons are
called, whether the face caps are printed — and a model missing from it falls back to the
Xbox-style layout.

The shell itself is built rather than drawn: one outline per family, held in fractions of
the shell's own width and height, sized from the `dimensionsMm` in the model's record. So
the T7 Pro's 145 × 93 mm shell is visibly the smallest in the range and the Tarantula Pro's
158 × 100 mm the largest, and every control is placed against that shell rather than at a
fixed coordinate. The contour is not a per-model claim — nobody publishes a shell profile —
and the note under each figure says which part of it is measured and which is schematic.

Because placement is arithmetic, the build checks it: every control has to sit on the shell,
parts that belong to an edge have to be on one, and no two controls may be drawn on top of
each other. A slip in the arithmetic fails the build instead of shipping something that
looks deliberate.

Diagrams are inlined into the HTML so they inherit the page's custom properties and switch
theme with it, and they are hoverable, focusable and keyboard-reachable. The same drawings
are written to `docs/assets/gamesir/` as standalone SVG files carrying their own palette,
for use outside the site. Both come from one call, so they cannot disagree.

## Building

Requires Node 20.11 or newer. No dependencies to install.

```sh
node build.mjs
```

This regenerates `docs/` from scratch. To preview, open `docs/index.html` directly in a
browser — the site uses no `fetch()`, so it works over `file://` without a local server.
`node serve.mjs` is there if you want a real server, and it answers unknown paths with
`404.html` the way GitHub Pages does.

## Validation

The build checks `data/controllers.json` against `src/schema.mjs` before it renders
anything, and refuses to write a site that would misreport itself. It reports every problem
at once rather than stopping at the first:

```
data/controllers.json is not valid (2 problems):
  g7-he.sticks.measuredCentreError   unknown field — did you mean "measuredCenterError"?
  t7-pro.tier                        "midrange" is not one of: mid-range, high-end, flagship
```

Unknown fields are errors rather than warnings, which is the whole point. A misspelled key
stops being read, so the page prints "not documented" for a value that *is* documented — and
without this check the build would report success while quietly publishing the gap. Adding a
field to the data therefore means adding it to the schema too.

Booleans are the one thing that may never be null. A null would render as a confident "No",
so an unknown yes/no has to be resolved before it can be published.

## Adding a controller

Append an object to the `controllers` array in `data/controllers.json` and rebuild. Pages,
badges, comparison columns, and the troubleshooting and FAQ indexes are all derived from the
data, so no template changes are needed.

Field conventions:

- Use `null` for anything you cannot verify. Do not guess.
- Put manufacturer figures in `claimed*` fields and independent measurements in `measured*`
  fields, so the two never get confused.
- Every `knownIssues` and `faq` entry must carry a `sourceUrl`, and every controller needs
  at least one entry in `sources`.
- `id` must be unique and URL-safe; it becomes the page filename.
- `dimensionsMm` repeats the millimetre figures from `dimensions` in a form the diagrams can
  size a shell from. Leave it out when nobody has published dimensions; do not estimate it.
- Adding a genuinely new field means declaring it in `src/schema.mjs`.

The build enforces what it can: at least one source per controller and per issue, unique
ids, no unknown fields, no null booleans, and a `dimensionsMm` that agrees with the prose it
copies. The two conventions above it are on the writer.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` runs `node build.mjs` on every push to `main` and publishes
the resulting `docs/` to Pages, so the live site is built from `data/controllers.json`
rather than from whatever output happened to be committed. The workflow enables Pages
itself on its first run; no repository setting needs touching.

Generated output stays committed anyway, because opening `docs/index.html` over `file://`
is the fastest way to preview a change. If a commit forgets to rebuild, the live site is
still correct — only the local preview goes stale.

Canonical URLs, the Open Graph tags and `sitemap.xml` are absolute, so they are built from
the `SITE_URL` constant at the top of `build.mjs`. Everything in the page chrome stays
relative, which is what keeps `file://` working. Moving the site to another address means
changing that one constant and rebuilding.

Two caveats worth knowing. `robots.txt` is only read from the root of a host, so at
`jkharrat.github.io/gamesir-wiki/` it is advisory rather than effective — the sitemap has to
be submitted to Google Search Console directly, and it starts working on its own if the site
ever moves to a domain of its own. And `docs/assets/og-image.png` is the one asset not drawn
at build time, because no chat client will render an SVG social preview; regenerate it from
`src/og-image.html` when the wording changes.

## Contributing

Corrections are welcome, especially from people who own the hardware. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full walkthrough. The short version:

- Fixing a spec: include the source URL.
- Reporting a problem or fix: include the exact button combinations and what you saw.
- First-hand measurements are particularly valuable, since this reference has none. They
  are credited and labelled as first-hand rather than compiled.

Every page carries an "Edit this page on GitHub" link at the foot that opens the file it was
generated from, so the shortest path to a fix does not involve cloning anything.

## Licence

Two licences, because the repository is two things:

- **Content** — `data/controllers.json`, the page prose and the generated pages under
  `docs/` — is [CC BY-SA 4.0](LICENSE-CONTENT). Credit "GameSir Wiki contributors" with a
  link back, and share adaptations under the same terms.
- **Software** — `build.mjs` as a program, `src/diagrams.mjs` and the SVGs it draws,
  `src/assets/` and `serve.mjs` — is [MIT](LICENSE).

`build.mjs` falls under both, deliberately: the code is MIT and the sentences that code
prints are CC BY-SA. [LICENSE](LICENSE) spells out the split file by file.

Neither licence grants trademark rights. GameSir product names and trademarks belong to
their owner, and this project is not affiliated with them. No GameSir photography or
copyrighted marketing asset is reproduced here; the site links to official pages instead,
and cited sources remain the property of their publishers.
