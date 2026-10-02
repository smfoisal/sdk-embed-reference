# Flarie Embed SDK — reference implementation

A small, **runnable** skeleton of the Partner Platform embed architecture:
one feature codebase, a CDN-hosted runtime, a tiny npm loader, inline
components in Shadow DOM, and the full Studio in an iframe, all behind one SDK API.

It is a reference for structure and mechanics, not production code. See
"Simplified on purpose" at the end.

```bash
npm install
npm run demo        # builds runtime + loader, starts both demo servers
# open http://localhost:3000
npm run typecheck
```

The demo runs two origins, like production:

| Origin | Plays the role of |
|---|---|
| `http://localhost:3000` | The partner app ("Fernway Loyalty", standing in for HelloAgain): page + partner backend |
| `http://localhost:4000` | Flarie: CDN (`/cdn/embed`), API (`/flarie-api`), Studio iframe (`/studio/embed`) |

Things to try: switch the partner theme (Fernway / Pulse), tick "Show Flarie
areas", create games until the plan limit, click **Edit** to open the full
Studio in an iframe, and open `/?flarie=/games/g2/edit` as a deep link.
The right-hand panel shows every callback the partner page receives.

---

## Repository layout

```
packages/                      internal building blocks (never published)
  contract/   PUBLIC API types: component names + props, init options, iframe protocol
  tokens/     theme contract → CSS custom properties (3 layers, 2 tiers)
  core/       session, API client, entitlements, navigation, <FlarieProvider> + hooks
  ui/         primitives (Button, Modal…) that only read tokens
  features/   domain features (games/GameList…) — host-agnostic

apps/
  embed-runtime/  → CDN   cdn.flarie.com/embed/<version>/flarie.js (React bundled inside)
  embed-js/       → npm   @flarie/embed-js: loader + types (≈1 kB)
  embed-react/    → npm   @flarie/embed-react: thin React wrapper
  studio/         illustration: the standalone Studio consuming the SAME features

demo/
  servers.mjs          both origins: CDN, token exchange, bootstrap, API, CORS, CSP
  partner-host/        the partner page (app.js = all code a partner writes)
  flarie/studio-embed  stand-in for the Studio embed shell (iframe child side)
```

The key rule: **`features/` never knows where it runs.** API, navigation,
entitlements, texts and the portal container are injected through
`<FlarieProvider>`. The standalone Studio (`apps/studio`) and the embed runtime
each build their own provider value around the same `<GameList />`.

---

## How the CDN runtime works

```
Partner page                         Partner backend             Flarie
─────────────────────────────────────────────────────────────────────────────────────
1. import { loadFlarie } from '@flarie/embed-js'      (npm, ~1 kB, rarely changes)
2. loadFlarie() injects <script type="module" src=".../embed/v1/flarie.js">
                                                         ──────────► CDN: v1 alias → 1.0.0
3. runtime registers window.__FLARIE_RUNTIME__
4. runtime.init() → getSessionToken() ─► POST /api/flarie-session
                                         signs assertion ────────► POST /embed/session
                                         ◄──────────── { token, expiresAt } (short-lived)
5. GET /embed/bootstrap (Bearer) ─────────────────────────────────► theme, entitlements, texts
6. flarie.create('game-list').mount('#games')
     → <flarie-game-list> + shadow root + own React root
     → import('./chunks/feature-games-*.js')   (lazy, only when mounted)
7. flarie.create('studio').mount('#editor')
     → iframe → 'ready' → runtime posts { token, theme } to the exact Studio origin
```

Why this split:

- **The loader is tiny and stable**, so partners almost never upgrade it.
  All real code is on the CDN, so a fix reaches every partner at once. That is
  the "one version of Flarie" principle, applied to the frontend.
- **React is bundled inside the runtime** and nothing is shared with the page.
  A partner on Angular, Vue, or a different React version cannot conflict with it.
- **A `<script>` tag, not `import(url)`**, so the partner's bundler never tries
  to resolve or bundle the runtime.
- **Features are lazy chunks** (`registry.ts` → `import('@flarie/features/games')`).
  Chunks are resolved relative to the entry URL (`base: './'`), so the same
  build works from any CDN path.

### Versioning and caching

| Path | Cache | Changes? |
|---|---|---|
| `/embed/1.0.0/flarie.js`, `/embed/1.0.0/chunks/*` | `max-age=31536000, immutable` | Never |
| `/embed/v1/flarie.js` (alias: `import '../1.0.0/flarie.js'`) | `max-age=300` | On release |

