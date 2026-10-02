// This is ALL the code a partner writes. Everything else comes from Flarie.
import { loadFlarie } from '@flarie/embed-js';

const FLARIE = 'http://localhost:4000'; // production: defaults, no URLs needed

/**
 * Two partner brands to show that ONE Flarie build adopts any look.
 * Fernway passes no override: its theme is stored in Flarie Partner Management
 * and arrives with the bootstrap call. Pulse overrides at runtime.
 */
const BRANDS = {
  fernway: { name: 'Fernway Loyalty', mark: 'F', appearance: {} },
  pulse: {
    name: 'Pulse Rewards',
    mark: 'P',
    appearance: {
      variables: {
        colorPrimary: '#5B3FD6',
        colorBackground: '#F5F3FF',
        colorSurface: '#FFFFFF',
        colorText: '#1C1537',
        colorTextMuted: '#676087',
        colorBorder: '#E2DDF6',
        fontFamilyBody: '"Nunito Sans", system-ui, sans-serif',
        fontFamilyHeading: '"Sora", system-ui, sans-serif',
        borderRadius: '14px',
      },
      tokens: { 'button-radius': '999px' }, // tier-2 override: pill buttons
      fontUrl: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&family=Sora:wght@600;700&display=swap',
    },
  },
};

const $ = (selector) => document.querySelector(selector);

/* ---------------- demo helpers (not part of the integration) ---------------- */

function log(name, payload) {
  const item = document.createElement('li');
  item.innerHTML = '<div class="log-head"><code class="log-name"></code><time></time></div><pre class="log-payload"></pre>';
  item.querySelector('.log-name').textContent = name;
  item.querySelector('time').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  item.querySelector('pre').textContent =
    payload === undefined ? '' : typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  $('#log').prepend(item);
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

function setUrl(path) {
  const url = new URL(location.href);
  if (path) url.searchParams.set('flarie', path);
  else url.searchParams.delete('flarie');
  history.replaceState(null, '', url);
}

/* ---------------- 1. load + init ---------------- */

let flarie;
try {
  flarie = await loadFlarie({
    cdnUrl: `${FLARIE}/cdn/embed`,
    version: 'v1',
    apiUrl: `${FLARIE}/flarie-api`,
    studioUrl: `${FLARIE}/studio/embed`,
    // Our backend signs an assertion for the logged-in user and exchanges it with Flarie.
    getSessionToken: async () => {
      const res = await fetch('/api/flarie-session', { method: 'POST' });
      if (!res.ok) throw new Error(`Session request failed (${res.status})`);
      log('getSessionToken()', 'new short-lived session from our backend');
      return res.json();
    },
  });
  log('loadFlarie()', { runtimeVersion: flarie.runtimeVersion });
} catch (err) {
  $('#flarie-games').textContent = 'Games are unavailable right now. Reload the page to try again.';
  throw err;
}

/* ---------------- 2. inline component ---------------- */

const gameList = flarie.create('game-list', {
  onSelect: (game) => {
    log('onSelect', game);
    toast(`${game.name} added to the spring campaign`);
  },
  onNavigate: (path) => {
    log('onNavigate', path);
    openEditor(path);
  },
  onEvent: (event) => log('onEvent', event),
});
gameList.mount('#flarie-games');

/* ---------------- 3. full Studio in an iframe, opened on demand ---------------- */

let studio = null;

function openEditor(path) {
  $('#editor').hidden = false;
  if (studio) {
    studio.update({ path });
  } else {
    studio = flarie.create('studio', {
      path,
      onNavigate: (next) => {
        log('studio onNavigate', next);
        if (next === '/games') closeEditor();
        else setUrl(next);
      },
      onEvent: (event) => log('studio onEvent', event),
    });
    studio.mount('#flarie-studio');
  }
  setUrl(path);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#editor').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

function closeEditor() {
  studio?.unmount();
  studio = null;
  $('#editor').hidden = true;
  setUrl(null);
}

$('#close-editor').addEventListener('click', closeEditor);

// Deep link: /?flarie=/games/g2/edit opens the editor directly.
const deepLink = new URLSearchParams(location.search).get('flarie');
if (deepLink) openEditor(deepLink);

/* ---------------- 4. theming at runtime ---------------- */

document.querySelectorAll('[data-brand-option]').forEach((button) => {
  button.addEventListener('click', () => {
    const brand = BRANDS[button.dataset.brandOption];
    document.documentElement.dataset.brand = button.dataset.brandOption;
    document.querySelectorAll('[data-brand-option]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    $('.brand-name').textContent = brand.name;
    $('.brand-mark').textContent = brand.mark;

    flarie.updateAppearance(brand.appearance);
    log('updateAppearance()', brand.appearance.variables ? { colorPrimary: brand.appearance.variables.colorPrimary } : 'partner theme from Flarie');
  });
});

$('#show-bounds').addEventListener('change', (e) => document.body.classList.toggle('show-bounds', e.target.checked));
