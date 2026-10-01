// Internal render check, per language.  node tools/selfcheck.js
import { flattenNav, getPage, stats, search, availableLocales } from '../lib/content.js';
import { lint } from './lint.mjs';

let problems = 0;
for (const locale of availableLocales()) {
  const flat = flattenNav(locale);
  console.log(`[${locale}] ${flat.length} pages in the navigation`);
  for (const entry of flat) {
    try {
      const page = getPage(locale, entry.slug);
      if (!page) { console.log('  MISSING ', entry.slug); problems++; continue; }
      const issues = [];
      const htmlForCheck = page.html.replace(/undefined behavior/gi, 'ok');
      if (htmlForCheck.includes('undefined')) issues.push('contains "undefined"');
      if (/\x00[FM]\d+\x00/.test(page.html)) issues.push('unresolved placeholder');
      if (!page.html || page.html.length < 200) issues.push('html too short');
      if (page.toc.length === 0) issues.push('no table of contents');
      if (issues.length) { console.log('  WARN    ', entry.slug, '-', issues.join(', ')); problems++; }
    } catch (err) {
      console.log('  ERROR   ', entry.slug, '-', err.message);
      problems++;
    }
  }
  console.log('  summary:', JSON.stringify(stats(locale)));
}

for (const locale of availableLocales()) {
  for (const q of ['tilemap', 'save game', 'terminal', 'void']) {
    const r = search(locale, q);
    if (r.length === 0 && q !== 'save game') console.log(`  [${locale}] search "${q}": 0 results`);
  }
}

problems += lint();

console.log(problems === 0 ? 'OK: all pages render' : `PROBLEMS: ${problems}`);
