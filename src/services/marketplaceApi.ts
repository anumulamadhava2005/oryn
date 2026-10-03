/**
 * Campus Peer-to-Peer Marketplace API Client
 *
 * Connects directly to the PostgreSQL oryn_marketplace table
 * via the Oryn backend API with JWT authentication and offline caching.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth';

const storage = new MMKV({ id: 'oryn-marketplace-api-cache' });
const CACHE_KEY = 'cache:marketplace_items';
const ORYN_JWT_KEY = 'oryn_backend_jwt';

export type MarketplaceCategory =
  | 'All'
  | 'Cycles'
  | 'Electronics'
  | 'Books & Notes'
  | 'Hostel Essentials'
  | 'Lab Gear'
  | 'Other';

export type ItemCondition = 'Brand New' | 'Like New' | 'Good' | 'Fair';

export interface MarketplaceItem {
  id: string;
  title: string;
  price: number;
  category: MarketplaceCategory;
  condition: ItemCondition;
  description: string;
  location: string;
  imageUrl?: string;
  sellerId: string;
  sellerName: string;
  sellerRoll: string;
  sellerEmail: string;
  sellerContact?: string;
  status: 'available' | 'reserved' | 'sold';
  createdAt: string;
}

export interface CreateMarketplaceItemPayload {
  title: string;
  description: string;
  price: number;
  category: MarketplaceCategory;
  condition: ItemCondition;
  location: string;
  imageUrl?: string;
  sellerContact?: string;
  sellerName?: string;
  sellerRoll?: string;
  sellerEmail?: string;
  sellerId?: string;
}

function getApiBaseUrls(): string[] {
  const urls: string[] = ['https://api.cruxel.xyz/oryn'];

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        urls.unshift(`http://${host}:3000/oryn`);
      }
    }

    if (Platform.OS === 'android') {
      urls.push('http://10.0.2.2:3000/oryn');
    }

    urls.push('http://localhost:3000/oryn');
    urls.push('http://127.0.0.1:3000/oryn');
  }

  return urls;
}

async function getOrynJwt(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ORYN_JWT_KEY);
  } catch {
    return null;
  }
}

function rowToItem(row: any): MarketplaceItem {
  return {
    id: String(row.id),
    title: row.title || '',
    price: parseFloat(row.price) || 0,
    category: row.category || 'Other',
    condition: row.condition || 'Good',
    description: row.description || '',
    location: row.location || '',
    imageUrl: row.image_url || undefined,
    sellerId: row.seller_id || '',
    sellerName: row.seller_name || 'Student',
    sellerRoll: row.seller_roll || '',
    sellerEmail: row.seller_email || '',
    sellerContact: row.seller_contact || undefined,
    status: row.status || 'available',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function getCachedMarketplaceItems(): MarketplaceItem[] {
  try {
    const raw = storage.getString(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCachedMarketplaceItems(items: MarketplaceItem[]): void {
  try {
    storage.set(CACHE_KEY, JSON.stringify(items));
  } catch {}
}

export async function fetchMarketplaceItems(params?: {
  category?: MarketplaceCategory;
  search?: string;
}): Promise<MarketplaceItem[]> {
  const urls = getApiBaseUrls();
  const queryParts: string[] = [];

  if (params?.category && params.category !== 'All') {
    queryParts.push(`category=${encodeURIComponent(params.category)}`);
  }
  if (params?.search && params.search.trim()) {
    queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  }

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  for (const base of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${base}/marketplace${qs}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const items = rows.map(rowToItem);
          if (items.length > 0 && !params?.search && (!params?.category || params.category === 'All')) {
            setCachedMarketplaceItems(items);
          }
          return items;
        }
      }
    } catch {
      // Try next base URL
    }
  }

  // Fallback to cache if network fails
  return getCachedMarketplaceItems();
}

export async function createMarketplaceItem(
  payload: CreateMarketplaceItemPayload
): Promise<MarketplaceItem | null> {
  const urls = getApiBaseUrls();
  const jwt = await getOrynJwt();
  const user = useAuthStore.getState().user;

  const body = {
    title: payload.title,
    description: payload.description,
    price: payload.price,
    category: payload.category,
    condition: payload.condition,
    location: payload.location,
    image_url: payload.imageUrl,
    seller_name: payload.sellerName || user?.name || 'Student',
    seller_roll: payload.sellerRoll || (user?.email ? user.email.split('@')[0].toUpperCase() : ''),
    seller_email: payload.sellerEmail || user?.email || '',
    seller_contact: payload.sellerContact,
  };

  for (const base of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const res = await fetch(`${base}/marketplace`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const row = await res.json();
        return rowToItem(row);
      }
    } catch {}
  }

  return null;
}

export async function updateMarketplaceItemStatus(
  id: string,
  status: 'available' | 'reserved' | 'sold'
): Promise<boolean> {
  const urls = getApiBaseUrls();
  const jwt = await getOrynJwt();

  for (const base of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const res = await fetch(`${base}/marketplace/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) return true;
    } catch {}
  }

  return false;
}

export async function deleteMarketplaceItem(id: string): Promise<boolean> {
  const urls = getApiBaseUrls();
  const jwt = await getOrynJwt();

  for (const base of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const headers: Record<string, string> = {};
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const res = await fetch(`${base}/marketplace/${id}`, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) return true;
    } catch {}
  }

  return false;
}
