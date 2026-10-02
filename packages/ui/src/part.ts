// Allow the `part` attribute on JSX elements. Elements with part="…" can be
// styled by the partner from OUTSIDE the shadow root:
//   flarie-game-list::part(row) { … }
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    part?: string;
  }
}
