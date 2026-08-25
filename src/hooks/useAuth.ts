/**
 * useAuth hook.
 * Handles Google Sign-In, silent restore on app launch, and sign-out.
 * Ensures persistent auth across app restarts by falling back to stored tokens.
 */

import { useCallback, useEffect } from 'react';
import {
  configureGoogleSignIn,
  signIn,
  signOut as googleSignOut,
  silentSignIn,
  loadUser,
  loadTokens,
} from '@/auth/google';
import { useAuthStore } from '@/store/auth';
import { clearAllCache } from '@/services/cache';

let configured = false;

function ensureConfigured(): void {
  if (!configured) {
    configureGoogleSignIn();
    configured = true;
  }
}

export function useAuth() {
  const store = useAuthStore();

  // Attempt silent restore on first mount
  useEffect(() => {
    ensureConfigured();

    if (store.status !== 'idle') return;
    store.setLoading();

    silentSignIn()
      .then(result => {
        if (result) {
          store.setAuthenticated(result.user, result.tokens);
        } else {
          // If silentSignIn returns null, fall back to persisted local credentials
          return Promise.all([loadUser(), loadTokens()]).then(([user, tokens]) => {
            if (user && tokens) {
              store.setAuthenticated(user, tokens);
            } else {
              store.setIdle();
            }
          });
        }
      })
      .catch(() => {
        // Offline / network failure fallback to persisted local credentials
        Promise.all([loadUser(), loadTokens()])
          .then(([user, tokens]) => {
            if (user && tokens) {
              store.setAuthenticated(user, tokens);
            } else {
              store.setIdle();
            }
          })
          .catch(() => store.setIdle());
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async () => {
    ensureConfigured();
    store.setLoading();
    try {
      const { user, tokens } = await signIn();
      store.setAuthenticated(user, tokens);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      store.setError(msg);
    }
  }, [store]);

  const logout = useCallback(async () => {
    store.setLoading();
    try {
      await googleSignOut();
      clearAllCache();
      store.clearAuth();
    } catch {
      clearAllCache();
      store.clearAuth();
    }
  }, [store]);

  return {
    status: store.status,
    user: store.user,
    tokens: store.tokens,
    error: store.error,
    isAuthenticated: store.status === 'authenticated',
    isLoading: store.status === 'loading',
    login,
    logout,
  };
}
