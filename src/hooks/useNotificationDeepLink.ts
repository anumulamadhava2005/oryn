/**
 * useNotificationDeepLink — handles tapping notifications & interactive action buttons:
 * - Direct tap / 'View' -> deep-links to email or today's briefing screen.
 * - 'Mark as Read' -> marks read in cache & store without interrupting workflow.
 * - 'Snooze 1h' -> reschedules reminder for 1 hour later.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { addHours } from 'date-fns';
import { ACTION_IDS, CHANNELS } from '@/services/notifications';
import { updateCachedEmailReadStatus } from '@/services/cache';
import { useEmailsStore } from '@/store/emails';

export function useNotificationDeepLink() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    async function handleResponse(response: Notifications.NotificationResponse) {
      const { actionIdentifier } = response;
      const content = response.notification.request.content;
      const data = content.data as { emailId?: string; type?: string; stage?: string } | undefined;
      const emailId = data?.emailId;

      // 1. Action: Mark as Read
      if (actionIdentifier === ACTION_IDS.MARK_READ && emailId) {
        updateCachedEmailReadStatus(emailId, false);
        useEmailsStore.setState((s) => ({
          emails: s.emails.map((e) => (e.id === emailId ? { ...e, isUnread: false } : e)),
        }));
        return;
      }

      // 2. Action: Snooze 1 hour
      if (actionIdentifier === ACTION_IDS.SNOOZE_1H) {
        const snoozeDate = addHours(new Date(), 1);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `[Snoozed] ${content.title || 'Reminder'}`,
            body: content.body || '',
            data: { ...data, snoozed: true },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: snoozeDate,
            channelId: CHANNELS.DEADLINES,
          },
        }).catch(() => {});
        return;
      }

      // 3. Default tap or 'View Email' action -> Navigate
      if (
        actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ||
        actionIdentifier === ACTION_IDS.VIEW_EMAIL
      ) {
        if (emailId && emailId !== 'test-placement-id' && emailId !== 'test-deadline-id' && emailId !== 'test-cancellation-id') {
          router.push(`/(app)/email/${emailId}`);
        } else if (data?.type === 'briefing_morning' || data?.type === 'briefing_nightly') {
          router.push('/(app)/today');
        }
      }
    }

    // Handle notification responses while app is active / in background
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Handle cold-start launch from notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        setTimeout(() => {
          handleResponse(response);
        }, 500);
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}
