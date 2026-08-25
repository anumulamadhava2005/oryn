/**
 * Local notification scheduler.
 * Schedules reminders for deadlines, critical emails, and placement events.
 */

import * as Notifications from 'expo-notifications';
import { addHours, isFuture, parseISO } from 'date-fns';
import type { ParsedEmail } from '@/types/email';

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowInNotificationCenter: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const CHANNEL_ID = 'oryn';

export async function setupNotificationChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Oryn Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED',
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function makeDeadlineIdentifier(emailId: string): string {
  return `deadline:${emailId}`;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Schedule a deadline reminder 1 hour before the deadline.
 * Cancels any previously scheduled reminder for the same email.
 */
export async function scheduleDeadlineReminder(email: ParsedEmail): Promise<void> {
  if (!email.deadline) return;

  const deadline = parseISO(email.deadline);
  const fireAt = addHours(deadline, -1);

  if (!isFuture(fireAt)) return; // Already passed

  const identifier = makeDeadlineIdentifier(email.id);

  // Cancel existing before rescheduling
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `⏰ Deadline in 1 hour`,
      body: email.subject,
      data: { emailId: email.id },
      categoryIdentifier: CHANNEL_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

/**
 * Immediately fire a local notification for a new critical / placement email.
 */
export async function notifyCriticalEmail(email: ParsedEmail): Promise<void> {
  const emoji =
    email.priority === 'critical' ? '🚨' :
    email.categoryGroup === 'placement' ? '💼' : '📧';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${email.sender}`,
      body: email.subject,
      data: { emailId: email.id },
      categoryIdentifier: CHANNEL_ID,
    },
    trigger: null, // fire immediately
  });
}

/**
 * Process a batch of emails:
 * - Always schedule future deadline reminders (silent until 1 hour before deadline).
 * - Fire immediate pop-up notifications ONLY if isBackground === true (e.g. during background fetch when new emails arrive).
 */
export async function processNewEmailNotifications(
  emails: ParsedEmail[],
  options: { isBackground?: boolean } = {},
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const { isBackground = false } = options;

  for (const email of emails) {
    // 1. Schedule future deadline reminders (silent until 1 hour before deadline)
    if (email.deadline) {
      await scheduleDeadlineReminder(email).catch(() => {});
    }

    // 2. Immediate push alerts ONLY during background fetch
    if (
      isBackground &&
      (email.priority === 'critical' ||
        email.categoryGroup === 'placement' ||
        email.priority === 'high')
    ) {
      await notifyCriticalEmail(email).catch(() => {});
    }
  }
}

/** Cancel a deadline reminder by email ID */
export async function cancelDeadlineReminder(emailId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    makeDeadlineIdentifier(emailId),
  ).catch(() => {});
}
