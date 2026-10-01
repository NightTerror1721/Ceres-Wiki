// Ceres Wiki - exportador estatico opcional (genera dist/ con HTML plano, por idioma).
//   node tools/build.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenNav, getPage, availableLocales, ROOT } from '../lib/content.js';
import { layout } from '../lib/layout.js';
import { DEFAULT_LOCALE } from '../lib/i18n.js';

const DIST = path.join(ROOT, 'dist');
const PUBLIC_DIR = path.join(ROOT, 'public');

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(PUBLIC_DIR, path.join(DIST, 'assets'), { recursive: true });

let count = 0;
for (const locale of availableLocales()) {
  fs.mkdirSync(path.join(DIST, locale, 'wiki'), { recursive: true });
  for (const entry of flattenNav(locale)) {
    const page = getPage(locale, entry.slug);
    if (!page) continue;
    fs.writeFileSync(path.join(DIST, locale, 'wiki', `${entry.slug}.html`), layout({ page, locale }), 'utf8');
    count++;
  }
}

fs.writeFileSync(
  path.join(DIST, 'index.html'),
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${DEFAULT_LOCALE}/wiki/inicio.html"><title>Ceres Wiki</title>`,
  'utf8'
);

console.log(`Exportadas ${count} paginas a ${path.relative(ROOT, DIST)}/`);
