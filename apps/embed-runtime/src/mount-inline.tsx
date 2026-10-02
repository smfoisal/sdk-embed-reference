import { createRoot, type Root } from 'react-dom/client';
import type { FlarieComponentName, FlarieComponentProps, FlarieEvent } from '@flarie/contract';
import { createMemoryNavigation, FlarieProvider } from '@flarie/core';
import { toCssText, type ResolvedTokens } from '@flarie/tokens';
import { uiStyles } from '@flarie/ui';
import { baseStyles } from './base-styles';
import { ErrorBoundary } from './ErrorBoundary';
import type { InlineModule, InternalHandle, SharedContext } from './types';

function defineHostElement(tag: string) {
  // A real custom element per component gives partners a stable selector:
  //   flarie-game-list { margin-top: 24px }            (the box)
  //   flarie-game-list::part(row) { … }                (exposed internals)
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}

function resolveTarget(target: string | HTMLElement): HTMLElement {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) throw new Error(`[Flarie] mount target not found: ${String(target)}`);
  return el;
}

/**
 * Inline strategy: our own React root inside a Shadow DOM, inside the partner page.
 *
 *   <div id="games">                      ← partner's element
 *     <flarie-game-list>                   ← host element
 *       #shadow-root
 *         <style> tokens </style>          ← swapped by updateAppearance()
 *         <style> base + ui </style>
 *         <style> feature </style>         ← arrives with the lazy chunk
 *         <div class="fl-root">            ← React root
 *         <div class="fl-root fl-portal">  ← modals portal here
 */
export function createInlineHandle<K extends FlarieComponentName>(
  name: K,
  load: () => Promise<InlineModule>,
  initialProps: FlarieComponentProps[K],
  shared: SharedContext,
): InternalHandle<K> {
  let props = initialProps;
  let host: HTMLElement | null = null;
  let root: Root | null = null;
  let themeStyle: HTMLStyleElement | null = null;
  let portalContainer: HTMLElement | null = null;
  let loaded: InlineModule | null = null;
  let released = false;

  const emit = (event: FlarieEvent) => props.onEvent?.(event);
  // Read props lazily so update({ onNavigate }) takes effect.
  const navigation = createMemoryNavigation({ onNavigate: (path) => props.onNavigate?.(path) });

  function render() {
    if (!root) return;
    // Contract-level callbacks are handled here; the feature gets its own props only.
    const { onNavigate: _nav, onEvent: _evt, ...featureProps } = props;
    const Feature = loaded?.Component;
    root.render(
      <FlarieProvider
        value={{
          api: shared.api,
          entitlements: shared.entitlements,
          texts: shared.texts,
          navigation,
          portalContainer,
          emit,
        }}
      >
        <ErrorBoundary name={name} onError={(message) => emit({ type: 'component.error', data: { component: name, message } })}>
          {Feature ? <Feature {...featureProps} /> : <div className="fl-loading" aria-busy="true" />}
        </ErrorBoundary>
      </FlarieProvider>,
    );
  }

  return {
    mount(target) {
      if (released) throw new Error(`[Flarie] "${name}" handle was unmounted; create a new one`);
      if (host) throw new Error(`[Flarie] "${name}" is already mounted`);
      const container = resolveTarget(target);

      const tag = `flarie-${name}`;
      defineHostElement(tag);
      host = document.createElement(tag);
      const shadow = host.attachShadow({ mode: 'open' });

      themeStyle = document.createElement('style');
      themeStyle.textContent = toCssText(shared.getTokens());
      const baseStyle = document.createElement('style');
      baseStyle.textContent = baseStyles + uiStyles;
      const featureStyle = document.createElement('style');

      const mountPoint = document.createElement('div');
      mountPoint.className = 'fl-root';
      portalContainer = document.createElement('div');
      portalContainer.className = 'fl-root fl-portal';

      shadow.append(themeStyle, baseStyle, featureStyle, mountPoint, portalContainer);
      container.appendChild(host);

      root = createRoot(mountPoint);
      render();

      load()
        .then((mod) => {
          if (released) return;
          loaded = mod;
          featureStyle.textContent = mod.styles;
          render();
        })
        .catch((err: unknown) => {
          console.error(`[Flarie] failed to load "${name}"`, err);
          emit({ type: 'component.error', data: { component: name, message: 'Failed to load component' } });
        });
    },

    update(next) {
      props = { ...props, ...next };
      render();
    },

    applyTheme(tokens: ResolvedTokens) {
      if (themeStyle) themeStyle.textContent = toCssText(tokens);
    },

    unmount() {
      released = true;
      root?.unmount();
      host?.remove();
      root = null;
      host = null;
      themeStyle = null;
      portalContainer = null;
    },
  };
}
