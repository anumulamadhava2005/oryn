/**
 * Custom SDUI Compatibility Engine.
 * Verifies build fingerprints, app versions, and schema contracts on-device
 * before applying any remote UI updates. Rejects mismatched builds with zero crash risk.
 */

import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { SDUIManifest, CURRENT_SDUI_SCHEMA_VERSION, SDUIEnvironment } from '@/types/sdui';

export interface SDUICompatibilityResult {
  compatible: boolean;
  reason?: string;
  deviceFingerprint: string;
  targetFingerprint?: string | null;
  deviceEnvironment: SDUIEnvironment;
  targetEnvironment: SDUIEnvironment;
}

/**
 * Returns native build metadata exposed by the custom Kotlin SDUICompatibilityModule,
 * falling back to Constants.expoConfig.extra or development heuristics.
 */
export function getNativeBuildMetadata(): {
  buildFingerprint: string;
  environment: SDUIEnvironment;
  projectId: string;
} {
  const nativeModule = NativeModules.SDUICompatibilityModule;
  const nativeConstants = nativeModule?.getConstants?.() || {};

  const extra = Constants.expoConfig?.extra || {};

  // Environment resolution
  const envRaw = nativeConstants.environment || (__DEV__ ? 'dev' : 'prod');
  const environment: SDUIEnvironment = envRaw === 'dev' ? 'dev' : 'prod';

  // Fingerprint resolution
  let buildFingerprint = nativeConstants.buildFingerprint;
  if (!buildFingerprint) {
    buildFingerprint = environment === 'dev'
      ? (extra.devFingerprint || 'dev-oryn-fingerprint')
      : (extra.prodFingerprint || 'prod-oryn-fingerprint');
  }

  // Project ID resolution
  const projectId = nativeConstants.projectId || extra.projectId || 'oryn';

  return {
    buildFingerprint,
    environment,
    projectId,
  };
}

/**
 * Compare two semver strings (e.g. "1.0.0" < "1.1.0")
 */
function compareSemver(v1: string, v2: string): number {
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
 * Evaluates whether an incoming remote manifest is compatible with this device.
 */
export function checkSDUICompatibility(manifest: SDUIManifest): SDUICompatibilityResult {
  const { buildFingerprint, environment } = getNativeBuildMetadata();
  const currentAppVersion = Constants.expoConfig?.version || Application.nativeApplicationVersion || '1.0.0';

  // 1. Schema Version Check
  if (manifest.schemaVersion > CURRENT_SDUI_SCHEMA_VERSION) {
    return {
      compatible: false,
      reason: `Server manifest schema v${manifest.schemaVersion} exceeds client supported v${CURRENT_SDUI_SCHEMA_VERSION}`,
      deviceFingerprint: buildFingerprint,
      targetFingerprint: manifest.targetFingerprint,
      deviceEnvironment: environment,
      targetEnvironment: manifest.environment,
    };
  }

  // 2. Environment Match Check
  if (manifest.environment !== environment) {
    return {
      compatible: false,
      reason: `Manifest environment (${manifest.environment}) does not match installed build environment (${environment})`,
      deviceFingerprint: buildFingerprint,
      targetFingerprint: manifest.targetFingerprint,
      deviceEnvironment: environment,
      targetEnvironment: manifest.environment,
    };
  }

  // 3. Fingerprint Match Check (if manifest specifies targetFingerprint)
  if (manifest.targetFingerprint && manifest.targetFingerprint !== buildFingerprint) {
    return {
      compatible: false,
      reason: `Build fingerprint mismatch: Device is '${buildFingerprint}', update targets '${manifest.targetFingerprint}'`,
      deviceFingerprint: buildFingerprint,
      targetFingerprint: manifest.targetFingerprint,
      deviceEnvironment: environment,
      targetEnvironment: manifest.environment,
    };
  }

  // 4. Minimum App Version Check
  if (manifest.minAppVersion && compareSemver(currentAppVersion, manifest.minAppVersion) < 0) {
    return {
      compatible: false,
      reason: `Installed app v${currentAppVersion} is below required minimum v${manifest.minAppVersion}`,
      deviceFingerprint: buildFingerprint,
      targetFingerprint: manifest.targetFingerprint,
      deviceEnvironment: environment,
      targetEnvironment: manifest.environment,
    };
  }

  return {
    compatible: true,
    deviceFingerprint: buildFingerprint,
    targetFingerprint: manifest.targetFingerprint,
    deviceEnvironment: environment,
    targetEnvironment: manifest.environment,
  };
}
