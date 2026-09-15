/**
 * App Preferences Zustand store backed by MMKV.
 * Manages user interface preferences:
 * - Inbox tab visibility in bottom navigation
 * - Default start/landing screen on app open ('inbox' | 'today')
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { applyTheme, type ThemeMode } from '@/constants/theme';

const storage = new MMKV({ id: 'oryn-app-preferences' });

const KEYS = {
  SHOW_INBOX_TAB: 'pref:show_inbox_tab',
  START_SCREEN: 'pref:start_screen',
  THEME_MODE: 'pref:theme_mode',
};

export type StartScreen = 'inbox' | 'today';
export type { ThemeMode } from '@/constants/theme';

function getInitialShowInboxTab(): boolean {
  return storage.getBoolean(KEYS.SHOW_INBOX_TAB) ?? true;
}

function getInitialStartScreen(): StartScreen {
  const stored = storage.getString(KEYS.START_SCREEN) as StartScreen | undefined;
  if (stored === 'inbox' || stored === 'today') {
    return stored;
  }
  return 'inbox';
}

function getInitialThemeMode(): ThemeMode {
  const stored = storage.getString(KEYS.THEME_MODE) as ThemeMode | undefined;
  if (stored === 'vibrant' || stored === 'monochrome') {
    return stored;
  }
  return 'monochrome';
}

export interface AppPreferencesStore {
  showInboxTab: boolean;
  startScreen: StartScreen;
  themeMode: ThemeMode;

  setShowInboxTab: (show: boolean) => void;
  toggleInboxTab: () => void;
  setStartScreen: (screen: StartScreen) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

export const usePreferencesStore = create<AppPreferencesStore>()((set, get) => {
  const initialShowInbox = getInitialShowInboxTab();
  const initialStart = getInitialStartScreen();
  const initialTheme = getInitialThemeMode();

  return {
    showInboxTab: initialShowInbox,
    startScreen: !initialShowInbox ? 'today' : initialStart,
    themeMode: initialTheme,

    setShowInboxTab: (show: boolean) => {
      storage.set(KEYS.SHOW_INBOX_TAB, show);
      const nextStartScreen = !show ? 'today' : get().startScreen;
      storage.set(KEYS.START_SCREEN, nextStartScreen);
      set({ showInboxTab: show, startScreen: nextStartScreen });
    },

    toggleInboxTab: () => {
      const next = !get().showInboxTab;
      get().setShowInboxTab(next);
    },

    setStartScreen: (screen: StartScreen) => {
      storage.set(KEYS.START_SCREEN, screen);
      set({ startScreen: screen });
    },

    setThemeMode: (mode: ThemeMode) => {
      storage.set(KEYS.THEME_MODE, mode);
      applyTheme(mode);
      set({ themeMode: mode });
    },

    toggleThemeMode: () => {
      const next: ThemeMode = get().themeMode === 'vibrant' ? 'monochrome' : 'vibrant';
      get().setThemeMode(next);
    },
  };
});
