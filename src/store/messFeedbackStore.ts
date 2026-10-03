/**
 * Mess Feedback Store
 * Collects anonymous, structured student ratings (1-5 stars & tags)
 * for Breakfast, Lunch, Snacks, and Dinner. Persisted in PostgreSQL
 * and cached in MMKV.
 *
 * ZERO dummy / mock data: Completely database-backed by oryn_mess_feedback.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { MealType } from '@/constants/messMenu';

const storage = new MMKV({ id: 'oryn-mess-feedback' });

const FEEDBACK_KEY = 'mess:feedback_ratings_v2';
const STATS_KEY = 'mess:campus_stats_v2';

export interface MealFeedback {
  date: string; // YYYY-MM-DD
  meal: MealType;
  rating: number; // 1 to 5
  tags: string[];
  review?: string;
  submittedAt: number;
}

export interface MealCampusStats {
  averageRating: number;
  totalRatings: number;
  topTags: string[];
}

interface MessFeedbackState {
  userRatings: Record<string, MealFeedback>; // key: `${date}-${meal}`
  campusStats: Record<MealType, MealCampusStats>;

  loadCampusStats: (date?: string) => Promise<void>;
  submitFeedback: (
    date: string,
    meal: MealType,
    rating: number,
    tags?: string[],
    review?: string
  ) => Promise<void>;
  getFeedback: (date: string, meal: MealType) => MealFeedback | null;
  getMealCampusStats: (meal: MealType) => MealCampusStats;
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

function loadStoredRatings(): Record<string, MealFeedback> {
  try {
    const raw = storage.getString(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadStoredStats(): Record<MealType, MealCampusStats> {
  try {
    const raw = storage.getString(STATS_KEY);
    return raw ? JSON.parse(raw) : {
      breakfast: { averageRating: 0, totalRatings: 0, topTags: [] },
      lunch: { averageRating: 0, totalRatings: 0, topTags: [] },
      snacks: { averageRating: 0, totalRatings: 0, topTags: [] },
      dinner: { averageRating: 0, totalRatings: 0, topTags: [] },
    };
  } catch {
    return {
      breakfast: { averageRating: 0, totalRatings: 0, topTags: [] },
      lunch: { averageRating: 0, totalRatings: 0, topTags: [] },
      snacks: { averageRating: 0, totalRatings: 0, topTags: [] },
      dinner: { averageRating: 0, totalRatings: 0, topTags: [] },
    };
  }
}

export const useMessFeedbackStore = create<MessFeedbackState>((set, get) => ({
  userRatings: loadStoredRatings(),
  campusStats: loadStoredStats(),

  loadCampusStats: async (date) => {
    const urls = getApiBaseUrls();
    const queryDate = date || new Date().toISOString().split('T')[0];

    for (const base of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(`${base}/mess/ratings?date=${queryDate}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const statsMap: Record<MealType, MealCampusStats> = {
            breakfast: data.breakfast || { averageRating: 0, totalRatings: 0, topTags: [] },
            lunch: data.lunch || { averageRating: 0, totalRatings: 0, topTags: [] },
            snacks: data.snacks || { averageRating: 0, totalRatings: 0, topTags: [] },
            dinner: data.dinner || { averageRating: 0, totalRatings: 0, topTags: [] },
          };

          set({ campusStats: statsMap });
          storage.set(STATS_KEY, JSON.stringify(statsMap));
          return;
        }
      } catch {}
    }
  },

  submitFeedback: async (date, meal, rating, tags = [], review) => {
    const key = `${date}-${meal}`;
    const entry: MealFeedback = {
      date,
      meal,
      rating,
      tags,
      review,
      submittedAt: Date.now(),
    };

    set((state) => {
      const updated = {
        ...state.userRatings,
        [key]: entry,
      };
      storage.set(FEEDBACK_KEY, JSON.stringify(updated));
      return { userRatings: updated };
    });

    // Dispatch to PostgreSQL backend
    const urls = getApiBaseUrls();
    let jwt: string | null = null;
    try {
      jwt = await SecureStore.getItemAsync('oryn_backend_jwt');
    } catch {}

    for (const base of urls) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (jwt) headers.Authorization = `Bearer ${jwt}`;

        const res = await fetch(`${base}/mess/ratings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            date,
            meal,
            rating,
            tags,
            review,
          }),
        });
        if (res.ok) {
          // Refresh campus averages after submitting
          get().loadCampusStats(date);
          break;
        }
      } catch {}
    }
  },

  getFeedback: (date, meal) => {
    const key = `${date}-${meal}`;
    return get().userRatings[key] || null;
  },

  getMealCampusStats: (meal) => {
    return get().campusStats[meal] || {
      averageRating: 0,
      totalRatings: 0,
      topTags: [],
    };
  },
}));
