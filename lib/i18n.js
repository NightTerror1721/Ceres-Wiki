// Ceres Wiki - idiomas. El ingles es el idioma por defecto; el espanol se sirve en /es/.

export const LOCALES = ['en', 'es'];
export const DEFAULT_LOCALE = 'en';
export const LOCALE_LABELS = { es: 'ES', en: 'EN' };
export const LOCALE_NAMES = { es: 'Español', en: 'English' };

const STRINGS = {
  es: {
    searchPlaceholder: 'Buscar en la wiki…',
    searchHint: 'Escribe al menos 2 letras. Ej.: gfx, tilemap, guardar, tarea.',
    noResults: 'Sin resultados para',
    pagesSuffix: 'pág.',
    progressLabel: 'Tu progreso',
    tocTitle: 'En esta página',
    tocEmpty: 'Sin secciones.',
    prev: 'Anterior',
    next: 'Siguiente',
    viewSource: 'Ver fuente',
    hideSource: 'Ocultar fuente',
    markRead: 'Marcar como leída',
    markedRead: '✓ Leída',
    copy: 'Copiar',
    copied: 'Copiado',
    output: 'Salida',
    footerHint: 'Servidor local · node server.js',
    language: 'Idioma',
    notFoundTitle: 'Página no encontrada',
    notFoundText: 'No encontré esa página en la wiki.',
    backHome: 'Volver al inicio',
    quizCorrect: '¡Correcto! ',
    quizWrong: 'Casi. ',
    sectionFallback: 'Wiki',
    errorSection: 'Error',
    onlyInOther: 'Esta página todavía no está traducida; se muestra en inglés.'
  },
  en: {
    searchPlaceholder: 'Search the wiki…',
    searchHint: 'Type at least 2 letters. E.g.: gfx, tilemap, save, task.',
    noResults: 'No results for',
    pagesSuffix: 'pages',
    progressLabel: 'Your progress',
    tocTitle: 'On this page',
    tocEmpty: 'No sections.',
    prev: 'Previous',
    next: 'Next',
    viewSource: 'View source',
    hideSource: 'Hide source',
    markRead: 'Mark as read',
    markedRead: '✓ Read',
    copy: 'Copy',
    copied: 'Copied',
    output: 'Output',
    footerHint: 'Local server · node server.js',
    language: 'Language',
    notFoundTitle: 'Page not found',
    notFoundText: 'I could not find that page in the wiki.',
    backHome: 'Back to start',
    quizCorrect: 'Correct! ',
    quizWrong: 'Almost. ',
    sectionFallback: 'Wiki',
    errorSection: 'Error',
    onlyInOther: 'This page is not translated yet; it is shown in English.'
  }
};

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function resolveLocale(value) {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function ui(locale) {
  return STRINGS[resolveLocale(locale)];
}

export function otherLocale(locale) {
  return resolveLocale(locale) === 'es' ? 'en' : 'es';
}
