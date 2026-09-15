/**
 * SDUI Fetch & Synchronization Service.
 * Fetches the remote manifest from the VPS server (https://www.cruxel.xyz/oryn)
 * with timeout safeguards, environment scoping ('dev' | 'prod'), and defensive validation.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { SDUIManifest, SDUIEnvironment, validateManifest } from '@/types/sdui';
import { useSDUIStore } from '@/store/sduiStore';
import { usePreferencesStore } from '@/store/preferences';
import { getNativeBuildMetadata, checkSDUICompatibility } from './sduiCompatibility';

export function getAppVersion(): string {
  return (
    Constants.expoConfig?.version ||
    Application.nativeApplicationVersion ||
    '1.1.0'
  );
}

export function getEffectiveSDUIEnvironment(): SDUIEnvironment {
  const store = useSDUIStore.getState();
  if (store.envOverride === 'dev' || store.envOverride === 'prod') {
    return store.envOverride;
  }
  return __DEV__ ? 'dev' : 'prod';
}

function getManifestCandidateUrls(env: SDUIEnvironment): string[] {
  const urls: string[] = [
    // Primary hosted VPS endpoint
    `https://api.cruxel.xyz/oryn/manifest?env=${env}`,
    `https://api.cruxel.xyz/api/oryn/manifest?env=${env}`,
    `https://www.cruxel.xyz/oryn/manifest?env=${env}`,
  ];

  // If in local dev / Expo dev client, also check Metro host
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        urls.push(`http://${host}:3000/oryn/manifest?env=${env}`);
        urls.push(`http://${host}:3456/api/oryn/manifest?env=${env}`);
      }
    }
    if (Platform.OS === 'android') {
      urls.push(`http://10.0.2.2:3000/oryn/manifest?env=${env}`);
    }
    urls.push(`http://localhost:3000/oryn/manifest?env=${env}`);
  }

  return urls;
}

/**
 * Compare two semver strings (e.g. "1.1.0" < "1.2.0")
 * Returns -1 if v1 < v2, 1 if v1 > v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = v1.split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = v2.split('.').map((x) => parseInt(x, 10) || 0);

  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

/**
 * Fetches the latest remote SDUI manifest.
 * Applies timeout, parses defensively, updates store, and returns the manifest or null.
 */
export async function fetchSDUIManifest(forceEnv?: SDUIEnvironment): Promise<SDUIManifest | null> {
  const env = forceEnv || getEffectiveSDUIEnvironment();
  const store = useSDUIStore.getState();
  store.setIsLoading(true);

  const candidateUrls = getManifestCandidateUrls(env);
  const appVersion = getAppVersion();
  const nativeMetadata = getNativeBuildMetadata();

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const delimiter = url.includes('?') ? '&' : '?';
      const targetUrl = `${url}${delimiter}appVersion=${encodeURIComponent(appVersion)}&platform=${Platform.OS}&fingerprint=${encodeURIComponent(nativeMetadata.buildFingerprint)}&projectId=${encodeURIComponent(nativeMetadata.projectId)}&ts=${Date.now()}`;

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'X-Build-Fingerprint': nativeMetadata.buildFingerprint,
          'X-Project-Id': nativeMetadata.projectId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const rawJson = await response.json();
        const validated = validateManifest(rawJson);

        if (validated) {
          // Verify compatibility before applying
          const compatibility = checkSDUICompatibility(validated);
          if (!compatibility.compatible) {
            console.warn('[SDUI Compatibility] Update rejected:', compatibility.reason);
            store.setIsLoading(false);
            store.setFetchError(`Update incompatible: ${compatibility.reason}`);
            return store.manifest;
          }

          // Compatible: apply update to store and MMKV cache
          store.setManifest(validated);
          store.setLastFetchedAt(new Date().toISOString());
          store.setIsLoading(false);

          // Apply remote theme override if specified
          if (validated.themeOverride) {
            usePreferencesStore.getState().setThemeMode(validated.themeOverride);
          }

          return validated;
        } else {
          console.warn('[SDUI] Manifest received but failed validation schema:', rawJson);
        }
      }
    } catch (err: any) {
      // Abort or network failure — proceed to next candidate URL
    }
  }

  // If all failed, stop loading but keep existing cached manifest in place
  store.setIsLoading(false);
  store.setFetchError('Unable to connect to SDUI server. Operating from local cache.');
  return null;
}

/**
 * Public trigger to sync SDUI on app start or pull-to-refresh
 */
export async function syncSDUI(): Promise<boolean> {
  const result = await fetchSDUIManifest();
  return result !== null;
}
