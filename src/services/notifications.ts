/**
 * Advanced Campus Notification Service.
 * Manages:
 * - High-stakes Placement sirens & test link alerts
 * - Multi-stage deadline countdowns (24h, 3h, 1h)
 * - Class cancellation / venue shift instant alerts
 * - Interactive action categories ('Mark as Read', 'Snooze 1h')
 * - Daily Morning Briefing & Nightly Radar
 * - Quiet Hours (DND) with critical bypass
 * - Android notification channels with priority-tailored haptic patterns
 */

import * as Notifications from 'expo-notifications';
import { addHours, isFuture, parseISO, isToday, isTomorrow } from 'date-fns';
import type { ParsedEmail } from '@/types/email';
import { useNotificationPreferencesStore } from '@/store/notificationPreferences';
import { useAcademicStore } from '@/store/academicStore';
import { getAllCachedEmails } from './cache';

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const CHANNELS = {
  GENERAL: 'oryn_general',
  PLACEMENT: 'oryn_placement',
  DEADLINES: 'oryn_deadlines',
  BRIEFING: 'oryn_briefing',
  LEGACY: 'oryn',
} as const;

export const CATEGORY_IDS = {
  EMAIL_ACTION: 'EMAIL_ACTION',
  DEADLINE_ACTION: 'DEADLINE_ACTION',
} as const;

export const ACTION_IDS = {
  MARK_READ: 'MARK_READ',
  SNOOZE_1H: 'SNOOZE_1H',
  VIEW_EMAIL: 'VIEW_EMAIL',
} as const;

/**
 * Setup all Android notification channels with fine-tuned urgency patterns.
 */
export async function setupAllNotificationChannels(): Promise<void> {
  // 1. Placement Channel (Max priority, distinct siren pattern)
  await Notifications.setNotificationChannelAsync(CHANNELS.PLACEMENT, {
    name: 'Placements & Career Drives',
    description: 'Critical coding tests, shortlists, and placement deadlines',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 150, 300, 150, 300],
    lightColor: '#FF3B30',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  });

  // 2. Deadlines Channel (High priority)
  await Notifications.setNotificationChannelAsync(CHANNELS.DEADLINES, {
    name: 'Deadlines & Submissions',
    description: 'Upcoming assignment, quiz, and project deadlines',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#FF9500',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  });

  // 3. General Campus Notices
  await Notifications.setNotificationChannelAsync(CHANNELS.GENERAL, {
    name: 'Campus Notices & Classes',
    description: 'Class cancellations, administrative circulars, hostel & faculty emails',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  });

  // 4. Daily Briefings Channel (Default priority, pleasant & unobtrusive)
  await Notifications.setNotificationChannelAsync(CHANNELS.BRIEFING, {
    name: 'Daily Briefing & Radar',
    description: 'Morning schedule summary and nightly radar',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150, 100, 150],
    lightColor: '#007AFF',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: false,
  });

  // Backward compatibility alias for legacy 'oryn' channel
  await Notifications.setNotificationChannelAsync(CHANNELS.LEGACY, {
    name: 'Oryn Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED',
  });
}

/** Legacy alias */
export const setupNotificationChannel = setupAllNotificationChannels;

/**
 * Register interactive notification categories (Action buttons on lock screen).
 */
