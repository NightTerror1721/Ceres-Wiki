# Ceres Wiki modernization plan

This document is the work plan to update and complete the wiki
(`D:\Projects\Ceres Projects\Ceres Wiki`) and align it with the real state of the four
repositories (CeresASM, Ceres-C, Ceres STDLIB and CeresBinaries) and with the v2 machine.

> **Language policy:** the wiki's *content* is bilingual (English primary + Spanish); the repo's
> *documentation* (this plan, the README, the tooling comments) is in **English**.

---

## 1. Diagnosis

### 1.1 What exists today

- A dependency-free bilingual (en/es) MDX site: `server.js` (own SSR), `lib/` (Markdown+MDX,
  highlight, i18n, layout), `public/` (router, search, themes, quiz, canvas demos), `tools/`
  (`build.js` exports to `dist/`, `selfcheck.js`, `lint.mjs`).
- **64 pages per language**, all translated, in 14 sections (~6 700 lines per language).
- Good, didactic content (Callout/Steps/Tabs/Cards/Quiz/GameDemo/Output), with Ceres-C and CASM
  snippets.

### 1.2 What is outdated (evidence)

The wiki mostly describes the **v1 machine**. Searches over `content/*/*.mdx` before W1:

| Obsolete term | Occurrences | Where | Real state (v2) |
| --- | ---: | --- | --- |
| `--soft-double` / `-fsoft-double` / `f64.h` | 25 | `lib-f64`, `lenguaje-64`, `cli-ceresc`, `instalacion`… | Removed (F6). `double` is **native** binary64; `-fshort-double` makes `double = float` |
| `--terminal` / `-Terminal` | 15 | `cli-ceres`, `instalacion`, `build-toolchain`… | Removed. Now `--headless` (or `CERES_HEADLESS=1`) |
| `textfb.h` | 7 | `gfx-texto`, `ref-apendice`… | Renamed to `ceres/text.h` |
| `display.h` | 4 | `gfx-display`, `ref-apendice` | Renamed to `ceres/fb.h` |

And in substance:

- **`ref-apendice` was entirely v1**: device map at `0xFF03/04/05…0xFF0C` (v2 uses grouped slots:
  `0x00` terminal, `0x01` timer, `0x02` dma, `0x03` debug log, `0x10` keyboard, `0x20` audio,
  `0x30` disk, `0x40` GPU, `0xFF` control — SPEC §5.5), `mmio_r8/16/32`, old terminal/timer
  registers and a **wrong interrupt table** (e.g. Terminal=17, DMA=18; in v2 Terminal=19,
  Timer=16, VBlank=32…).
- **`inicio`**: "183 instructions" and "C89 + `long long` + partial C11/C23" (v1); the v2 ISA adds
  44 64-bit opcodes over register pairs.
- **`instalacion` / `build-toolchain`**: claimed the scripts look for `../../Ceres-C` and
  `../../CeresASM` "automatically" (v2 does **not** look next to the checkout: `CERESC`/`CERES`/
  `CERES_PATH`/`PATH`); optional modules "`irq` and `fault`" (there are **three**: `irq`, `fault`,
  `mmu`); used `-Terminal`; **no mention of CeresBinaries**.
- **`cli-ceres`**: used `--memory` (now `--ram`) and `--terminal`; and **missed almost all** the v2
  machine options: `--profile`, `--cpu-clock`, `--gpu-clock`, `--ram`, `--vram`, `--max-video`,
  `--max-audio`, `--max-resolution`, `--speed`, `--refresh`, `--rtc`, `--fullscreen`,
  `--exit-on-halt`, `--frames`, `--screen-log`, `--transcript`, `--type`, `--keys`, `--record`,
  `--replay`, `--log`, `--strict-mmio`, `--shell`, `--gpu`.
- **`cli-ceresc`**: used `-fsoft-double` (now `-fshort-double`) and `--sysroot` (now `--stdlib` +
  `--ceres-path` + `--decls`); missing `--stdlib`, `--gc-sections`, and the real `--stdlib` flow.
