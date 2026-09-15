/**
 * Lost & Found API client.
 * Handles authenticated mutations via Oryn backend JWT,
 * auto-exchanging the Google idToken on first call.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth';

const storage = new MMKV({ id: 'oryn-lost-found-cache' });

const ITEMS_CACHE_KEY = 'cache:lost_found_items';
const ORYN_JWT_KEY = 'oryn_backend_jwt';

// ─── Types ──────────────────────────────────────────────────────

export interface LostItem {
  id: string;
  poster_id: string;
  campus_id: string | null;
  title: string;
  description: string;
  category: string;
  location_found: string | null;
  building: string | null;
  contact_info: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  poster_name: string;
  poster_avatar: string | null;
  poster_email?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateLostItemPayload {
  title: string;
  description: string;
  category?: string;
  campus_id?: string;
  location_found?: string;
  building?: string;
  contact_info?: string;
  image_url?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateLostItemPayload {
  title?: string;
  description?: string;
  category?: string;
  location_found?: string;
  building?: string;
  contact_info?: string;
  image_url?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// ─── URL Resolution ─────────────────────────────────────────────

function getApiBaseUrls(): string[] {
  const urls: string[] = [
    'https://api.cruxel.xyz/oryn',
  ];

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      urls.push(`http://${host}:3000/oryn`);
    }
  }

  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:3000/oryn');
  }

  urls.push('http://localhost:3000/oryn');
  urls.push('http://127.0.0.1:3000/oryn');

  return urls;
}

// ─── JWT Management ─────────────────────────────────────────────

async function getOrynJwt(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(ORYN_JWT_KEY);
  return raw || null;
}

async function saveOrynJwt(jwt: string): Promise<void> {
  await SecureStore.setItemAsync(ORYN_JWT_KEY, jwt);
}

export async function clearOrynJwt(): Promise<void> {
  await SecureStore.deleteItemAsync(ORYN_JWT_KEY);
}

/**
 * Exchange Google idToken for an Oryn backend JWT.
 * Called automatically when the stored JWT is missing.
 */
async function exchangeTokenForJwt(): Promise<string | null> {
  const tokens = useAuthStore.getState().tokens;
  if (!tokens?.idToken) return null;

  const urls = getApiBaseUrls();

  for (const base of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${base}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: tokens.idToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          await saveOrynJwt(data.token);
          return data.token;
        }
      }
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

/**
 * Get a valid Oryn JWT, exchanging automatically if needed.
 */
async function getValidOrynJwt(): Promise<string | null> {
  let jwt = await getOrynJwt();
  if (jwt) return jwt;

  jwt = await exchangeTokenForJwt();
  return jwt;
}

// ─── HTTP Helpers ───────────────────────────────────────────────

async function fetchFromApi(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    auth?: boolean;
    queryParams?: URLSearchParams;
  },
): Promise<any> {
  const urls = getApiBaseUrls();
  const queryString = options?.queryParams ? `?${options.queryParams.toString()}` : '';
  const method = options?.method || 'GET';
  const needsAuth = options?.auth ?? false;

  let authHeader: string | undefined;
  if (needsAuth) {
    const jwt = await getValidOrynJwt();
    if (!jwt) throw new Error('Authentication required. Please sign in again.');
    authHeader = `Bearer ${jwt}`;
  }

  for (const base of urls) {
    try {
      const fullUrl = `${base}${endpoint}${queryString}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const headers: Record<string, string> = {};
      if (method !== 'GET') headers['Content-Type'] = 'application/json';
      if (authHeader) headers['Authorization'] = authHeader;

      const response = await fetch(fullUrl, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      // If 401/403, clear JWT and retry once with fresh token
      if (needsAuth && (response.status === 401 || response.status === 403)) {
        await clearOrynJwt();
        const freshJwt = await exchangeTokenForJwt();
        if (freshJwt) {
          const retryHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshJwt}`,
          };
          const retryController = new AbortController();
          const retryTimeout = setTimeout(() => retryController.abort(), 5000);
          const retryRes = await fetch(fullUrl, {
            method,
            headers: retryHeaders,
            body: options?.body ? JSON.stringify(options.body) : undefined,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeout);
          if (retryRes.ok) return await retryRes.json();

          const errBody = await retryRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Request failed with status ${retryRes.status}`);
        }
      }

      // If server returned 4xx (client error e.g. 400 validation error), throw it directly
      if (response.status >= 400 && response.status < 500) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed with status ${response.status}`);
      }
    } catch (err: any) {
      // If it's a specific validation/client error thrown from above, propagate it
      if (
        err.message &&
        !err.message.includes('fetch failed') &&
        !err.message.includes('ConnectException') &&
        !err.message.includes('Network request failed') &&
        !err.message.includes('aborted')
      ) {
        throw err;
      }
      // Connection error — try next endpoint
    }
  }
  throw new Error('Unable to reach server. Please check your connection.');
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Fetch lost items (public, cached)
 */
export async function fetchLostItems(filters?: {
  campus_id?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<LostItem[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.campus_id) query.append('campus_id', filters.campus_id);
    if (filters?.category) query.append('category', filters.category);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.limit) query.append('limit', String(filters.limit));
    if (filters?.offset) query.append('offset', String(filters.offset));

    const data = await fetchFromApi('/lost-found', { queryParams: query });
    if (Array.isArray(data)) {
      storage.set(ITEMS_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err: any) {
    console.warn('[LostFoundAPI] Error fetching items:', err.message);
  }

  // Fallback to cache
  const cachedRaw = storage.getString(ITEMS_CACHE_KEY);
  if (cachedRaw) {
    try { return JSON.parse(cachedRaw); } catch {}
  }
  return [];
}

/**
 * Get a single lost item
 */
export async function fetchLostItemById(id: string): Promise<LostItem | null> {
  try {
    return await fetchFromApi(`/lost-found/${id}`);
  } catch {
    return null;
  }
}

/**
 * Post a new lost item (authenticated)
 */
export async function createLostItem(payload: CreateLostItemPayload): Promise<LostItem> {
  return await fetchFromApi('/lost-found', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

/**
 * Update a lost item (authenticated, poster only)
 */
export async function updateLostItem(id: string, payload: UpdateLostItemPayload): Promise<LostItem> {
  return await fetchFromApi(`/lost-found/${id}`, {
    method: 'PUT',
    body: payload,
    auth: true,
  });
}

/**
 * Mark item as found — deletes it (authenticated, poster only)
 */
export async function markItemFound(id: string): Promise<{ success: boolean; message: string }> {
  return await fetchFromApi(`/lost-found/${id}/found`, {
    method: 'POST',
    auth: true,
  });
}

/**
 * Delete a lost item (authenticated, poster only)
 */
export async function deleteLostItem(id: string): Promise<{ success: boolean }> {
  return await fetchFromApi(`/lost-found/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

/**
 * Invalidate cached items
 */
export function invalidateLostFoundCache(): void {
  storage.delete(ITEMS_CACHE_KEY);
}
