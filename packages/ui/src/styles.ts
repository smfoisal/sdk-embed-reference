/**
 * Primitive styles. They only read CSS custom properties (tokens), never
 * hard-coded brand values, so every partner theme applies automatically.
 * Injected into each shadow root by the runtime (or globally by standalone Studio).
 */
export const uiStyles = /* css */ `
.fl-btn {
  font: inherit;
  font-weight: 600;
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: calc(var(--flarie-spacing-unit) * 2.25) calc(var(--flarie-spacing-unit) * 4);
  border-radius: var(--flarie-button-radius);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.fl-btn:focus-visible { outline: 3px solid var(--flarie-focus-ring); outline-offset: 2px; }
.fl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.fl-btn--primary { background: var(--flarie-button-primary-bg); color: var(--flarie-button-primary-text); }
.fl-btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--flarie-button-primary-bg) 86%, #000); }
.fl-btn--secondary { background: var(--flarie-color-surface); color: var(--flarie-color-text); border-color: var(--flarie-color-border); }
.fl-btn--secondary:hover:not(:disabled) { border-color: var(--flarie-color-text-muted); }
.fl-btn--ghost { background: transparent; color: var(--flarie-color-primary); padding-inline: calc(var(--flarie-spacing-unit) * 2.5); }
.fl-btn--ghost:hover:not(:disabled) { background: color-mix(in srgb, var(--flarie-color-primary) 9%, transparent); }

.fl-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.86em;
  font-weight: 600;
}
.fl-badge--positive { background: color-mix(in srgb, var(--flarie-color-primary) 13%, transparent); color: var(--flarie-color-primary); }
.fl-badge--neutral { background: color-mix(in srgb, var(--flarie-color-text-muted) 13%, transparent); color: var(--flarie-color-text-muted); }

.fl-field { display: grid; gap: 6px; }
.fl-field-label { font-weight: 600; }
.fl-input {
  font: inherit;
  color: var(--flarie-color-text);
  background: var(--flarie-color-surface);
  border: 1px solid var(--flarie-color-border);
  border-radius: var(--flarie-input-radius);
  padding: calc(var(--flarie-spacing-unit) * 2.25) calc(var(--flarie-spacing-unit) * 3);
  width: 100%;
}
.fl-input:focus-visible { outline: 3px solid var(--flarie-focus-ring); outline-offset: 1px; border-color: var(--flarie-color-primary); }

.fl-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(10 12 16 / 0.45);
}
.fl-modal {
  width: min(440px, 100%);
  padding: 24px;
  background: var(--flarie-color-surface);
  color: var(--flarie-color-text);
  border-radius: calc(var(--flarie-card-radius) * 1.5);
  box-shadow: 0 24px 60px rgb(0 0 0 / 0.25);
}
.fl-modal-title { margin: 0 0 16px; font-size: 1.3em; }

.fl-form { display: grid; gap: 16px; }
.fl-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.fl-error { margin: 0; color: var(--flarie-color-danger); }
.fl-muted { color: var(--flarie-color-text-muted); }
`;
