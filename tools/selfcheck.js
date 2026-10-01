// Comprobacion interna del renderizado, por idioma.  node tools/selfcheck.js
import { flattenNav, getPage, stats, search, availableLocales } from '../lib/content.js';
import { lint } from './lint.mjs';

let problems = 0;
for (const locale of availableLocales()) {
  const flat = flattenNav(locale);
  console.log(`[${locale}] ${flat.length} paginas en la navegacion`);
  for (const entry of flat) {
    try {
      const page = getPage(locale, entry.slug);
      if (!page) { console.log('  FALTA   ', entry.slug); problems++; continue; }
      const issues = [];
      const htmlForCheck = page.html.replace(/undefined behavior/gi, 'ok');
      if (htmlForCheck.includes('undefined')) issues.push('contiene "undefined"');
      if (/\x00[FM]\d+\x00/.test(page.html)) issues.push('placeholder sin resolver');
      if (!page.html || page.html.length < 200) issues.push('html muy corto');
      if (page.toc.length === 0) issues.push('sin indice');
      if (issues.length) { console.log('  AVISO   ', entry.slug, '-', issues.join(', ')); problems++; }
    } catch (err) {
      console.log('  ERROR   ', entry.slug, '-', err.message);
      problems++;
    }
  }
  console.log('  resumen:', JSON.stringify(stats(locale)));
}

for (const locale of availableLocales()) {
  for (const q of ['tilemap', 'guardar partida', 'interruptions', 'void']) {
    const r = search(locale, q);
    if (r.length === 0 && q !== 'guardar partida') console.log(`  [${locale}] busqueda "${q}": 0 resultados`);
  }
}

problems += lint();

console.log(problems === 0 ? 'OK: todas renderizan' : `PROBLEMAS: ${problems}`);
