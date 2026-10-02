/**
 * @flarie/embed-js
 *
 * This package deliberately contains almost nothing: it loads the runtime from
 * the CDN and hands back a typed instance. Because the real code lives on the
 * CDN, partners get fixes and features without upgrading this package.
 *
 *   import { loadFlarie } from '@flarie/embed-js';
 *   const flarie = await loadFlarie({ getSessionToken });
 *   flarie.create('game-list', { onSelect }).mount('#games');
 */
import type { FlarieInitOptions, FlarieInstance, FlarieRuntime } from '@flarie/contract';

export type * from '@flarie/contract';

export interface LoadFlarieOptions extends FlarieInitOptions {
  /**
   * 'v1' (default) follows the latest 1.x release.
   * '1.4.2' pins an exact, immutable build.
   */
  version?: string;
  /** Override for staging / local development. */
  cdnUrl?: string;
}

const DEFAULT_CDN_URL = 'https://cdn.flarie.com/embed';

let runtimePromise: Promise<FlarieRuntime> | null = null;

function loadRuntime(cdnUrl: string, version: string): Promise<FlarieRuntime> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('[Flarie] loadFlarie() can only run in the browser (call it after hydration in SSR apps)'));
  }
  if (window.__FLARIE_RUNTIME__) return Promise.resolve(window.__FLARIE_RUNTIME__);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<FlarieRuntime>((resolve, reject) => {
    const script = document.createElement('script');
    // A <script> tag instead of import(url): the partner's bundler
    // (webpack, Vite, Angular CLI…) never tries to resolve or bundle it.
    script.type = 'module';
    script.src = `${cdnUrl.replace(/\/$/, '')}/${version}/flarie.js`;
    script.crossOrigin = 'anonymous';
    // For pinned versions you can also set script.integrity (SRI).

    script.onload = () => {
      if (window.__FLARIE_RUNTIME__) resolve(window.__FLARIE_RUNTIME__);
      else reject(new Error('[Flarie] runtime loaded but did not register'));
    };
    script.onerror = () => {
      runtimePromise = null; // allow a retry
      script.remove();
      reject(new Error(`[Flarie] could not load runtime from ${script.src}`));
    };
    document.head.appendChild(script);
  });

  return runtimePromise;
}

export async function loadFlarie(options: LoadFlarieOptions): Promise<FlarieInstance> {
  const { version = 'v1', cdnUrl = DEFAULT_CDN_URL, ...initOptions } = options;
  const runtime = await loadRuntime(cdnUrl, version);
  return runtime.init(initOptions);
}