- **Release 1.0.1:** upload `1.0.1/`, repoint the alias. **Rollback:** repoint it back.
- **Breaking change:** ship `v2`. `v1` partners are unaffected until they opt in.
- **Pinning:** a partner can pass `version: '1.0.0'` (and add SRI `integrity`
  for pinned builds). Per-partner canary/pinning can also be done centrally,
  e.g. a CDN edge rule that resolves the alias per partner.
- The CDN must send **CORS headers**: cross-origin module scripts require them.

---

## Auth, theming, entitlements

**Auth** (spec section 5). The browser never holds a partner secret. The
partner backend signs an assertion for its logged-in user, Flarie verifies it,
maps the external ids to its own organization and user, and returns a
short-lived session. The SDK keeps it **in memory**, refreshes it through
`getSessionToken()` (single-flight, 30 s before expiry, and on any 401), and
sends it as a Bearer token. No cookies, so third-party cookie blocking does not
matter. The iframe receives it by `postMessage` to the exact Studio origin,
never in the URL.

**Theming** (spec section 3). Three layers, later wins:
Flarie default → partner theme from Partner Management (arrives with bootstrap)
→ `appearance` passed at runtime. Two tiers: global variables
(`colorPrimary`…) and semantic tokens (`button-radius`…) derived from them but
individually overridable. The result is CSS custom properties in each shadow
root, swapped live by `updateAppearance()`. For fine control, partners can
style exposed parts from outside: `flarie-game-list::part(row) { … }`.

**Entitlements** (spec section 2). Bootstrap returns the already-resolved
Partner → Package → Organization snapshot. The UI uses it for UX only
(`useEntitlement`, `useLimit`); the API enforces the same rules on every request
(see `POST /games` in `demo/servers.mjs`).

---

## Embedding gotchas this skeleton handles

| Problem | Where |
|---|---|
| Partner CSS leaking in (inherited font, colour, line-height) | `:host { all: initial }` in `base-styles.ts` |
| `rem` follows the partner's `<html>` font-size (demo host uses 15px) | px-based tokens (`fontSizeBase`) |
| `@font-face` does not work inside Shadow DOM | `fonts.ts` injects font CSS into the host `<head>` |
| Modals portalled to `document.body` lose styles | portal container inside the shadow root (`FlarieProvider`) |
| Media queries see the viewport, not the widget's box | container queries on `.fl-root` |
| A Flarie crash breaking the partner page | `ErrorBoundary` + `component.error` event |
| Partner router vs ours | memory navigation + `onNavigate`; no history patching |
| Third-party cookies blocked | Bearer token in memory, `credentials: 'omit'` |
| Clickjacking of the Studio iframe | `frame-ancestors` from the partner's allowed origins |
| Spoofed `postMessage` | origin + source + envelope/version checks on both sides |
| Iframe height | child measures its content (not `documentElement`) and posts `resize` |

---

## Adding a new public component

1. Build it in `packages/features/<feature>/` using only `@flarie/core` hooks and `@flarie/ui`.
2. Use it in the standalone Studio first (dogfooding keeps one implementation).
3. Add its name and props to `FlarieComponentProps` in `packages/contract`. This is public API.
4. Register it in `apps/embed-runtime/src/registry.ts` with `mode` and `entitlement`.
5. Give it an entitlement key in Partner Management, and enforce it in the API.
6. Test it in the fake hosts (at least one React and one non-React host) and in Safari.

Moving a component between `'iframe'` and `'inline'` later is a registry
change only. Partner code stays the same.

---

## Simplified on purpose

- **Assertion verification:** the demo assertion is unsigned base64 JSON. Production
  verifies a signed JWT (partner key or JWKS), `iss`, `aud`, `exp`, and never trusts role claims.
- **Studio embed shell:** `demo/flarie/studio-embed.html` only shows the child side
  of the protocol. The real one is the single-spa root config running in embed mode.
- **Data:** games and sessions live in memory in `servers.mjs`.
- **Types for npm:** `@flarie/embed-js` points `types` at source for the monorepo.
  For publishing, bundle the `.d.ts` (e.g. tsup `--dts` or api-extractor).
- **Not included:** telemetry (tag errors with partner, org and runtime version),
  CSP guidance for partners (`script-src`, `connect-src`, `style-src` for the CDN
  and API), i18n beyond text overrides, and automated tests.
- `@flarie/embed-react` is typechecked but not used by the plain-HTML demo host.
