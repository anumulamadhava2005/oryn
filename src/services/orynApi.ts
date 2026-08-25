/**
 * orynApi.ts — Client API Service for Oryn Backend Services hosted at https://api.cruxel.xyz/oryn/
 * Fetches dynamic Mess Menu and Academic Timetable data with local offline MMKV caching & fallbacks.
 */

import { MMKV } from 'react-native-mmkv';
import { MESS_MENU, WeekType, DayName, DayMenu } from '@/constants/messMenu';

const API_BASE_URL = 'https://api.cruxel.xyz/oryn';
const storage = new MMKV({ id: 'oryn-api-cache' });

const MESS_CACHE_KEY = 'cache:mess_menu';
const TIMETABLE_CACHE_KEY = 'cache:timetable';

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
  slot_code?: string;
  program?: string;
  semester?: string;
  notes?: string;
}

/**
 * Fetch remote Mess Menu from https://api.cruxel.xyz/oryn/mess-menu
 * Formats response into Record<WeekType, WeekMenu> structure compatible with MESS_MENU constant.
 * Caches results in MMKV for offline usage.
 */
export async function fetchRemoteMessMenu(weekType?: WeekType): Promise<Record<WeekType, Record<DayName, DayMenu>>> {
  try {
    const url = weekType ? `${API_BASE_URL}/mess-menu?week_type=${weekType}` : `${API_BASE_URL}/mess-menu`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const items: MessMenuItem[] = await response.json();
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
    }
  } catch (err: any) {
    console.warn('[OrynAPI] Error fetching remote mess menu, checking MMKV cache:', err.message);
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
 * Fetch remote Academic Timetable from https://api.cruxel.xyz/oryn/timetable
 */
export async function fetchRemoteTimetable(filters?: { day?: string; program?: string; semester?: string }): Promise<TimetableEntry[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.day) query.append('day', filters.day);
    if (filters?.program) query.append('program', filters.program);
    if (filters?.semester) query.append('semester', filters.semester);

    const url = `${API_BASE_URL}/timetable?${query.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: TimetableEntry[] = await response.json();
      if (Array.isArray(data)) {
        storage.set(TIMETABLE_CACHE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err: any) {
    console.warn('[OrynAPI] Error fetching remote timetable, checking MMKV cache:', err.message);
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
