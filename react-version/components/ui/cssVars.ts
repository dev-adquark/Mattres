import type { CSSProperties } from 'react';

/**
 * Runtime values (bar widths, stagger index, per-item hues) handed to CSS
 * Modules as custom properties: the only kind of inline style the site sets.
 */
export type CssVars = Record<`--${string}`, string | number>;
/** Alias kept for the editorial components that spell it this way. */
export type CSSVars = CssVars;

export function cssVars(vars: CssVars): CSSProperties {
  return vars as CSSProperties;
}
