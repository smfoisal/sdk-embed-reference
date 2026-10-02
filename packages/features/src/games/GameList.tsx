import { useCallback, useEffect, useId, useState } from 'react';
import type { GameSummary } from '@flarie/contract';
import { useEmit, useEntitlement, useFlarieApi, useFlarieNavigation, useLimit, useText } from '@flarie/core';
import { Badge, Button } from '@flarie/ui';
import { CreateGameModal } from './CreateGameModal';

export interface GameListProps {
  filter?: 'all' | 'active' | 'draft';
  onSelect?: (game: GameSummary) => void;
}

const KIND_LABEL: Record<GameSummary['kind'], string> = {
  quiz: 'Quiz',
  memory: 'Memory',
  wheel: 'Spin the wheel',
  puzzle: 'Puzzle',
};

/**
 * One implementation, two hosts. This component does not know whether it runs
 * in the standalone Studio or inside a partner page: API, navigation,
 * entitlements, texts and portals all come from <FlarieProvider>.
 */
export function GameList({ filter = 'all', onSelect }: GameListProps) {
  const api = useFlarieApi();
  const t = useText();
  const emit = useEmit();
  const { navigate } = useFlarieNavigation();
  const canCreate = useEntitlement('games.create');
  const maxGames = useLimit('games.maxGames');
  const titleId = useId();

  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    api.get<GameSummary[]>('/games').then(setGames, () => setLoadError(true));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = useCallback(() => setCreating(false), []);
  const visible = games?.filter((g) => filter === 'all' || g.status === filter) ?? [];
  const used = games?.length ?? 0;
  const atLimit = maxGames !== null && used >= maxGames;

  return (
    <section className="gl" part="container" aria-labelledby={titleId}>
      <header className="gl-head">
        <div>
          <h2 id={titleId} className="gl-title">
            {t('gameList.title', 'Games')}
          </h2>
          {maxGames !== null && games && (
            <div className="gl-usage">
              <span>
                {used} of {maxGames} games in your plan
              </span>
              <span className="gl-meter" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (used / maxGames) * 100)}%` }} />
              </span>
            </div>
          )}
        </div>
        {canCreate && (
          <Button
            onClick={() => setCreating(true)}
            disabled={!games || atLimit}
            title={atLimit ? 'Your plan limit is reached. Remove a game or upgrade the plan.' : undefined}
          >
            {t('gameList.create', 'Create game')}
          </Button>
        )}
      </header>

      {loadError ? (
        <div className="gl-state">
          <p>Couldn't load games. Check your connection and try again.</p>
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      ) : !games ? (
        <ul className="gl-rows" aria-busy="true" aria-label="Loading games">
          {[0, 1, 2].map((i) => (
            <li key={i} className="gl-row gl-row--skeleton" />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="gl-state">
          <p>No games yet. Create one and your customers can start playing.</p>
        </div>
      ) : (
        <ul className="gl-rows">
          {visible.map((game) => (
            <li key={game.id} className="gl-row" part="row">
              <span className="gl-tile" aria-hidden="true">
                {game.name.charAt(0)}
              </span>
              <div className="gl-main">
                <span className="gl-name">{game.name}</span>
                <span className="gl-kind">{KIND_LABEL[game.kind]}</span>
              </div>
              <Badge tone={game.status === 'active' ? 'positive' : 'neutral'}>{game.status === 'active' ? 'Live' : 'Draft'}</Badge>
              <span className="gl-plays">
                <strong>{game.plays.toLocaleString()}</strong> plays
              </span>
              <div className="gl-actions">
                {onSelect && (
                  <Button variant="secondary" onClick={() => onSelect(game)}>
                    {t('gameList.select', 'Select')}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate(`/games/${game.id}/edit`)}>
                  {t('gameList.edit', 'Edit')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <CreateGameModal
          onClose={closeModal}
          onCreated={(game) => {
            setGames((prev) => [game, ...(prev ?? [])]);
            setCreating(false);
            emit({ type: 'game.created', data: { id: game.id, name: game.name } });
          }}
        />
      )}
    </section>
  );
}
