/**
 * Layout uses CONTAINER queries, not media queries: an embedded widget does not
 * know the viewport it lives in, only the box the partner gave it.
 * (.fl-root is the query container, set by the runtime.)
 */
export const gameListStyles = /* css */ `
.gl { display: grid; gap: calc(var(--flarie-spacing-unit) * 4); }
.gl-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.gl-title { margin: 0; font-size: 1.45em; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
.gl-usage { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 0.93em; color: var(--flarie-color-text-muted); }
.gl-meter { width: 96px; height: 6px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--flarie-color-primary) 15%, transparent); }
.gl-meter > span { display: block; height: 100%; background: var(--flarie-color-primary); }

.gl-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--flarie-card-bg);
  border: 1px solid var(--flarie-card-border);
  border-radius: var(--flarie-card-radius);
  overflow: hidden;
}
.gl-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 104px auto;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-top: 1px solid var(--flarie-card-border);
}
.gl-row:first-child { border-top: 0; }
.gl-tile {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: calc(var(--flarie-card-radius) * 0.75);
  background: color-mix(in srgb, var(--flarie-color-primary) 12%, var(--flarie-color-surface));
  color: var(--flarie-color-primary);
  font-family: var(--flarie-font-family-heading);
  font-size: 1.2em;
  font-weight: 700;
}
.gl-main { display: grid; min-width: 0; }
.gl-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gl-kind, .gl-plays { color: var(--flarie-color-text-muted); font-size: 0.93em; }
.gl-plays { text-align: right; font-variant-numeric: tabular-nums; }
.gl-plays strong { color: var(--flarie-color-text); font-weight: 600; }
.gl-actions { display: flex; justify-content: flex-end; gap: 4px; }

.gl-row--skeleton { height: 73px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--flarie-color-border) 60%, transparent), transparent) 0 0 / 200% 100%; animation: gl-shimmer 1.4s linear infinite; }
@keyframes gl-shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .gl-row--skeleton { animation: none; } }

.gl-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 32px 16px;
  text-align: center;
  color: var(--flarie-color-text-muted);
  border: 1px dashed var(--flarie-card-border);
  border-radius: var(--flarie-card-radius);
}
.gl-state p { margin: 0; }

@container flarie (max-width: 620px) {
  .gl-row { grid-template-columns: 44px minmax(0, 1fr) auto; row-gap: 10px; }
  .gl-plays { display: none; }
  .gl-actions { grid-column: 2 / -1; justify-content: flex-start; }
}
`;
