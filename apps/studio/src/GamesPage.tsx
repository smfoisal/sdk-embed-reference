/**
 * The standalone Studio is simply the FIRST host of the feature packages;
 * HelloAgain's page is the second. Same <GameList />, different provider value.
 *
 * In the real app this component is the root of a single-spa microfrontend:
 *   export const { bootstrap, mount, unmount } =
 *     singleSpaReact({ React, ReactDOMClient, rootComponent: GamesPage });
 */
import { useMemo } from 'react';
import {
  createApiClient,
  createBrowserNavigation,
  createEntitlements,
  createSessionClient,
  FlarieProvider,
  type EntitlementSnapshot,
  type FlarieContextValue,
} from '@flarie/core';
import { GameList, styles as gameListStyles } from '@flarie/features/games';
import { resolveTheme, toCssText } from '@flarie/tokens';
import { uiStyles } from '@flarie/ui';

// Direct customers: every feature on, Flarie default theme on :root.
const directCustomer: EntitlementSnapshot = {
  features: { games: true, 'games.create': true, studio: true },
  limits: { 'games.maxGames': null },
};

export function GamesPage({ getSessionToken }: { getSessionToken: Parameters<typeof createSessionClient>[0] }) {
  const value = useMemo<FlarieContextValue>(() => {
    const session = createSessionClient(getSessionToken);
    return {
      api: createApiClient({ baseUrl: '/api/v1', session }),
      entitlements: createEntitlements(directCustomer),
      navigation: createBrowserNavigation('/studio'), // real URLs here, memory in embeds
      texts: {},
      portalContainer: null, // document.body is fine in the standalone app
      emit: (event) => console.info('[studio analytics]', event),
    };
  }, [getSessionToken]);

  return (
    <FlarieProvider value={value}>
      {/* No shadow root here: tokens on :root, styles global, and .fl-root as the container. */}
      <style>{toCssText(resolveTheme(), ':root') + uiStyles + gameListStyles}</style>
      <div className="fl-root" style={{ containerName: 'flarie', containerType: 'inline-size' }}>
        <GameList />
      </div>
    </FlarieProvider>
  );
}
