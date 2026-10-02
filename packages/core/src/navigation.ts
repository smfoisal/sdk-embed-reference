/**
 * Features never touch window.location or a router directly.
 * They talk to this adapter, and each host decides what navigation means.
 */
export interface NavigationAdapter {
  getPath(): string;
  navigate(path: string): void;
  subscribe(listener: () => void): () => void;
}

/** Embedded mode: keep the path in memory and tell the partner. */
export function createMemoryNavigation({
  initialPath = '/',
  onNavigate,
}: {
  initialPath?: string;
  onNavigate?: (path: string) => void;
}): NavigationAdapter {
  let path = initialPath;
  const listeners = new Set<() => void>();
  return {
    getPath: () => path,
    navigate(next) {
      path = next;
      listeners.forEach((l) => l());
      onNavigate?.(next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Standalone Studio: real browser URL (in the real app this wraps your router). */
export function createBrowserNavigation(basePath = ''): NavigationAdapter {
  const read = () => window.location.pathname.slice(basePath.length) || '/';
  return {
    getPath: read,
    navigate(next) {
      window.history.pushState(null, '', `${basePath}${next}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    subscribe(listener) {
      window.addEventListener('popstate', listener);
      return () => window.removeEventListener('popstate', listener);
    },
  };
}
