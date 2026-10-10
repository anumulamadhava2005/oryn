/**
 * Oryn Device Telemetry & User Radar Service.
 * Tracks installed devices, active sessions, and provides
 * real-time bird's-eye metrics to the Super Admin.
 */

import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/auth';
import { getNativeBundleMetadata } from '@/services/codeUpdateService';
import type { TelemetryOverview } from '@/types/telemetry';

import { setupAllNotificationChannels } from '@/services/notifications';

const storage = new MMKV({ id: 'oryn_telemetry_store' });
const DEVICE_ID_KEY = 'oryn_unique_device_id';
const PUSH_TOKEN_KEY = 'oryn_expo_push_token';

const PRIMARY_SERVER_URL = 'https://api.cruxel.xyz/oryn';
const FALLBACK_SERVER_URL = 'http://localhost:3000/oryn';

/**
 * Get or initialize a unique persistent device installation ID.
 */
export function getDeviceId(): string {
  let id = storage.getString(DEVICE_ID_KEY);
  if (!id) {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const timeSuffix = Date.now().toString(36);
    id = `oryn_${Platform.OS}_${randomSuffix}_${timeSuffix}`;
    storage.set(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Retrieve or request the device's Push Token for background notifications.
 * Fails gracefully and silently on simulators or offline.
 */
export async function getOrFetchExpoPushToken(): Promise<{ token: string | null; diagnostic: string }> {
  const cached = storage.getString(PUSH_TOKEN_KEY);
  if (cached) {
    return { token: cached, diagnostic: 'cached' };
  }

  // Remote push notifications require a physical device
  if (!Device.isDevice) {
    return { token: null, diagnostic: 'simulator' };
  }

  const logs: string[] = [];

  try {
    if (Platform.OS === 'android') {
      await setupAllNotificationChannels().catch((err: any) => logs.push('chan_err:' + err?.message));
    }

    // Check / request notification permissions
    let permStatus = 'unknown';
    try {
      const { status } = await Notifications.getPermissionsAsync();
      permStatus = status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        permStatus = req.status;
      }
    } catch (permErr: any) {
      logs.push('perm_err:' + permErr?.message);
    }
    logs.push('perm:' + permStatus);

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      'dce4319a-073e-4ab1-90fd-e864d062a91e';

    // 1. Try Expo Push Token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      if (tokenData?.data) {
        storage.set(PUSH_TOKEN_KEY, tokenData.data);
        return { token: tokenData.data, diagnostic: 'expo_ok' };
      }
    } catch (expoErr: any) {
      logs.push('expo_err:' + (expoErr?.message || String(expoErr)));
    }

    // 2. Seamlessly fallback to Native Device FCM Push Token
    try {
      const deviceData = await Notifications.getDevicePushTokenAsync();
      if (deviceData?.data) {
        storage.set(PUSH_TOKEN_KEY, deviceData.data);
        return { token: deviceData.data, diagnostic: 'fcm_ok' };
      }
    } catch (fcmErr: any) {
      logs.push('fcm_err:' + (fcmErr?.message || String(fcmErr)));
    }
  } catch (err: any) {
    logs.push('outer_err:' + (err?.message || String(err)));
  }

  return { token: null, diagnostic: logs.join(' | ') };
}

/**
 * Explicitly trigger registration of the Expo push token (e.g. after user grants permission).
 */
export async function registerExpoPushToken(): Promise<string | null> {
  const result = await getOrFetchExpoPushToken();
  if (result.token) {
    // Send immediate heartbeat so backend has the push token associated
    sendTelemetryHeartbeat().catch(() => {});
  }
  return result.token;
}

/**
 * Send a device telemetry heartbeat to the backend.
 * Fails silently if offline so it never blocks or interrupts the user experience.
 */
export async function sendTelemetryHeartbeat(): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    const user = useAuthStore.getState().user;

    // Cache user credentials synchronously in MMKV so cold starts before silentSignIn still report the user
    if (user?.email) {
      storage.set('oryn_cached_user_email', user.email);
      if (user.name) storage.set('oryn_cached_user_name', user.name);
      if (user.photo) storage.set('oryn_cached_user_photo', user.photo);
    }

    const userEmail = user?.email || storage.getString('oryn_cached_user_email') || null;
    const userName = user?.name || storage.getString('oryn_cached_user_name') || null;
    const avatarUrl = user?.photo || storage.getString('oryn_cached_user_photo') || null;

    // Retrieve cached push token or attempt asynchronous fetch with diagnostic tracking
    const cachedToken = storage.getString(PUSH_TOKEN_KEY);
    let expoPushToken = cachedToken || null;
    let pushDiagnostic = cachedToken ? 'cached' : '';

    if (!expoPushToken) {
      const res = await getOrFetchExpoPushToken().catch((e: any) => ({ token: null, diagnostic: 'err:' + e?.message }));
      expoPushToken = res?.token || null;
      pushDiagnostic = res?.diagnostic || '';
    }

    const meta = await getNativeBundleMetadata().catch(() => null);

    const payload = {
      deviceId,
      userEmail,
      userName,
      avatarUrl,
      expoPushToken,
      pushDiagnostic,
      deviceModel: Device.modelName || Device.productName || (Platform.OS === 'android' ? 'Android Device' : 'iOS Device'),
      deviceBrand: Device.manufacturer || Device.brand || (Platform.OS === 'android' ? 'Android' : 'Apple'),
      osName: Device.osName || Platform.OS,
      osVersion: Device.osVersion || String(Platform.Version),
      appVersion: Application.nativeApplicationVersion || '1.1.0',
      bundleHash: meta?.currentHash || null,
      buildFingerprint: meta?.buildFingerprint || 'prod',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${PRIMARY_SERVER_URL}/telemetry/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);
    return !!res && res.ok;
  } catch {
    return false;
  }
}

/**
 * Clear cached user info upon explicit user logout.
 */
export function clearTelemetryUserCache(): void {
  storage.delete('oryn_cached_user_email');
  storage.delete('oryn_cached_user_name');
  storage.delete('oryn_cached_user_photo');
}

const CACHE_KEY = 'oryn_cached_telemetry_overview';

/**
 * Read cached telemetry from MMKV for instant zero-latency rendering.
 */
export function getCachedTelemetryOverview(): TelemetryOverview | null {
  try {
    const raw = storage.getString(CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as TelemetryOverview;
    }
  } catch (err) {
    console.warn('[Telemetry] Failed reading cache:', err);
  }
  return null;
}

/**
 * Fetch Bird's Eye View telemetry data for Super Admin.
 * Uses resilient timeouts (20s), anti-stale cache-busters, and persists to MMKV.
 */
export async function fetchTelemetryOverview(): Promise<TelemetryOverview | null> {
  const ts = Date.now();
  const urls = [
    `${PRIMARY_SERVER_URL}/telemetry/overview?_t=${ts}`,
    `${FALLBACK_SERVER_URL}/telemetry/overview?_t=${ts}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = (await res.json()) as TelemetryOverview;
        if (json && json.summary && Array.isArray(json.devices)) {
          // Cache successful payload for instant load next time
          try {
            storage.set(CACHE_KEY, JSON.stringify(json));
          } catch {}
          return json;
        }
      } else {
        console.warn(`[Telemetry] HTTP error from ${url}: status ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`[Telemetry] Fetch failed for ${url}:`, err?.message || err);
    }
  }

  // If network calls failed, fallback to local cache
  const cached = getCachedTelemetryOverview();
  if (cached) {
    console.info('[Telemetry] Using cached telemetry payload as network fallback.');
    return cached;
  }

  return null;
}
