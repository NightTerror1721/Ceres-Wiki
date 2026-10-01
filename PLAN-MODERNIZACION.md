# Plan de modernización de la Ceres Wiki

Este documento es el plan de trabajo para actualizar y completar la wiki
(`D:\Projects\Ceres Projects\Ceres Wiki`) y alinearla con el estado real de los cuatro
repositorios (CeresASM, Ceres-C, Ceres STDLIB y CeresBinaries) y con la máquina v2.

---

## 1. Diagnóstico

### 1.1 Qué hay hoy

- Sitio MDX bilingüe (es/en) **sin dependencias**: `server.js` (SSR propio), `lib/` (Markdown+MDX,
  highlight, i18n, layout), `public/` (router, búsqueda, temas, quiz, demos en canvas), `tools/`
  (`build.js` exporta a `dist/`, `selfcheck.js`).
- **64 páginas por idioma**, todas traducidas, en 14 secciones. ≈6 700 líneas por idioma.
- Contenido de calidad y didáctico (Callout/Steps/Tabs/Cards/Quiz/GameDemo/Output), con fragmentos
  de C y CASM.

### 1.2 Qué está desactualizado (evidencia)

La wiki describe mayoritariamente la **máquina v1**. Búsquedas sobre `content/es/*.mdx`:

| Término obsoleto | Apariciones | Dónde | Estado real (v2) |
| --- | ---: | --- | --- |
| `--soft-double` / `-fsoft-double` / `f64.h` | 25 | `lib-f64`, `lenguaje-64`, `cli-ceresc`, `instalacion`… | Eliminados (F6). `double` es binary64 **nativo** (pares); `-fshort-double` hace `double = float` |
| `--terminal` / `-Terminal` | 15 | `cli-ceres`, `instalacion`, `build-toolchain`… | Eliminado. Ahora `--headless` (o `CERES_HEADLESS=1`) |
| `textfb.h` | 7 | `gfx-texto`, `ref-apendice`… | Renombrado a `ceres/text.h` |
| `display.h` | 4 | `gfx-display`, `ref-apendice` | Renombrado a `ceres/fb.h` |

Y por contenido:

- **`ref-apendice.mdx` es v1 entero**: mapa de dispositivos en `0xFF03/04/05…0xFF0C` (v2 usa slots por
  grupo: `0x00` terminal, `0x01` timer, `0x02` dma, `0x03` debug log, `0x10` teclado, `0x20` audio,
  `0x30` disco, `0x40` GPU, `0xFF` control — SPEC §5.5), `mmio_r8/16/32`, registros de terminal/timer
  y **tabla de interrupciones con números incorrectos** (p. ej. Terminal=17, DMA=18; en v2 Terminal=19,
  Timer=16, VBlank=32…).
- **`inicio.mdx`**: "183 instrucciones" y "C89 + `long long` + C11/C23 parcial" (v1); el ISA v2 añade
  44 opcodes de 64 bits sobre pares.
- **`instalacion.mdx` / `build-toolchain.mdx`**: dicen que los scripts buscan `../../Ceres-C` y
  `../../CeresASM` "automáticamente" (la v2 **no** busca junto al checkout: `CERESC`/`CERES`/
  `CERES_PATH`/`PATH`); módulos opcionales "`irq` y `fault`" (son **tres**: `irq`, `fault` y `mmu`);
  usan `-Terminal`; **no mencionan CeresBinaries**.
- **`cli-ceres.mdx`**: usa `--memory` (ahora `--ram`) y `--terminal`; y **faltan casi todas** las
  opciones de máquina de la v2: `--profile`, `--cpu-clock`, `--gpu-clock`, `--ram`, `--vram`,
  `--max-video`, `--max-audio`, `--max-resolution`, `--speed`, `--refresh`, `--rtc`, `--fullscreen`,
  `--exit-on-halt`, `--frames`, `--screen-log`, `--transcript`, `--type`, `--keys`, `--record`,
  `--replay`, `--log`, `--strict-mmio`, `--shell`, `--gpu`.
