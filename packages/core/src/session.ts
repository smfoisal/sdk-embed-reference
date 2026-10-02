import type { SessionToken } from '@flarie/contract';

export interface SessionClient {
  /** Returns a valid token, refreshing through the partner callback when close to expiry. */
  getAccessToken(): Promise<string>;
  /** Drop the cached token (e.g. after a 401) so the next call refreshes. */
  invalidate(): void;
}

const REFRESH_MARGIN_MS = 30_000;

export function createSessionClient(getSessionToken: () => Promise<SessionToken>): SessionClient {
  let current: SessionToken | null = null;
  let inflight: Promise<SessionToken> | null = null;

  return {
    async getAccessToken() {
      if (current && current.expiresAt - Date.now() > REFRESH_MARGIN_MS) return current.token;
      // Single-flight: ten components asking at once trigger ONE partner call.
      inflight ??= getSessionToken()
        .then((token) => {
          if (!token?.token || !token.expiresAt) throw new Error('[Flarie] getSessionToken must resolve to { token, expiresAt }');
          current = token;
          return token;
        })
        .finally(() => {
          inflight = null;
        });
      return (await inflight).token;
    },
    invalidate() {
      current = null;
    },
  };
}
