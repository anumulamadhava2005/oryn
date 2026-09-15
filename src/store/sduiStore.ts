/**
 * SDUI Zustand Store backed by MMKV persistence.
 * Caches remote manifests locally to provide zero-latency startup and full offline resilience.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import {
  SDUIManifest,
  SDUIAnnouncement,
  CURRENT_SDUI_SCHEMA_VERSION,
  validateManifest,
  SDUIEnvironment,
} from '@/types/sdui';

const storage = new MMKV({ id: 'oryn-sdui-config' });

const KEYS = {
  MANIFEST: 'sdui:manifest',
  LAST_FETCHED_AT: 'sdui:last_fetched_at',
  DISMISSED_ANNOUNCEMENTS: 'sdui:dismissed_announcements',
  ENV_OVERRIDE: 'sdui:env_override',
};

export type EnvOverride = 'auto' | 'dev' | 'prod';

export const DEFAULT_SDUI_MANIFEST: SDUIManifest = {
  schemaVersion: CURRENT_SDUI_SCHEMA_VERSION,
  environment: 'prod',
  updatedAt: new Date().toISOString(),
  featureFlags: {
    lost_found_enabled: true,
    mess_menu_enabled: true,
    timetable_enabled: true,
    academic_calendar_enabled: true,
    email_intelligence_enabled: true,
  },
  announcement: null,
  maintenance: {
    enabled: false,
  },
  textOverrides: {},
  themeOverride: null,
};

function getInitialManifest(): SDUIManifest {
  const cached = storage.getString(KEYS.MANIFEST);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const validated = validateManifest(parsed);
      if (validated) return validated;
    } catch {
      // Fallback to default
    }
  }
  return DEFAULT_SDUI_MANIFEST;
}

function getInitialDismissedAnnouncements(): string[] {
  const raw = storage.getString(KEYS.DISMISSED_ANNOUNCEMENTS);
  if (raw) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list.filter((x): x is string => typeof x === 'string');
    } catch {}
  }
  return [];
}

function getInitialEnvOverride(): EnvOverride {
  const raw = storage.getString(KEYS.ENV_OVERRIDE);
  if (raw === 'dev' || raw === 'prod' || raw === 'auto') return raw;
  return 'auto';
}

export interface SDUIState {
  manifest: SDUIManifest;
  lastFetchedAt: string | null;
  dismissedAnnouncementIds: string[];
  isLoading: boolean;
  fetchError: string | null;
  envOverride: EnvOverride;

  setManifest: (manifest: SDUIManifest) => void;
  setLastFetchedAt: (timestamp: string) => void;
  setIsLoading: (loading: boolean) => void;
  setFetchError: (error: string | null) => void;
  dismissAnnouncement: (id: string) => void;
  setEnvOverride: (override: EnvOverride) => void;
  clearCache: () => void;
}

export const useSDUIStore = create<SDUIState>()((set, get) => ({
  manifest: getInitialManifest(),
  lastFetchedAt: storage.getString(KEYS.LAST_FETCHED_AT) || null,
  dismissedAnnouncementIds: getInitialDismissedAnnouncements(),
  isLoading: false,
  fetchError: null,
  envOverride: getInitialEnvOverride(),

  setManifest: (manifest: SDUIManifest) => {
    storage.set(KEYS.MANIFEST, JSON.stringify(manifest));
    set({ manifest, fetchError: null });
  },

  setLastFetchedAt: (timestamp: string) => {
    storage.set(KEYS.LAST_FETCHED_AT, timestamp);
    set({ lastFetchedAt: timestamp });
  },

  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setFetchError: (error: string | null) => {
    set({ fetchError: error });
  },

  dismissAnnouncement: (id: string) => {
    const next = Array.from(new Set([...get().dismissedAnnouncementIds, id]));
    storage.set(KEYS.DISMISSED_ANNOUNCEMENTS, JSON.stringify(next));
    set({ dismissedAnnouncementIds: next });
  },

  setEnvOverride: (override: EnvOverride) => {
    storage.set(KEYS.ENV_OVERRIDE, override);
    set({ envOverride: override });
  },

  clearCache: () => {
    storage.delete(KEYS.MANIFEST);
    storage.delete(KEYS.LAST_FETCHED_AT);
    storage.delete(KEYS.DISMISSED_ANNOUNCEMENTS);
    storage.delete(KEYS.ENV_OVERRIDE);
    set({
      manifest: DEFAULT_SDUI_MANIFEST,
      lastFetchedAt: null,
      dismissedAnnouncementIds: [],
      envOverride: 'auto',
      fetchError: null,
    });
  },
}));

// ─── Convenience Selector Hooks ──────────────────────────────────────────────

/**
 * Returns whether a specific feature flag is active.
 * Falls back to defaultValue (defaulting to true) if the key is not in manifest.
 */
export function useFeatureFlag(key: string, defaultValue: boolean = true): boolean {
  return useSDUIStore((s) => s.manifest.featureFlags?.[key] ?? defaultValue);
}

/**
 * Returns active announcement if present and not dismissed by the user.
 */
export function useActiveAnnouncement(): SDUIAnnouncement | null {
  const announcement = useSDUIStore((s) => s.manifest.announcement);
  const dismissed = useSDUIStore((s) => s.dismissedAnnouncementIds);

  if (!announcement || !announcement.id) return null;
  if (dismissed.includes(announcement.id)) return null;
  return announcement;
}

/**
 * Returns whether the app is in remote maintenance mode.
 */
export function useIsMaintenanceMode(): boolean {
  return useSDUIStore((s) => !!s.manifest.maintenance?.enabled);
}

/**
 * Returns remote text override for a given UI string key, or the provided fallback.
 */
export function useTextOverride(key: string, fallback: string): string {
  return useSDUIStore((s) => s.manifest.textOverrides?.[key] ?? fallback);
}

/**
 * Returns effective environment ('dev' or 'prod') taking into account overrides and __DEV__.
 */
export function useSDUIEnvironment(): SDUIEnvironment {
  const envOverride = useSDUIStore((s) => s.envOverride);
  if (envOverride === 'dev' || envOverride === 'prod') return envOverride;
  return __DEV__ ? 'dev' : 'prod';
}
