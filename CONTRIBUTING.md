# Contributing

This is a wiki. Nobody owns it, there is no review board to convince, and you do not need
to be asked. If something here is wrong, incomplete, or missing a controller you own, the
fix is yours to make.

## The one rule

**A change that adds or alters a figure needs a source.** That is the whole editorial
policy. A source can be:

- an official GameSir product page, manual or FAQ document
- an independent measurement that publishes its methodology, such as
  [gamepadla.com](https://gamepadla.com)
- a published review from an established outlet
- your own unit, if you say what you did and what you observed

The last one counts. First-hand reports are the most valuable contributions this site can
receive, precisely because it has none of its own — they get credited and labelled as
first-hand rather than folded in with compiled figures.

The only kind of change that gets turned away is a number with no way to check it. Filling
a gap with a plausible-looking guess is the exact failure this site exists to avoid, so a
blank is always preferred to an estimate.

## Three ways in

### 1. Report it and let someone else write it

[Open an issue](../../issues/new). Say what is wrong or what is missing and link a source
if you have one. You do not need to know how the site is built, and a rough note is far
more useful than nothing.

### 2. Edit a page in the browser

Every page on the site has an **Edit this page on GitHub** link at the bottom. It opens
the exact file the page was generated from — on a controller page, scrolled to that
model's own record. GitHub forks the repository and opens a pull request for you. Nothing
gets installed and nothing can be broken irreversibly.

Note that editing the data this way will leave the generated `docs/` out of date until
someone rebuilds. That is fine; say so in the pull request and it will be handled.

### 3. Edit the data and rebuild

Requires Node 20.11 or newer. There are no dependencies to install.

```sh
git clone https://github.com/jkharrat/gamesir-wiki
cd gamesir-wiki
# edit data/controllers.json
node build.mjs
```

`node build.mjs` regenerates `docs/` from scratch. Commit the regenerated output alongside
your data change — the build output is committed to the repository because GitHub Pages
serves `docs/` directly, with no CI step in between.

To preview, open `docs/index.html` in a browser. The site uses no `fetch()`, so it works
over `file://`; `node serve.mjs` is there if you would rather have a local server.

## Where things live

```
data/controllers.json    Single source of truth — nearly every contribution belongs here
build.mjs                Zero-dependency generator (layout, page prose and client JS inline)
src/diagrams.mjs         SVG line art
src/assets/css/style.css The only stylesheet
docs/                    Generated output — never edit by hand
```

If you are changing a specification, a documented fix, a FAQ answer or a source, you want
`data/controllers.json` and nothing else. Page wording and layout live in `build.mjs`.

## Adding a controller

Append an object to the `controllers` array in `data/controllers.json` and rebuild. Its
page, badges, comparison column, diagrams, and troubleshooting and FAQ entries are all
derived from that record, so no template changes are needed.

Field conventions:

- Use `null` for anything you cannot verify. Do not guess.
- Put manufacturer figures in `claimed*` fields and independent measurements in `measured*`
  fields, so the two never get confused.
- Every `knownIssues` and `faq` entry should carry a `sourceUrl`.
- `id` must be unique and URL-safe; it becomes the page filename. The build fails on
  duplicates.

A partly filled record is welcome. Visible gaps are the design, so an article with four
sourced fields and twenty blanks is a real contribution, not a half-finished one.

## Writing style

Two things worth matching, because they are what makes the site worth reading:

- **Attribute claims.** "GameSir claims 25 hours" and "gamepadla measured 3.1% center
  error" are both fine. "Battery life is excellent" is not.
- **Say what a reader should do.** Troubleshooting entries carry exact button combinations
  and what the indicator does, because someone is reading them with the controller in their
  hands.

Nothing here is a sales pitch. The site deliberately has no call-to-action buttons and no
prices in card corners; if a change reads like marketing copy, it will get reworded rather
than rejected.

## Licensing your contribution

Opening a pull request means offering it under the licence that already covers the part of
the repository you touched — [CC BY-SA 4.0](LICENSE-CONTENT) for content, [MIT](LICENSE)
for code. There is no separate agreement to sign. This is what keeps the wiki freely
redistributable by anyone, which is the whole reason for compiling it in one place.

Two things that cannot be accepted, because they would make the content unshareable:

- **Copy-pasted prose from a source.** Cite it, summarise it, link it — do not paste it.
  Specifications and figures are facts and are fine to record; a reviewer's paragraph is
  theirs.
- **Product photography or marketing renders.** The site has none by design. Diagrams are
  drawn from primitives in `src/diagrams.mjs`, so a new controller gets its illustration
  from its own data record rather than from an image.
