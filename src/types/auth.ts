/** Authentication domain types */

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  familyName: string | null;
  givenName: string | null;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string | null;
  /** Unix ms — when the access token expires */
  expiresAt: number;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: GoogleUser | null;
  tokens: AuthTokens | null;
  error: string | null;
}
