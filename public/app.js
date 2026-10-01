// Ceres Wiki - comportamiento del cliente (sin frameworks).
// Router SPA multilingue, busqueda, progreso, tema, TOC, copiado, pestanas y quiz.

const CFG = window.__CERES__ || { locale: 'en', slug: 'inicio', ui: {} };
const UI = Object.assign({
  copy: 'Copiar', copied: 'Copiado', noResults: 'Sin resultados para',
  searchHint: 'Escribe al menos 2 letras.', viewSource: 'Ver fuente',
  hideSource: 'Ocultar fuente', markRead: 'Marcar como leída', markedRead: '✓ Leída',
  quizCorrect: '¡Correcto! ', quizWrong: 'Casi. ', tocEmpty: 'Sin secciones.',
  sectionFallback: 'Wiki'
}, CFG.ui || {});

let LOCALE = CFG.locale;

const state = { progress: loadProgress(), searchTimer: null };

/* ---------------- tema ---------------- */
function initTheme() {
  const saved = localStorage.getItem('ceres-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = theme === 'dark' ? '&#9789;' : '&#9788;';
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ceres-theme', next);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = next === 'dark' ? '&#9789;' : '&#9788;';
}

/* ---------------- progreso ---------------- */
function loadProgress() {
  try { return new Set(JSON.parse(localStorage.getItem('ceres-progress') || '[]')); }
  catch { return new Set(); }
}
function saveProgress() { localStorage.setItem('ceres-progress', JSON.stringify([...state.progress])); }
function updateProgress() {
  const total = document.querySelectorAll('.nav-link').length;
  const pct = total ? Math.round((state.progress.size / total) * 100) : 0;
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  if (bar) bar.style.width = pct + '%';
  if (text) text.textContent = pct + '%';
  document.querySelectorAll('.nav-link').forEach((a) => a.classList.toggle('done', state.progress.has(a.dataset.slug)));
  const slug = document.body.dataset.slug;
  const doneBtn = document.getElementById('mark-done');
  if (doneBtn) {
    const done = state.progress.has(slug);
    doneBtn.textContent = done ? UI.markedRead : UI.markRead;
    doneBtn.classList.toggle('active', done);
  }
}

/* ---------------- render de pagina ---------------- */
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function renderPage(page) {
  LOCALE = page.locale || LOCALE;
  const wrap = document.querySelector('.content-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  wrap.appendChild(el('div', 'breadcrumbs',
    `<span>${esc(page.section || UI.sectionFallback)}</span><span class="sep">/</span><span class="current">${esc(page.title)}</span>`));

  if (page.fallback && LOCALE !== 'en') {
    wrap.appendChild(el('div', 'fallback-note', 'This page is not translated yet; it is shown in Spanish.'));
  }

  const article = el('article', 'prose', page.html);
  article.id = 'article';
  wrap.appendChild(article);

  wrap.appendChild(el('div', 'page-tools',
    `<button class="tool-btn" id="toggle-source" type="button">${esc(UI.viewSource)}</button>` +
    `<button class="tool-btn" id="mark-done" type="button" data-slug="${esc(page.slug)}">${esc(UI.markRead)}</button>`));

  const src = el('pre', 'source-view', esc(page.source || ''));
  src.id = 'source-view'; src.hidden = true;
  wrap.appendChild(src);

  const pager = el('nav', 'pager');
  pager.innerHTML =
    (page.prev
      ? `<a class="pager-prev" href="/${page.locale}/wiki/${page.prev.slug}" data-slug="${page.prev.slug}"><span class="pager-label">&larr; ${esc(UI.prev || 'Anterior')}</span><span class="pager-title">${esc(page.prev.title)}</span></a>`
      : '<span class="pager-spacer"></span>') +
    (page.next
      ? `<a class="pager-next" href="/${page.locale}/wiki/${page.next.slug}" data-slug="${page.next.slug}"><span class="pager-label">${esc(UI.next || 'Siguiente')} &rarr;</span><span class="pager-title">${esc(page.next.title)}</span></a>`
      : '<span class="pager-spacer"></span>');
  wrap.appendChild(pager);

  const toc = document.getElementById('toc');
  if (toc) {
    toc.innerHTML = `<div class="toc-title">${esc(UI.tocTitle || 'On this page')}</div>` +
      (page.toc && page.toc.length
        ? '<ul class="toc-list">' + page.toc.map((h) => `<li class="toc-item toc-h${h.level}"><a href="#${esc(h.id)}" data-toc="${esc(h.id)}">${esc(h.text)}</a></li>`).join('') + '</ul>'
        : `<p class="toc-empty">${esc(UI.tocEmpty)}</p>`);
  }

  document.title = `${page.title} · Ceres Wiki`;
  document.body.dataset.slug = page.slug;
  document.body.dataset.locale = page.locale;
  document.documentElement.lang = page.locale;
  document.documentElement.setAttribute('data-page', page.slug);
  document.querySelectorAll('.nav-link').forEach((a) => a.classList.toggle('active', a.dataset.slug === page.slug));
  document.querySelectorAll('.lang-link').forEach((a) => {
    a.setAttribute('href', `/${a.dataset.langSwitch}/wiki/${page.slug}`);
  });

  enhanceArticle();
  updateProgress();
  installTocObserver();
  document.dispatchEvent(new CustomEvent('ceres:content', { detail: { slug: page.slug } }));
}