- **`cli-ceresc.mdx`**: usa `-fsoft-double` (hoy `-fshort-double`) y `--sysroot` (hoy `--stdlib` +
  `--ceres-path` + `--decls`); faltan `--stdlib`, `--gc-sections`, `--run-arg`, `--symlink`(si
  aplica) y el flujo real de `--stdlib`.
- **`lib-f64.mdx`**: toda la página trata de `ceres/f64.h` y `--soft-double`, **eliminados**. Debe
  desaparecer y convertirse en "Float y double nativos".
- **Autores/estructura**: `build-vm.mdx` lista módulos v1 (terminal, disco, framebuffer, display,
  blitter…) como "bibliotecas internas".

### 1.3 Qué falta (contenido y cobertura)

- **CeresBinaries**: no existe guía para descargarlo, construir el paquete completo o instalar los
  paquetes precompilados (Windows `.exe`/`.zip`, Linux/macOS `.tar.gz`/`install.sh`), ni
  `install.cmd`/`install.sh`, `CERES_PATH`, `PATH`, desinstalación, `build.ps1`/`build.sh` y modos
  `-Prebuilt`/`--no-sdl`/`-CeresAsm…`.
- **La máquina v2**: mapa de memoria nuevo (RAM/VRAM/MMIO, 2 GiB), **perfiles** (`micro…custom`),
  **relojes** (CPU/GPU/vídeo/audio/RTC), **planificador de eventos y `halt`**, **shell** y carga de
  programas (`sys_run`, comando 3 del control), **headless**/CI.
- **Vídeo por niveles** (V0 terminal, V1 framebuffer, V2 retro 2D): páginas dedicadas a `ceres/video.h`,
  `ceres/text.h`, `ceres/fb.h`, `ceres/tiles.h`, `ceres/sprite.h` (GPU), y la retirada prevista del
  blitter.
- **Módulos `ceres/` sin página propia** (referencia exhaustiva): `blockdev.h`, `sort.h`, `test.h`,
  `endian.h`, `atomic.h`, `dma.h`, `debug.h`, `config.h`, `keys.h`, `line.h`, `color.h`, `game.h`,
  `tui.h`, `save.h`, y en general **todas** las cabeceras merecen una entrada de referencia.
- **Línea de comandos completa**: `ceres asm/link/ar/run/disasm/profile/debug` con **todas** sus
  opciones; `ceresc` con **todas** las suyas; el depurador.
- **Herramientas** (`tools/`): `img2tiles`, `mkpack`, `gen_font`, `gen_tables`, `gendocs`,
  `runtests`, `example`.
- **Guías transversales**: compilación separada, bibliotecas propias, testing/CI headless,
  depuración (backtrace/registro de fallos), migración v1→v2, glosario, FAQ.
- **Estado de implementación**: la máquina v2 va por F0–F8 (F9+ pendiente). La wiki debe documentar lo
  **implementado** y marcar lo pendiente como "planificado", no describirlo como existente.

---

## 2. Objetivos y principios

1. **Exactitud**: cada página se verifica contra el código/ayuda real; nada de inventar.
2. **Cobertura total**: paquete completo (CeresBinaries), las cuatro piezas, **todas** las opciones de
   `ceres`/`ceresc`, **todas** las cabeceras de la stdlib, tutoriales y ejemplos.
3. **Dos audiencias**: "quiero usarlo ya" (instalar paquete → hola mundo → juego) y "quiero
   entender/construir" (arquitectura, ISA, CLI, stdlib).
4. **No volver a quedarse atrás**: generar automáticamente lo que pueda generarse (CLI, tabla de
   dispositivos, opcodes, IRQ) y comprobar el contenido en CI.
5. **Bilingüe de verdad**: paridad es/en garantizada por la herramienta, no por disciplina.
6. **Alcance honesto**: marcar `Planificado (F9+)` lo que aún no existe.

