import type { ComponentType } from 'react';
import type { FlarieComponentHandle, FlarieComponentName, FlarieComponentProps } from '@flarie/contract';
import type { ApiClient, Entitlements, SessionClient } from '@flarie/core';
import type { ResolvedTokens } from '@flarie/tokens';

/** Services created once per init() and shared by every mounted component. */
export interface SharedContext {
  api: ApiClient;
  session: SessionClient;
  entitlements: Entitlements;
  texts: Record<string, string>;
  studioUrl: string;
  getTokens: () => ResolvedTokens;
}

export interface InternalHandle<K extends FlarieComponentName = FlarieComponentName> extends FlarieComponentHandle<K> {
  applyTheme(tokens: ResolvedTokens): void;
}

export type InlineModule = { Component: ComponentType<Record<string, unknown>>; styles: string };

export type ComponentDefinition =
  | { mode: 'inline'; entitlement?: string; load: () => Promise<InlineModule> }
  | { mode: 'iframe'; entitlement?: string };

export type Registry = { [K in FlarieComponentName]: ComponentDefinition };

export type AnyProps = FlarieComponentProps[FlarieComponentName];
