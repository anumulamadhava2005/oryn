/**
 * Notification Preferences Store backed by MMKV.
 * Provides fine-grained user controls for campus alerts:
 * - Placements & high-stakes alerts
 * - Multi-stage deadline reminders (24h, 3h, 1h)
 * - Class cancellation / venue shifts
 * - Morning briefing & nightly radar
 * - Quiet hours (Do Not Disturb) with critical override
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oryn-notification-preferences' });

const KEYS = {
  ENABLED: 'notif_pref:enabled',
  PLACEMENTS: 'notif_pref:placements',
  DEADLINES: 'notif_pref:deadlines',
  DEADLINE_24H: 'notif_pref:deadline_24h',
  DEADLINE_3H: 'notif_pref:deadline_3h',
  DEADLINE_1H: 'notif_pref:deadline_1h',
  CLASS_CANCELLATIONS: 'notif_pref:class_cancellations',
  MORNING_BRIEFING: 'notif_pref:morning_briefing',
  MORNING_TIME: 'notif_pref:morning_time',
  NIGHTLY_RADAR: 'notif_pref:nightly_radar',
  NIGHTLY_TIME: 'notif_pref:nightly_time',
  MESS_ALERTS: 'notif_pref:mess_alerts',
  QUIET_HOURS_ENABLED: 'notif_pref:quiet_hours_enabled',
  QUIET_HOURS_START: 'notif_pref:quiet_hours_start',
  QUIET_HOURS_END: 'notif_pref:quiet_hours_end',
  ALLOW_CRITICAL_IN_QUIET_HOURS: 'notif_pref:allow_critical_in_quiet_hours',
};

export interface NotificationPreferencesState {
  enabled: boolean;
  placements: boolean;
  deadlines: boolean;
  deadline24h: boolean;
  deadline3h: boolean;
  deadline1h: boolean;
  classCancellations: boolean;
  morningBriefing: boolean;
  morningTime: string; // 'HH:mm'
  nightlyRadar: boolean;
  nightlyTime: string; // 'HH:mm'
  messAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // 'HH:mm'
  quietHoursEnd: string; // 'HH:mm'
  allowCriticalInQuietHours: boolean;

  // Actions
  setEnabled: (val: boolean) => void;
  setPlacements: (val: boolean) => void;
  setDeadlines: (val: boolean) => void;
  setDeadline24h: (val: boolean) => void;
  setDeadline3h: (val: boolean) => void;
  setDeadline1h: (val: boolean) => void;
  setClassCancellations: (val: boolean) => void;
  setMorningBriefing: (val: boolean) => void;
  setMorningTime: (val: string) => void;
  setNightlyRadar: (val: boolean) => void;
  setNightlyTime: (val: string) => void;
  setMessAlerts: (val: boolean) => void;
  setQuietHoursEnabled: (val: boolean) => void;
  setQuietHoursStart: (val: string) => void;
  setQuietHoursEnd: (val: string) => void;
  setAllowCriticalInQuietHours: (val: boolean) => void;
  resetDefaults: () => void;
}

export const useNotificationPreferencesStore = create<NotificationPreferencesState>()(
  (set) => ({
    enabled: storage.getBoolean(KEYS.ENABLED) ?? true,
    placements: storage.getBoolean(KEYS.PLACEMENTS) ?? true,
    deadlines: storage.getBoolean(KEYS.DEADLINES) ?? true,
    deadline24h: storage.getBoolean(KEYS.DEADLINE_24H) ?? true,
    deadline3h: storage.getBoolean(KEYS.DEADLINE_3H) ?? true,
    deadline1h: storage.getBoolean(KEYS.DEADLINE_1H) ?? true,
    classCancellations: storage.getBoolean(KEYS.CLASS_CANCELLATIONS) ?? true,
    morningBriefing: storage.getBoolean(KEYS.MORNING_BRIEFING) ?? true,
    morningTime: storage.getString(KEYS.MORNING_TIME) ?? '08:00',
    nightlyRadar: storage.getBoolean(KEYS.NIGHTLY_RADAR) ?? true,
    nightlyTime: storage.getString(KEYS.NIGHTLY_TIME) ?? '21:30',
    messAlerts: storage.getBoolean(KEYS.MESS_ALERTS) ?? false,
    quietHoursEnabled: storage.getBoolean(KEYS.QUIET_HOURS_ENABLED) ?? false,
    quietHoursStart: storage.getString(KEYS.QUIET_HOURS_START) ?? '23:00',
    quietHoursEnd: storage.getString(KEYS.QUIET_HOURS_END) ?? '07:00',
    allowCriticalInQuietHours: storage.getBoolean(KEYS.ALLOW_CRITICAL_IN_QUIET_HOURS) ?? true,

    setEnabled: (val: boolean) => {
      storage.set(KEYS.ENABLED, val);
      set({ enabled: val });
    },
    setPlacements: (val: boolean) => {
      storage.set(KEYS.PLACEMENTS, val);
      set({ placements: val });
    },
    setDeadlines: (val: boolean) => {
      storage.set(KEYS.DEADLINES, val);
      set({ deadlines: val });
    },
    setDeadline24h: (val: boolean) => {
      storage.set(KEYS.DEADLINE_24H, val);
      set({ deadline24h: val });
    },
    setDeadline3h: (val: boolean) => {
      storage.set(KEYS.DEADLINE_3H, val);
      set({ deadline3h: val });
    },
    setDeadline1h: (val: boolean) => {
      storage.set(KEYS.DEADLINE_1H, val);
      set({ deadline1h: val });
    },
    setClassCancellations: (val: boolean) => {
      storage.set(KEYS.CLASS_CANCELLATIONS, val);
      set({ classCancellations: val });
    },
    setMorningBriefing: (val: boolean) => {
      storage.set(KEYS.MORNING_BRIEFING, val);
      set({ morningBriefing: val });
    },
    setMorningTime: (val: string) => {
      storage.set(KEYS.MORNING_TIME, val);
      set({ morningTime: val });
    },
    setNightlyRadar: (val: boolean) => {
      storage.set(KEYS.NIGHTLY_RADAR, val);
      set({ nightlyRadar: val });
    },
    setNightlyTime: (val: string) => {
      storage.set(KEYS.NIGHTLY_TIME, val);
      set({ nightlyTime: val });
    },
    setMessAlerts: (val: boolean) => {
      storage.set(KEYS.MESS_ALERTS, val);
      set({ messAlerts: val });
    },
    setQuietHoursEnabled: (val: boolean) => {
      storage.set(KEYS.QUIET_HOURS_ENABLED, val);
      set({ quietHoursEnabled: val });
    },
    setQuietHoursStart: (val: string) => {
      storage.set(KEYS.QUIET_HOURS_START, val);
      set({ quietHoursStart: val });
    },
    setQuietHoursEnd: (val: string) => {
      storage.set(KEYS.QUIET_HOURS_END, val);
      set({ quietHoursEnd: val });
    },
    setAllowCriticalInQuietHours: (val: boolean) => {
      storage.set(KEYS.ALLOW_CRITICAL_IN_QUIET_HOURS, val);
      set({ allowCriticalInQuietHours: val });
    },
    resetDefaults: () => {
      storage.clearAll();
      set({
        enabled: true,
        placements: true,
        deadlines: true,
        deadline24h: true,
        deadline3h: true,
        deadline1h: true,
        classCancellations: true,
        morningBriefing: true,
        morningTime: '08:00',
        nightlyRadar: true,
        nightlyTime: '21:30',
        messAlerts: false,
        quietHoursEnabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        allowCriticalInQuietHours: true,
      });
    },
  })
);
