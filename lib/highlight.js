// Ceres Wiki - resaltador de sintaxis sin dependencias.
// Cubre C (Ceres-C), CASM, JSON, INI, consola y texto. Devuelve HTML ya escapado.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const C_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'goto', 'sizeof', 'alignof', 'typedef', 'struct', 'union', 'enum', 'static',
  'extern', 'const', 'volatile', 'restrict', 'inline', 'register', 'auto', 'signed',
  'unsigned', 'void', 'asm', '__asm__', '__attribute__', '__interrupt', '__interrupt_vector',
  '__builtin_va_list', '_Generic', '_Static_assert', '_Alignof', '_Noreturn', '_Atomic'
]);

const C_TYPES = new Set([
  'char', 'short', 'int', 'long', 'float', 'double', 'bool', 'size_t', 'ssize_t', 'wchar_t',
  'wint_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t',
  'uint64_t', 'intptr_t', 'uintptr_t', 'intmax_t', 'uintmax_t', 'ptrdiff_t', 'time_t',
  'clock_t', 'FILE', 'va_list', 'fpos_t', 'f64', 'fixed_t', 'div_t', 'lldiv_t', 'mbstate_t',
  'char8_t', 'char16_t', 'char32_t', 'bool', 'size_t', 'uint32_t'
]);

const C_CONSTANTS = new Set([
  'NULL', 'true', 'false', 'EOF', 'SEEK_SET', 'SEEK_CUR', 'SEEK_END', 'EXIT_SUCCESS',
  'EXIT_FAILURE', 'RAND_MAX', 'M_PI', 'M_E', 'INFINITY', 'NAN', 'MB_CUR_MAX', 'BUFSIZ'
]);

const CASM_KEYWORDS = new Set([
  'global', 'let', 'struct', 'union', 'enum', 'alias', 'macro', 'import', 'interrupt',
  'align', 'reserve', 'ifdef', 'ifndef', 'else', 'endif', 'define', 'include', 'assert',
  'true', 'false', 'u8', 'u16', 'u32', 's8', 's16', 's32', 'f32', 'string', 'ptr'
]);

const CASM_TYPES = new Set(['u8', 'u16', 'u32', 's8', 's16', 's32', 'f32', 'string', 'ptr']);

const CASM_REGISTERS = /^(r(?:1[0-5]|[0-9])|f(?:1[0-5]|[0-9])|at|fp|sp|pc|rd|rs|rt|fd|fs|ft)$/;

function classifyCWord(word, after) {
  if (C_KEYWORDS.has(word)) return 'kw';
  if (C_TYPES.has(word)) return 'type';
  if (C_CONSTANTS.has(word)) return 'const';
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(word)) return 'const';
  if (after === '(') return 'fn';
  return 'ident';
}

function classifyCasmWord(word, after) {
  if (CASM_KEYWORDS.has(word)) return 'kw';
  if (CASM_TYPES.has(word)) return 'type';
  if (CASM_REGISTERS.test(word)) return 'reg';
  if (after === ':') return 'label';
  if (/^__/.test(word)) return 'ident';
  return 'ident';
}

// Un escaner con expresion regular maestra: comentarios/strings/preprocesador/numeros/palabras.
function highlightCLike(code, casm) {
  const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[ \t]*[A-Za-z_][^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\b\d(?:[0-9A-Fa-f.xXbBoO_]*[uUlL]*)\b|\b[A-Za-z_]\w*\b)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = pattern.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, m.index));
    const tok = m[0];
    const after = code[m.index + tok.length];
    let cls;
    if (tok.startsWith('//') || tok.startsWith('/*')) cls = 'comment';
    else if (tok.startsWith('#')) cls = 'meta';
    else if (tok.startsWith('"') || tok.startsWith("'")) cls = 'str';
    else if (/^\d/.test(tok)) cls = 'num';
    else cls = casm ? classifyCasmWord(tok, after) : classifyCWord(tok, after);
    out += `<span class="tok-${cls}">${escapeHtml(tok)}</span>`;
    last = m.index + tok.length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}

function highlightJson(code) {
  let out = '';
  let last = 0;
  const re = /("(?:\\.|[^"\\])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, m.index));
    if (m[1]) {
      const after = code.slice(m.index + m[0].length).match(/^\s*:/);
      out += `<span class="tok-${after ? 'key' : 'str'}">${escapeHtml(m[1])}</span>`;
    } else if (m[2]) {
      out += `<span class="tok-num">${escapeHtml(m[2])}</span>`;
    } else {
      out += `<span class="tok-kw">${escapeHtml(m[3])}</span>`;
    }
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}

function highlightIni(code) {
  return code
    .split('\n')
    .map((line) => {
      if (/^\s*[;#]/.test(line)) return `<span class="tok-comment">${escapeHtml(line)}</span>`;
      if (/^\s*\[.*\]\s*$/.test(line)) return `<span class="tok-type">${escapeHtml(line)}</span>`;
      const kv = line.match(/^(\s*)([^=:#]+)([=:])([\s\S]*)$/);
      if (kv) {
        return (
          escapeHtml(kv[1]) +
          `<span class="tok-key">${escapeHtml(kv[2])}</span>` +
          `<span class="tok-op">${kv[3]}</span>` +
          `<span class="tok-str">${escapeHtml(kv[4])}</span>`
        );
      }
      return escapeHtml(line);
    })
    .join('\n');
}

function highlightShell(code) {
  return code
    .split('\n')
    .map((line) => {
      if (/^\s*[#$>]/.test(line)) {
        const m = line.match(/^(\s*[#$>]\s?)([\s\S]*)$/);
        return `<span class="tok-meta">${escapeHtml(m[1])}</span><span class="tok-ident">${escapeHtml(m[2])}</span>`;
      }
      if (/^\s*\/\//.test(line)) return `<span class="tok-comment">${escapeHtml(line)}</span>`;
      const cmd = line.match(/^(\s*)([a-z][\w./-]*)([\s\S]*)$/);
      if (cmd) {
        return `<span class="tok-fn">${escapeHtml(cmd[2])}</span>${escapeHtml(cmd[3])}`;
      }
      return escapeHtml(line);
    })
    .join('\n');
}

const ALIASES = {
  c: 'c', h: 'c', cpp: 'c', cxx: 'c', ceresc: 'c',
  casm: 'casm', asm: 'casm', s: 'casm',
  json: 'json',
  ini: 'ini', toml: 'ini',
  sh: 'shell', bash: 'shell', console: 'shell', shell: 'shell', powershell: 'shell', ps: 'shell',
  text: 'text', txt: 'text', output: 'text', '': 'text'
};

export function highlight(code, lang) {
  const key = ALIASES[(lang || '').toLowerCase()] ?? 'text';
  switch (key) {
    case 'c':
      return highlightCLike(code, false);
    case 'casm':
      return highlightCLike(code, true);
    case 'json':
      return highlightJson(code);
    case 'ini':
      return highlightIni(code);
    case 'shell':
      return highlightShell(code);
    default:
      return escapeHtml(code);
  }
}

export function isKnownLanguage(lang) {
  return Object.prototype.hasOwnProperty.call(ALIASES, (lang || '').toLowerCase());
}
