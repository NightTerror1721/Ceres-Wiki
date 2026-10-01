# Ceres Wiki

An interactive, **bilingual** tutorial and wiki (English and Spanish; English is the default
language) for the **Ceres** virtual machine (CeresASM + Ceres-C + Ceres STDLIB). It goes from
`Hello, world` to complete retro games (Pong, Arkanoid, Connect Four, Sokoban and a 2D RPG
adventure), through **every** module of the library, plus guides to **build the pieces** and to
use **their command lines** in detail.

## Running

It has no dependencies: it only needs **Node.js 18 or newer**.

```shell
> node server.js
> # or:
> npm start
```

Open <http://localhost:4300>. Change the port with `PORT`:

```shell
> set PORT=8080 && node server.js
```

## Languages

- **English is the primary and default language**: `/en/wiki/<slug>`. `/` redirects to `/en/...`
  (or `/es/...` if the browser prefers Spanish). Spanish, for those who pick it, is at
  `/es/wiki/<slug>`.
- An **EN/ES** switch in the top bar (it keeps the current page).
- The navigation, the interface (search, progress, buttons) and **all the content** are in both
  languages. 64 pages per language.
- If a page is not translated, the English one is served with a note; today everything is
  translated.

## What it includes

- Its own **HTTP server** (`server.js`) that renders the wiki on the server.
- A dependency-free **Markdown and MDX** renderer (`lib/markdown.js`).
- Syntax highlighting for C, CASM, JSON, INI and the console (`lib/highlight.js`).
- Internationalization (`lib/i18n.js`) and per-locale content (`content/en`, `content/es`).
- A front end with **search** (per language), **light/dark theme**, **reading progress**, a side
  index, tabs, quizzes and code copy (`public/`).
- **Playable canvas demos** of the five games (`public/demos.js`).
- 128 pages in total: 64 in English and 64 in Spanish, in 14 sections.

## Structure

```
Ceres Wiki/
├─ server.js              HTTP server (no dependencies)
├─ package.json
├─ lib/
│  ├─ content.js          Navigation, pages and search per language
│  ├─ markdown.js         Markdown + MDX renderer
│  ├─ highlight.js        Syntax highlighting
│  ├─ i18n.js             Languages and UI strings
│  └─ layout.js           Shared HTML template
├─ public/
│  ├─ style.css           Wiki theme
│  ├─ app.js              Router, search, progress, components, language
│  ├─ demos.js            Canvas games
│  └─ favicon.svg
├─ content/
│  ├─ en/                 English content (_nav.json + *.mdx)
│  └─ es/                 Spanish content (_nav.json + *.mdx)
└─ tools/
   ├─ build.js            Static export to dist/ (per language)
   ├─ lint.mjs            Content lint (v1 terms, es/en parity, links)
   └─ selfcheck.js        Checks that every page renders
```

## Sections

1. **Getting started** — what Ceres is, installing, hello world, anatomy of a program
2. **Building Ceres** — the virtual machine, the compiler, the library and the toolchain
3. **The Ceres-C language** — types, control flow, functions, 64-bit, preprocessor, attributes
4. **Console and text** · 5. **Standard libraries** · 6. **Graphics** · 7. **Sound, TUI and input**
8. **Storage** · 9. **Data and resources** · 10. **System** · 11. **Data structures**
12. **Complete games** · 13. **Command line** (ceres, ceresc, debugger) · 14. **Reference**

## Adding a page

1. Create `content/<locale>/my-page.mdx` (in both `en/` and `es/`).
2. Add it to `content/<locale>/_nav.json` in the section you want.

Pages listed in `_nav.json` that do not have a file yet **do not appear** (no broken links):
you can plan and write them little by little.

## MDX components

Inside an `.mdx` (or `.md`) you can use, besides normal Markdown:

```mdx
<Callout type="tip" title="Title">**Markdown** text.</Callout>

<Steps>
  <Step title="First">...</Step>
  <Step title="Then">...</Step>
</Steps>

<Tabs>
  <Tab label="Option A">...</Tab>
  <Tab label="Option B">...</Tab>
</Tabs>

<Cards>
  <Card title="Link" icon="🚀" href="/wiki/start">Description.</Card>
</Cards>

<GameDemo kind="pong" title="Pong">Move with W/S.</GameDemo>

<Quiz question="¿…?" options="a|b|c" answer="1" explain="Because…"></Quiz>

<Output title="Output">plain text</Output>
```

`GameDemo` values: `pong`, `arkanoid`, `connect4`, `sokoban`, `rpg`.

## Static export

```shell
> node tools/build.js      # writes dist/en/... and dist/es/... as plain HTML
```

## Verifying the content

```shell
> node tools/selfcheck.js  # renders every page (both languages) and looks for problems
> node tools/lint.mjs      # content lint only (v1 terms, es/en parity, links)
```

## Maintenance

The update plan and its diagnosis are in [MODERNIZATION-PLAN.md](MODERNIZATION-PLAN.md).

**Source of truth.** The wiki does **not** define behaviour: it summarizes and links. Before
touching a page, check it against:

| Topic | Source |
| --- | --- |
| Machine, memory, ISA, IRQ, `ceres` | `../CeresASM/docs/*.md` and `ceres --help` |
| Language and `ceresc` | `../Ceres-C/docs/*.md` and `ceresc --help` |
| Library headers and API | `../Ceres Projects/Ceres STDLIB/include/**` and `docs/reference/` |
| Package and installation | `../CeresBinaries/README.md` |
| Phase status | `../CeresASM/plan/v2/STATUS.md` |

**House style:** a line that mentions something from the v1 machine (e.g. `--soft-double`) must
carry the marker `lint:v1` so the lint allows it (only the migration guide should need it).

Versions and commits the wiki was verified against: [tools/versions.json](tools/versions.json).

**CI.** On every push, `.github/workflows/ci.yml` runs `selfcheck` (render + lint) and `build`.
The `dist/` directory is generated and **not** versioned.

## How it maps to Ceres

- The example code is **real Ceres-C** against the `Ceres STDLIB` API.
- The console snippets use `ceresc` and `ceres`.
- The build guides and the command-line pages describe the three real repositories.
- The wiki demos are **JavaScript versions** of the same games, so you can play them without
  compiling; the full Ceres code is in each page.
