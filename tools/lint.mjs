// Ceres Wiki - lint de contenido (modernizacion v2).
//
//   node tools/lint.mjs
//
// Comprueba, sin dependencias:
//   1. Terminos obsoletos de la maquina v1 (--soft-double, f64.h, textfb, display.h,
//      --terminal, mmio_r8/16..., read_port/write_port, --memory).
//      Una linea que contenga `lint:v1` queda exenta (se usa en la guia de migracion).
//   2. Paridad es/en: el mismo conjunto de slugs en content/<locale>/*.mdx y en _nav.json.
//   3. Enlaces internos: todo `/wiki/<slug>` apunta a un slug de la navegacion.
//
// Exporta lint() -> numero de problemas; ejecutado directo imprime el informe.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableLocales, loadNav, flattenNav, CONTENT_DIR } from '../lib/content.js';

const OBSOLETE = [
  ['soft-double', 'v2: double es nativo; usa -fshort-double (double = float)'],
  ['f64.h', 'v2: ceres/f64.h se elimino (F6)'],
  ['ns64.h', 'v2: ceres/ns64.h se elimino (F6)'],
  ['--terminal', 'v2: usa --headless (o CERES_HEADLESS=1)'],
  ['-Terminal', 'v2: usa --headless'],
  ['textfb', 'v2: ceres/textfb.h es ahora ceres/text.h'],
  ['display.h', 'v2: ceres/display.h es ahora ceres/fb.h'],
  ['mmio_r8', 'v2: MMIO es solo de 32 bits (mmio_r32)'],
  ['mmio_r16', 'v2: MMIO es solo de 32 bits (mmio_r32)'],
  ['mmio_w8', 'v2: MMIO es solo de 32 bits (mmio_w32)'],
  ['mmio_w16', 'v2: MMIO es solo de 32 bits (mmio_w32)'],
  ['read_port', 'v2: usa mmio_r32 (read_port se elimino)'],
  ['write_port', 'v2: usa mmio_w32 (write_port se elimino)'],
  ['--memory', 'v2: usa --ram <bytes>']
];

function mdxFiles(locale) {
  const dir = path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.mdx?$/.test(f)).sort();
}

function navSlugs(locale) {
  const slugs = [];
  for (const section of loadNav(locale).sections) for (const p of section.pages) slugs.push(p.slug);
  return slugs;
}

export function lint({ verbose = true } = {}) {
  const problems = [];
  const say = (...a) => { if (verbose) console.log(...a); };

  const locales = availableLocales();
  const navByLocale = {};
  for (const locale of locales) navByLocale[locale] = new Set(navSlugs(locale));

  // 1. Terminos obsoletos.
  say('lint: terminos obsoletos');
  for (const locale of locales) {
    for (const file of mdxFiles(locale)) {
      const full = path.join(CONTENT_DIR, locale, file);
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes('lint:v1')) return;
        for (const [term, why] of OBSOLETE) {
          if (line.includes(term)) {
            problems.push(`${locale}/${file}:${i + 1}: "${term}" (${why})`);
          }
        }
      });
    }
  }
  say(`  ${problems.length} apariciones`);

  // 2. Paridad es/en (ficheros y navegacion).
  say('lint: paridad es/en');
  const before = problems.length;
  const fileSets = {};
  for (const locale of locales) fileSets[locale] = new Set(mdxFiles(locale));
  if (locales.includes('es') && locales.includes('en')) {
    for (const f of fileSets.es) if (!fileSets.en.has(f)) problems.push(`paridad: falta content/en/${f}`);
    for (const f of fileSets.en) if (!fileSets.es.has(f)) problems.push(`paridad: falta content/es/${f}`);
    for (const s of navByLocale.es) if (!navByLocale.en.has(s)) problems.push(`paridad nav: "${s}" no esta en /en`);
    for (const s of navByLocale.en) if (!navByLocale.es.has(s)) problems.push(`paridad nav: "${s}" no esta en /es`);
  }
  say(`  ${problems.length - before} problemas`);

  // 3. Enlaces internos /wiki/<slug>.
  say('lint: enlaces internos');
  const beforeLinks = problems.length;
  const linkRe = /(?:\]\(|\bhref=")\/wiki\/([a-z0-9][a-z0-9-]*)/gi;
  for (const locale of locales) {
    const known = navByLocale[locale];
    for (const file of mdxFiles(locale)) {
      const text = fs.readFileSync(path.join(CONTENT_DIR, locale, file), 'utf8');
      for (const m of text.matchAll(linkRe)) {
        const slug = m[1];
        if (!known.has(slug)) problems.push(`${locale}/${file}: enlace a /wiki/${slug} no esta en la navegacion`);
      }
    }
  }
  say(`  ${problems.length - beforeLinks} problemas`);

  if (verbose) {
    if (problems.length) {
      console.log(`\nLINT: ${problems.length} problema(s)`);
      for (const p of problems) console.log('  - ' + p);
    } else {
      console.log('\nLINT: OK');
    }
  }
  return problems.length;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  process.exit(lint() === 0 ? 0 : 1);
}
