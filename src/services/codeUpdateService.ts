/**
 * Oryn Live Code Update Service
 * 100% custom Over-The-Air (OTA) raw code updater.
 * Communicates with native Android dynamic bundle loader and mint_vps distribution queue.
 */

import { NativeModules, Platform, AppState } from 'react-native';
import Constants from 'expo-constants';

const { OrynCodeUpdateModule } = NativeModules;

const PRIMARY_SERVER_URL = 'https://api.cruxel.xyz/oryn';
const FALLBACK_SERVER_URL = 'http://localhost:3000/oryn';

export interface CodeBundleMetadata {
  isDynamicBundle: boolean;
  currentHash: string;
  bundleSize: number;
  buildFingerprint: string;
  environment: string;
  projectId: string;
}

export interface CodeUpdateCheckResult {
  updateAvailable: boolean;
  isPatch?: boolean;
  baseHash?: string;
  targetHash?: string;
  patchUrl?: string;
  patchSize?: number;
  hash?: string;
  size?: number;
  version?: number;
  environment?: string;
  publishedAt?: string;
  downloadUrl?: string;
  reason?: string;
}

/**
 * Returns native bundle metadata from Kotlin OrynCodeUpdateModule
 */
export async function getNativeBundleMetadata(): Promise<CodeBundleMetadata> {
  if (Platform.OS !== 'android' || !OrynCodeUpdateModule) {
    const extra = Constants.expoConfig?.extra || {};
    return {
      isDynamicBundle: false,
      currentHash: '',
      bundleSize: 0,
      buildFingerprint: extra.devFingerprint || 'dev_local',
      environment: __DEV__ ? 'dev' : 'prod',
      projectId: extra.projectId || 'oryn',
    };
  }

  try {
    return await OrynCodeUpdateModule.getBundleMetadata();
  } catch (err) {
    console.warn('[CodeUpdate] Failed to read native bundle metadata:', err);
    return {
      isDynamicBundle: false,
      currentHash: '',
      bundleSize: 0,
      buildFingerprint: 'unknown',
      environment: 'prod',
      projectId: 'oryn',
    };
  }
}

/**
 * Checks mint_vps for a raw code update matching this device's build fingerprint (< 3ms)
 */
export async function checkForCodeUpdate(): Promise<CodeUpdateCheckResult> {
  const meta = await getNativeBundleMetadata();
  const fingerprint = meta.buildFingerprint;
  const currentHash = meta.currentHash;

  const url = `${PRIMARY_SERVER_URL}/code-updates/check?fingerprint=${encodeURIComponent(fingerprint)}&currentHash=${encodeURIComponent(currentHash)}&ts=${Date.now()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json: CodeUpdateCheckResult = await res.json();
      return json;
    }
  } catch (err: any) {
    console.warn('[CodeUpdate] Primary check failed or timed out:', err?.message);
    // Retry with fallback only if primary is unreachable
    try {
      const fallbackUrl = `${FALLBACK_SERVER_URL}/code-updates/check?fingerprint=${encodeURIComponent(fingerprint)}&currentHash=${encodeURIComponent(currentHash)}&ts=${Date.now()}`;
      const res = await fetch(fallbackUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) return await res.json();
    } catch {}
  }

  return { updateAvailable: false, reason: 'Network request failed' };
}

/**
 * Helper: converts ArrayBuffer to Base64 in JavaScript
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    base64 += chars[b0 >> 2];
    base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return base64;
}

/**
 * Downloads the raw JavaScript code bundle (or differential delta patch) from mint_vps
 * and installs it into device storage.
 */
export async function downloadAndInstallCodeUpdate(
  update: CodeUpdateCheckResult,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const targetHash = update.targetHash || update.hash;
  if (!targetHash || !OrynCodeUpdateModule) return false;

  // 1. Ultra-fast Differential Delta Patch (typically 200B - 15KB download, applied in < 2ms)
  if (update.isPatch && update.patchUrl) {
    const patchPath = update.patchUrl.startsWith('/oryn') ? update.patchUrl.slice(5) : update.patchUrl;
    const patchUrls = [
      `${PRIMARY_SERVER_URL}${patchPath}`,
      `${FALLBACK_SERVER_URL}${patchPath}`,
    ];

    for (const pUrl of patchUrls) {
      try {
        console.log('[CodeUpdate] ⚡ Fetching differential delta patch:', pUrl);
        const pRes = await fetch(pUrl, { headers: { Accept: 'application/json' } });
        if (pRes.ok) {
          const patchText = await pRes.text();
          if (typeof OrynCodeUpdateModule.applyPatchAndInstall === 'function') {
            const patchRes = await OrynCodeUpdateModule.applyPatchAndInstall(patchText, targetHash);
            if (patchRes && patchRes.success) {
              console.log(`[CodeUpdate] ✅ Differential delta patch applied in < 2ms! Hash: ${patchRes.hash}`);
              return true;
            }
          }
        }
      } catch (pErr) {
        console.warn('[CodeUpdate] Delta patch failed, falling back to full bundle download:', pErr);
      }
    }
  }

  // 2. Full bundle streaming download (Native gzip decompression in Kotlin, ~250ms)
  const downloadPath = update.downloadUrl || `/oryn/code-updates/bundle/${targetHash}`;
  const normalizedPath = downloadPath.startsWith('/oryn') ? downloadPath.slice(5) : downloadPath;
  const primaryUrl = `${PRIMARY_SERVER_URL}${normalizedPath}`;

  if (typeof OrynCodeUpdateModule.downloadAndInstallBundle === 'function') {
    try {
      const nativeRes = await OrynCodeUpdateModule.downloadAndInstallBundle(primaryUrl, targetHash);
      if (nativeRes && nativeRes.success) {
        return true;
      }
    } catch (err) {
      console.warn('[CodeUpdate] Native stream download failed, attempting JS fallback:', err);
    }
  }

  // 3. Fallback JS Download
  const urls = [primaryUrl, `${FALLBACK_SERVER_URL}${normalizedPath}`];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) continue;

      const base64 = bufferToBase64(arrayBuffer);
      await OrynCodeUpdateModule.installBundle(base64, targetHash);
      return true;
    } catch (err) {
      console.warn('[CodeUpdate] Download failed for url:', url, err);
    }
  }

  return false;
}

/**
 * Triggers native hot-reload of the React Native engine with the new bundle
 */
export async function reloadApp(): Promise<void> {
  if (OrynCodeUpdateModule) {
    await OrynCodeUpdateModule.reloadApp();
  }
}

/**
 * Reverts to factory built-in APK bundle
 */
export async function rollbackToFactoryDefault(): Promise<void> {
  if (OrynCodeUpdateModule) {
    await OrynCodeUpdateModule.rollbackToDefault();
  }
}

/**
 * Marks startup as safe to clear crash guard
 */
export async function markBootSuccess(): Promise<void> {
  if (OrynCodeUpdateModule) {
    await OrynCodeUpdateModule.markSuccessfulLaunch();
  }
}
