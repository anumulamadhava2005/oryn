/**
 * Server-Driven UI (SDUI) schema types and defensive validation.
 * Enables dynamic remote UI configurations, feature flags, announcements,
 * maintenance gates, version enforcement, and text patches.
 */

export type SDUIEnvironment = 'dev' | 'prod';

export type AnnouncementType = 'info' | 'warning' | 'critical';

export interface SDUIAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  dismissible: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface SDUIMaintenance {
  enabled: boolean;
  title?: string;
  message?: string;
  estimatedEndTime?: string;
  allowAdminBypass?: boolean;
}

export interface SDUIManifest {
  /** Schema contract version. Client rejects schemas > supported version */
  schemaVersion: number;
  /** Environment targeting ('dev' | 'prod') */
  environment: SDUIEnvironment;
  /** ISO-8601 timestamp of when this manifest was published */
  updatedAt: string;
  /** Minimum app version required to use the app. Triggers force-update if current < min */
  minAppVersion?: string;
  /** Remote toggle flags for features (e.g. lost_found_enabled, mess_menu_v2) */
  featureFlags?: Record<string, boolean>;
  /** Global top announcement banner */
  announcement?: SDUIAnnouncement | null;
  /** Maintenance mode kill switch */
  maintenance?: SDUIMaintenance;
  /** String translation or copy replacement patches */
  textOverrides?: Record<string, string>;
  /** Force global theme override from server */
  themeOverride?: 'vibrant' | 'monochrome' | null;
  /** Target build fingerprint this update applies to (dev or prod fingerprint). If null, applies to all matching env */
  targetFingerprint?: string | null;
  /** Optional metadata / build commit hash / release notes */
  metadata?: Record<string, unknown>;
}

export const CURRENT_SDUI_SCHEMA_VERSION = 1;

/**
 * Defensive runtime validator for incoming SDUI JSON manifests.
 * Prevents client crashes caused by unexpected types or malformed payloads.
 */
export function validateManifest(raw: unknown): SDUIManifest | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // schemaVersion must be an integer
  const schemaVersion = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;
  if (schemaVersion > CURRENT_SDUI_SCHEMA_VERSION) {
    console.warn(`[SDUI] Server manifest schemaVersion ${schemaVersion} is higher than client supported version ${CURRENT_SDUI_SCHEMA_VERSION}. Skipping.`);
    return null;
  }

  // environment must be dev or prod
  const environment: SDUIEnvironment =
    obj.environment === 'dev' || obj.environment === 'prod' ? obj.environment : 'prod';

  // updatedAt
  const updatedAt = typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString();

  // minAppVersion
  const minAppVersion = typeof obj.minAppVersion === 'string' ? obj.minAppVersion : undefined;

  // featureFlags
  let featureFlags: Record<string, boolean> | undefined;
  if (obj.featureFlags && typeof obj.featureFlags === 'object') {
    featureFlags = {};
    for (const [k, v] of Object.entries(obj.featureFlags as Record<string, unknown>)) {
      if (typeof v === 'boolean') {
        featureFlags[k] = v;
      }
    }
  }

  // announcement
  let announcement: SDUIAnnouncement | null = null;
  if (obj.announcement && typeof obj.announcement === 'object') {
    const a = obj.announcement as Record<string, unknown>;
    if (typeof a.id === 'string' && typeof a.title === 'string' && typeof a.message === 'string') {
      const type: AnnouncementType =
        a.type === 'warning' || a.type === 'critical' || a.type === 'info' ? a.type : 'info';
      announcement = {
        id: a.id,
        title: a.title,
        message: a.message,
        type,
        dismissible: typeof a.dismissible === 'boolean' ? a.dismissible : true,
        actionUrl: typeof a.actionUrl === 'string' ? a.actionUrl : undefined,
        actionLabel: typeof a.actionLabel === 'string' ? a.actionLabel : undefined,
      };
    }
  }

  // maintenance
  let maintenance: SDUIMaintenance | undefined;
  if (obj.maintenance && typeof obj.maintenance === 'object') {
    const m = obj.maintenance as Record<string, unknown>;
    maintenance = {
      enabled: typeof m.enabled === 'boolean' ? m.enabled : false,
      title: typeof m.title === 'string' ? m.title : undefined,
      message: typeof m.message === 'string' ? m.message : undefined,
      estimatedEndTime: typeof m.estimatedEndTime === 'string' ? m.estimatedEndTime : undefined,
      allowAdminBypass: typeof m.allowAdminBypass === 'boolean' ? m.allowAdminBypass : false,
    };
  }

  // textOverrides
  let textOverrides: Record<string, string> | undefined;
  if (obj.textOverrides && typeof obj.textOverrides === 'object') {
    textOverrides = {};
    for (const [k, v] of Object.entries(obj.textOverrides as Record<string, unknown>)) {
      if (typeof v === 'string') {
        textOverrides[k] = v;
      }
    }
  }

  // themeOverride
  const themeOverride =
    obj.themeOverride === 'vibrant' || obj.themeOverride === 'monochrome' ? obj.themeOverride : null;

  // targetFingerprint
  const targetFingerprint =
    typeof obj.targetFingerprint === 'string' ? obj.targetFingerprint : null;

  return {
    schemaVersion,
    environment,
    updatedAt,
    minAppVersion,
    featureFlags,
    announcement,
    maintenance,
    textOverrides,
    themeOverride,
    targetFingerprint,
    metadata: typeof obj.metadata === 'object' && obj.metadata !== null ? (obj.metadata as Record<string, unknown>) : undefined,
  };
}
