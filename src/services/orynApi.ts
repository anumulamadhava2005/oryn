import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import { MESS_MENU, WeekType, DayName, DayMenu } from '@/constants/messMenu';

const storage = new MMKV({ id: 'oryn-api-cache' });

const MESS_CACHE_KEY = 'cache:mess_menu';
const TIMETABLE_CACHE_KEY = 'cache:timetable';
const ANNOUNCEMENTS_CACHE_KEY = 'cache:announcements';

export interface MessMenuItem {
  id: string;
  week_type: 'even' | 'odd';
  day: DayName;
  meal_type: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  main: string[];
  accompaniments: string[];
  extras?: string[];
  beverage?: string;
  dessert?: string;
}

export interface TimetableEntry {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  course_code?: string;
  instructor?: string;
  room?: string;
  slot?: string;
  slot_code?: string;
  program?: string;
  semester?: string;
  notes?: string;
}

export interface CampusAnnouncement {
  id: string;
  title: string;
  category: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  body: string;
  author?: string;
  createdAt: string;
}

function getApiBaseUrls(): string[] {
  const urls: string[] = [];

  // 1. Host IP from Expo Dev Client / Metro (works on real phones over Wi-Fi / USB)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      urls.push(`http://${host}:3456/api`);
    }
  }

  // 2. Android Emulator Loopback
  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:3456/api');
  }

  // 3. Localhost (iOS Simulator / Web / Desktop)
  urls.push('http://localhost:3456/api');
  urls.push('http://127.0.0.1:3456/api');

  // 4. Remote Production Fallback
  urls.push('https://api.cruxel.xyz/oryn');

  return urls;
}

async function fetchFromApi(endpoint: string, queryParams?: URLSearchParams): Promise<any> {
  const urls = getApiBaseUrls();
  const queryString = queryParams ? `?${queryParams.toString()}` : '';

  for (const base of urls) {
    try {
      const fullUrl = `${base}${endpoint}${queryString}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Try next endpoint in list
    }
  }
  return null;
}

/**
 * Invalidate API cache to force immediate fetch of newly approved timetables and announcements
 */
export function invalidateOrynApiCache(): void {
  storage.delete(MESS_CACHE_KEY);
  storage.delete(TIMETABLE_CACHE_KEY);
  storage.delete(ANNOUNCEMENTS_CACHE_KEY);
}

/**
 * Fetch remote Mess Menu
 */
export async function fetchRemoteMessMenu(weekType?: WeekType): Promise<Record<WeekType, Record<DayName, DayMenu>>> {
  try {
    const query = weekType ? new URLSearchParams({ week_type: weekType }) : undefined;
    const items = await fetchFromApi('/mess-menu', query);

    if (Array.isArray(items) && items.length > 0) {
      const formatted: any = { even: {}, odd: {} };

      for (const item of items) {
        const w = item.week_type;
        const d = item.day;
        const m = item.meal_type;

        if (!formatted[w]) formatted[w] = {};
        if (!formatted[w][d]) formatted[w][d] = {};

        formatted[w][d][m] = {
          main: item.main || [],
          accompaniments: item.accompaniments || [],
          extras: item.extras || [],
          beverage: item.beverage || undefined,
          dessert: item.dessert || undefined,
        };
      }

      storage.set(MESS_CACHE_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (err: any) {
    console.warn('[OrynAPI] Error fetching remote mess menu:', err.message);
  }

  // Fallback 1: MMKV Cache
  const cachedRaw = storage.getString(MESS_CACHE_KEY);
  if (cachedRaw) {
    try {
      return JSON.parse(cachedRaw);
    } catch {}
  }

  // Fallback 2: Local MESS_MENU constant
  return MESS_MENU;
}

/**
 * Fetch remote Academic Timetable (including approved slot changes from admin portal)
 */
export async function fetchRemoteTimetable(filters?: { day?: string; program?: string; semester?: string }): Promise<TimetableEntry[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.day) query.append('day', filters.day);
    if (filters?.program) query.append('program', filters.program);
    if (filters?.semester) query.append('semester', filters.semester);

    const data = await fetchFromApi('/timetable', query);
    if (Array.isArray(data) && data.length > 0) {
      storage.set(TIMETABLE_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err: any) {
    console.warn('[OrynAPI] Error fetching remote timetable:', err.message);
  }

  // Fallback: MMKV Cache
  const cachedRaw = storage.getString(TIMETABLE_CACHE_KEY);
  if (cachedRaw) {
    try {
      return JSON.parse(cachedRaw);
    } catch {}
  }

  return [];
}

/**
 * Fetch remote Campus Announcements
 */
export async function fetchRemoteAnnouncements(): Promise<CampusAnnouncement[]> {
  try {
    const data = await fetchFromApi('/announcements');
    if (Array.isArray(data) && data.length > 0) {
      storage.set(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err: any) {
    console.warn('[OrynAPI] Error fetching announcements:', err.message);
  }

  const cachedRaw = storage.getString(ANNOUNCEMENTS_CACHE_KEY);
  if (cachedRaw) {
    try {
      return JSON.parse(cachedRaw);
    } catch {}
  }

  return [];
}