- **`lib-f64`**: the whole page was about `ceres/f64.h` and `--soft-double`, **removed**. Replaced
  by **`lib-float`** (native float/double).

### 1.3 What is missing (content and coverage)

- **CeresBinaries**: no guide to download it, build the whole package, or install the prebuilt
  packages (Windows `.exe`/`.zip`, Linux/macOS `.tar.gz`/`install.sh`), nor `install.cmd`/
  `install.sh`, `CERES_PATH`, `PATH`, uninstall, `build.ps1`/`build.sh` and
  `-Prebuilt`/`--no-sdl`/`-CeresAsm…`.
- **The v2 machine**: new memory map (RAM/VRAM/MMIO, 2 GiB), **profiles** (`micro…custom`),
  **clocks** (CPU/GPU/video/audio/RTC), **event scheduler and `halt`**, **shell** and program
  loading (`sys_run`, control command 3), **headless**/CI.
- **Video by level** (V0 terminal, V1 framebuffer, V2 retro 2D): dedicated pages for
  `ceres/video.h`, `ceres/text.h`, `ceres/fb.h`, `ceres/tiles.h`, `ceres/sprite.h` (GPU), and the
  planned retirement of the blitter.
- **`ceres/` modules without their own page** (exhaustive reference): `blockdev.h`, `sort.h`,
  `test.h`, `endian.h`, `atomic.h`, `dma.h`, `debug.h`, `config.h`, `keys.h`, `line.h`, `color.h`,
  `game.h`, `tui.h`, `save.h`, and in general **every** header deserves a reference entry.
- **Complete command line**: `ceres asm/link/ar/run/disasm/profile/debug` with **all** their
  options; `ceresc` with **all** of its; the debugger.
- **Tools** (`tools/`): `img2tiles`, `mkpack`, `gen_font`, `gen_tables`, `gendocs`, `runtests`,
  `example`.
- **Cross-cutting guides**: separate compilation, own libraries, testing/headless CI, debugging
  (backtrace/fault log), v1→v2 migration, glossary, FAQ.
- **Implementation status**: v2 is at F0–F8 (F9+ pending). The wiki must document what is
  **implemented** and mark the rest as "planned", never describe it as existing.

---

## 2. Goals and principles

1. **Accuracy**: every page is verified against the real code/help; nothing invented.
2. **Full coverage**: the whole package (CeresBinaries), the four pieces, **all** `ceres`/`ceresc`
   options, **all** the stdlib headers, tutorials and examples.
3. **Two audiences**: "I want to use it now" (install → hello world → game) and "I want to
   understand/build" (architecture, ISA, CLI, stdlib).
4. **Never fall behind again**: generate what can be generated (CLI, device table, opcodes, IRQ)
   and check the content in CI.
5. **Truly bilingual**: es/en parity enforced by the tooling, not by discipline. **English is the
   primary/default language**; Spanish is the optional translation.
6. **Honest scope**: mark `Planned (F9+)` what does not exist yet.

---

## 3. Sources of truth (per repository)

| Topic | Primary source |
| --- | --- |
| Machine, memory, ISA, IRQ, `ceres`, debugger, formats | `CeresASM/docs/01..36-*.md` + `ceres --help` |
| Ceres-C language, `ceresc`, diagnostics | `Ceres-C/docs/01..14-*.md` + `ceresc --help` |
| Library headers and behaviour | `Ceres STDLIB/include/**` + `docs/reference/**` (from `tools/gendocs.js`) + `README.md` |
| Package/installation | `CeresBinaries/README.md`, `package/*`, `build.ps1`/`build.sh` |
| Phase status | `CeresASM/plan/v2/STATUS.md` and `SPEC.md` |

Rule: **the wiki does not define behaviour**; it summarizes and links. Generated blocks are
produced by scripts, not by hand.

---

## 4. Target information architecture

Bold slugs are new or renamed. Keep `en`/`es` mirrored.

**0. Home** — `/inicio`