---

## 3. Fuentes de verdad (por repositorio)

| Tema | Fuente primaria |
| --- | --- |
| Máquina, memoria, ISA, IRQ, CLI `ceres`, depurador, formatos | `CeresASM/docs/01..36-*.md` + `ceres --help` |
| Lenguaje Ceres-C, CLI `ceresc`, diagnósticos | `Ceres-C/docs/01..14-*.md` + `ceresc --help` |
| Cabeceras y comportamiento de la stdlib | `Ceres STDLIB/include/**` + `docs/reference/**` (generado por `tools/gendocs.js`) + `README.md` |
| Paquete/instalación | `CeresBinaries/README.md`, `package/*`, `build.ps1`/`build.sh` |
| Estado de fases | `CeresASM/plan/v2/STATUS.md` y `SPEC.md` |

Regla: **la wiki no define comportamiento**; lo resume y enlaza. Los bloques generados se producen
con scripts, no a mano.

---

## 4. Nueva información (arquitectura de la wiki)

Estructura propuesta (los slugs en negrita son nuevos o renombrados). Mantener es/en espejados.

**0. Portada** — `/inicio`

**1. Empezar**
`/que-es-ceres` · `/requisitos` · `/instalar-paquete` (**nuevo**, CeresBinaries prebuilt) ·
`/construir-ceres` (**nuevo**, `git clone --recursive` + `build.ps1`/`build.sh`) ·
`/compilar-fuentes` (las tres piezas) · `/toolchain` (CERES_PATH/PATH) · `/hola-mundo` ·
`/anatomia` · `/primer-juego` (**nuevo**)

**2. La máquina (CeresASM)**
`/maquina-vision` · `/maquina-memoria` (v2) · `/maquina-isa32` · `/maquina-isa64` ·
`/maquina-registros-abi` · `/maquina-interrupciones` · `/maquina-relojes-perfiles` ·
`/maquina-planificador` · `/maquina-bus-dispositivos` · `/maquina-depurador` ·
`/maquina-formatos` (`.cres/.cobj/.car`) · `/maquina-headless`

**3. El lenguaje Ceres-C**
`/lenguaje-tipos` · `/lenguaje-control` · `/lenguaje-funciones` · `/lenguaje-64` ·
`/lenguaje-preprocesador` · `/lenguaje-genericos` · `/lenguaje-interop-casm` (**nuevo**) ·
`/lenguaje-diagnosticos` (**nuevo**) · `/lenguaje-limitaciones` (**nuevo**)

**4. Consola y E/S**
`/consola-io` · `/consola-streams` · `/consola-terminal` (terminal virtual v2) · `/consola-ansi` ·
`/consola-linea` · `/consola-getchar` (**nuevo**: `getchar`, `getchar_nb`, que no hay `gets`)

**5. Biblioteca estándar** (una página por cabecera o familia)
`/std-assert` `/std-ctype` `/std-errno` `/std-float` `/std-inttypes` `/std-limits` `/std-locale`
`/std-math` `/std-setjmp` `/std-signal` `/std-stddef-stdint` `/std-stdio` `/std-stdlib`
`/std-string` `/std-time` `/std-uchar-wchar` `/std-otras-c11-c23` (stdbit/stdckdint/stdalign…)

**6. La API `ceres/`** (una página por cabecera; agrupadas por familia en el menú)
- Terminal y texto: `/api-terminal` `/api-ansi` `/api-line` `/api-tui` `/api-text` `/api-font`
- GPU: `/api-video` `/api-fb` `/api-tiles` `/api-sprite` `/api-gfx` `/api-blitter`
- Audio: `/api-audio` `/api-music`
- Sistema: `/api-sys` `/api-timer` `/api-irq` `/api-fault` `/api-mmu` `/api-task` `/api-debug`
  `/api-backtrace`
