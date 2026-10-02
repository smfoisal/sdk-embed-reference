import {
  PROTOCOL_VERSION,
  type FlarieComponentName,
  type FlarieComponentProps,
  type HostToStudioMessage,
  type StudioToHostMessage,
} from '@flarie/contract';
import type { ResolvedTokens } from '@flarie/tokens';
import type { InternalHandle, SharedContext } from './types';

type Payload<M> = M extends unknown ? Omit<M, 'source' | 'v'> : never;

/**
 * iframe strategy, used for the full Studio (editor, game engine preview).
 * The partner never writes the iframe or the postMessage code: this does.
 *
 * Security rules:
 *  - The session token goes via postMessage to the EXACT Studio origin, never in the URL.
 *  - Incoming messages are accepted only from our iframe's window AND origin.
 *  - Studio responds with `Content-Security-Policy: frame-ancestors <partner origins>`.
 */
export function createIframeHandle<K extends FlarieComponentName>(
  name: K,
  initialProps: FlarieComponentProps[K],
  shared: SharedContext,
): InternalHandle<K> {
  const studioOrigin = new URL(shared.studioUrl).origin;
  let props = initialProps as FlarieComponentProps['studio'];
  let iframe: HTMLIFrameElement | null = null;

  const post = (msg: Payload<HostToStudioMessage>) =>
    iframe?.contentWindow?.postMessage({ source: 'flarie-host', v: PROTOCOL_VERSION, ...msg }, studioOrigin);

  async function onMessage(e: MessageEvent) {
    if (!iframe || e.source !== iframe.contentWindow || e.origin !== studioOrigin) return;
    const msg = e.data as StudioToHostMessage;
    if (msg?.source !== 'flarie-studio' || msg.v !== PROTOCOL_VERSION) return;

    switch (msg.type) {
      case 'ready':
        post({
          type: 'init',
          token: await shared.session.getAccessToken(),
          tokens: shared.getTokens(),
          texts: shared.texts,
          path: props.path ?? '/',
        });
        break;
      case 'token-request':
        post({ type: 'token', token: await shared.session.getAccessToken() });
        break;
      case 'resize':
        iframe.style.height = `${Math.max(240, Math.ceil(msg.height))}px`;
        break;
      case 'navigate':
        props.onNavigate?.(msg.path);
        break;
      case 'event':
        props.onEvent?.(msg.event);
        break;
    }
  }

  return {
    mount(target) {
      const container = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
      if (!container) throw new Error(`[Flarie] mount target not found: ${String(target)}`);
      iframe = document.createElement('iframe');
      iframe.src = shared.studioUrl;
      iframe.title = 'Flarie Studio';
      iframe.allow = 'clipboard-write; fullscreen';
      iframe.style.cssText = 'display:block;width:100%;height:480px;border:0;background:transparent';
      window.addEventListener('message', onMessage);
      container.appendChild(iframe);
    },
    update(next) {
      const prevPath = props.path;
      props = { ...props, ...(next as Partial<FlarieComponentProps['studio']>) };
      if (props.path && props.path !== prevPath) post({ type: 'navigate', path: props.path });
    },
    applyTheme(tokens: ResolvedTokens) {
      post({ type: 'theme', tokens });
    },
    unmount() {
      window.removeEventListener('message', onMessage);
      iframe?.remove();
      iframe = null;
    },
  } as InternalHandle<K>;
}
