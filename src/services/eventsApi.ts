/**
 * District Events, Clubs, and Live Polls API Client.
 * Integrated with Oryn VPS backend, MMKV offline caching,
 * and automatic Google ID-token to JWT exchange.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth';
import { silentSignIn } from '@/auth/google';
import type {
  DistrictEvent,
  Club,
  Poll,
  ClubRequest,
  DemographicsData,
  CreateEventPayload,
  CreateClubRequestPayload,
  CreatePollPayload,
  RSVPStatus,
} from '@/types/events';

const storage = new MMKV({ id: 'oryn-district-events-cache' });

const EVENTS_CACHE_KEY = 'cache:district_events';
const CLUBS_CACHE_KEY = 'cache:district_clubs';
const POLLS_CACHE_KEY = 'cache:district_polls';
const ORYN_JWT_KEY = 'oryn_backend_jwt';

// ─── Base URL Resolution ────────────────────────────────────────

function getApiBaseUrls(): string[] {
  const urls: string[] = ['https://api.cruxel.xyz/oryn'];

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

// ─── JWT Authentication ─────────────────────────────────────────

async function getOrynJwt(): Promise<string | null> {
  return (await SecureStore.getItemAsync(ORYN_JWT_KEY)) || null;
}

async function saveOrynJwt(jwt: string): Promise<void> {
  await SecureStore.setItemAsync(ORYN_JWT_KEY, jwt);
}

export async function clearOrynJwt(): Promise<void> {
  await SecureStore.deleteItemAsync(ORYN_JWT_KEY);
}

async function exchangeTokenForJwt(): Promise<string | null> {
  let tokens = useAuthStore.getState().tokens;
  if (!tokens?.idToken) {
    try {
      const fresh = await silentSignIn();
      if (fresh?.tokens) {
        useAuthStore.getState().updateTokens(fresh.tokens);
        tokens = fresh.tokens;
      }
    } catch {}
  }
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
      // Try next candidate
    }
  }
  return null;
}

async function getValidOrynJwt(): Promise<string | null> {
  let jwt = await getOrynJwt();
  if (jwt) return jwt;
  jwt = await exchangeTokenForJwt();
  return jwt;
}

// ─── HTTP Dispatcher ────────────────────────────────────────────

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
  const currentUser = useAuthStore.getState().user;
  if (needsAuth) {
    const jwt = await getValidOrynJwt().catch(() => null);
    if (jwt) {
      authHeader = `Bearer ${jwt}`;
    } else if (!currentUser?.email) {
      throw new Error('Authentication required. Please sign in again.');
    }
  }

  for (const base of urls) {
    try {
      const fullUrl = `${base}${endpoint}${queryString}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {};
      if (method !== 'GET') headers['Content-Type'] = 'application/json';
      if (authHeader) headers['Authorization'] = authHeader;
      if (currentUser?.email) headers['x-user-email'] = currentUser.email;
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;

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

      // Auto-retry on 401/403 with fresh token exchange
      if (needsAuth && (response.status === 401 || response.status === 403)) {
        await clearOrynJwt();
        const freshJwt = await exchangeTokenForJwt();
        if (freshJwt) {
          const retryHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshJwt}`,
          };
          const retryController = new AbortController();
          const retryTimeout = setTimeout(() => retryController.abort(), 6000);
          const retryRes = await fetch(fullUrl, {
            method,
            headers: retryHeaders,
            body: options?.body ? JSON.stringify(options.body) : undefined,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeout);
          if (retryRes.ok) return await retryRes.json();

          const errBody = await retryRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Request failed (${retryRes.status})`);
        }
      }

      if (response.status >= 400 && response.status < 500) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }
    } catch (err: any) {
      if (
        err.message &&
        !err.message.includes('fetch failed') &&
        !err.message.includes('ConnectException') &&
        !err.message.includes('Network request failed') &&
        !err.message.includes('aborted')
      ) {
        throw err;
      }
    }
  }
  throw new Error('Unable to reach server. Please check your network connection.');
}

// ─── Public API Methods ─────────────────────────────────────────

/**
 * Fetch District events with optional category and search filters.
 * Returns cached data immediately if offline.
 */
