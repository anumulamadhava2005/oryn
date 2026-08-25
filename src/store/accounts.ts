/**
 * Multi-Account Store — Manages multiple linked Gmail accounts.
 * Allows instant 1-tap switching between primary college mail & secondary accounts.
 */

import { create } from 'zustand';
import type { GoogleUser } from '@/types/auth';

export interface Account {
  id: string;
  user: GoogleUser;
  unreadCount: number;
  isActive: boolean;
}

interface AccountsState {
  accounts: Account[];
  activeAccountId: string | null;
  addAccount: (user: GoogleUser) => void;
  switchAccount: (id: string) => void;
  removeAccount: (id: string) => void;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  activeAccountId: null,

  addAccount: (user) => {
    const existing = get().accounts;
    if (existing.some(a => a.id === user.id)) return;

    const newAcc: Account = {
      id: user.id,
      user,
      unreadCount: 0,
      isActive: existing.length === 0, // First account is active by default
    };

    set({
      accounts: [...existing, newAcc],
      activeAccountId: get().activeAccountId || user.id,
    });
  },

  switchAccount: (id) => {
    set((state) => ({
      activeAccountId: id,
      accounts: state.accounts.map(acc => ({
        ...acc,
        isActive: acc.id === id,
      })),
    }));
  },

  removeAccount: (id) => {
    set((state) => {
      const filtered = state.accounts.filter(a => a.id !== id);
      const nextActive = filtered.length > 0 ? filtered[0].id : null;
      return {
        accounts: filtered,
        activeAccountId: nextActive,
      };
    });
  },
}));
