/**
 * Theme Context — Provides dynamic Light/Dark mode token switching & MMKV persistence.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';
import { Colors } from '@/constants/theme';

const storage = new MMKV({ id: 'oryn-theme' });
const THEME_KEY = 'theme_preference';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: typeof Colors;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  setMode: () => {},
  isDark: true,
  colors: Colors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (storage.getString(THEME_KEY) as ThemeMode) || 'dark';
  });

  const setMode = (newMode: ThemeMode) => {
    storage.set(THEME_KEY, newMode);
    setModeState(newMode);
  };

  const isDark = mode === 'dark' || mode === 'system';

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, colors: Colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
