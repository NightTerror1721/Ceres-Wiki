// Ceres Wiki - plantilla HTML compartida por el servidor y el exportador estatico.
import { escapeHtml } from './highlight.js';
import { stats, visibleSections } from './content.js';
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, LOCALE_NAMES, resolveLocale, ui, otherLocale } from './i18n.js';

export function renderNav(locale, activeSlug) {
  const loc = resolveLocale(locale);
  const sections = visibleSections(loc);
  let html = '';
  for (const section of sections) {
    html += '<div class="nav-section">';
    html += `<div class="nav-section-title"><span class="nav-icon">${section.icon || '•'}</span>${escapeHtml(section.title)}</div>`;
    html += '<ul class="nav-pages">';
    for (const page of section.pages) {
      const active = page.slug === activeSlug ? ' active' : '';
      html += `<li><a class="nav-link${active}" href="/${loc}/wiki/${page.slug}" data-slug="${page.slug}"><span class="nav-dot"></span><span class="nav-text">${escapeHtml(page.title)}</span></a></li>`;
    }
    html += '</ul></div>';
  }
  return html;
}

export function renderToc(toc, loc) {
  if (!toc || toc.length === 0) return `<p class="toc-empty">${escapeHtml(ui(loc).tocEmpty)}</p>`;
  return (
    '<ul class="toc-list">' +
    toc.map((h) => `<li class="toc-item toc-h${h.level}"><a href="#${h.id}" data-toc="${h.id}">${escapeHtml(h.text)}</a></li>`).join('') +
    '</ul>'
  );
}

export function renderPager(page, loc) {
  const t = ui(loc);
  const prev = page.prev
    ? `<a class="pager-prev" href="/${loc}/wiki/${page.prev.slug}" data-slug="${page.prev.slug}"><span class="pager-label">&larr; ${escapeHtml(t.prev)}</span><span class="pager-title">${escapeHtml(page.prev.title)}</span></a>`
    : '<span class="pager-spacer"></span>';
  const next = page.next
    ? `<a class="pager-next" href="/${loc}/wiki/${page.next.slug}" data-slug="${page.next.slug}"><span class="pager-label">${escapeHtml(t.next)} &rarr;</span><span class="pager-title">${escapeHtml(page.next.title)}</span></a>`
    : '<span class="pager-spacer"></span>';
  return prev + next;
}

function renderLangSwitch(locale, slug) {
  const links = LOCALES.map((loc) => {
    const active = loc === locale ? ' active' : '';
    const label = LOCALE_LABELS[loc];
    const title = LOCALE_NAMES[loc];
    return `<a class="lang-link${active}" href="/${loc}/wiki/${slug}" data-lang-switch="${loc}" title="${escapeHtml(title)}">${label}</a>`;
  }).join('');
  return `<div class="lang-switch" role="group" aria-label="${escapeHtml(ui(locale).language)}">${links}</div>`;
}

export function layout({ page, locale }) {
  const loc = resolveLocale(locale || (page && page.locale) || DEFAULT_LOCALE);
  const s = stats(loc);
  const t = ui(loc);
  const slug = page ? page.slug : 'inicio';
  const title = page ? `${page.title} · Ceres Wiki` : 'Ceres Wiki';

  const alternates = LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="/${l}/wiki/${slug}">`).join('');

  const fallbackNote = page && page.fallback && loc !== DEFAULT_LOCALE
    ? `<div class="fallback-note">${escapeHtml(t.onlyInOther)}</div>`
    : '';

  const content = page
    ? `<div class="breadcrumbs"><span>${escapeHtml(page.section || t.sectionFallback)}</span><span class="sep">/</span><span class="current">${escapeHtml(page.title)}</span></div>
       ${fallbackNote}
       <article class="prose" id="article">${page.html}</article>
       <div class="page-tools">
         <button class="tool-btn" id="toggle-source" type="button">${escapeHtml(t.viewSource)}</button>
         <button class="tool-btn" id="mark-done" type="button" data-slug="${page.slug}">${escapeHtml(t.markRead)}</button>
       </div>
       <pre class="source-view" id="source-view" hidden>${escapeHtml(page.source || '')}</pre>
       <nav class="pager">${renderPager(page, loc)}</nav>`
    : '';

  const clientConfig = {
    locale: loc,
    slug,
    ui: {
      copy: t.copy,
      copied: t.copied,
      noResults: t.noResults,
      searchHint: t.searchHint,
      viewSource: t.viewSource,
      hideSource: t.hideSource,
      markRead: t.markRead,
      markedRead: t.markedRead,
      quizCorrect: t.quizCorrect,
      quizWrong: t.quizWrong,
      tocEmpty: t.tocEmpty,
      sectionFallback: t.sectionFallback
    }
  };

  return `<!doctype html>
<html lang="${loc}" data-page="${slug}" data-locale="${loc}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="Ceres virtual machine wiki and tutorial: CeresASM, Ceres-C and the standard library.">
${alternates}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
<script>window.__CERES__ = ${JSON.stringify(clientConfig)};</script>
</head>
<body data-slug="${slug}" data-locale="${loc}">
<a class="skip-link" href="#article">Skip</a>
<header class="topbar">
  <button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Menu">&#9776;</button>
  <a class="brand" href="/${loc}/wiki/inicio" data-slug="inicio">
    <span class="brand-mark">C</span>
    <span class="brand-text">Ceres <em>Wiki</em></span>
  </a>
  <button class="search-btn" id="search-open" type="button">
    <span class="search-icon">&#128269;</span>
    <span class="search-placeholder">${escapeHtml(t.searchPlaceholder)}</span>
    <kbd>/</kbd>
  </button>
  <div class="topbar-right">
    ${renderLangSwitch(loc, slug)}
    <span class="stats-chip" title="${s.pages}">${s.pages} ${escapeHtml(t.pagesSuffix)}</span>
    <button class="icon-btn" id="theme-toggle" type="button" aria-label="Theme" title="Theme">&#9788;</button>
  </div>
</header>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      <div class="progress-box">
        <div class="progress-label"><span>${escapeHtml(t.progressLabel)}</span><span id="progress-text">0%</span></div>
        <div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div>
      </div>
      <nav class="site-nav">${renderNav(loc, slug)}</nav>
    </div>
  </aside>
  <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  <main class="main" id="main">
    <div class="content-wrap">
      ${content}
    </div>
    <aside class="toc" id="toc"><div class="toc-title">${escapeHtml(t.tocTitle)}</div>${page ? renderToc(page.toc, loc) : ''}</aside>
  </main>
</div>
<div class="search-modal" id="search-modal" hidden>
  <div class="search-panel">
    <div class="search-head">
      <input id="search-input" type="search" placeholder="${escapeHtml(t.searchPlaceholder)}" autocomplete="off">
      <button class="icon-btn" id="search-close" type="button" aria-label="Close">&#10005;</button>
    </div>
    <div class="search-results" id="search-results"></div>
  </div>
</div>
<footer class="footer">
  <span>Ceres Wiki · CeresASM + Ceres-C + Ceres STDLIB</span>
  <span class="footer-hint">${escapeHtml(t.footerHint)}</span>
</footer>
<script type="module" src="/assets/app.js"></script>
<script type="module" src="/assets/demos.js"></script>
</body>
</html>`;
}

export { otherLocale };
