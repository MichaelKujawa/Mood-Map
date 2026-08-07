// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Theme Context
// Provides the active theme to all screens.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { store } from '../data/store';
import { resolveTheme, darkTheme } from './index';
import type { Theme, ThemeMode } from './index';

interface ThemeContextValue {
  colors:    Theme;
  mode:      ThemeMode;
  setMode:   (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors:  darkTheme,
  mode:    'dark',
  setMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState]     = useState<ThemeMode>('dark');
  const [colors, setColors]      = useState<Theme>(darkTheme);

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

  return (
    <ThemeContext.Provider value={{ colors, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}