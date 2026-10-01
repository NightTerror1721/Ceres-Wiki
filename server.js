// Ceres Wiki - servidor HTTP sin dependencias externas.  node server.js  (o: npm start)
//
// Rutas:
//   /                         -> redirige a /en/ (o /es/ si el navegador prefiere espanol)
//   /es/wiki/<slug>           -> pagina en espanol
//   /en/wiki/<slug>           -> pagina en ingles (idioma por defecto)
//   /api/page?lang=en&p=slug  -> JSON de la pagina
//   /api/nav?lang=…           -> navegacion
//   /api/search?lang=…&q=…    -> busqueda
//   /api/stats?lang=…         -> recuento
//   /assets/*                 -> estaticos

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNav, getPage, search, stats, invalidate, availableLocales, ROOT } from './lib/content.js';
import { layout } from './lib/layout.js';
import { escapeHtml } from './lib/highlight.js';
import { DEFAULT_LOCALE, LOCALES, resolveLocale, isLocale, ui } from './lib/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 4300);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}
function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');
}
function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}
function pickLocale(header) {
  const pref = String(header || '').toLowerCase();
  return pref.startsWith('es') ? 'es' : DEFAULT_LOCALE;   // ingles por defecto; espanol si el navegador lo pide
}
function serveStatic(req, res, urlPath) {
  const rel = urlPath.replace(/^\/assets\//, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
  return true;
}

function notFoundPage(locale, slug) {
  const t = ui(locale);
  return {
    locale,
    slug: '__404',
    title: t.notFoundTitle,
    section: t.errorSection,
    sectionIcon: '',
    fallback: false,
    html: `<div class="notfound"><p class="nf-code">404</p><h1>${escapeHtml(t.notFoundTitle)}</h1><p>${escapeHtml(t.notFoundText)} <code>${escapeHtml(slug)}</code></p><p><a class="btn-primary" href="/${locale}/wiki/inicio">${escapeHtml(t.backHome)}</a></p></div>`,
    toc: [], source: '', prev: null, next: null
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith('/assets/')) {
      if (serveStatic(req, res, pathname)) return;
      return send(res, 404, 'Asset not found', 'text/plain; charset=utf-8');
    }
    if (pathname === '/favicon.ico') return redirect(res, '/assets/favicon.svg');

    // ---- API (el idioma llega en ?lang=) ----
    const langParam = resolveLocale(url.searchParams.get('lang'));
    if (pathname === '/api/locales') return json(res, 200, { locales: availableLocales(), default: DEFAULT_LOCALE });
    if (pathname === '/api/nav') return json(res, 200, loadNav(langParam));
    if (pathname === '/api/stats') return json(res, 200, stats(langParam));
    if (pathname === '/api/search') {
      const q = url.searchParams.get('q') || '';
      return json(res, 200, { query: q, locale: langParam, results: search(langParam, q) });
    }
    if (pathname === '/api/page') {
      const slug = url.searchParams.get('p') || 'inicio';
      const page = getPage(langParam, slug);
      if (!page) return json(res, 404, { error: 'not found' });
      return json(res, 200, page);
    }
    if (pathname === '/api/reload') {
      invalidate();
      return json(res, 200, { ok: true });
    }

    // ---- raiz: al idioma del navegador ----
    if (pathname === '/') {
      return redirect(res, `/${pickLocale(req.headers['accept-language'])}/wiki/inicio`);
    }

    // ---- /es o /en solos ----
    const rootMatch = pathname.match(/^\/([a-z]{2})\/?$/);
    if (rootMatch && isLocale(rootMatch[1])) {
      return redirect(res, `/${rootMatch[1]}/wiki/inicio`);
    }

    // ---- /wiki/<slug> sin idioma: al idioma por defecto ----
    if (pathname === '/wiki' || pathname === '/wiki/') {
      return redirect(res, `/${DEFAULT_LOCALE}/wiki/inicio`);
    }
    if (pathname.startsWith('/wiki/')) {
      const slug = pathname.replace(/^\/wiki\//, '');
      return redirect(res, `/${pickLocale(req.headers['accept-language'])}/wiki/${slug}`);
    }

    // ---- /<locale>/wiki/<slug> ----
    const pageMatch = pathname.match(/^\/([a-z]{2})\/wiki\/(.*)$/);
    if (pageMatch && isLocale(pageMatch[1])) {
      const locale = pageMatch[1];
      const slug = pageMatch[2] || 'inicio';
      const page = getPage(locale, slug);
      if (!page) return send(res, 404, layout({ page: notFoundPage(locale, slug), locale }));
      return send(res, 200, layout({ page, locale }));
    }

    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error('[ceres-wiki] error:', err);
    return send(res, 500, '<pre>' + escapeHtml(String(err && err.stack ? err.stack : err)) + '</pre>');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Ceres Wiki');
  console.log('  ----------------------------------------');
  console.log(`  Servidor:  http://localhost:${PORT}`);
  for (const loc of availableLocales()) {
    const s = stats(loc);
    console.log(`  [${loc}]      ${s.pages} paginas en ${s.sections} secciones`);
  }
  console.log('  Detener:   Ctrl+C');
  console.log('');
});
