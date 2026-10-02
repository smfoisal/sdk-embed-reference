import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { FlarieEvent } from '@flarie/contract';
import type { ApiClient } from './api';
import type { Entitlements } from './entitlements';
import type { NavigationAdapter } from './navigation';

/**
 * Everything that depends on WHERE the code runs is injected here.
 * The standalone Studio and the embed runtime each build their own value.
 */
export interface FlarieContextValue {
  api: ApiClient;
  entitlements: Entitlements;
  navigation: NavigationAdapter;
  texts: Record<string, string>;
  /** Where modals / popovers portal to. Inside an embed this is a node in the shadow root. */
  portalContainer: HTMLElement | null;
  emit: (event: FlarieEvent) => void;
}

const FlarieContext = createContext<FlarieContextValue | null>(null);

export function FlarieProvider({ value, children }: { value: FlarieContextValue; children: ReactNode }) {
  return <FlarieContext.Provider value={value}>{children}</FlarieContext.Provider>;
}

function useFlarie(): FlarieContextValue {
  const ctx = useContext(FlarieContext);
  if (!ctx) throw new Error('[Flarie] hooks must be used inside <FlarieProvider>');
  return ctx;
}

export const useFlarieApi = () => useFlarie().api;
export const useEntitlement = (feature: string) => useFlarie().entitlements.has(feature);
export const useLimit = (name: string) => useFlarie().entitlements.limit(name);
export const useEmit = () => useFlarie().emit;
export const usePortalContainer = () => useFlarie().portalContainer ?? document.body;

export function useFlarieNavigation() {
  const { navigation } = useFlarie();
  const path = useSyncExternalStore(navigation.subscribe, navigation.getPath);
  return { path, navigate: navigation.navigate };
}

/** t('gameList.title', 'Games') — partner / backend text overrides win over the fallback. */
export function useText() {
  const { texts } = useFlarie();
  return useCallback((key: string, fallback: string) => texts[key] ?? fallback, [texts]);
}
