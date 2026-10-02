import type { InlineModule, Registry } from './types';

/**
 * The curated list of PUBLIC components. Internal Studio components are not
 * here and can be refactored freely; these names and their props are a contract.
 *
 * mode decides the rendering strategy. Partners never see it: moving a
 * component from 'iframe' to 'inline' later needs no partner code change.
 */
export const registry: Registry = {
  'game-list': {
    mode: 'inline',
    entitlement: 'games',
    load: () =>
      import('@flarie/features/games').then(
        (m): InlineModule => ({ Component: m.GameList as InlineModule['Component'], styles: m.styles }),
      ),
  },
  studio: {
    mode: 'iframe',
    entitlement: 'studio',
  },
};
