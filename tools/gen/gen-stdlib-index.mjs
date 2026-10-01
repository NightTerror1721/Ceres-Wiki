// Ceres Wiki - generator for the stdlib header index.
//
//   node tools/gen/gen-stdlib-index.mjs
//
// Walks the Ceres STDLIB's include/** (path from STDLIB env var, ../Ceres Projects/Ceres STDLIB,
// or ../CeresSTDLIB) and writes content/en/_gen/_stdlib-index.mdx: one row per header with its
// first sentence as a summary, split into "the C library" and "Ceres: the machine and the
// extras". The headers themselves are the source (the same rule as the STDLIB's gendocs.js), so
// the index cannot drift. Run it after the library gains or renames a header.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const candidates = [
  process.env.STDLIB,
  path.resolve(ROOT, '..', 'Ceres STDLIB'),
  path.resolve(ROOT, '..', 'CeresSTDLIB')
].filter(Boolean);
const stdlib = candidates.find((p) => fs.existsSync(path.join(p, 'include')));
if (!stdlib) {
  console.error('gen-stdlib-index: cannot find the Ceres STDLIB (set STDLIB=<path>)');
  process.exit(1);
}
const include = path.join(stdlib, 'include');
const MACHINE = new Set(['ceres.h', 'interrupts.h']);

function headers(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) out.push(...headers(path.join(dir, entry.name), rel + '/'));
    else if (entry.name.endsWith('.h') && !entry.name.startsWith('__')) out.push(rel);
  }
  return out;
}

// The first sentence of a header's opening comment (the same rule as gendocs.js).
function summary(rel) {
  const lines = fs.readFileSync(path.join(include, rel), 'utf8').replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  const skip = () => { while (i < lines.length && (/^\s*$/.test(lines[i]) || /^#pragma once/.test(lines[i]) || /^#include/.test(lines[i]))) i++; };
  skip();
  const intro = [];
  while (i < lines.length && /^\s*\/\//.test(lines[i])) {
    const text = lines[i].replace(/^\s*\/\/ ?/, '');
    if (/-{2,}/.test(text)) break;
    intro.push(text);
    i++;
  }
  const joined = intro.join(' ').replace(/\s+/g, ' ').trim();
  const first = joined.split(/(?<=(?<!\.|\be\.g|\bi\.e)\.)\s+/)[0] || '';
  return first.length > 150 ? first.slice(0, 147).replace(/\s+\S*$/, '') + '...' : first;
}

const all = headers(include);
const isMachine = (h) => h.includes('/') || MACHINE.has(h);
const table = (rows) => {
  const head = '| Header | What it is |\n| --- | --- |';
  return `${head}\n${rows.map((r) => `| \`<${r[0]}>\` | ${r[1].replace(/\|/g, '\\|')} |`).join('\n')}\n`;
};

let out = '';
for (const [title, pred] of [['The C library', (h) => !isMachine(h)], ['Ceres: the machine and the extras', isMachine]]) {
  const rows = all.filter(pred).map((h) => [h, summary(h)]);
  out += `### ${title}\n\n${table(rows)}\n`;
}

const dir = path.join(ROOT, 'content', 'en', '_gen');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, '_stdlib-index.mdx'), out, 'utf8');
console.log(`wrote content/en/_gen/_stdlib-index.mdx: ${all.length} headers`);