export async function setupNotificationCategories(): Promise<void> {
  // Category 1: Email Action (Mark Read, Snooze)
  await Notifications.setNotificationCategoryAsync(CATEGORY_IDS.EMAIL_ACTION, [
    {
      identifier: ACTION_IDS.MARK_READ,
      buttonTitle: '✓ Mark Read',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: ACTION_IDS.SNOOZE_1H,
      buttonTitle: '⏰ Snooze 1h',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
  ]);

  // Category 2: Deadline Action (Snooze, Open)
  await Notifications.setNotificationCategoryAsync(CATEGORY_IDS.DEADLINE_ACTION, [
    {
      identifier: ACTION_IDS.SNOOZE_1H,
      buttonTitle: '⏰ Snooze 1h',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: ACTION_IDS.VIEW_EMAIL,
      buttonTitle: 'View Email',
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// --------------------------------------------------------------------------
// Quiet Hours & Cancellation Heuristics
// --------------------------------------------------------------------------

/**
 * Checks if current time is within user-configured Quiet Hours.
 */
export function isInQuietHours(): boolean {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.quietHoursEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);

  const startMinutes = (startH || 23) * 60 + (startM || 0);
  const endMinutes = (endH || 7) * 60 + (endM || 0);

  if (startMinutes > endMinutes) {
    // Spans overnight (e.g. 23:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Detects if an email announces a class cancellation, reschedule, or venue shift.
 */
export function isClassCancelledOrRescheduled(email: ParsedEmail): {
  isCancellation: boolean;
  reason?: string;
} {
  const text = `${email.subject} ${email.snippet || ''} ${email.body || ''}`.toLowerCase();

  const cancelPatterns = [
    /class.*cancelled/i,
    /lecture.*cancelled/i,
    /lab.*cancelled/i,
    /class.*suspended/i,
    /no.*class.*today/i,
    /lecture.*suspended/i,
    /will not be taking class/i,
    /wont be taking class/i,
    /rescheduled to/i,
    /venue changed to/i,
    /room changed to/i,
    /postponed to/i,
  ];

  for (const pattern of cancelPatterns) {
    if (pattern.test(text)) {
      return { isCancellation: true, reason: email.subject };
    }
  }

  return { isCancellation: false };
}

// --------------------------------------------------------------------------
// Notification Dispatchers
// --------------------------------------------------------------------------

/**
 * Fire an immediate high-stakes Placement Alert siren.
 */
export async function notifyPlacementAlert(email: ParsedEmail): Promise<void> {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.enabled || !prefs.placements) return;

  if (isInQuietHours() && !prefs.allowCriticalInQuietHours) return;

  const company = email.extractedEntities?.companyNames?.[0] || email.sender;
  const isTestLink = /test|assessment|hackerrank|codeforces|shl|examly|link/i.test(
    `${email.subject} ${email.snippet}`
  );

  const title = isTestLink
    ? `🚨 [Action Required] Test Link: ${company}`
    : `💼 [Placement] ${company}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: email.subject,
      data: { emailId: email.id, type: 'placement' },
      categoryIdentifier: CATEGORY_IDS.EMAIL_ACTION,
    },
    trigger: { channelId: CHANNELS.PLACEMENT },
  });
}

/**
 * Fire an immediate alert when a class or lecture is cancelled / rescheduled.
 */
export async function notifyClassUpdate(email: ParsedEmail): Promise<void> {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.enabled || !prefs.classCancellations) return;

  if (isInQuietHours() && !prefs.allowCriticalInQuietHours) return;

  const course = email.extractedEntities?.courseCodes?.[0] || 'Class';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Class Update: ${course}`,
      body: email.subject,
      data: { emailId: email.id, type: 'class_update' },
      categoryIdentifier: CATEGORY_IDS.EMAIL_ACTION,
    },
    trigger: { channelId: CHANNELS.GENERAL },
  });
}

/**
 * Immediately fire a local notification for a new critical / placement email.
 */
export async function notifyCriticalEmail(email: ParsedEmail): Promise<void> {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.enabled) return;

  // Check placement first
  if (email.categoryGroup === 'placement' || email.priority === 'critical') {
    if (email.categoryGroup === 'placement') {
      await notifyPlacementAlert(email);
      return;
    }
  }

  // Check class cancellation
  const { isCancellation } = isClassCancelledOrRescheduled(email);
  if (isCancellation) {
    await notifyClassUpdate(email);
    return;
  }

  // Check Quiet Hours for general critical alerts
  if (isInQuietHours() && !prefs.allowCriticalInQuietHours) return;

  const prefix = email.priority === 'critical' ? '[Urgent]' : '[Notice]';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${prefix} ${email.sender}`,
      body: email.subject,
      data: { emailId: email.id, type: 'critical' },
      categoryIdentifier: CATEGORY_IDS.EMAIL_ACTION,
    },
    trigger: { channelId: CHANNELS.GENERAL },
  });
}

// --------------------------------------------------------------------------
// Multi-Stage Deadline Scheduling
// --------------------------------------------------------------------------

function makeDeadlineKey(stage: '24h' | '3h' | '1h', emailId: string): string {
  return `deadline:${stage}:${emailId}`;
}

/**
 * Schedule multi-stage deadline reminders (24h, 3h, 1h before deadline).
 */
export async function scheduleMultiStageDeadlineReminders(email: ParsedEmail): Promise<void> {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.enabled || !prefs.deadlines || !email.deadline) return;

  const deadline = parseISO(email.deadline);

  const stages: Array<{
    key: '24h' | '3h' | '1h';
    hours: number;
    enabled: boolean;
    title: string;
  }> = [
    {
      key: '24h',
      hours: 24,
      enabled: prefs.deadline24h,
      title: '⏳ Deadline Tomorrow (24h left)',
    },
    {
      key: '3h',
      hours: 3,
      enabled: prefs.deadline3h,
      title: '⚠️ Deadline in 3 hours',
    },
    {
      key: '1h',
      hours: 1,
      enabled: prefs.deadline1h,
      title: '🚨 Final Call: Deadline in 1 hour',
    },
  ];

  for (const stage of stages) {
    if (!stage.enabled) continue;

    const fireAt = addHours(deadline, -stage.hours);
    if (!isFuture(fireAt)) continue; // Stage already passed

    const identifier = makeDeadlineKey(stage.key, email.id);

    // Cancel previously scheduled instance
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: stage.title,
        body: email.subject,
        data: { emailId: email.id, type: 'deadline', stage: stage.key },
        categoryIdentifier: CATEGORY_IDS.DEADLINE_ACTION,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNELS.DEADLINES,
      },
    });
  }
}

/** Legacy wrapper */
export const scheduleDeadlineReminder = scheduleMultiStageDeadlineReminders;

/** Cancel all multi-stage deadline reminders for an email ID */
export async function cancelDeadlineReminder(emailId: string): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(makeDeadlineKey('24h', emailId)).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(makeDeadlineKey('3h', emailId)).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(makeDeadlineKey('1h', emailId)).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`deadline:${emailId}`).catch(() => {}),
  ]);
}

// --------------------------------------------------------------------------
// Daily Morning Briefing & Nightly Radar
// --------------------------------------------------------------------------

const BRIEFING_IDENTIFIERS = {
  MORNING: 'oryn:daily_morning_briefing',
  NIGHTLY: 'oryn:nightly_radar',
};

/**
 * Schedules or refreshes the daily Morning Briefing notification.
 */
export async function scheduleMorningBriefing(): Promise<void> {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.enabled || !prefs.morningBriefing) {
    await Notifications.cancelScheduledNotificationAsync(BRIEFING_IDENTIFIERS.MORNING).catch(() => {});
    return;
  }

  const [hourStr, minStr] = prefs.morningTime.split(':');
  const targetHour = parseInt(hourStr || '8', 10);
  const targetMinute = parseInt(minStr || '0', 10);

  // Compute today's details
  const today = new Date();
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][today.getDay()];

  let classSummary = 'No scheduled lectures today';
  if (dayOfWeek !== 'SUN' && dayOfWeek !== 'SAT') {
    const weeklySchedule = useAcademicStore.getState().getWeeklySchedule();
    const todaySlots = weeklySchedule[dayOfWeek] || [];
    const courseCount = todaySlots.reduce((acc, slot) => acc + (slot.courses?.length || 0), 0);
    if (courseCount > 0) {
      classSummary = `${courseCount} class${courseCount > 1 ? 'es' : ''} on schedule`;
    }
  }

  // Count deadlines due today
  const cachedEmails = getAllCachedEmails();
  const todayDeadlines = cachedEmails.filter(e => {
    if (!e.deadline) return false;
    try {
      return isToday(parseISO(e.deadline));
    } catch {
      return false;
    }
  });

  const deadlineSummary =
    todayDeadlines.length > 0
      ? ` • ⏰ ${todayDeadlines.length} deadline${todayDeadlines.length > 1 ? 's' : ''} today`
      : '';

  // Calculate next fire date
  const fireDate = new Date();
  fireDate.setHours(targetHour, targetMinute, 0, 0);
  if (fireDate.getTime() <= Date.now()) {
    fireDate.setDate(fireDate.getDate() + 1); // Tomorrow morning
  }

  await Notifications.cancelScheduledNotificationAsync(BRIEFING_IDENTIFIERS.MORNING).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: BRIEFING_IDENTIFIERS.MORNING,
    content: {
      title: `☀️ Morning Briefing`,
      body: `${classSummary}${deadlineSummary}. Have a productive day!`,
      data: { type: 'briefing_morning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNELS.BRIEFING,
    },
  });
}

/**
 * Schedules or refreshes the daily Nightly Radar notification.
 */
export async function scheduleNightlyRadar(): Promise<void> {
  const prefs = useNotificationPreferencesStore.getState();
  if (!prefs.enabled || !prefs.nightlyRadar) {
    await Notifications.cancelScheduledNotificationAsync(BRIEFING_IDENTIFIERS.NIGHTLY).catch(() => {});
    return;
  }

  const [hourStr, minStr] = prefs.nightlyTime.split(':');
  const targetHour = parseInt(hourStr || '21', 10);
  const targetMinute = parseInt(minStr || '30', 10);

  // Compute tomorrow's details
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][tomorrow.getDay()];

  let preview = 'Clear schedule tomorrow';
  if (nextDay !== 'SUN' && nextDay !== 'SAT') {
    const weeklySchedule = useAcademicStore.getState().getWeeklySchedule();
    const tomorrowSlots = weeklySchedule[nextDay] || [];
    const courseCount = tomorrowSlots.reduce((acc, slot) => acc + (slot.courses?.length || 0), 0);
    if (courseCount > 0) {
      preview = `${courseCount} class${courseCount > 1 ? 'es' : ''} scheduled tomorrow`;
    }
  }

  const cachedEmails = getAllCachedEmails();
  const tomorrowDeadlines = cachedEmails.filter(e => {
    if (!e.deadline) return false;
    try {
      return isTomorrow(parseISO(e.deadline));
    } catch {
      return false;
    }
  });

  const deadlineSummary =
    tomorrowDeadlines.length > 0
      ? ` • ⚠️ ${tomorrowDeadlines.length} deadline${tomorrowDeadlines.length > 1 ? 's' : ''} due tomorrow`
      : '';

  const fireDate = new Date();
  fireDate.setHours(targetHour, targetMinute, 0, 0);
  if (fireDate.getTime() <= Date.now()) {
    fireDate.setDate(fireDate.getDate() + 1);
  }

  await Notifications.cancelScheduledNotificationAsync(BRIEFING_IDENTIFIERS.NIGHTLY).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: BRIEFING_IDENTIFIERS.NIGHTLY,
    content: {
      title: `🌙 Tomorrow's Radar`,
      body: `${preview}${deadlineSummary}. Check your inbox before rest!`,
      data: { type: 'briefing_nightly' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNELS.BRIEFING,
    },
  });
}

