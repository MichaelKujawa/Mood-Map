// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Theme Context
// Provides the active color theme AND responsive metrics to all screens.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import { store } from '../data/store';
import {
  resolveTheme, darkTheme,
  spacing as baseSpacing, fontSize as baseFontSize, radius as baseRadius,
  scaleSpacing, scaleFontSize, scaleRadius,
} from './index';
import type { Theme, ThemeMode, SpacingScale, FontSizeScale, RadiusScale } from './index';
import { useResponsive, type DeviceClass } from './responsive'

interface ThemeContextValue {
  colors:    Theme;
  mode:      ThemeMode;
  setMode:   (mode: ThemeMode) => Promise<void>;

  // ── Responsive metrics — prefer these over the static imports from
  // theme/index.ts in any screen you migrate. Same shape/keys as before
  // (spacing.md, fontSize.lg, radius.full, etc.), just live-scaled.
  spacing:   SpacingScale;
  fontSize:  FontSizeScale;
  radius:    RadiusScale;

  // ── Device info — for the tablet/landscape-specific layout work.
  isTablet:      boolean;
  isLandscape:   boolean;
  deviceClass:   DeviceClass;
  width:         number;
  height:        number;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors:  darkTheme,
  mode:    'dark',
  setMode: async () => {},
  spacing:  baseSpacing,
  fontSize: baseFontSize,
  radius:   baseRadius,
  isTablet:    false,
  isLandscape: false,
  deviceClass: 'phone',
  width:  0,
  height: 0,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [colors, setColors]  = useState<Theme>(darkTheme);

  const responsive = useResponsive();

  const updateColors = useCallback((m: ThemeMode) => {
    setColors(resolveTheme(m));
  }, []);

  // Load saved theme preference on mount
  useEffect(() => {
    async function loadTheme() {
      const prefs = await store.getPreferences();
      const saved = (prefs as any).themeMode as ThemeMode ?? 'dark';
      setModeState(saved);
      updateColors(saved);
    }
    loadTheme();
  }, [updateColors]);

  // Re-evaluate auto theme when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') updateColors(mode);
    });
    return () => sub.remove();
  }, [mode, updateColors]);

  async function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    updateColors(newMode);
    await store.savePreferences({ ...await store.getPreferences(), themeMode: newMode } as any);
  }

  // Recomputed whenever the window dimensions change (rotation, split-screen,
  // tablet vs phone) — this is the piece that makes spacing/fontSize/radius
  // actually respond to screen size instead of being fixed numbers.
  const responsiveMetrics = useMemo(() => ({
    spacing:  scaleSpacing(responsive.scaleFactor),
    fontSize: scaleFontSize(responsive.scaleFactor),
    radius:   scaleRadius(responsive.scaleFactor),
  }), [responsive.scaleFactor]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors,
    mode,
    setMode,
    ...responsiveMetrics,
    isTablet:    responsive.isTablet,
    isLandscape: responsive.isLandscape,
    deviceClass: responsive.deviceClass,
    width:       responsive.width,
    height:      responsive.height,
  }), [colors, mode, responsiveMetrics, responsive]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}