**1. Getting started**
`/que-es-ceres` · `/requisitos` · `/instalar-paquete` (**new**, CeresBinaries prebuilt) ·
`/construir-ceres` (**new**, `git clone --recursive` + `build.ps1`/`build.sh`) ·
`/compilar-fuentes` (the three pieces) · `/toolchain` (CERES_PATH/PATH) · `/hola-mundo` ·
`/anatomia` · `/primer-juego` (**new**)

**2. The machine (CeresASM)**
`/maquina-vision` · `/maquina-memoria` (v2) · `/maquina-isa32` · `/maquina-isa64` ·
`/maquina-registros-abi` · `/maquina-interrupciones` · `/maquina-relojes-perfiles` ·
`/maquina-planificador` · `/maquina-bus-dispositivos` · `/maquina-depurador` ·
`/maquina-formatos` · `/maquina-headless`

**3. The Ceres-C language**
`/lenguaje-tipos` · `/lenguaje-control` · `/lenguaje-funciones` · `/lenguaje-64` ·
`/lenguaje-preprocesador` · `/lenguaje-genericos` · `/lenguaje-interop-casm` (**new**) ·
`/lenguaje-diagnosticos` (**new**) · `/lenguaje-limitaciones` (**new**)

**4. Console and I/O**
`/consola-io` · `/consola-streams` · `/consola-terminal` (v2 virtual terminal) · `/consola-ansi` ·
`/consola-linea` · `/consola-getchar` (**new**)

**5. Standard library** (one page per header/family): `/std-*` …

**6. The `ceres/` API** (one page per header): `/api-*` and `/ds-*`.

**7. Command line**: `/cli-ceres` · `/cli-ceresc` · `/cli-debugger` · `/tools` (**new**)

**8. Guides**: `/guia-compilacion-separada` · `/guia-bibliotecas-propias` · `/guia-tests-ci` ·
`/guia-depuracion` · `/guia-migracion-v1-v2` (**new**) · `/juegos`

**9. Reference**: `/ref-cheatsheet` · `/ref-dispositivos` · `/ref-opcodes` · `/ref-interrupciones`
· `/ref-abi-registros` · `/ref-formatos` · `/ref-estado-implementacion` (**new**) · `/ref-glosario`
(**new**) · `/ref-faq` (**new**)

---

## 5. Tooling changes (modernization)

1. **Generators** (`tools/gen/`, new) writing MDX fragments from the real source:
   - `gen-cli.mjs`: runs `ceres --help` and `ceresc --help` and produces the `/cli-*` tables.
   - `gen-devices.mjs`: parses `include/ceres.h` + device headers + SPEC §5.5/§5.7 →
     `/ref-dispositivos`.
   - `gen-irq.mjs`: from `include/interrupts.h` → `/ref-interrupciones`.
   - `gen-opcodes.mjs`: from the ISA tables → `/ref-opcodes`.
   - `gen-stdlib-index.mjs`: from `include/**` and `docs/reference/` → the index and seed pages.
2. **Content lint** (`tools/lint.mjs`, in `selfcheck.js`): v1 blacklist, es/en parity, internal
   link checking, strict UTF-8.
3. **Code verification**: compile the pages' C snippets against the real stdlib in CI; assemble
   the `.casm` snippets.
4. **Search/index**: regenerate the per-language index; add synonyms (`--headless` ↔ `--terminal`).
5. **CI** (GitHub Actions): `selfcheck`, `build` and the lint.
6. **Versioning**: pin the repos' versions/commits in `tools/versions.json`; show a warning when
   the installed binary differs from the documented one.
7. **Stack**: keep the dependency-free server (it works and supports the MDX components and the
   demos); optionally evaluate Astro Starlight later (non-blocking).

---

## 6. Phases and tasks

Every task is bilingual, and each phase ends with a commit and a push.

### Phase W0 — Freeze sources and scaffolding — **DONE**
Git repo, `.gitignore` (`dist/`), `.gitattributes`, `tools/versions.json`, `tools/lint.mjs` wired
into `selfcheck.js`, and a CI workflow. English made the default language.

