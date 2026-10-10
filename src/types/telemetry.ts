/**
 * Types for Oryn Device Telemetry and Bird's Eye User Radar.
 */

export interface TelemetryDevice {
  device_id: string;
  user_email: string | null;
  user_name: string | null;
  avatar_url: string | null;
  roll_number: string | null;
  batch: string | null;
  department: string | null;
  device_model: string | null;
  device_brand: string | null;
  os_name: string | null;
  os_version: string | null;
  app_version: string | null;
  bundle_hash: string | null;
  build_fingerprint: string | null;
  first_seen: string;
  last_seen: string;
  launch_count: number;
  is_online: boolean;
  is_active_today: boolean;
  expo_push_token?: string | null;
}

export interface TelemetrySummary {
  totalInstalls: number;
  activeNow: number;
  activeToday: number;
  registeredUsers: number;
  anonymousInstalls: number;
  withPushTokens?: number;
}

export interface TelemetryOverview {
  summary: TelemetrySummary;
  batches: Record<string, number>;
  departments: Record<string, number>;
  brands: Record<string, number>;
  devices: TelemetryDevice[];
}
