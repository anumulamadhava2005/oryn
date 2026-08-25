/**
 * Preferred Senders Zustand store backed by MMKV.
 * Tracks user-selected prominent/frequent senders and app launch filtering preferences.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oryn-preferred-senders' });
const KEYS = {
  SELECTED: 'preferredSenders:selected',
  FILTER_ON_OPEN: 'preferredSenders:filterOnAppOpen',
};

function getInitialSelected(): string[] {
  const raw = storage.getString(KEYS.SELECTED);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s: string) => s.toLowerCase()) : [];
  } catch {
    return [];
  }
}

function getInitialFilterOnOpen(): boolean {
  return storage.getBoolean(KEYS.FILTER_ON_OPEN) ?? false;
}

export interface PreferredSendersStore {
  selectedSenders: string[]; // Lowercased email addresses
  filterOnAppOpen: boolean;
  activeFilter: boolean;

  toggleSender: (email: string) => void;
  setSelectedSenders: (emails: string[]) => void;
  setFilterOnAppOpen: (enabled: boolean) => void;
  setActiveFilter: (active: boolean) => void;
  clearSelectedSenders: () => void;
}

export const usePreferredSendersStore = create<PreferredSendersStore>()((set, get) => {
  const initialSelected = getInitialSelected();
  const initialFilterOnOpen = getInitialFilterOnOpen();

  return {
    selectedSenders: initialSelected,
    filterOnAppOpen: initialFilterOnOpen,
    activeFilter: initialFilterOnOpen && initialSelected.length > 0,

    toggleSender: (email: string) => {
      const lower = email.toLowerCase().trim();
      const current = get().selectedSenders;
      const updated = current.includes(lower)
        ? current.filter(e => e !== lower)
        : [...current, lower];

      storage.set(KEYS.SELECTED, JSON.stringify(updated));
      set({ selectedSenders: updated, activeFilter: get().filterOnAppOpen && updated.length > 0 });
    },

    setSelectedSenders: (emails: string[]) => {
      const updated = Array.from(new Set(emails.map(e => e.toLowerCase().trim())));
      storage.set(KEYS.SELECTED, JSON.stringify(updated));
      set({ selectedSenders: updated, activeFilter: get().filterOnAppOpen && updated.length > 0 });
    },

    setFilterOnAppOpen: (enabled: boolean) => {
      storage.set(KEYS.FILTER_ON_OPEN, enabled);
      set((s) => ({
        filterOnAppOpen: enabled,
        activeFilter: enabled && s.selectedSenders.length > 0,
      }));
    },

    setActiveFilter: (active: boolean) => {
      set({ activeFilter: active });
    },

    clearSelectedSenders: () => {
      storage.delete(KEYS.SELECTED);
      set({ selectedSenders: [], activeFilter: false });
    },
  };
});
