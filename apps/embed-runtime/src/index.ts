/**
 * CDN entry. Loading this file has exactly one side effect: it registers the
 * runtime on window so the loader (@flarie/embed-js) can find it.
 * No global CSS, no history patching, no globals besides this one.
 */
import type { FlarieRuntime } from '@flarie/contract';
import { init } from './init';
import { RUNTIME_VERSION } from './version';

const runtime: FlarieRuntime = { version: RUNTIME_VERSION, init };

if (window.__FLARIE_RUNTIME__) {
  if (window.__FLARIE_RUNTIME__.version !== RUNTIME_VERSION) {
    console.warn(`[Flarie] runtime ${window.__FLARIE_RUNTIME__.version} already loaded; ignoring ${RUNTIME_VERSION}`);
  }
} else {
  window.__FLARIE_RUNTIME__ = runtime;
}