export async function fetchDistrictEvents(filters?: {
  category?: string;
  search?: string;
  featured?: boolean;
  organization_id?: string;
  limit?: number;
  offset?: number;
}): Promise<DistrictEvent[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.category && filters.category !== 'All') query.append('category', filters.category);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.featured) query.append('featured', 'true');
    if (filters?.organization_id) query.append('organization_id', filters.organization_id);
    if (filters?.limit) query.append('limit', String(filters.limit));
    if (filters?.offset) query.append('offset', String(filters.offset));

    const data = await fetchFromApi('/events/district', { queryParams: query, auth: true });
    if (Array.isArray(data)) {
      if (!filters?.category || filters.category === 'All') {
        storage.set(EVENTS_CACHE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (err: any) {
    console.warn('[EventsAPI] Error fetching district events:', err.message);
  }

  // Fallback to cache
  const cachedRaw = storage.getString(EVENTS_CACHE_KEY);
  if (cachedRaw) {
    try {
      const parsed: DistrictEvent[] = JSON.parse(cachedRaw);
      if (filters?.category && filters.category !== 'All') {
        return parsed.filter(e =>
          (e.tags && e.tags.some(t => t.toLowerCase().includes(filters.category!.toLowerCase()))) ||
          (e.organization_category && e.organization_category.toLowerCase() === filters.category!.toLowerCase())
        );
      }
      return parsed;
    } catch {}
  }
  return [];
}

/**
 * Fetch all registered clubs.
 */
export async function fetchClubs(filters?: { search?: string }): Promise<Club[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.search) query.append('search', filters.search);

    const data = await fetchFromApi('/clubs', { queryParams: query, auth: false });
    if (Array.isArray(data)) {
      storage.set(CLUBS_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err: any) {
    console.warn('[EventsAPI] Error fetching clubs:', err.message);
  }

  const cachedRaw = storage.getString(CLUBS_CACHE_KEY);
  if (cachedRaw) {
    try { return JSON.parse(cachedRaw); } catch {}
  }
  return [];
}

/**
 * Fetch a single club by ID with its events and active polls.
 */
export async function fetchClubById(clubId: string): Promise<Club | null> {
  try {
    return await fetchFromApi(`/clubs/${clubId}`, { auth: false });
  } catch {
    return null;
  }
}

/**
 * Fetch active campus polls.
 */
export async function fetchPolls(): Promise<Poll[]> {
  try {
    const data = await fetchFromApi('/polls', { auth: true });
    if (Array.isArray(data)) {
      storage.set(POLLS_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err: any) {
    console.warn('[EventsAPI] Error fetching polls:', err.message);
  }

  const cachedRaw = storage.getString(POLLS_CACHE_KEY);
  if (cachedRaw) {
    try { return JSON.parse(cachedRaw); } catch {}
  }
  return [];
}

/**
 * Vote on a live campus poll.
 */
export async function votePoll(pollId: string, optionId: string): Promise<Poll> {
  return await fetchFromApi(`/polls/${pollId}/vote`, {
    method: 'POST',
    body: { option_id: optionId },
    auth: true,
  });
}

/**
 * RSVP or record interest for an event with user's academic demographics.
 */
export async function rsvpEvent(
  eventId: string,
  payload: {
    status: RSVPStatus;
    program?: string;
    department?: string;
    semester?: string;
    year_of_study?: number;
    user_name?: string;
  },
): Promise<any> {
  return await fetchFromApi(`/events/${eventId}/rsvp`, {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

/**
 * Cancel RSVP for an event.
 */
export async function cancelRsvp(eventId: string): Promise<{ success: boolean }> {
  return await fetchFromApi(`/events/${eventId}/rsvp`, {
    method: 'DELETE',
    auth: true,
  });
}

/**
 * Fetch demographic breakdown of attendees (Club Lead or Admin only).
 */
export async function fetchEventDemographics(eventId: string): Promise<DemographicsData> {
  return await fetchFromApi(`/events/${eventId}/demographics`, {
    auth: true,
  });
}

/**
 * Check user's club leadership roles and super admin status.
 */
export async function fetchMyClubRoles(): Promise<{
  roles: { role: string; organization_id: string; club_name: string; club_logo: string; verified: boolean }[];
  is_super_admin: boolean;
  is_club_lead: boolean;
}> {
  return await fetchFromApi('/clubs/my-roles', { auth: true });
}

/**
 * Submit a request to create a new club page.
 */
export async function submitClubRequest(payload: CreateClubRequestPayload): Promise<ClubRequest> {
  return await fetchFromApi('/clubs/request', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

/**
 * Create a new club event (Club Lead or Admin only).
 */
export async function createClubEvent(payload: CreateEventPayload): Promise<DistrictEvent> {
  return await fetchFromApi('/events/club-event', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

/**
 * Delete a club event (Club Lead or Admin only).
 */
export async function deleteClubEvent(eventId: string): Promise<{ success: boolean; message?: string }> {
  const currentUser = useAuthStore.getState().user;
  const query = new URLSearchParams();
  if (currentUser?.email) query.append('email', currentUser.email);

  // 1. Try primary DELETE /events/:id
  try {
    return await fetchFromApi(`/events/${eventId}`, {
      method: 'DELETE',
      auth: true,
      queryParams: query,
    });
  } catch (err: any) {
    console.warn('[EventsAPI] Primary DELETE /events/:id failed, attempting fallback POST delete:', err?.message);
    // 2. Fallback to POST /events/:id/delete
    try {
      return await fetchFromApi(`/events/${eventId}/delete`, {
        method: 'POST',
        body: { email: currentUser?.email, userId: currentUser?.id },
        auth: true,
      });
    } catch (fallbackErr: any) {
      console.error('[EventsAPI] All delete endpoints failed for event:', eventId, fallbackErr?.message);
      throw fallbackErr;
    }
  }
}

/**
 * Create a poll for a club (Club Lead or Admin only).
 */
export async function createPoll(payload: CreatePollPayload): Promise<Poll> {
  return await fetchFromApi('/polls', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

/**
 * Super Admin: List club page creation requests.
 */
export async function fetchAdminClubRequests(status?: string): Promise<ClubRequest[]> {
  const query = new URLSearchParams();
  if (status) query.append('status', status);
  return await fetchFromApi('/admin/club-requests', {
    queryParams: query,
    auth: true,
  });
}

/**
 * Super Admin: Approve a club request.
 */
export async function approveClubRequest(requestId: string): Promise<{ success: boolean; data: any }> {
  return await fetchFromApi(`/admin/club-requests/${requestId}/approve`, {
    method: 'POST',
    auth: true,
  });
}

/**
 * Super Admin: Reject a club request.
 */
export async function rejectClubRequest(requestId: string, reason?: string): Promise<{ success: boolean }> {
  return await fetchFromApi(`/admin/club-requests/${requestId}/reject`, {
    method: 'POST',
    body: { reason },
    auth: true,
  });
}

/**
 * Upload poster or logo image (base64).
 */
export async function uploadEventImage(base64Uri: string): Promise<{ success: boolean; url: string }> {
  return await fetchFromApi('/events/upload', {
    method: 'POST',
    body: { image: base64Uri },
    auth: true,
  });
}

/**
 * Invalidate cache.
 */
export function invalidateDistrictCache(): void {
  storage.delete(EVENTS_CACHE_KEY);
  storage.delete(CLUBS_CACHE_KEY);
  storage.delete(POLLS_CACHE_KEY);
}
