// Ceres Wiki - carga de contenido por idioma: navegacion, paginas, busqueda.
// El contenido vive en content/<locale>/<slug>.mdx|.md. Si una pagina no existe en el
// idioma pedido, se sirve la del idioma por defecto (fallback) y se marca.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocument } from './markdown.js';
import { DEFAULT_LOCALE, LOCALES, resolveLocale, ui } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const CONTENT_DIR = path.join(ROOT, 'content');

const navCache = new Map();
const pageCache = new Map();
const searchIndexes = new Map();
const searchStamps = new Map();

function localeDir(locale) {
  return path.join(CONTENT_DIR, resolveLocale(locale));
}

export function loadNav(locale = DEFAULT_LOCALE) {
  const loc = resolveLocale(locale);
  if (navCache.has(loc)) return navCache.get(loc);
  const file = path.join(localeDir(loc), '_nav.json');
  const fallback = path.join(localeDir(DEFAULT_LOCALE), '_nav.json');
  const source = fs.existsSync(file) ? file : fallback;
  const nav = JSON.parse(fs.readFileSync(source, 'utf8'));
  navCache.set(loc, nav);
  return nav;
}

export function resolveFile(locale, slug) {
  const loc = resolveLocale(locale);
  const clean = String(slug || 'inicio').replace(/^\/+|\/+$/g, '');
  for (const candidate of [path.join(localeDir(loc), clean), path.join(localeDir(DEFAULT_LOCALE), clean)]) {
    for (const ext of ['.mdx', '.md']) {
      const file = candidate + ext;
      if (fs.existsSync(file)) {
        return { file, fallback: !file.startsWith(localeDir(loc)) };
      }
    }
  }
  return null;
}

export function flattenNav(locale = DEFAULT_LOCALE) {
  const nav = loadNav(locale);
  const flat = [];
  for (const section of nav.sections) {
    for (const page of section.pages) {
      if (!resolveFile(locale, page.slug)) continue;
      flat.push({ ...page, section: section.title, sectionIcon: section.icon || '' });
    }
  }
  return flat;
}

export function visibleSections(locale = DEFAULT_LOCALE) {
  const nav = loadNav(locale);
  const flat = flattenNav(locale);
  return nav.sections
    .map((s) => ({ ...s, pages: flat.filter((p) => p.section === s.title).map((p) => ({ slug: p.slug, title: p.title })) }))
    .filter((s) => s.pages.length > 0);
}

function firstHeading(raw) {
  const m = raw.match(/^\s*#\s+(.+)$/m);
  return m ? m[1].replace(/[`*_~]/g, '').trim() : null;
}

export function getPage(locale, slug) {
  const loc = resolveLocale(locale);
  const found = resolveFile(loc, slug);
  if (!found) return null;
  const stat = fs.statSync(found.file);
  const key = `${loc}:${found.file}`;
  const cached = pageCache.get(key);
  if (cached && cached.mtime === stat.mtimeMs) return cached.page;

  const source = fs.readFileSync(found.file, 'utf8');
  const flat = flattenNav(loc);
  const entry = flat.find((p) => p.slug === slug) || null;
  const rendered = renderDocument(source, { locale: loc, strings: ui(loc) });
  const title = (entry && entry.title) || firstHeading(source) || slug;
  const index = flat.findIndex((p) => p.slug === slug);
  const page = {
    locale: loc,
    slug,
    file: path.relative(ROOT, found.file).replace(/\\/g, '/'),
    title,
    section: entry ? entry.section : '',
    sectionIcon: entry ? entry.sectionIcon : '',
    fallback: found.fallback,
    html: rendered.html,
    toc: rendered.toc,
    prev: index > 0 ? { slug: flat[index - 1].slug, title: flat[index - 1].title } : null,
    next: index >= 0 && index < flat.length - 1 ? { slug: flat[index + 1].slug, title: flat[index + 1].title } : null,
    source
  };
  pageCache.set(key, { mtime: stat.mtimeMs, page });
  return page;
}

// ---- indice de busqueda -------------------------------------------------
function stripMarkdown(text) {
  return text
    .replace(/```[^\n]*\n([\s\S]*?)```/g, ' $1 ')
    .replace(/`([^`]*)`/g, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~|`-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchIndex(locale = DEFAULT_LOCALE) {
  const loc = resolveLocale(locale);
  let newest = 0;
  const dir = localeDir(loc);
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir, { recursive: true })) {
      if (/\.mdx?$/.test(String(f))) newest = Math.max(newest, fs.statSync(path.join(dir, f)).mtimeMs);
    }
  }
  if (searchIndexes.has(loc) && searchStamps.get(loc) === newest) return searchIndexes.get(loc);

  const index = [];
  for (const entry of flattenNav(loc)) {
    const found = resolveFile(loc, entry.slug);
    if (!found) continue;
    const text = stripMarkdown(fs.readFileSync(found.file, 'utf8'));
    index.push({ slug: entry.slug, title: entry.title, section: entry.section, text, lower: text.toLowerCase() });
  }
  searchIndexes.set(loc, index);
  searchStamps.set(loc, newest);
  return index;
}

export function search(locale, query, limit = 24) {
  const loc = resolveLocale(locale);
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const results = [];
  for (const page of buildSearchIndex(loc)) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const at = page.lower.indexOf(term);
      if (at === -1) { ok = false; break; }
      score += 10;
      if (page.title.toLowerCase().includes(term)) score += 40;
      if (at < 200) score += 6;
    }
    if (!ok) continue;
    const first = page.lower.indexOf(terms[0]);
    const from = Math.max(0, first - 60);
    results.push({ slug: page.slug, title: page.title, section: page.section, score, snippet: page.text.slice(from, from + 200).trim() });
  }
  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return results.slice(0, limit);
}

export function stats(locale = DEFAULT_LOCALE) {
  const loc = resolveLocale(locale);
  const flat = flattenNav(loc);
  const dir = localeDir(loc);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir, { recursive: true }).filter((f) => /\.mdx?$/.test(String(f)))
    : [];
  return { locale: loc, pages: flat.length, files: files.length, sections: loadNav(loc).sections.length };
}

export function availableLocales() {
  return LOCALES.filter((loc) => fs.existsSync(path.join(localeDir(loc), '_nav.json')));
}

export function invalidate() {
  navCache.clear();
  pageCache.clear();
  searchIndexes.clear();
  searchStamps.clear();
}
