# Ceres Wiki

Tutorial y wiki interactiva **bilingüe** (inglés y español; el inglés es el idioma por defecto) de la máquina virtual **Ceres**
(CeresASM + Ceres-C + Ceres STDLIB). Cubre desde `Hola, mundo` hasta juegos retro completos
(Pong, Arkanoid, 4 en raya, Sokoban y una aventura RPG 2D), pasando por **todos** los módulos
de la librería, más guías para **compilar las tres piezas** y para usar **sus líneas de
comandos** en detalle.

## Arrancar

No tiene dependencias: sólo necesita **Node.js 18 o superior**.

```shell
> node server.js
> # o:
> npm start
```

Abre <http://localhost:4300>. Cambia el puerto con `PORT`:

```shell
> set PORT=8080 && node server.js
```

## Idiomas

- **El inglés es el idioma principal y por defecto**: `/en/wiki/<slug>`. `/` redirige a `/en/...`
  (o a `/es/...` si el navegador prefiere español). El español, para quien lo escoja, en
  `/es/wiki/<slug>`.
- Conmutador **EN/ES** en la barra superior (mantiene la página actual).
- La navegación, la interfaz (búsqueda, progreso, botones) y **todo el contenido** están en
  ambos idiomas. 64 páginas por idioma.
- Si una página no estuviera traducida, se sirve la inglesa con un aviso; hoy todo está traducido.

## Qué incluye

- Un **servidor HTTP** propio (`server.js`) que renderiza la wiki en el servidor.
- Renderizador de **Markdown y MDX** sin dependencias (`lib/markdown.js`).
- Resaltado de sintaxis para C, CASM, JSON, INI y consola (`lib/highlight.js`).
- Internacionalización (`lib/i18n.js`) y contenido por locale (`content/es`, `content/en`).
- Frontend con **búsqueda** (por idioma), **tema claro/oscuro**, **progreso de lectura**,
  índice lateral, pestañas, quiz y copiado de código (`public/`).
- **Demos jugables** en canvas de los cinco juegos (`public/demos.js`).
- 128 páginas en total: 64 en español y 64 en inglés, en 14 secciones.

## Estructura

```
Ceres Wiki/
├─ server.js              Servidor HTTP (sin dependencias)
├─ package.json
├─ lib/
│  ├─ content.js          Navegacion, paginas y busqueda por idioma
│  ├─ markdown.js         Renderizador Markdown + MDX
│  ├─ highlight.js        Resaltado de sintaxis
│  ├─ i18n.js             Idiomas y cadenas de interfaz
│  └─ layout.js           Plantilla HTML compartida
├─ public/
│  ├─ style.css           Tema de la wiki
│  ├─ app.js              Router, busqueda, progreso, componentes, idioma
│  ├─ demos.js            Juegos en canvas
│  └─ favicon.svg
├─ content/
│  ├─ es/                 Contenido en espanol (_nav.json + *.mdx)
│  └─ en/                 Contenido en ingles (_nav.json + *.mdx)
└─ tools/
   ├─ build.js            Exportacion estatica a dist/ (por idioma)
   └─ selfcheck.js        Comprueba que todas las paginas renderizan
```

## Secciones

1. **Primeros pasos** — qué es Ceres, instalación, hola mundo, anatomía de un programa
2. **Compilar Ceres** — la máquina virtual, el compilador, la librería y el toolchain
3. **El lenguaje Ceres-C** — tipos, control de flujo, funciones, 64 bits, preprocesador, atributos
4. **Consola y texto** · 5. **Librerías estándar** · 6. **Gráficos** · 7. **Sonido, TUI y entrada**
8. **Almacenamiento** · 9. **Datos y recursos** · 10. **Sistema** · 11. **Estructuras de datos**
12. **Juegos completos** · 13. **Línea de comandos** (ceres, ceresc, depurador) · 14. **Referencia**

## Añadir una página

1. Crea `content/<locale>/mi-pagina.mdx` (en `es/` y `en/`).
2. Añádela a `content/<locale>/_nav.json` en la sección que quieras.

Las páginas listadas en `_nav.json` que todavía no tienen fichero **no aparecen** (no hay
enlaces rotos): puedes planificar y escribir poco a poco.

## Componentes MDX

Dentro de un `.mdx` (o `.md`) puedes usar, además del Markdown normal:

```mdx
<Callout type="tip" title="Titulo">Texto en **Markdown**.</Callout>

<Steps>
  <Step title="Primero">...</Step>
  <Step title="Después">...</Step>
</Steps>

<Tabs>
  <Tab label="Opción A">...</Tab>
  <Tab label="Opción B">...</Tab>
</Tabs>

<Cards>
  <Card title="Enlace" icon="🚀" href="/wiki/inicio">Descripción.</Card>
</Cards>

<GameDemo kind="pong" title="Pong">Mueve con W/S.</GameDemo>

<Quiz question="¿…?" options="a|b|c" answer="1" explain="Porque…"></Quiz>

<Output title="Salida">texto sin formato</Output>
```

Valores de `GameDemo`: `pong`, `arkanoid`, `connect4`, `sokoban`, `rpg`.

## Exportar a estático

```shell
> node tools/build.js      # genera dist/es/... y dist/en/... con HTML plano
```

## Verificar el contenido

```shell
> node tools/selfcheck.js  # renderiza todas las páginas (ambos idiomas) y busca problemas
> node tools/lint.mjs      # solo el lint de contenido (términos v1, paridad es/en, enlaces)
```

## Mantenimiento

El plan de actualización y su diagnóstico están en [PLAN-MODERNIZACION.md](PLAN-MODERNIZACION.md).

**Fuente de verdad.** La wiki **no define** comportamiento: lo resume y enlaza. Antes de tocar una
página, contrástala con:

| Tema | Fuente |
| --- | --- |
| Máquina, memoria, ISA, IRQ, `ceres` | `../CeresASM/docs/*.md` y `ceres --help` |
| Lenguaje y `ceresc` | `../Ceres-C/docs/*.md` y `ceresc --help` |
| Cabeceras y API de la librería | `../Ceres Projects/Ceres STDLIB/include/**` y `docs/reference/` |
| Paquete e instalación | `../CeresBinaries/README.md` |
| Estado de fases | `../CeresASM/plan/v2/STATUS.md` |

**Regla de estilo:** una línea que mencione algo de la máquina v1 (p. ej. `--soft-double`) debe llevar
el marcador `lint:v1` para que el lint la permita (solo la guía de migración debería necesitarlo).

Versiones y commits contra los que se verificó: [tools/versions.json](tools/versions.json).

**CI.** En cada push, `.github/workflows/ci.yml` corre `selfcheck` (render + lint) y `build`. La
carpeta `dist/` es generada y **no se versiona**.

## Cómo se corresponde con Ceres

- El código de ejemplo es **Ceres-C real** contra la API de `Ceres STDLIB`.
- Los fragmentos de consola usan `ceresc` y `ceres`.
- Las guías de compilación y de línea de comandos describen los tres repositorios reales.
- Las demos de la wiki son **versiones en JavaScript** de los mismos juegos, para poder
  jugarlos sin compilar; el código Ceres completo está en cada página.
