# Contributing

This is a wiki. Nobody owns it, there is no review board to convince, and you do not need to
be asked. If something here is wrong, incomplete, or missing a controller you own, the fix
is yours to make.

## The one rule

**A change that adds or alters a figure needs a source.** That is the whole editorial
policy. A source can be:

- an official GameSir product page, manual or FAQ document
- an independent measurement that publishes its methodology, such as
  [gamepadla.com](https://gamepadla.com)
- a published review from an established outlet
- your own unit, if you say what you did and what you saw

The last one counts. First-hand reports are the most valuable thing this site can get,
since it has none of its own, and they are credited and labelled as first-hand rather than
folded in with compiled figures.

The only changes turned away are numbers with no way to check them. A blank always beats an
estimate.

## Three ways in

### 1. Report it and let someone else write it

[Open an issue](../../issues/new). Say what is wrong or what is missing, and link a source
if you have one. You do not need to know how the site is built, and a rough note beats
nothing.

### 2. Edit a page in the browser

Every page has an **Edit this page on GitHub** link at the bottom. It opens the exact file
the page was generated from, scrolled to that model's own record on a controller page.
GitHub forks the repository and opens a pull request for you. Nothing to install, nothing
you can break.

Editing the data this way leaves the generated `docs/` out of date until someone rebuilds.
That is fine — say so in the pull request and it will be handled.

### 3. Edit the data and rebuild

Requires Node 20.11 or newer. No dependencies to install.

```sh
git clone https://github.com/jkharrat/gamesir-wiki
cd gamesir-wiki
# edit data/controllers.json
node build.mjs
```

`node build.mjs` regenerates `docs/` from scratch. Commit the regenerated output alongside
your data change so the checked-in pages match the data. The published site does not depend
on your remembering to: it is rebuilt from the JSON on every push to `main`.

To preview, open `docs/index.html` in a browser. The site uses no `fetch()`, so it works
over `file://`. `node serve.mjs` is there if you would rather have a local server.

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
page, badges, comparison column, diagrams, and troubleshooting and FAQ entries all come from
that record, so no template changes are needed.

Field conventions:

- Use `null` for anything you cannot verify. Do not guess.
- Put manufacturer figures in `claimed*` fields and independent measurements in `measured*`
  fields, so the two never get confused.
- Every `knownIssues` and `faq` entry should carry a `sourceUrl`.
- `id` must be unique and URL-safe; it becomes the page filename. The build fails on
  duplicates.

A partly filled record is welcome. Visible gaps are the design, so an article with four
sourced fields and twenty blanks is a real contribution.

## Writing style

Two things worth matching:

- **Attribute claims.** "GameSir claims 25 hours" and "gamepadla measured 3.1% center
  error" are both fine. "Battery life is excellent" is not.
- **Say what a reader should do.** Troubleshooting entries carry exact button combinations
  and what the indicator does, because someone is reading them with the controller in their
  hands.

Nothing here is a sales pitch. The site has no call-to-action buttons and no prices in card
corners. If a change reads like marketing copy it gets reworded rather than rejected.

## Licensing your contribution

Opening a pull request offers your work under the licence that already covers the part of
the repository you touched — [CC BY-SA 4.0](LICENSE-CONTENT) for content,
[MIT](LICENSE) for code. There is no separate agreement to sign. This is what keeps the wiki
freely redistributable, which was the point of compiling it in one place.

Two things that cannot be accepted, because they would make the content unshareable:

- **Copy-pasted prose from a source.** Cite it, summarise it, link it — do not paste it.
  Specifications and figures are facts and are fine to record; a reviewer's paragraph is
  theirs.
- **Product photography or marketing renders.** The site has none by design. Diagrams are
  drawn from primitives in `src/diagrams.mjs`, so a new controller gets its illustration
  from its own data record rather than from an image.
