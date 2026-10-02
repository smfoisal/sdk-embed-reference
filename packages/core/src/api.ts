import type { SessionClient } from './session';

export class FlarieApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FlarieApiError';
  }
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export function createApiClient({ baseUrl, session }: { baseUrl: string; session: SessionClient }): ApiClient {
  async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, retried = false): Promise<T> {
    const token = await session.getAccessToken();
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      // Bearer token, never cookies: third-party cookies are blocked in embeds.
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && !retried) {
      session.invalidate();
      return request<T>(method, path, body, true);
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      throw new FlarieApiError(res.status, err.code ?? 'request_failed', err.message ?? `Request failed (${res.status})`);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
  };
}
