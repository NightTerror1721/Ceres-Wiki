// Ceres Wiki - renderizador de Markdown y MDX (sin dependencias).
//
// SOPORTA MDX: ademas del Markdown (encabezados, listas anidadas, tablas, citas, bloques de
// codigo con lenguaje y titulo, enfasis, enlaces, imagenes, tareas), reconoce etiquetas de
// componente en mayuscula al inicio de linea o sueltas: <Callout>, <Steps>/<Step>, <Tabs>/<Tab>,
// <Cards>/<Card>, <GameDemo>, <Quiz>, <Output>, <Badge>. El HTML de un componente se genera aqui;
// el comportamiento interactivo lo anade public/app.js y public/demos.js.

import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml, highlight } from './highlight.js';

const COMPONENTS = new Set([
  'Callout', 'Note', 'Tip', 'Warn', 'Danger', 'Info', 'Steps', 'Step', 'Tabs', 'Tab',
  'Cards', 'Card', 'GameDemo', 'Quiz', 'Output', 'Badge', 'Key', 'Ref', 'Include'
]);

const TOKEN_RE = /\x00([FM])(\d+)\x00/g;

function slugify(text) {
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'seccion';
}

function findTagEnd(text, start) {
  let quote = null;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

function parseProps(openTag) {
  const props = {};
  const inner = openTag.replace(/^<[A-Za-z0-9]+/, '').replace(/\/?>$/, '');
  const re = /([A-Za-z_][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const key = m[1];
    if (!key) continue;
    props[key] = m[2] ?? m[3] ?? m[4] ?? m[5] ?? true;
  }
  return props;
}

function findClosing(text, from, name) {
  const openRe = new RegExp(`<${name}(?=[\\s/>])`, 'g');
  const closeRe = new RegExp(`</${name}\\s*>`, 'g');
  let depth = 1;
  let i = from;
  while (i < text.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(text);
    const c = closeRe.exec(text);
    if (!c) return null;
    if (o && o.index < c.index) {
      const end = findTagEnd(text, o.index);
      if (end !== -1 && !/\/\s*>$/.test(text.slice(o.index, end + 1))) depth++;
      i = end === -1 ? o.index + 1 : end + 1;
      continue;
    }
    depth--;
    if (depth === 0) return { start: c.index, end: closeRe.lastIndex };
    i = closeRe.lastIndex;
  }
  return null;
}

class Doc {
  constructor(options = {}) {
    this.t = options.strings || {};
    this.locale = options.locale || 'es';
    this.codes = [];
    this.comps = [];
    this.toc = [];
  }

  // ---- bloques de codigo -------------------------------------------------
  extractFences(text) {
    const lines = text.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)\s*(.*)$/);
      if (m) {
        const fence = m[1][0];
        const lang = (m[2] || '').toLowerCase();
        const meta = m[3] || '';
        const body = [];
        i++;
        while (i < lines.length && !new RegExp(`^ {0,3}${fence}{${m[1].length},}\\s*$`).test(lines[i])) {
          body.push(lines[i]);
          i++;
        }
        i++; // cierre
        const idx = this.codes.push({ lang, meta, code: body.join('\n') }) - 1;
        out.push(`\x00F${idx}\x00`);
      } else {
        out.push(lines[i]);
        i++;
      }
    }
    return out.join('\n');
  }

  // ---- componentes MDX ---------------------------------------------------
  expandComponents(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const lt = text.indexOf('<', i);
      if (lt === -1) { out += text.slice(i); break; }
      // No expandir dentro de codigo inline (backticks en la misma linea).
      const lineStart = text.lastIndexOf('\n', lt - 1) + 1;
      const before = text.slice(lineStart, lt);
      if ((before.match(/`/g) || []).length % 2 === 1) { out += text.slice(i, lt + 1); i = lt + 1; continue; }
      const m = /^<([A-Z][A-Za-z0-9]*)/.exec(text.slice(lt));
      if (!m || !COMPONENTS.has(m[1])) { out += text.slice(i, lt + 1); i = lt + 1; continue; }
      const tagEnd = findTagEnd(text, lt);
      if (tagEnd === -1) { out += text.slice(i, lt + 1); i = lt + 1; continue; }
      const name = m[1];
      const openTag = text.slice(lt, tagEnd + 1);
      const props = parseProps(openTag);
      out += text.slice(i, lt);
      if (/\/\s*>$/.test(openTag)) {
        const idx = this.comps.push({ name, props, children: '' }) - 1;
        out += `\x00M${idx}\x00`;
        i = tagEnd + 1;
        continue;
      }
      const close = findClosing(text, tagEnd + 1, name);
      if (!close) { out += text.slice(i, lt + 1); i = lt + 1; continue; }
      const idx = this.comps.push({ name, props, children: text.slice(tagEnd + 1, close.start) }) - 1;
      out += `\x00M${idx}\x00`;
      i = close.end;
    }
    return out;
  }

  renderScope(text) {
    const expanded = this.expandComponents(text);
    const blocks = this.parseBlocks(expanded.split('\n'));
    return blocks.map((b) => this.renderBlock(b)).join('\n');
  }

  renderInline(text) {
    if (text == null) return '';
    const codes = [];
    let s = String(text).replace(/(`+)([\s\S]*?)\1/g, (mm, ticks, code) => {
      codes.push(escapeHtml(code));
      return `\x00IC${codes.length - 1}\x00`;
    });
    s = escapeHtml(s);
    // imagenes
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (mm, alt, src) => {
      return `<img src="${src}" alt="${alt}" loading="lazy">`;
    });
    // enlaces
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (mm, label, href) => {
      const external = /^https?:/i.test(href);
      const attrs = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${href}"${attrs}>${label}</a>`;
    });
    // autolinks
    s = s.replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, (mm, url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
    // enfasis
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // saltos duros
    s = s.replace(/  \n/g, '<br>\n');
    s = s.replace(/\n/g, ' ');
    // tokens embebidos y codigo inline
    s = s.replace(/\x00IC(\d+)\x00/g, (mm, id) => `<code class="inline">${codes[Number(id)]}</code>`);
    s = s.replace(/\x00M(\d+)\x00/g, (mm, id) => this.renderComponent(this.comps[Number(id)]));
    return s;
  }

  // ---- analisis de bloques ----------------------------------------------
  isBlockStart(line) {
    return (
      /^ {0,3}(#{1,6})\s+/.test(line) ||
      /^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line) ||
      /^ {0,3}>/.test(line) ||
      /^ {0,3}([-*+]|\d{1,9}[.)])\s+/.test(line) ||
      /^\x00[FM]\d+\x00\s*$/.test(line) ||
      /^ {0,3}<([a-z][a-z0-9-]*)\b/.test(line) ||
      /^ {0,3}<!--/.test(line)
    );
  }

  parseBlocks(lines) {
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '') { i++; continue; }

      const token = line.trim().match(/^\x00([FM])(\d+)\x00$/);
      if (token) { blocks.push({ type: 'token', kind: token[1], id: Number(token[2]) }); i++; continue; }

      const heading = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); i++; continue; }

      if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }

      if (/^ {0,3}<!--/.test(line) || /^ {0,3}<([a-z][a-z0-9-]*)\b/.test(line)) {
        const raw = [];
        while (i < lines.length && lines[i].trim() !== '') { raw.push(lines[i]); i++; }
        blocks.push({ type: 'raw', html: raw.join('\n') });
        continue;
      }

      if (/^ {0,3}>/.test(line)) {
        const quote = [];
        while (i < lines.length && (/^ {0,3}>/.test(lines[i]) || lines[i].trim() === '')) {
          if (lines[i].trim() === '' && !/^ {0,3}>/.test(lines[i + 1] || '')) break;
          quote.push(lines[i].replace(/^ {0,3}>\s?/, ''));
          i++;
        }
        blocks.push({ type: 'quote', text: quote.join('\n') });
        continue;
      }

      if (this.isTableStart(lines, i)) {
        const { html, next } = this.parseTable(lines, i);
        blocks.push({ type: 'html', html });
        i = next;
        continue;
      }

      if (/^ {0,3}([-*+]|\d{1,9}[.)])\s+/.test(line)) {
        const { html, next } = this.parseList(lines, i);
        blocks.push({ type: 'html', html });
        i = next;
        continue;
      }

      const para = [];
      while (i < lines.length && lines[i].trim() !== '' && !this.isBlockStart(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      if (para.length === 0) { para.push(lines[i]); i++; }
      blocks.push({ type: 'paragraph', text: para.join('\n') });
    }
    return blocks;
  }

  isTableStart(lines, i) {
    if (!lines[i] || !lines[i].includes('|')) return false;
    const sep = lines[i + 1];
    return !!sep && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(sep);
  }

  splitRow(row) {
    let s = row.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  }

  parseTable(lines, i) {
    const head = this.splitRow(lines[i]);
    const sep = this.splitRow(lines[i + 1]);
    const align = sep.map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : ''));
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
      rows.push(this.splitRow(lines[j]));
      j++;
    }
    let html = '<div class="table-wrap"><table>';
    html += '<thead><tr>' + head.map((c, k) => `<th${align[k] ? ` style="text-align:${align[k]}"` : ''}>${this.renderInline(c)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>' + rows.map((r) => '<tr>' + head.map((_, k) => `<td${align[k] ? ` style="text-align:${align[k]}"` : ''}>${this.renderInline(r[k] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
    html += '</table></div>';
    return { html, next: j };
  }

  parseList(lines, start) {
    const first = lines[start].match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
    const baseIndent = first[1].length;
    const ordered = /\d/.test(first[2]);
    const items = [];
    let i = start;
    const itemAt = (line) => {
      const m = line.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
      return m && m[1].length === baseIndent ? { marker: m[2], text: m[3] } : null;
    };
    while (i < lines.length) {
      const it = itemAt(lines[i]);
      if (!it) break;
      const content = [it.text];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') {
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          const nxt = lines[j];
          if (nxt && nxt.match(/^\s*/)[0].length > baseIndent && !itemAt(nxt)) { content.push(''); i++; continue; }
          break;
        }
        if (itemAt(l)) break;
        const ind = l.match(/^\s*/)[0].length;
        if (ind <= baseIndent && l.trim() !== '') break;
        content.push(l.slice(Math.min(baseIndent + 2, ind)));
        i++;
      }
      items.push(content.join('\n'));
    }
    const tag = ordered ? 'ol' : 'ul';
    const html = `<${tag} class="md-list">` + items.map((c) => {
      const task = c.match(/^\[([ xX])\]\s+([\s\S]*)$/);
      if (task) {
        const checked = task[1].toLowerCase() === 'x';
        return `<li class="task${checked ? ' done' : ''}"><input type="checkbox" disabled${checked ? ' checked' : ''}> ${this.renderScope(task[2])}</li>`;
      }
      return `<li>${this.renderScope(c)}</li>`;
    }).join('') + `</${tag}>`;
    return { html, next: i };
  }

  // ---- render ------------------------------------------------------------
  renderBlock(block) {
    switch (block.type) {
      case 'token':
        return block.kind === 'F' ? this.renderCode(this.codes[block.id]) : this.renderComponent(this.comps[block.id]);
      case 'html':
      case 'raw':
        return block.html;
      case 'hr':
        return '<hr>';
      case 'quote':
        return `<blockquote>${this.renderScope(block.text)}</blockquote>`;
      case 'heading': {
        const id = slugify(block.text);
        if (block.level === 2 || block.level === 3) {
          this.toc.push({ level: block.level, id, text: block.text.replace(/[`*_~]/g, '') });
        }
        return `<h${block.level} id="${id}">${this.renderInline(block.text)}</h${block.level}>`;
      }
      case 'paragraph':
      default:
        return `<p>${this.renderInline(block.text)}</p>`;
    }
  }

  renderCode(info) {
    const { lang, meta, code } = info;
    const titleMatch = /title=(?:"([^"]*)"|'([^']*)'|([^\s]+))/.exec(meta || '');
    const title = titleMatch ? (titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]) : '';
    const hl = new Set();
    const hlMatch = /\{([\d,\s-]+)\}/.exec(meta || '');
    if (hlMatch) {
      hlMatch[1].split(',').forEach((part) => {
        const r = part.trim().split('-').map(Number);
        if (r.length === 2) { for (let n = r[0]; n <= r[1]; n++) hl.add(n); }
        else if (!Number.isNaN(r[0])) hl.add(r[0]);
      });
    }
    const highlighted = highlight(code, lang);
    const lines = highlighted.split('\n');
    const body = lines.map((l, k) => `<span class="cl${hl.has(k + 1) ? ' cl-hl' : ''}">${l || ' '}</span>`).join('\n');
    const label = (lang || 'text').toUpperCase();
    return [
      '<figure class="code-block">',
      `<figcaption><span class="code-lang">${escapeHtml(label)}</span>`,
      title ? `<span class="code-title">${escapeHtml(title)}</span>` : '',
      `<button class="code-copy" type="button" aria-label="${escapeHtml(this.t.copy || 'Copiar')}">${escapeHtml(this.t.copy || 'Copiar')}</button></figcaption>`,
      `<pre><code class="language-${escapeHtml(lang || 'text')}">${body}</code></pre>`,
      '</figure>'
    ].join('');
  }

  renderComponent(comp) {
    if (!comp) return '';
    const p = comp.props || {};
    const children = comp.children || '';
    const attr = (v) => escapeHtml(String(v ?? ''));
    switch (comp.name) {
      case 'Callout': case 'Note': case 'Tip': case 'Warn': case 'Danger': case 'Info': {
        const typeMap = { Note: 'info', Tip: 'tip', Warn: 'warn', Danger: 'danger', Info: 'info' };
        const type = (p.type || typeMap[comp.name] || 'info').toLowerCase();
        const icons = { info: 'i', tip: '?', warn: '!', danger: 'x', success: 'v' };
        const title = p.title ? `<div class="callout-title">${escapeHtml(p.title)}</div>` : '';
        return `<div class="callout callout-${attr(type)}"><div class="callout-icon">${icons[type] || 'i'}</div><div class="callout-main">${title}<div class="callout-body">${this.renderScope(children)}</div></div></div>`;
      }
      case 'Steps':
        return `<ol class="steps">${this.renderScope(children)}</ol>`;
      case 'Step':
        return `<li class="step">${p.title ? `<div class="step-head">${this.renderInline(String(p.title))}</div>` : ''}<div class="step-body">${this.renderScope(children)}</div></li>`;
      case 'Tabs':
        return `<div class="tabs" data-tabs>${this.renderScope(children)}</div>`;
      case 'Tab':
        return `<section class="tab" data-label="${attr(p.label || 'Tab')}">${this.renderScope(children)}</section>`;
      case 'Cards':
        return `<div class="cards">${this.renderScope(children)}</div>`;
      case 'Card': {
        const inner = `<div class="card-title">${p.icon ? `<span class="card-icon">${escapeHtml(p.icon)}</span>` : ''}${escapeHtml(p.title || '')}</div><div class="card-desc">${this.renderScope(children)}</div>`;
        return p.href
          ? `<a class="card" href="${attr(p.href)}">${inner}</a>`
          : `<div class="card">${inner}</div>`;
      }
      case 'GameDemo': {
        const kind = attr(p.kind || 'pong');
        const title = p.title ? `<div class="game-head"><span class="game-title">${escapeHtml(p.title)}</span><span class="game-kind">${kind}</span></div>` : '';
        return `<div class="game-demo" data-game="${kind}" data-height="${attr(p.height || 260)}">${title}<div class="game-stage"><canvas></canvas></div><div class="game-controls"></div>${children.trim() ? `<div class="game-desc">${this.renderScope(children)}</div>` : ''}</div>`;
      }
      case 'Quiz': {
        const options = String(p.options || '').split('|').map((o) => o.trim()).filter(Boolean);
        const list = options.map((o, k) => `<button type="button" class="quiz-option" data-index="${k}">${escapeHtml(o)}</button>`).join('');
        return `<div class="quiz" data-quiz data-answer="${attr(p.answer ?? 0)}" data-explain="${attr(p.explain || '')}"><div class="quiz-q">${this.renderInline(String(p.question || ''))}</div><div class="quiz-options">${list}</div><div class="quiz-feedback" hidden></div></div>`;
      }
      case 'Output':
        return `<figure class="output"><figcaption>${escapeHtml(p.title || this.t.output || 'Salida')}</figcaption><pre>${escapeHtml(children.replace(/^\n+|\n+$/g, ''))}</pre></figure>`;
      case 'Badge':
        return `<span class="badge badge-${attr(p.type || 'default')}">${escapeHtml(children.trim() || p.text || '')}</span>`;
      case 'Key':
        return `<kbd>${escapeHtml(children.trim() || p.text || '')}</kbd>`;
      case 'Include': {
        // Inserta un fragmento generado: content/<locale>/_gen/<file>. El idioma lo pone el doc.
        const file = String(p.file || '').replace(/\.\./g, '').replace(/[\\/]+/g, '/').trim();
        const locale = this.locale || 'en';
        const candidates = [`content/${locale}/_gen/${file}`, `content/en/_gen/${file}`];
        for (const rel of candidates) {
          const full = path.resolve(process.cwd(), rel);
          if (fs.existsSync(full)) return this.renderScope(fs.readFileSync(full, 'utf8'));
        }
        return `<!-- Include not found: ${escapeHtml(file)} -->`;
      }
      default:
        return `<div class="mdx-block mdx-${comp.name.toLowerCase()}">${this.renderScope(children)}</div>`;
    }
  }
}

export function renderDocument(raw, options = {}) {
  const doc = new Doc(options);
  const text = String(raw).replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  const withFences = doc.extractFences(text);
  let html = doc.renderScope(withFences);
  // Enlaza los enlaces internos con el prefijo del idioma (/es/wiki/… o /en/wiki/…).
  const locale = options.locale || 'es';
  html = html.replace(/href="\/wiki\//g, `href="/${locale}/wiki/`);
  return { html, toc: doc.toc };
}
