// Ceres Wiki - content lint (v2 modernization).
//
//   node tools/lint.mjs
//
// Checks, with no dependencies:
//   1. Obsolete v1 machine terms (--soft-double, f64.h, textfb, display.h,
//      --terminal, mmio_r8/16..., read_port/write_port, --memory).
//      A line that contains `lint:v1` is exempt (used in the migration guide).
//   2. es/en parity: the same set of slugs in content/<locale>/*.mdx and in _nav.json.
//   3. Internal links: every `/wiki/<slug>` points to a slug in the navigation.
//
// Exports lint() -> number of problems; run directly it prints the report.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableLocales, loadNav, flattenNav, CONTENT_DIR } from '../lib/content.js';

const OBSOLETE = [
  ['soft-double', 'v2: double is native; use -fshort-double (double = float)'],
  ['f64.h', 'v2: ceres/f64.h was removed (F6)'],
  ['ns64.h', 'v2: ceres/ns64.h was removed (F6)'],
  ['--terminal', 'v2: use --headless (or CERES_HEADLESS=1)'],
  ['-Terminal', 'v2: use --headless'],
  ['textfb', 'v2: ceres/textfb.h is now ceres/text.h'],
  ['display.h', 'v2: ceres/display.h is now ceres/fb.h'],
  ['mmio_r8', 'v2: MMIO is 32-bit only (mmio_r32)'],
  ['mmio_r16', 'v2: MMIO is 32-bit only (mmio_r32)'],
  ['mmio_w8', 'v2: MMIO is 32-bit only (mmio_w32)'],
  ['mmio_w16', 'v2: MMIO is 32-bit only (mmio_w32)'],
  ['read_port', 'v2: use mmio_r32 (read_port was removed)'],
  ['write_port', 'v2: use mmio_w32 (write_port was removed)'],
  ['--memory', 'v2: use --ram <bytes>']
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

  // 1. Obsolete terms.
  say('lint: obsolete terms');
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
  say(`  ${problems.length} occurrences`);

  // 2. es/en parity (files and navigation).
  say('lint: es/en parity');
  const before = problems.length;
  const fileSets = {};
  for (const locale of locales) fileSets[locale] = new Set(mdxFiles(locale));
  if (locales.includes('es') && locales.includes('en')) {
    for (const f of fileSets.es) if (!fileSets.en.has(f)) problems.push(`parity: content/en/${f} is missing`);
    for (const f of fileSets.en) if (!fileSets.es.has(f)) problems.push(`parity: content/es/${f} is missing`);
    for (const s of navByLocale.es) if (!navByLocale.en.has(s)) problems.push(`nav parity: "${s}" is not in /en`);
    for (const s of navByLocale.en) if (!navByLocale.es.has(s)) problems.push(`nav parity: "${s}" is not in /es`);
  }
  say(`  ${problems.length - before} problems`);

  // 3. Internal links /wiki/<slug>.
  say('lint: internal links');
  const beforeLinks = problems.length;
  const linkRe = /(?:\]\(|\bhref=")\/wiki\/([a-z0-9][a-z0-9-]*)/gi;
  for (const locale of locales) {
    const known = navByLocale[locale];
    for (const file of mdxFiles(locale)) {
      const text = fs.readFileSync(path.join(CONTENT_DIR, locale, file), 'utf8');
      for (const m of text.matchAll(linkRe)) {
        const slug = m[1];
        if (!known.has(slug)) problems.push(`${locale}/${file}: link to /wiki/${slug} is not in the navigation`);
      }
    }
  }
  say(`  ${problems.length - beforeLinks} problems`);

  if (verbose) {
    if (problems.length) {
      console.log(`\nLINT: ${problems.length} problem(s)`);
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