function localeOfHref(href) {
  const m = String(href).match(/^\/([a-z]{2})\/wiki\//);
  return m ? m[1] : null;
}
function slugOfHref(href) {
  const m = String(href).match(/\/wiki\/([^#?]+)/);
  return m ? m[1] : null;
}

async function navigate(slug, { push = true } = {}) {
  try {
    const res = await fetch(`/api/page?lang=${encodeURIComponent(LOCALE)}&p=${encodeURIComponent(slug)}`);
    if (!res.ok) { window.location.href = `/${LOCALE}/wiki/${slug}`; return; }
    const page = await res.json();
    renderPage(page);
    if (push) history.pushState({ slug }, '', `/${page.locale}/wiki/${page.slug}`);
    window.scrollTo(0, 0);
    closeSidebar();
    const modal = document.getElementById('search-modal');
    if (modal) modal.hidden = true;
  } catch {
    window.location.href = `/${LOCALE}/wiki/${slug}`;
  }
}

/* ---------------- mejoras del articulo ---------------- */
function enhanceArticle() {
  document.querySelectorAll('.code-copy').forEach((btn) => {
    if (btn.dataset.ready) return;
    btn.dataset.ready = '1';
    btn.addEventListener('click', () => {
      const fig = btn.closest('.code-block');
      const code = fig ? fig.querySelector('code') : null;
      if (!code) return;
      const text = code.innerText.replace(/^\d+\s?/gm, '');
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = UI.copied;
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = UI.copy; btn.classList.remove('copied'); }, 1600);
      });
    });
  });

  document.querySelectorAll('.tabs[data-tabs]').forEach((tabs) => {
    if (tabs.dataset.ready) return;
    tabs.dataset.ready = '1';
    const panes = [...tabs.querySelectorAll(':scope > .tab')];
    if (!panes.length) return;
    const bar = el('div', 'tab-buttons');
    panes.forEach((pane, i) => {
      const b = el('button', 'tab-btn' + (i === 0 ? ' active' : ''), esc(pane.dataset.label || `Tab ${i + 1}`));
      b.type = 'button';
      b.addEventListener('click', () => {
        panes.forEach((p) => p.classList.remove('active'));
        bar.querySelectorAll('.tab-btn').forEach((x) => x.classList.remove('active'));
        pane.classList.add('active'); b.classList.add('active');
      });
      bar.appendChild(b);
      pane.classList.toggle('active', i === 0);
    });
    tabs.insertBefore(bar, panes[0]);
  });

  document.querySelectorAll('.quiz[data-quiz]').forEach((quiz) => {
    if (quiz.dataset.ready) return;
    quiz.dataset.ready = '1';
    const answer = Number(quiz.dataset.answer || 0);
    const explain = quiz.dataset.explain || '';
    const feedback = quiz.querySelector('.quiz-feedback');
    quiz.querySelectorAll('.quiz-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        if (quiz.dataset.answered) return;
        quiz.dataset.answered = '1';
        const idx = Number(opt.dataset.index);
        quiz.querySelectorAll('.quiz-option').forEach((o, i) => {
          if (i === answer) o.classList.add('correct');
          else if (i === idx) o.classList.add('wrong');
        });
        if (feedback) {
          feedback.hidden = false;
          feedback.innerHTML = (idx === answer ? UI.quizCorrect : UI.quizWrong) + esc(explain);
        }
      });
    });
  });
}

