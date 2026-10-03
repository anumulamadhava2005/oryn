/**
 * Action Item Completion Zustand store backed by MMKV.
 * Tracks checked/completed action items with persistent state.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oryn-action-items-state' });
const STORAGE_KEY = 'completed_action_keys';

function loadCompletedKeys(): Record<string, boolean> {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCompletedKeys(map: Record<string, boolean>) {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export interface ActionItemStore {
  completedMap: Record<string, boolean>;
  toggleCompleted: (key: string) => boolean; // returns new checked state
  isCompleted: (key: string) => boolean;
  clearAll: () => void;
}

export const useActionItemStore = create<ActionItemStore>()((set, get) => ({
  completedMap: loadCompletedKeys(),

  toggleCompleted: (key: string) => {
    const current = get().completedMap;
    const nextVal = !current[key];
    const updated = { ...current, [key]: nextVal };
    saveCompletedKeys(updated);
    set({ completedMap: updated });
    return nextVal;
  },

  isCompleted: (key: string) => {
    return !!get().completedMap[key];
  },

  clearAll: () => {
    saveCompletedKeys({});
    set({ completedMap: {} });
  },
}));
