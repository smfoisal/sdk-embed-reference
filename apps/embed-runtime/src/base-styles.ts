/**
 * :host { all: initial } cuts off every inherited property coming from the
 * partner page (font, color, line-height, letter-spacing …).
 * Custom properties (our tokens) are not affected by `all`.
 */
export const baseStyles = /* css */ `
:host { all: initial; display: block; }
:host([hidden]) { display: none; }

.fl-root {
  container: flarie / inline-size;
  font-family: var(--flarie-font-family-body);
  font-size: var(--flarie-font-size-base);
  line-height: 1.5;
  color: var(--flarie-color-text);
  -webkit-font-smoothing: antialiased;
}
/* The portal container is a sibling of the app root, so it needs the same base. */
.fl-portal { container: none; }
.fl-root *, .fl-root *::before, .fl-root *::after { box-sizing: border-box; }
.fl-root :is(h1, h2, h3, h4) { font-family: var(--flarie-font-family-heading); }

.fl-loading { min-height: 120px; }
.fl-crash {
  padding: 16px;
  border: 1px solid var(--flarie-color-border);
  border-radius: var(--flarie-card-radius);
  color: var(--flarie-color-text-muted);
}
`;