- Memoria/utilidades: `/api-heap` `/api-arena` `/api-pool` `/api-bits` `/api-hash` `/api-sort`
  `/api-rand` `/api-fixed` `/api-vecmath` `/api-atomic` `/api-endian` `/api-config` `/api-test`
- Entrada: `/api-input` `/api-key` `/api-keys` `/api-keyboard` `/api-mouse` `/api-gamepad`
- Almacenamiento: `/api-disk` `/api-blockdev` `/api-periph` `/api-hostfs` `/api-fs` `/api-save`
- Datos: `/api-json` `/api-ini` `/api-pack` `/api-image` `/api-lz`
- Juego: `/api-game` `/api-shell` (`sys_run`)
- Estructuras (`ds/`): `/ds-bitset` `/ds-vector` `/ds-list` `/ds-queues` `/ds-heaps` `/ds-hash`
  `/ds-omap-oset` `/ds-flatmap-flatset` `/ds-rbtree` `/ds-skiplist` `/ds-trie` `/ds-bloom`
  `/ds-dsu-lru-slotmap` `/ds-strbuf` `/ds-generic`

**7. Línea de comandos**
`/cli-ceres` (todos los subcomandos y opciones) · `/cli-ceresc` · `/cli-debugger` ·
`/tools` (**nuevo**: `tools/` de la stdlib)

**8. Guías**
`/guia-compilacion-separada` · `/guia-bibliotecas-propias` · `/guia-tests-ci` ·
`/guia-depuracion` · `/guia-migracion-v1-v2` (**nuevo**) · `/juegos`

**9. Referencia**
`/ref-cheatsheet` · `/ref-dispositivos` (reescrito, v2) · `/ref-opcodes` · `/ref-interrupciones` ·
`/ref-abi-registros` · `/ref-formatos` · `/ref-estado-implementacion` (**nuevo**) · `/ref-glosario`
(**nuevo**) · `/ref-faq` (**nuevo**)

---

## 5. Acciones por página (inventario)

### 5.1 Reescrituras (v1 → v2)
| Página | Acción |
| --- | --- |
| `ref-apendice` → `ref-dispositivos` | Rehacer con el mapa de slots SPEC §5.5, MMIO solo 32 bits, registros v2; quitar `mmio_r8/16`, tabla IRQ correcta |
| `lib-f64` → `lenguaje-64`/`std-float` | Eliminar `f64.h`/`--soft-double`; documentar `double` nativo y `-fshort-double` |
| `cli-ceres` | Reescribir con la salida real de `ceres --help` (todos los subcomandos/opciones) |
| `cli-ceresc` | Reescribir con `ceresc --help` (`--stdlib`, `-fshort-double`, sin `--sysroot`) |
| `instalacion` / `build-toolchain` | Añadir CeresBinaries, quitar "busca junto al checkout", módulos `irq/fault/mmu`, `--headless` |
| `gfx-texto` → `api-text` | `text.h`/plano de texto v2 (celdas 16/32 bits, fuente, paleta, scrollback) |
| `gfx-display` → `api-fb` + `api-video` | Plano bitmap V1 + núcleo de la GPU/pantalla/VBlank |
| `inicio` | "183 instrucciones", las **cuatro** piezas (CeresBinaries), estado v2 |
| `build-vm` | Módulos internos reales v2; nota de `--help` sale con 2 |
| `consola-io`/`consola-ansi`/`consola-streams` | Alinear con terminal virtual v2 y `--headless` |

### 5.2 Actualizaciones menores
`lenguaje-64` (pares nativos), `lenguaje-tipos` (quitar `--soft-double`), `game-*` y `gfx-*`
(quitar `-Terminal`, `display.h`), `ref-cheatsheet` (v2), `sys-*` (timer v2, `sys_run`), `audio`/
`music` (niveles A0–A4 con marca de estado), todos los `build-*`.