// --------------------------------------------------------------------------
// Batch Email Pipeline Processing
// --------------------------------------------------------------------------

/**
 * Process a batch of newly synced emails:
 * - Schedules multi-stage deadline reminders.
 * - Detects class cancellations and fires alerts.
 * - Fires immediate alerts for placement and critical emails if in background.
 */
export async function processNewEmailNotifications(
  emails: ParsedEmail[],
  options: { isBackground?: boolean } = {},
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const { isBackground = false } = options;

  for (const email of emails) {
    // 1. Multi-stage deadline scheduling (24h, 3h, 1h)
    if (email.deadline) {
      await scheduleMultiStageDeadlineReminders(email).catch(() => {});
    }

    // 2. Class cancellation or venue shift alerts
    const { isCancellation } = isClassCancelledOrRescheduled(email);
    if (isCancellation && isBackground) {
      await notifyClassUpdate(email).catch(() => {});
      continue;
    }

    // 3. Immediate push alerts during background fetch
    if (
      isBackground &&
      (email.priority === 'critical' ||
        email.categoryGroup === 'placement' ||
        email.priority === 'high')
    ) {
      await notifyCriticalEmail(email).catch(() => {});
    }
  }

  // Refresh Morning Briefing & Nightly Radar with latest data
  await scheduleMorningBriefing().catch(() => {});
  await scheduleNightlyRadar().catch(() => {});
}

