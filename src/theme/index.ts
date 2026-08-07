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

// These will be replaced by the active theme at runtime via ThemeContext,
// but are exported here so existing imports don't break during transition.
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