### 5.3 Nuevas páginas
CeresBinaries (3), máquina v2 (11), `sys_run`/shell, herramientas, migración v1→v2, estado de
implementación, glosario, FAQ, ISA32/ISA64, planificador/relojes/perfiles, formatos, todas las
cabeceras de la stdlib y de `ceres/` sin página.

---

## 6. Cambios de herramienta (modernización)

1. **Generadores** (`tools/gen/`, nuevos) que escriben fragmentos MDX a partir de la fuente real:
   - `gen-cli.mjs`: ejecuta `ceres --help` y `ceresc --help` y produce las tablas de `/cli-ceres` y
     `/cli-ceresc`. Anclado a la versión (banner "generado para ceres X.Y").
   - `gen-devices.mjs`: parsea `include/ceres.h` (bases) + cabeceras de dispositivo + SPEC §5.5/§5.7
     → `/ref-dispositivos`.
   - `gen-irq.mjs`: de `include/interrupts.h` → `/ref-interrupciones`.
   - `gen-opcodes.mjs`: de la tabla del ISA en CeresASM docs/04-05 + `Ceres-C` → `/ref-opcodes`.
   - `gen-stdlib-index.mjs`: de `include/**` y `docs/reference/` → índice y páginas semilla.
2. **Lint de contenido** en `tools/selfcheck.js`:
   - lista negra de términos v1 (`--soft-double`, `f64.h`, `textfb`, `display.h`, `--terminal`,
     `mmio_r8/16`, `read_port`) → fallo;
   - comprobación de **paridad es/en** (mismo conjunto de slugs y de estructura de componentes);
   - comprobador de **enlaces internos** y de anclas;
   - UTF-8 estricto (sin BOM problemático) y `charset=utf-8` en las respuestas.
3. **Verificación de código**: compilar (en CI) los fragmentos de C de las páginas contra la stdlib
   real; ensamblar los fragmentos `.casm`. Los fragmentos se marcan para extracción (p. ej. fenced
   ```c title="…"``` ya existe).
4. **Búsqueda/índice**: regenerar el índice por idioma (ya existe `search`); añadir sinónimos
   (`--headless` ↔ `--terminal`).
5. **CI** (GitHub Actions) que corre `node tools/selfcheck.js`, `node tools/build.js` y el lint.
6. **Versionado**: `VERSION` de los repos anclado en un `tools/versions.json`; aviso visible si el
   binario instalado difiere del documentado.
7. **Estilo/stack**: mantener el servidor sin dependencias (funciona y soporta los componentes MDX y
   las demos); evaluar (opcional, no bloqueante) migrar a Astro Starlight si se quiere tema/i18n
   "de serie". Decisión al final de la fase F1.

---

## 7. Fases y tareas

Cada tarea: **archivos → pasos → criterios de aceptación → verificación**. Todas bilingües.

### Fase W0 — Congelar fuentes y andamiaje
- Tareas: fijar `tools/versions.json`; añadir `tools/gen/` (esqueleto) y el lint de contenido;
  documentar en `README.md` de la wiki qué es la fuente de verdad y cómo se regenera.
- Aceptación: `node tools/selfcheck.js` falla al detectar un término v1 de prueba; el lint corre en CI.

### Fase W1 — Barrido v1 → v2 (correcciones)
- Tareas: eliminar `lib-f64` y crear `lenguaje-64`/`std-float`; renombrar `gfx-texto/displays` a
  `api-text`/`api-fb`; reescribir `ref-display`→`ref-dispositivos`, `cli-ceres`, `cli-ceresc`,
  `instalacion`, `build-toolchain`; pasar el lint de obsolescencia a **0**; corregir `inicio`,
  `build-vm`, `lenguaje-*`, `game-*`.
- Aceptación: `selfcheck` sin avisos; 0 apariciones de términos v1; las páginas de CLI coinciden con
  `ceres --help`/`ceresc --help` actuales.

