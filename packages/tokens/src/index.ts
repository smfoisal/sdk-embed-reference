import type { Appearance, SemanticToken, ThemeVariables } from '@flarie/contract';

/** Flarie's own defaults. Direct customers see exactly this. */
export const flarieDefaultTheme: ThemeVariables = {
  colorPrimary: '#2B59C3',
  colorOnPrimary: '#FFFFFF',
  colorBackground: '#F5F6F8',
  colorSurface: '#FFFFFF',
  colorText: '#1A1D24',
  colorTextMuted: '#5E6573',
  colorBorder: '#DDE1E8',
  colorDanger: '#C2362F',
  fontFamilyBody: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontFamilyHeading: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontSizeBase: '14px',
  borderRadius: '8px',
  spacingUnit: '4px',
};

/** Tier 2 tokens are derived from tier 1, so a partner that sets one colour gets a coherent theme. */
function deriveSemanticTokens(v: ThemeVariables): Record<SemanticToken, string> {
  return {
    'button-primary-bg': v.colorPrimary,
    'button-primary-text': v.colorOnPrimary,
    'button-radius': v.borderRadius,
    'card-bg': v.colorSurface,
    'card-border': v.colorBorder,
    'card-radius': v.borderRadius,
    'input-radius': v.borderRadius,
    'focus-ring': `color-mix(in srgb, ${v.colorPrimary} 45%, transparent)`,
  };
}

export type ResolvedTokens = Record<string, string>;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function defined<T extends object>(obj: T | undefined): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

/**
 * Merge appearance layers, later layers win:
 *   Flarie default → partner theme (configured in Flarie backend) → runtime appearance (partner code)
 * Output is a flat map of CSS custom properties.
 */
export function resolveTheme(...layers: Array<Appearance | undefined>): ResolvedTokens {
  const variables: ThemeVariables = Object.assign({}, flarieDefaultTheme, ...layers.map((l) => defined(l?.variables)));
  const semantic: Record<string, string> = Object.assign(deriveSemanticTokens(variables), ...layers.map((l) => defined(l?.tokens)));

  const out: ResolvedTokens = {};
  for (const [key, value] of Object.entries(variables)) out[`--flarie-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(semantic)) out[`--flarie-${key}`] = value;
  return out;
}

export function toCssText(tokens: ResolvedTokens, selector = ':host'): string {
  const body = Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

export function fontUrls(...layers: Array<Appearance | undefined>): string[] {
  return layers.map((l) => l?.fontUrl).filter((u): u is string => Boolean(u));
}
