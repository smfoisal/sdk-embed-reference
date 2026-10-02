/**
 * Local demo: two separate origins, exactly like production.
 *
 *   http://localhost:3000  "Fernway Loyalty" — the PARTNER app (stands in for HelloAgain)
 *                          /                     partner dashboard page
 *                          /npm/@flarie/embed-js  the npm loader (as if bundled by the partner)
 *                          POST /api/flarie-session   partner BACKEND: signs assertion, exchanges it
 *
 *   http://localhost:4000  FLARIE (cdn.flarie.com + api.flarie.com + embed.flarie.com in production)
 *                          /cdn/embed/<version>/flarie.js   the CDN runtime
 *                          POST /flarie-api/embed/session   token exchange (server-to-server)
 *                          GET  /flarie-api/embed/bootstrap theme + entitlements + texts
 *                          GET|POST /flarie-api/games       data API (entitlements enforced HERE)
 *                          /studio/embed                    full Studio inside the iframe
 *
 * Run:  npm run demo   then open http://localhost:3000
 */
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTNER_ORIGIN = 'http://localhost:3000';
const FLARIE_ORIGIN = 'http://localhost:4000';
const SESSION_TTL_MS = 5 * 60_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/* ================================================================== */
/* FLARIE side — data that lives in Partner Management                 */
/* ================================================================== */

const partners = {
  fernway: {
    id: 'fernway',
    name: 'Fernway Loyalty',
    // Used for CORS on the API and CSP frame-ancestors on the Studio iframe.
    allowedOrigins: [PARTNER_ORIGIN],
    // Partner theme, configured by SuperAdmin. Components pick this up automatically.
    theme: {
      variables: {
        colorPrimary: '#1F4D3A',
        colorOnPrimary: '#FFFFFF',
        colorBackground: '#EEF2EE',
        colorSurface: '#FFFFFF',
        colorText: '#16241D',
        colorTextMuted: '#5A6B62',
        colorBorder: '#D5DED8',
        fontFamilyBody: '"Public Sans", system-ui, sans-serif',
        fontFamilyHeading: '"Bricolage Grotesque", system-ui, sans-serif',
        borderRadius: '6px',
      },
      fontUrl:
        'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Public+Sans:wght@400;600&display=swap',
    },
    texts: { 'gameList.select': 'Add to campaign' },
  },
};

// Partner packages (Partner → Package → Organization).
const packages = {
  'fernway-starter': {
    features: { games: true, 'games.create': true, studio: true },
    limits: { 'games.maxGames': 5 },
  },
};

// Customer organizations, keyed by Flarie id, with the partner's external id for identity mapping.
const organizations = {
  'org-harbor': { partnerId: 'fernway', externalId: 'cust-1042', name: 'Harbor Café', package: 'fernway-starter' },
};

const games = {
  'org-harbor': [
    { id: 'g1', name: 'Coffee bean quiz', kind: 'quiz', status: 'active', plays: 12840 },
    { id: 'g2', name: 'Match the pastry', kind: 'memory', status: 'active', plays: 4312 },
    { id: 'g3', name: 'Autumn prize wheel', kind: 'wheel', status: 'draft', plays: 0 },
  ],
};

const sessions = new Map(); // token -> { partnerId, orgId, userId, expiresAt }

function exchangePartnerAssertion(assertion) {
  // PRODUCTION: this is a signed JWT. Verify the signature with the partner's
  // configured public key / JWKS, check iss, aud === 'flarie', exp, and a
  // short lifetime. NEVER trust role claims from it (see spec section 5).
  // DEMO: base64url JSON, no signature.
  const claims = JSON.parse(Buffer.from(assertion, 'base64url').toString('utf8'));
  const partner = partners[claims.partnerId];
  if (!partner || claims.aud !== 'flarie' || claims.iss !== partner.id || claims.exp * 1000 < Date.now()) {
    throw new Error('invalid assertion');
  }
  // Identity mapping: partner's external customer id -> Flarie organization.
  const orgEntry = Object.entries(organizations).find(
    ([, o]) => o.partnerId === partner.id && o.externalId === claims.organizationId,
  );
  if (!orgEntry) throw new Error('unknown organization');

  const token = `fes_${randomBytes(24).toString('base64url')}`;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { partnerId: partner.id, orgId: orgEntry[0], userId: claims.userId, expiresAt });
  return { token, expiresAt };
}

function authenticate(req) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  const org = organizations[session.orgId];
  return { ...session, org, partner: partners[session.partnerId], entitlements: packages[org.package] };
}

/* ================================================================== */
/* helpers                                                             */
/* ================================================================== */

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, { 'Content-Type': isJson ? MIME['.json'] : MIME['.html'], ...headers });
  res.end(isJson ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function serveFile(res, baseDir, relPath, headers = {}) {
  const file = path.join(baseDir, relPath);
  if (!file.startsWith(baseDir)) return send(res, 403, 'Forbidden');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', ...headers });
    res.end(data);
  } catch {
    send(res, 404, 'Not found');
  }
}

/* ================================================================== */
/* FLARIE server :4000                                                  */
/* ================================================================== */

const allAllowedOrigins = [...new Set(Object.values(partners).flatMap((p) => p.allowedOrigins))];

const flarieServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, FLARIE_ORIGIN);
  const origin = req.headers.origin;

  // --- CDN: static runtime -------------------------------------------------
  if (url.pathname.startsWith('/cdn/embed/')) {
    const rel = url.pathname.replace('/cdn/embed/', '');
    const immutable = /^\d+\.\d+\.\d+\//.test(rel);
    return serveFile(res, path.join(ROOT, 'apps/embed-runtime/dist'), rel, {
      // <script type="module"> across origins REQUIRES CORS on the CDN.
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    });
  }

  // --- Studio page loaded inside the iframe --------------------------------
  if (url.pathname === '/studio/embed') {
    const html = (await readFile(path.join(ROOT, 'demo/flarie/studio-embed.html'), 'utf8')).replace(
      '__ALLOWED_PARENTS__',
      JSON.stringify(allAllowedOrigins),
    );
    return send(res, 200, html, {
      // Only partner origins may frame the Studio (clickjacking protection).
      'Content-Security-Policy': `frame-ancestors ${allAllowedOrigins.join(' ')}`,
    });
  }

  // --- API -------------------------------------------------------------------
  if (url.pathname.startsWith('/flarie-api/')) {
    const cors = allAllowedOrigins.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '600',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' };
    if (req.method === 'OPTIONS') return send(res, 204, '', cors);

    const route = `${req.method} ${url.pathname.replace('/flarie-api', '')}`;

    // Server-to-server: called by the PARTNER BACKEND, never by a browser.
    if (route === 'POST /embed/session') {
      try {
        const { assertion } = await readJson(req);
        return send(res, 200, exchangePartnerAssertion(assertion), cors);
      } catch (err) {
        return send(res, 401, { code: 'invalid_assertion', message: String(err.message) }, cors);
      }
    }

    const ctx = authenticate(req);
    if (!ctx) return send(res, 401, { code: 'unauthorized', message: 'Session expired or invalid' }, cors);

    if (route === 'GET /embed/bootstrap') {
      return send(
        res,
        200,
        {
          partner: { id: ctx.partner.id, name: ctx.partner.name },
          organization: { id: ctx.orgId, name: ctx.org.name },
          theme: ctx.partner.theme,
          entitlements: ctx.entitlements,
          texts: ctx.partner.texts,
        },
        cors,
      );
    }

    if (route === 'GET /games') return send(res, 200, games[ctx.orgId] ?? [], cors);

    if (route === 'POST /games') {
      // The UI hides/disables things; THIS is where rules are actually enforced.
      if (!ctx.entitlements.features['games.create']) {
        return send(res, 403, { code: 'not_entitled', message: 'Creating games is not included in your plan.' }, cors);
      }
      const list = (games[ctx.orgId] ??= []);
      const max = ctx.entitlements.limits['games.maxGames'];
      if (max !== null && list.length >= max) {
        return send(
          res,
          403,
          { code: 'limit_reached', message: `Your plan allows ${max} games. Remove a game or upgrade the plan.` },
          cors,
        );
      }
      const { name, kind } = await readJson(req);
      const game = { id: `g${Date.now()}`, name: String(name).slice(0, 80), kind, status: 'draft', plays: 0 };
      list.unshift(game);
      return send(res, 201, game, cors);
    }

    return send(res, 404, { code: 'not_found', message: 'Unknown endpoint' }, cors);
  }

  send(res, 404, 'Not found');
});

/* ================================================================== */
/* PARTNER server :3000                                                 */
/* ================================================================== */

const partnerServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, PARTNER_ORIGIN);

  if (url.pathname === '/') return serveFile(res, path.join(ROOT, 'demo/partner-host'), 'index.html');
  if (url.pathname.startsWith('/assets/')) {
    return serveFile(res, path.join(ROOT, 'demo/partner-host'), url.pathname.replace('/assets/', ''));
  }
  // Stand-in for "the partner installed @flarie/embed-js and bundled it".
  if (url.pathname.startsWith('/npm/@flarie/embed-js/')) {
    return serveFile(res, path.join(ROOT, 'apps/embed-js/dist'), url.pathname.replace('/npm/@flarie/embed-js/', ''));
  }

  // Partner BACKEND endpoint. The user is already logged in to the partner
  // app; the partner knows who they are and which customer they belong to.
  if (req.method === 'POST' && url.pathname === '/api/flarie-session') {
    const loggedInUser = { id: 'user-77', customerId: 'cust-1042' }; // from the partner's own session
    const assertion = Buffer.from(
      JSON.stringify({
        iss: 'fernway',
        aud: 'flarie',
        partnerId: 'fernway',
        organizationId: loggedInUser.customerId,
        subAccountId: null,
        userId: loggedInUser.id,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).toString('base64url'); // PRODUCTION: sign with the partner's private key

    const r = await fetch(`${FLARIE_ORIGIN}/flarie-api/embed/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assertion }),
    });
    return send(res, r.status, await r.json(), { 'Cache-Control': 'no-store' });
  }

  send(res, 404, 'Not found');
});

flarieServer.listen(4000, () => console.log(`Flarie  (CDN + API + Studio)  ${FLARIE_ORIGIN}`));
partnerServer.listen(3000, () => console.log(`Partner (Fernway Loyalty)     ${PARTNER_ORIGIN}   <- open this`));
