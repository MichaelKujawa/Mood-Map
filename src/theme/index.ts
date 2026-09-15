// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Theme System
// Supports dark (default), light, and auto (time-based) modes.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface Theme {
  background:  string;
  card:        string;
  cardAlt:     string;
  purple:      string;
  purpleLight: string;
  purplePale:  string;
  gold:        string;
  white:       string;
  gray:        string;
  grayLight:   string;
  positive:    string;
  negative:    string;
  border:      string;
  text:        string;
  textMuted:   string;
  textDark:    string;
}

export const darkTheme: Theme = {
  background:  '#1A1A2E',
  card:        '#252540',
  cardAlt:     '#2E2E50',
  purple:      '#6B4FA0',
  purpleLight: '#9B7DC8',
  purplePale:  '#EDE7F6',
  gold:        '#C8973A',
  white:       '#FFFFFF',
  gray:        '#8A8490',
  grayLight:   '#F5F3F8',
  positive:    '#4CAF50',
  negative:    '#EF5350',
  border:      '#3A3A5C',
  text:        '#FFFFFF',
  textMuted:   '#8A8490',
  textDark:    '#1A1A2E',
};

export const lightTheme: Theme = {
  background:  '#FDFBF0',
  card:        '#F5EDD0',
  cardAlt:     '#EDE0B8',
  purple:      '#C8973A',
  purpleLight: '#A07828',
  purplePale:  '#FDF6E9',
  gold:        '#4A7FA8',
  white:       '#2C2416',
  gray:        '#8A7355',
  grayLight:   '#F9F4E4',
  positive:    '#2E7D32',
  negative:    '#C62828',
  border:      '#E8D9A0',
  text:        '#2C2416',
  textMuted:   '#8A7355',
  textDark:    '#FDFBF0',
};

// ── Time-based auto switching ──────────────────────────────────────────────

/**
 * Returns true if current time is between 7am and 8pm — light mode hours.
 */
export function isLightHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 20;
}

/**
 * Resolves the active theme based on the mode setting.
 */
export function resolveTheme(mode: ThemeMode): Theme {
  if (mode === 'light') return lightTheme;
  if (mode === 'dark')  return darkTheme;
  // auto — switch based on time of day
  return isLightHours() ? lightTheme : darkTheme;
}

// ── Legacy exports (keeps all existing screens working without changes) ────
//
// These stay exactly as they were — fixed numbers, phone-baseline sizing.
// Any screen that hasn't been migrated to useTheme()'s responsive metrics
// yet will keep working exactly as before. Once a screen is migrated
// (see ThemeContext.tsx + responsive.ts), it should read spacing/fontSize/
// radius from useTheme() instead of importing them from here.

export const colors = darkTheme;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  md:   16,
  lg:   20,
  xl:   26,
  xxl:  36,
  hero: 56,
} as const;

export const radius = {
  sm:   8,
  md:   14,
  lg:   20,
  full: 999,
} as const;

// ── Responsive metrics ───────────────────────────────────────────────────────
//
// These are the SAME shapes as spacing/fontSize/radius above (same keys),
// just scaled by the live screen's scaleFactor (see theme/responsive.ts).
// ThemeContext computes these once per render via useResponsive() and hands
// them out through useTheme(), so screens get live-updating values without
// needing to import responsive.ts directly.
//
// Scaling philosophy, tuned per metric:
//   - fontSize: moderate scale (factor 0.5) — grows on tablets for
//     readability, but text at 2x screen width shouldn't be 2x the size.
//   - spacing:  lighter scale (factor 0.3) — generous padding at phone
//     proportions already reads fine scaled up slightly; scaling it as
//     hard as font size makes tablet layouts feel sparse/empty.
//   - radius:   barely scales (factor 0.15) — corner radius is a style
//     signature, not something that should visibly change with screen size.

export type SpacingScale  = typeof spacing;
export type FontSizeScale = typeof fontSize;
export type RadiusScale   = typeof radius;

function scaleShape<T extends Record<string, number>>(
  shape: T,
  scaleFactor: number,
  dampening: number,
): T {
  const result = {} as Record<string, number>;
  for (const key of Object.keys(shape)) {
    const base = shape[key];
    result[key] = Math.round(base + (base * scaleFactor - base) * dampening);
  }
  return result as T;
}

export function scaleSpacing(scaleFactor: number): SpacingScale {
  return scaleShape(spacing, scaleFactor, 0.3);
}

export function scaleFontSize(scaleFactor: number): FontSizeScale {
  return scaleShape(fontSize, scaleFactor, 0.5);
}

export function scaleRadius(scaleFactor: number): RadiusScale {
  // radius.full = 999 is a "fully round" sentinel, not a real dimension —
  // never scale it, or full-round pills/avatars get corner artifacts.
  const scaled = scaleShape(radius, scaleFactor, 0.15);
  return { ...scaled, full: radius.full };
}