### Phase W1 — v1 → v2 sweep (corrections) — **DONE**
Removed the v1 terms (`--soft-double`/`f64.h`, `--terminal`, `textfb`, `display.h`, `--memory`,
`mmio_r8/16`, `read_port`/`write_port`); rewrote `ref-apendice` (v2 device map) and turned
`lib-f64` into `lib-float` (native float/double); fixed `lenguaje-64`, `lenguaje-tipos`,
`instalacion`, `consola-io`, `ref-cheatsheet`, `cli-ceresc`. Lint at 0. Repo documentation moved
to English. Acceptance: `node tools/lint.mjs` = OK.

### Phase W2 — Package and toolchain (CeresBinaries)
- Tasks: `/instalar-paquete`, `/construir-ceres`, update `/compilar-fuentes`, `/toolchain`,
  `/requisitos`; exact commands from `CeresBinaries/README.md`.
- Acceptance: a reader on Windows/Linux can install or build Ceres from the wiki alone.

### Phase W3 — The v2 machine
- Tasks: the "Machine" section (v2 memory, ISA32/64, IRQ, clocks/profiles, scheduler, bus,
  debugger, formats, headless); `ref-interrupciones`, `ref-opcodes`, `ref-abi-registros`,
  `ref-formatos`, `ref-estado-implementacion`; the shell/`sys_run` guide.
- Acceptance: `ref-dispositivos` and the IRQ/opcodes tables generated and verified against the code.

### Phase W4 — Complete stdlib reference
- Tasks: a reference page per standard header and per `ceres/*.h`; index with status
  (implemented/planned); v2 cheat sheet.
- Acceptance: **every** header under `include/` has an entry; `gen-stdlib-index` leaves no gaps.

### Phase W5 — CLI and tools
- Tasks: `/cli-ceres` and `/cli-ceresc` generated + explained with examples; `/cli-debugger`;
  `/tools`.
- Acceptance: every option of `ceres --help`/`ceresc --help` is documented with an example.

### Phase W6 — Guides, migration and FAQ
- Tasks: separate compilation, own libraries, tests/headless CI, debugging, v1→v2 migration,
  glossary, FAQ; review the games against the v2 APIs.
- Acceptance: complete "learn to use everything" tours; no broken links.

### Phase W7 — Close and publish
- Tasks: 100 % es/en parity; `selfcheck` + `build.js` green; style pass; publish `dist/`.
- Acceptance: `node tools/selfcheck.js` = OK; `node tools/build.js` builds en/es fully.

---

## 7. Global acceptance criteria

- Zero v1 terms in the lint.
- Every header under `include/**` and every `ceres`/`ceresc` subcommand/option documented.
- CeresBinaries guide (install package and build from source) verified step by step.
- English and Spanish with the same sitemap and structure; **English is the default**.
- CLI/device/IRQ/opcode tables **generated** and verified in CI.
- Ceres code blocks compiled/assembled in CI.
- v2 gaps (F9+) marked as "Planned", never described as existing.

## 8. Risks and open decisions

- **Risk**: v2 changes while documenting (F9 audio, F10 GPU 2D, blitter retirement). Mitigation:
  generated fields + `ref-estado-implementacion` + versioning.
- **Decision**: keep the dependency-free server or migrate to Astro Starlight. Initial
  recommendation: **keep** and harden with CI; re-evaluate in W1.
- **Decision**: stdlib reference granularity (one page per header vs per family). Proposal: one
  per header, grouped in the menu.
- **Effort**: ~35 new/rewritten pages per language (×2), plus generators and CI. Prioritize
  W1–W3 (what is wrong or missing today) before W4–W5 (exhaustiveness).

## 9. Verifying the plan

- `node tools/selfcheck.js` with no problems (includes the lint).
- `node tools/build.js` with no errors.
- Manual walkthroughs: install package → hello world → first game; and build from source →
  toolchain → CLI → stdlib.