function installTocObserver() {
  const headings = [...document.querySelectorAll('#article h2[id], #article h3[id]')];
  const links = [...document.querySelectorAll('#toc a[data-toc]')];
  if (!headings.length || !links.length) return;
  if (window.__tocObserver) window.__tocObserver.disconnect();
  const map = new Map(links.map((l) => [l.dataset.toc, l]));
  window.__tocObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        links.forEach((l) => l.classList.remove('active'));
        const link = map.get(entry.target.id);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
  headings.forEach((h) => window.__tocObserver.observe(h));
}

/* ---------------- sidebar movil ---------------- */
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-backdrop')?.classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('show');
}

/* ---------------- busqueda ---------------- */
function openSearch() {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  modal.hidden = false;
  const input = document.getElementById('search-input');
  input.value = '';
  input.focus();
  renderSearchHint();
}
function closeSearch() { const m = document.getElementById('search-modal'); if (m) m.hidden = true; }
function renderSearchHint() {
  const box = document.getElementById('search-results');
  if (box) box.innerHTML = `<p class="search-hint">${esc(UI.searchHint)}</p>`;
}
function highlightSnippet(text, q) {
  let out = esc(text);
  for (const term of q.split(/\s+/).filter((t) => t.length > 1)) {
    out = out.replace(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
  }
  return out;
}
async function runSearch(q) {
  const box = document.getElementById('search-results');
  if (!box) return;
  if (q.trim().length < 2) { renderSearchHint(); return; }
  const res = await fetch(`/api/search?lang=${encodeURIComponent(LOCALE)}&q=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!data.results.length) {
    box.innerHTML = `<p class="search-empty">${esc(UI.noResults)} <strong>${esc(q)}</strong>.</p>`;
    return;
  }
  box.innerHTML = '';
  data.results.forEach((r) => {
    const a = el('a', 'search-result',
      `<div class="search-result-section">${esc(r.section)}</div>` +
      `<div class="search-result-title">${esc(r.title)}</div>` +
      `<div class="search-result-snippet">…${highlightSnippet(r.snippet, q)}…</div>`);
    a.href = `/${LOCALE}/wiki/${r.slug}`;
    a.dataset.slug = r.slug;
    box.appendChild(a);
  });
}

/* ---------------- eventos ---------------- */
function bindGlobal() {
  document.addEventListener('click', (e) => {
    const langLink = e.target.closest('a[data-lang-switch]');
    if (langLink) return;   // recarga completa: cambia idioma e interfaz de una vez

    const link = e.target.closest('a[data-slug], a[href*="/wiki/"]');
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      const href = link.getAttribute('href') || '';
      const slug = slugOfHref(href) || link.dataset.slug;
      if (!slug) return;
      const targetLocale = localeOfHref(href);
      if (targetLocale && targetLocale !== LOCALE) { window.location.href = href; return; }
      e.preventDefault();
      navigate(slug);
      return;
    }
    if (e.target.closest('#theme-toggle')) { toggleTheme(); return; }
    if (e.target.closest('#menu-btn')) { openSidebar(); return; }
    if (e.target.closest('#sidebar-backdrop')) { closeSidebar(); return; }
    if (e.target.closest('#search-open')) { openSearch(); return; }
    if (e.target.closest('#search-close')) { closeSearch(); return; }
    if (e.target.closest('.search-modal') && !e.target.closest('.search-panel')) { closeSearch(); return; }
    if (e.target.closest('#toggle-source')) {
      const sv = document.getElementById('source-view');
      const btn = e.target.closest('#toggle-source');
      if (sv) { sv.hidden = !sv.hidden; btn.textContent = sv.hidden ? UI.viewSource : UI.hideSource; }
      return;
    }
    if (e.target.closest('#mark-done')) {
      const slug = document.body.dataset.slug;
      if (state.progress.has(slug)) state.progress.delete(slug); else state.progress.add(slug);
      saveProgress(); updateProgress();
      return;
    }
    const result = e.target.closest('.search-result');
    if (result && result.dataset.slug) { e.preventDefault(); closeSearch(); navigate(result.dataset.slug); }
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeSearch(); closeSidebar(); }
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => runSearch(searchInput.value), 140);
    });
  }

  window.addEventListener('popstate', () => {
    const m = location.pathname.match(/^\/([a-z]{2})\/wiki\/(.+)$/);
    if (!m) return;
    if (m[1] !== LOCALE) { window.location.reload(); return; }
    navigate(m[2], { push: false });
  });
}

initTheme();
bindGlobal();
updateProgress();
enhanceArticle();
installTocObserver();
renderSearchHint();
