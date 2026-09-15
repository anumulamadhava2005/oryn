/**
 * OrynSDUI — Root-Level Server-Driven UI Provider & Wrapper Component ("The Tag").
 *
 * Wraps the entire application tree to empower remote UI agility:
 * - Fetches & synchronizes dynamic UI manifests from the VPS server (https://www.cruxel.xyz/oryn)
 * - Evaluates environment targeting (dev vs. prod)
 * - Gates app access during remote maintenance or mandatory version upgrades
 * - Injects dynamic announcement banners at the top of the viewport
 * - Provides zero-latency cached configuration with full offline resilience
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import {
  SDUIManifest,
  SDUIEnvironment,
} from '@/types/sdui';
import {
  useSDUIStore,
  useSDUIEnvironment,
  DEFAULT_SDUI_MANIFEST,
} from '@/store/sduiStore';
import {
  fetchSDUIManifest,
  getAppVersion,
  compareSemver,
} from '@/services/sduiService';
import { AnnouncementBanner } from './AnnouncementBanner';
import { MaintenanceScreen } from './MaintenanceScreen';
import { ForceUpdateScreen } from './ForceUpdateScreen';

export interface SDUIContextValue {
  manifest: SDUIManifest;
  environment: SDUIEnvironment;
  isLoading: boolean;
  isOffline: boolean;
  lastFetchedAt: string | null;
  refresh: () => Promise<boolean>;
  featureFlag: (key: string, defaultValue?: boolean) => boolean;
  textOverride: (key: string, fallback: string) => string;
  dismissAnnouncement: (id: string) => void;
}

const SDUIContext = createContext<SDUIContextValue | null>(null);

/**
 * Hook to consume the SDUI context anywhere in the component hierarchy.
 */
export function useSDUI(): SDUIContextValue {
  const ctx = useContext(SDUIContext);
  if (!ctx) {
    // Fallback to store values if accessed outside provider
    const store = useSDUIStore.getState();
    return {
      manifest: store.manifest,
      environment: store.envOverride === 'dev' || store.envOverride === 'prod' ? store.envOverride : __DEV__ ? 'dev' : 'prod',
      isLoading: store.isLoading,
      isOffline: !!store.fetchError,
      lastFetchedAt: store.lastFetchedAt,
      refresh: async () => {
        const res = await fetchSDUIManifest();
        return res !== null;
      },
      featureFlag: (key, def = true) => store.manifest.featureFlags?.[key] ?? def,
      textOverride: (key, fallback) => store.manifest.textOverrides?.[key] ?? fallback,
      dismissAnnouncement: store.dismissAnnouncement,
    };
  }
  return ctx;
}

interface OrynSDUIProps {
  children: React.ReactNode;
  /** Optional manual environment target override */
  targetEnv?: SDUIEnvironment;
  /** Optional callback fired whenever a new manifest is successfully applied */
  onManifestUpdated?: (manifest: SDUIManifest) => void;
}

export function OrynSDUI({ children, targetEnv, onManifestUpdated }: OrynSDUIProps) {
  const manifest = useSDUIStore((s) => s.manifest);
  const isLoading = useSDUIStore((s) => s.isLoading);
  const fetchError = useSDUIStore((s) => s.fetchError);
  const lastFetchedAt = useSDUIStore((s) => s.lastFetchedAt);
  const dismissAnnouncement = useSDUIStore((s) => s.dismissAnnouncement);
  const detectedEnv = useSDUIEnvironment();
  const activeEnv = targetEnv || detectedEnv;

  const [bypassMaintenance, setBypassMaintenance] = useState(false);

  // Sync manifest on initial mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const updated = await fetchSDUIManifest(activeEnv);
      if (updated && isMounted && onManifestUpdated) {
        onManifestUpdated(updated);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activeEnv, onManifestUpdated]);

  // Sync on app foreground if older than 5 minutes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const last = useSDUIStore.getState().lastFetchedAt;
        if (!last || Date.now() - new Date(last).getTime() > 5 * 60 * 1000) {
          const updated = await fetchSDUIManifest(activeEnv);
          if (updated && onManifestUpdated) {
            onManifestUpdated(updated);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activeEnv, onManifestUpdated]);

  const refresh = useCallback(async (): Promise<boolean> => {
    const updated = await fetchSDUIManifest(activeEnv);
    if (updated && onManifestUpdated) {
      onManifestUpdated(updated);
    }
    return updated !== null;
  }, [activeEnv, onManifestUpdated]);

  const featureFlag = useCallback(
    (key: string, defaultValue: boolean = true): boolean => {
      return manifest.featureFlags?.[key] ?? defaultValue;
    },
    [manifest.featureFlags]
  );

  const textOverride = useCallback(
    (key: string, fallback: string): string => {
      return manifest.textOverrides?.[key] ?? fallback;
    },
    [manifest.textOverrides]
  );

  const contextValue: SDUIContextValue = useMemo(
    () => ({
      manifest: manifest || DEFAULT_SDUI_MANIFEST,
      environment: activeEnv,
      isLoading,
      isOffline: !!fetchError,
      lastFetchedAt,
      refresh,
      featureFlag,
      textOverride,
      dismissAnnouncement,
    }),
    [manifest, activeEnv, isLoading, fetchError, lastFetchedAt, refresh, featureFlag, textOverride, dismissAnnouncement]
  );

  // ─── GATE 1: Force Update Screen ──────────────────────────────────────────
  const currentAppVersion = getAppVersion();
  const minRequiredVersion = manifest.minAppVersion;
  if (minRequiredVersion && compareSemver(currentAppVersion, minRequiredVersion) < 0) {
    return <ForceUpdateScreen minAppVersion={minRequiredVersion} />;
  }

  // ─── GATE 2: Maintenance Screen ───────────────────────────────────────────
  if (manifest.maintenance?.enabled && !bypassMaintenance) {
    return (
      <MaintenanceScreen
        onBypass={() => setBypassMaintenance(true)}
      />
    );
  }

  // ─── NORMAL APP RENDERING ─────────────────────────────────────────────────
  return (
    <SDUIContext.Provider value={contextValue}>
      <View style={styles.root}>
        <AnnouncementBanner />
        {children}
      </View>
    </SDUIContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
