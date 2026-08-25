/**
 * Onboarding Zustand store backed by MMKV.
 * Tracks whether onboarding has been completed.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oryn-onboarding' });
const KEY = 'onboarding:completed';

export interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()((set) => ({
  hasCompletedOnboarding: storage.getBoolean(KEY) ?? false,

  completeOnboarding: () => {
    storage.set(KEY, true);
    set({ hasCompletedOnboarding: true });
  },

  resetOnboarding: () => {
    storage.delete(KEY);
    set({ hasCompletedOnboarding: false });
  },
}));
