// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Responsive Utilities
//
// Single source of truth for "how big is the screen and what should scale
// because of it." Nothing here knows about colors or app-specific spacing
// values — it's purely geometry. theme/index.ts and ThemeContext consume
// this to produce responsive spacing/fontSize/radius.
//
// Drop this file at: src/theme/responsive.ts
// ─────────────────────────────────────────────────────────────────────────────

import { useWindowDimensions, PixelRatio } from 'react-native';

// ── Breakpoints ──────────────────────────────────────────────────────────────
// Based on shortest-side width (dp), which is the standard way to detect
// "tablet" regardless of orientation. iPhone Pro Max is ~430dp wide;
// the smallest iPads and most Android tablets start around 600dp.

export const BREAKPOINTS = {
  phone:  0,
  tablet: 600,
  large:  900, // big tablets / iPad Pro landscape — reserved for later use
} as const;

export type DeviceClass = 'phone' | 'tablet' | 'large';

/**
 * Reference width used as the "design baseline." All the original hardcoded
 * pixel values in the app (e.g. ITEM_HEIGHT = 140) were designed against a
 * ~390dp-wide phone screen. We scale relative to that baseline so existing
 * proportions are preserved on phones and grow sensibly on tablets.
 */
const BASE_WIDTH = 390;

/** Clamp so scaling never goes so small it's unreadable, or so large it looks like a stretched phone app on a desktop-sized display. */
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.35;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function classify(shortestSide: number): DeviceClass {
  if (shortestSide >= BREAKPOINTS.large) return 'large';
  if (shortestSide >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

// ── Core hook ────────────────────────────────────────────────────────────────

export interface ResponsiveInfo {
  width:  number;
  height: number;
  /** min(width, height) — stable across rotation, used for breakpoints */
  shortestSide: number;
  /** max(width, height) — the other one */
  longestSide: number;
  isLandscape: boolean;
  isTablet: boolean;   // shortestSide >= tablet breakpoint
  isLargeTablet: boolean;
  deviceClass: DeviceClass;
  /**
   * Multiplier for spacing/fontSize/radius, derived from width relative to
   * the phone design baseline, then clamped. Use via scale()/moderateScale()
   * rather than reading this directly in most cases.
   */
  scaleFactor: number;
  /** Font scale the user has set at the OS level (accessibility) */
  fontScale: number;
}

/**
 * Live, re-renders on rotation / window resize / split-screen changes.
 * This replaces every `Dimensions.get('window')` call in the app.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height, fontScale } = useWindowDimensions();

  const shortestSide = Math.min(width, height);
  const longestSide   = Math.max(width, height);
  const isLandscape   = width > height;
  const deviceClass   = classify(shortestSide);

  const rawScale   = shortestSide / BASE_WIDTH;
  const scaleFactor = clamp(rawScale, MIN_SCALE, MAX_SCALE);

  return {
    width,
    height,
    shortestSide,
    longestSide,
    isLandscape,
    isTablet: deviceClass !== 'phone',
    isLargeTablet: deviceClass === 'large',
    deviceClass,
    scaleFactor,
    fontScale,
  };
}

// ── Scaling helpers ──────────────────────────────────────────────────────────
// Two flavors, same distinction RN devs typically reach for:
//
//   scale(size)            — full linear scale. Good for widths, image sizes,
//                             things that should genuinely grow with the screen.
//
//   moderateScale(size, f) — dampened scale (default factor 0.5). Good for
//                             fontSize / padding / border radius, where you
//                             want *some* growth on tablets but not 1:1,
//                             so text doesn't become oversized.
//
// Both take the current scaleFactor from useResponsive() so they stay in
// sync with live rotation/resize.

export function scale(size: number, scaleFactor: number): number {
  return Math.round(size * scaleFactor);
}

export function moderateScale(
  size: number,
  scaleFactor: number,
  factor = 0.5,
): number {
  return Math.round(size + (size * scaleFactor - size) * factor);
}

/**
 * Rounds to the nearest device pixel — avoids the classic RN blurry-border
 * problem when scaled values land on fractional dp.
 */
export function pixelRound(value: number): number {
  return PixelRatio.roundToNearestPixel(value);
}

// ── Grid helpers ─────────────────────────────────────────────────────────────
// Used for things like HomeScreen's nav card grid, which is hardcoded to
// exactly 2 columns today. On a tablet we want more columns, not just
// bigger cards.

/**
 * Picks a column count based on device class. Callers can override per-screen
 * if 2/2/3 doesn't fit their content (e.g. a grid of small chips might want
 * 3/4/6 instead) — pass custom columnsFor* args.
 */
export function useResponsiveColumns(
  columnsPhone = 2,
  columnsTablet = 3,
  columnsLarge = 4,
): number {
  const { deviceClass } = useResponsive();
  if (deviceClass === 'large') return columnsLarge;
  if (deviceClass === 'tablet') return columnsTablet;
  return columnsPhone;
}

/**
 * Caps content width on large screens so a phone-shaped app doesn't stretch
 * into a single unreadable full-bleed column on a 12" tablet. This is the
 * "respond, but don't go desktop-wide" constraint you mentioned.
 */
export const MAX_CONTENT_WIDTH = 720;

export function useContentWidth(): number {
  const { width } = useResponsive();
  return Math.min(width, MAX_CONTENT_WIDTH);
}