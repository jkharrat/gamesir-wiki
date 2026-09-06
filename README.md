# GameSir Wiki

An unofficial, community-maintained reference for GameSir controllers: specifications,
documented problems and their fixes, and frequently asked questions — with every figure
traceable to a source.

Not affiliated with, endorsed by, or operated by GameSir.

## What makes this different

Most controller pages either reprint marketing copy or guess. This one has two rules:

1. **Every specification cites a source.** Official manuals and FAQ pages first, then
   independent measurements from [gamepadla.com](https://gamepadla.com), then published
   reviews. Community threads are used only for problem reports, never for specs.
2. **Gaps stay visible.** If a value could not be verified, it renders as "not documented"
   instead of being filled with a plausible estimate. A wrong number in a troubleshooting
   guide costs someone real time.

Manufacturer claims are labelled as claims. Nothing here is first-hand testing unless a
figure explicitly says so.

## Structure

```
data/controllers.json    Single source of truth — all content lives here
build.mjs                Zero-dependency generator (templates and client JS live inline)
src/assets/               Stylesheet and favicon, copied verbatim into docs/assets/
docs/                    Generated output (this is what GitHub Pages serves)
```

Everything in `docs/` is generated. Never edit it by hand; edit the JSON and rebuild.

## Design

One stylesheet, `src/assets/css/style.css`, with no build step and no framework. Every
colour, size and radius is a custom property declared at the top, so the dark and light
themes are override blocks rather than parallel rulesets — nothing further down the file
hard-codes a surface or text colour. The theme follows the operating system by default and
remembers an explicit choice in `localStorage`.

Typography is a system-font stack, which renders on first paint and needs no network
request. There is no product photography anywhere: controller cards use a typographic
media panel generated from the model name, and the hero is built from a masked grid and a
brand-tinted glow.

Scripting is progressive enhancement only. With JavaScript off, every page stays a
complete, readable document — panels do not collapse, and the filters simply do not appear
to do anything.

## Building

Requires Node 20.11 or newer. No dependencies to install.

```sh
node build.mjs
```

This regenerates `docs/` from scratch. To preview, open `docs/index.html` directly in a
browser — the site uses no `fetch()`, so it works over `file://` without a local server.

## Adding a controller

Append an object to the `controllers` array in `data/controllers.json` and rebuild. Pages,
badges, comparison columns, and the troubleshooting and FAQ indexes are all derived from
the data, so no template changes are needed.

Field conventions:

- Use `null` for anything you cannot verify. Do not guess.
- Put manufacturer figures in `claimed*` fields and independent measurements in
  `measured*` fields, so the two never get confused.
- Every `knownIssues` and `faq` entry should carry a `sourceUrl`.
- `id` must be unique and URL-safe; it becomes the page filename. The build fails on
  duplicates.

## Deploying to GitHub Pages

Push the repository, then in **Settings → Pages** set the source to **Deploy from a
branch**, branch `main`, folder `/docs`. The build commits its output, so no CI is
required.

## Contributing

Corrections are welcome, especially from people who own the hardware.

- Fixing a spec: include the source URL.
- Reporting a problem or fix: include the exact button combinations and what you observed.
- First-hand measurements are particularly valuable, since this reference has none. They
  will be credited and labelled as first-hand rather than compiled.

## Licence

Content is offered for community reference. GameSir product names and trademarks belong to
their owner. No GameSir product photography or copyrighted marketing assets are reproduced
here; the site links to official pages instead.
