/**
 * Authentication Zustand store.
 * Single source of truth for auth state, user profile, and token status.
 */

import { create } from 'zustand';
import type { AuthState, AuthStatus, AuthTokens, GoogleUser } from '@/types/auth';

export interface AuthStore extends AuthState {
  setLoading: () => void;
  setAuthenticated: (user: GoogleUser, tokens: AuthTokens) => void;
  setError: (error: string) => void;
  setIdle: () => void;
  clearAuth: () => void;
  updateTokens: (tokens: AuthTokens) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  status: 'idle' as AuthStatus,
  user: null,
  tokens: null,
  error: null,

  setLoading: () =>
    set({ status: 'loading', error: null }),

  setAuthenticated: (user, tokens) =>
    set({ status: 'authenticated', user, tokens, error: null }),

  setError: (error) =>
    set({ status: 'error', error }),

  setIdle: () =>
    set({ status: 'idle', error: null }),

  clearAuth: () =>
    set({ status: 'idle', user: null, tokens: null, error: null }),

  updateTokens: (tokens) =>
    set((s) => ({ tokens: s.user ? tokens : null })),
}));
