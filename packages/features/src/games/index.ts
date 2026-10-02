// Public entry of the "games" feature. The runtime lazy-loads this module as
// its own chunk, so partners only download what they actually mount.
export { GameList, type GameListProps } from './GameList';
export { gameListStyles as styles } from './styles';
