/**
 * Google Sign-In service.
 * Wraps @react-native-google-signin/google-signin v14 and manages
 * token lifecycle: sign-in, silent restore, refresh, sign-out.
 */

import {
  GoogleSignin,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

import { WEB_CLIENT_ID, GMAIL_SCOPES } from '@/constants/gmail';
import type { AuthTokens, GoogleUser } from '@/types/auth';

const STORE_TOKENS_KEY = 'oryn_auth_tokens';
const STORE_USER_KEY = 'oryn_auth_user';

/** One-time setup — call before using any sign-in methods */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    scopes: GMAIL_SCOPES,
    offlineAccess: false,
  });
}

/** Persist tokens securely */
async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(STORE_TOKENS_KEY, JSON.stringify(tokens));
}

/** Load persisted tokens */
export async function loadTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(STORE_TOKENS_KEY);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

/** Persist user profile */
async function saveUser(user: GoogleUser): Promise<void> {
  await SecureStore.setItemAsync(STORE_USER_KEY, JSON.stringify(user));
}

/** Load persisted user */
export async function loadUser(): Promise<GoogleUser | null> {
  const raw = await SecureStore.getItemAsync(STORE_USER_KEY);
  return raw ? (JSON.parse(raw) as GoogleUser) : null;
}

/**
 * Map v14 User object to our internal GoogleUser shape.
 * In v14, the User type is { user: {...}, scopes, idToken, serverAuthCode }.
 */
function mapUser(u: User): GoogleUser {
  return {
    id: u.user.id,
    name: u.user.name ?? '',
    email: u.user.email,
    photo: u.user.photo ?? null,
    familyName: u.user.familyName ?? null,
    givenName: u.user.givenName ?? null,
  };
}

/**
 * Sign the user in interactively.
 * Returns the signed-in user and tokens.
 */
export async function signIn(): Promise<{ user: GoogleUser; tokens: AuthTokens }> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') {
    throw new Error('Sign-in was cancelled');
  }

  const tokenResponse = await GoogleSignin.getTokens();
  const user = mapUser(response.data);
  const tokens: AuthTokens = {
    accessToken: tokenResponse.accessToken,
    idToken: tokenResponse.idToken ?? null,
    // Access tokens typically expire in 1 hour; refresh 5 min early
    expiresAt: Date.now() + 55 * 60 * 1000,
  };

  await Promise.all([saveTokens(tokens), saveUser(user)]);
  return { user, tokens };
}

/**
 * Attempt a silent sign-in to restore a previous session.
 * Returns null when no prior session exists or when it can't be silently restored.
 */
export async function silentSignIn(): Promise<{
  user: GoogleUser;
  tokens: AuthTokens;
} | null> {
  try {
    const response = await GoogleSignin.signInSilently();

    // 'noSavedCredentialFound' means no previous session
    if (response.type !== 'success') {
      return null;
    }

    const tokenResponse = await GoogleSignin.getTokens();
    const user = mapUser(response.data);
    const tokens: AuthTokens = {
      accessToken: tokenResponse.accessToken,
      idToken: tokenResponse.idToken ?? null,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };

    await Promise.all([saveTokens(tokens), saveUser(user)]);
    return { user, tokens };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_REQUIRED) {
      return null;
    }
    throw error;
  }
}

/**
 * Get a valid access token, refreshing silently if expired.
 * Uses a mutex to prevent parallel refresh storms.
 */
let _refreshPromise: Promise<string> | null = null;

export async function getValidAccessToken(): Promise<string> {
  const cached = await loadTokens();

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  // Mutex: if a refresh is already in-flight, wait for it
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const result = await silentSignIn();
      if (!result) {
        throw new Error('Session expired. Please sign in again.');
      }
      return result.tokens.accessToken;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/** Sign the user out and clear all persisted data */
export async function signOut(): Promise<void> {
  await GoogleSignin.signOut();
  await Promise.all([
    SecureStore.deleteItemAsync(STORE_TOKENS_KEY),
    SecureStore.deleteItemAsync(STORE_USER_KEY),
  ]);
}

/** Returns whether the user is currently signed in */
export async function isSignedIn(): Promise<boolean> {
  return GoogleSignin.hasPreviousSignIn();
}