// --------------------------------------------------------------------------
// Testing Utilities (Allows testing live from Settings UI)
// --------------------------------------------------------------------------

export async function sendTestNotification(
  type: 'placement' | 'deadline' | 'cancellation' | 'morning_briefing'
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error('Notification permissions not granted');
  }

  switch (type) {
    case 'placement':
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 [Action Required] Test Link: Google SWE`,
          body: `Online Assessment link active. Closes in 90 minutes. Do not share credentials.`,
          data: { emailId: 'test-placement-id', type: 'placement' },
          categoryIdentifier: CATEGORY_IDS.EMAIL_ACTION,
        },
        trigger: { channelId: CHANNELS.PLACEMENT },
      });
      break;

    case 'deadline':
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏳ Deadline in 3 hours: CS301 Lab Assignment 4`,
          body: `Submission portal closes at 11:59 PM. Make sure your GitHub PR is merged.`,
          data: { emailId: 'test-deadline-id', type: 'deadline' },
          categoryIdentifier: CATEGORY_IDS.DEADLINE_ACTION,
        },
        trigger: { channelId: CHANNELS.DEADLINES },
      });
      break;

    case 'cancellation':
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠️ Class Update: CS202 Operating Systems`,
          body: `Prof. Sharma emailed: "Lecture cancelled today due to faculty board meeting."`,
          data: { emailId: 'test-cancellation-id', type: 'class_update' },
          categoryIdentifier: CATEGORY_IDS.EMAIL_ACTION,
        },
        trigger: { channelId: CHANNELS.GENERAL },
      });
      break;

    case 'morning_briefing':
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `☀️ Morning Briefing`,
          body: `3 lectures on schedule today • ⏰ 1 deadline at 11:59 PM. Have a productive day!`,
          data: { type: 'briefing_morning' },
        },
        trigger: { channelId: CHANNELS.BRIEFING },
      });
      break;
  }
}