### Fase W2 — Paquete y toolchain (CeresBinaries)
- Tareas: `/instalar-paquete`, `/construir-ceres`, actualizar `/compilar-fuentes`, `/toolchain`,
  `/requisitos`; comandos exactos de `CeresBinaries/README.md` (instaladores, `install.cmd`/`install.sh`,
  `build.ps1`/`build.sh`, `-Prebuilt`, `--no-sdl`, `-CeresAsm…`).
- Aceptación: un lector con Windows/Linux puede instalar o construir Ceres siguiendo solo la wiki.

### Fase W3 — La máquina v2
- Tareas: sección "La máquina" (memoria v2, ISA32/64, IRQ, relojes/perfiles, planificador, bus,
  depurador, formatos, headless); `ref-interrupciones`, `ref-opcodes`, `ref-abi-registros`,
  `ref-formatos`, `ref-estado-implementacion`; guía del shell/`sys_run`.
- Aceptación: `ref-dispositivos` y las tablas de IRQ/opcodes generadas y verificadas contra el código.

### Fase W4 — Referencia completa de la stdlib
- Tareas: página de referencia por cabecera estándar y por `ceres/*.h`; índice con estado
  (implementado/pendiente); chuletario v2.
- Aceptación: **toda** cabecera de `include/` tiene entrada; `gen-stdlib-index` no deja huecos.

### Fase W5 — CLI y herramientas
- Tareas: `/cli-ceres` y `/cli-ceresc` generados + explicados con ejemplos; `/cli-debugger`;
  `/tools` (img2tiles/mkpack/gen_font/gendocs/runtests/example).
- Aceptación: cada opción de `ceres --help`/`ceresc --help` está documentada con ejemplo.

### Fase W6 — Guías, migración y FAQ
- Tareas: compilación separada, bibliotecas propias, tests/CI headless, depuración, migración
  v1→v2, glosario, FAQ; repasar los juegos con las APIs v2.
- Aceptación: recorridos "aprender a usar todo" completos; sin enlaces rotos.

### Fase W7 — Cierre y publicación
- Tareas: paridad es/en al 100 %; `selfcheck` + `build.js` verdes; revisión de estilo; publicar
  `dist/` (y aviso de versión).
- Aceptación: `node tools/selfcheck.js` = OK; `node tools/build.js` genera es/en completos.

---

## 8. Criterios de aceptación globales

- Cero términos v1 en el lint.
- Toda cabecera de `include/**` y todo subcomando/opción de `ceres`/`ceresc` con documentación.
- Guía de CeresBinaries (instalar paquete y construir desde fuente) verificada paso a paso.
- es/en con el mismo sitemap y estructura.
- Tablas de CLI/dispositivos/IRQ/opcodes **generadas** y verificadas en CI.
- Bloques de código Ceres compilados/ensamblados en CI.
- Las carencias de la v2 (F9+) marcadas como "Planificado", nunca descritas como existentes.

## 9. Riesgos y decisiones abiertas

- **Riesgo**: la v2 cambia mientras se documenta (F9 audio, F10 GPU 2D, retirada del blitter).
  Mitigación: campos generados + `ref-estado-implementacion` + versionado.
- **Decisión**: mantener el servidor sin dependencias o migrar a Astro Starlight (coste: reescribir
  `public/` y las demos). Recomendación inicial: **mantener** y endurecer con CI; reevaluar en W1.
- **Decisión**: granularidad de la referencia stdlib (una página por cabecera vs por familia). Se
  propone una por cabecera, con agrupación en el menú.
- **Esfuerzo**: ~35 páginas nuevas/reescritas por idioma (×2), más generadores y CI. Conviene
  priorizar W1–W3 (lo que hoy está mal o falta) antes de W4–W5 (exhaustividad).

## 10. Verificación del plan

- `node tools/selfcheck.js` sin problemas (incluye el lint nuevo).
- `node tools/build.js` sin errores.
- Repaso manual de los recorridos: instalar paquete → hola mundo → primer juego; y
  compilar fuentes → toolchain → CLI → stdlib.
