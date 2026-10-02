/**
 * @flarie/contract — the PUBLIC contract between partners and the Flarie Embed SDK.
 *
 * Everything in this file is public API. Within a major version (v1) changes
 * must be backwards compatible: add optional fields, never rename or remove.
 * The loader (@flarie/embed-js) re-exports these types to partners, and the
 * CDN runtime implements them.
 */

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export interface SessionToken {
  /** Short-lived Flarie embed session token, produced by the token exchange. */
  token: string;
  /** Expiry as epoch milliseconds. */
  expiresAt: number;
}

/* ------------------------------------------------------------------ */
/* Theme / appearance                                                   */
/* ------------------------------------------------------------------ */

/** Tier 1: global theme variables. Most partners only ever set these. */
export interface ThemeVariables {
  colorPrimary: string;
  colorOnPrimary: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorTextMuted: string;
  colorBorder: string;
  colorDanger: string;
  fontFamilyBody: string;
  fontFamilyHeading: string;
  /** Use px, not rem: rem follows the PARTNER's <html> font-size. */
  fontSizeBase: string;
  borderRadius: string;
  spacingUnit: string;
}

/** Tier 2: semantic tokens, derived from ThemeVariables but individually overridable. */
export type SemanticToken =
  | 'button-primary-bg'
  | 'button-primary-text'
  | 'button-radius'
  | 'card-bg'
  | 'card-border'
  | 'card-radius'
  | 'input-radius'
  | 'focus-ring';

export interface Appearance {
  variables?: Partial<ThemeVariables>;
  tokens?: Partial<Record<SemanticToken, string>>;
  /**
   * Stylesheet URL for web fonts. It is injected into the HOST document,
   * because @font-face rules do not work from inside a Shadow DOM.
   */
  fontUrl?: string;
}

/* ------------------------------------------------------------------ */
/* Domain types exposed through component callbacks                     */
/* ------------------------------------------------------------------ */

export interface GameSummary {
  id: string;
  name: string;
  kind: 'quiz' | 'memory' | 'wheel' | 'puzzle';
  status: 'active' | 'draft';
  plays: number;
}

export type FlarieEvent =
  | { type: 'game.created'; data: { id: string; name: string } }
  | { type: 'game.updated'; data: { id: string } }
  | { type: 'component.error'; data: { component: string; message: string } };

/* ------------------------------------------------------------------ */
/* Components                                                           */
/* ------------------------------------------------------------------ */

export interface BaseComponentProps {
  /** Flarie wants to go somewhere (e.g. "/games/3/edit"). The partner decides what that means. */
  onNavigate?: (path: string) => void;
  onEvent?: (event: FlarieEvent) => void;
}

/** Map of every public component and its props. Adding a component = adding a key here. */
export interface FlarieComponentProps {
  'game-list': BaseComponentProps & {
    filter?: 'all' | 'active' | 'draft';
    onSelect?: (game: GameSummary) => void;
  };
  /** The full Studio. Rendered inside an iframe by the runtime. */
  studio: BaseComponentProps & {
    /** Controlled path. Calling update({ path }) navigates the Studio. */
    path?: string;
  };
}

export type FlarieComponentName = keyof FlarieComponentProps;

export interface FlarieComponentHandle<K extends FlarieComponentName = FlarieComponentName> {
  mount(target: string | HTMLElement): void;
  update(props: Partial<FlarieComponentProps[K]>): void;
  /** Unmounts and releases the handle. Create a new handle to mount again. */
  unmount(): void;
}

/* ------------------------------------------------------------------ */
/* Init + runtime                                                       */
/* ------------------------------------------------------------------ */

export interface FlarieInitOptions {
  /**
   * Called whenever the SDK needs a (new) session. The partner's BACKEND
   * signs a partner assertion, exchanges it with Flarie, and returns the result.
   */
  getSessionToken: () => Promise<SessionToken>;
  /** Overrides for staging / local development. */
  apiUrl?: string;
  studioUrl?: string;
  /** Runtime override layered on top of the partner theme configured in Flarie. */
  appearance?: Appearance;
  /** Text overrides, e.g. { 'gameList.title': 'Experiences' }. */
  texts?: Record<string, string>;
}

export interface FlarieInstance {
  readonly runtimeVersion: string;
  create<K extends FlarieComponentName>(
    name: K,
    props?: FlarieComponentProps[K],
  ): FlarieComponentHandle<K>;
  updateAppearance(appearance: Appearance): void;
  destroy(): void;
}

/** What the CDN runtime registers on window. Only the loader talks to this. */
export interface FlarieRuntime {
  version: string;
  init(options: FlarieInitOptions): Promise<FlarieInstance>;
}

declare global {
  interface Window {
    __FLARIE_RUNTIME__?: FlarieRuntime;
  }
}

/* ------------------------------------------------------------------ */
/* iframe protocol (runtime <-> Studio). Versioned like the rest.       */
/* ------------------------------------------------------------------ */

export const PROTOCOL_VERSION = 1;

type HostEnvelope = { source: 'flarie-host'; v: typeof PROTOCOL_VERSION };
type StudioEnvelope = { source: 'flarie-studio'; v: typeof PROTOCOL_VERSION };

export type HostToStudioMessage = HostEnvelope &
  (
    | { type: 'init'; token: string; tokens: Record<string, string>; texts: Record<string, string>; path: string }
    | { type: 'token'; token: string }
    | { type: 'theme'; tokens: Record<string, string> }
    | { type: 'navigate'; path: string }
  );

export type StudioToHostMessage = StudioEnvelope &
  (
    | { type: 'ready' }
    | { type: 'token-request' }
    | { type: 'resize'; height: number }
    | { type: 'navigate'; path: string }
    | { type: 'event'; event: FlarieEvent }
  );
