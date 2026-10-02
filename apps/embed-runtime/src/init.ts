import type { Appearance, FlarieInitOptions, FlarieInstance } from '@flarie/contract';
import { createApiClient, createEntitlements, createSessionClient, type EntitlementSnapshot } from '@flarie/core';
import { fontUrls, resolveTheme } from '@flarie/tokens';
import { ensureFonts } from './fonts';
import { createIframeHandle } from './mount-iframe';
import { createInlineHandle } from './mount-inline';
import { registry } from './registry';
import type { InternalHandle, SharedContext } from './types';
import { RUNTIME_VERSION } from './version';

const DEFAULT_API_URL = 'https://api.flarie.com/v1';
const DEFAULT_STUDIO_URL = 'https://embed.flarie.com/studio';

/** One call, everything the partner is allowed to see: theme, entitlements, texts. */
interface BootstrapResponse {
  partner: { id: string; name: string };
  organization: { id: string; name: string };
  theme: Appearance;
  entitlements: EntitlementSnapshot;
  texts: Record<string, string>;
}

export async function init(options: FlarieInitOptions): Promise<FlarieInstance> {
  if (typeof options?.getSessionToken !== 'function') {
    throw new Error('[Flarie] init: `getSessionToken` is required');
  }

  const session = createSessionClient(options.getSessionToken);
  const api = createApiClient({ baseUrl: options.apiUrl ?? DEFAULT_API_URL, session });

  // The session identifies partner + organization + user, so the backend
  // returns the right theme and the already-resolved package entitlements.
  const bootstrap = await api.get<BootstrapResponse>('/embed/bootstrap');

  let appearance = options.appearance;
  const shared: SharedContext = {
    api,
    session,
    entitlements: createEntitlements(bootstrap.entitlements),
    texts: { ...bootstrap.texts, ...options.texts },
    studioUrl: options.studioUrl ?? DEFAULT_STUDIO_URL,
    // Flarie default → partner theme (backend) → runtime appearance (partner code)
    getTokens: () => resolveTheme(bootstrap.theme, appearance),
  };
  ensureFonts(fontUrls(bootstrap.theme, appearance));

  const handles = new Set<InternalHandle>();

  const instance: FlarieInstance = {
    runtimeVersion: RUNTIME_VERSION,

    create(name, props) {
      const def = registry[name];
      if (!def) throw new Error(`[Flarie] unknown component "${String(name)}"`);
      if (def.entitlement && !shared.entitlements.has(def.entitlement)) {
        throw new Error(`[Flarie] "${name}" is not included in this organization's package`);
      }

      const initial = props ?? ({} as NonNullable<typeof props>);
      const handle =
        def.mode === 'inline' ? createInlineHandle(name, def.load, initial, shared) : createIframeHandle(name, initial, shared);

      handles.add(handle as InternalHandle);
      const unmount = handle.unmount;
      handle.unmount = () => {
        unmount();
        handles.delete(handle as InternalHandle);
      };
      return handle;
    },

    updateAppearance(next) {
      appearance = next;
      ensureFonts(fontUrls(bootstrap.theme, appearance));
      const tokens = shared.getTokens();
      handles.forEach((h) => h.applyTheme(tokens));
    },

    destroy() {
      [...handles].forEach((h) => h.unmount());
      handles.clear();
    },
  };

  return instance;
}
