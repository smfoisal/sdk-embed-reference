const injected = new Set<string>();

/**
 * @font-face does not work inside a shadow root, so font stylesheets go into
 * the HOST document <head>. De-duplicated across components and re-inits.
 */
export function ensureFonts(urls: string[]) {
  for (const url of urls) {
    if (injected.has(url) || document.querySelector(`link[href="${CSS.escape(url)}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.crossOrigin = 'anonymous';
    link.dataset.flarie = 'font';
    document.head.appendChild(link);
    injected.add(url);
  }
}
