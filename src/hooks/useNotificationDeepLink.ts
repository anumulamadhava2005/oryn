/**
 * useNotificationDeepLink — handles tapping notifications to deep-link to email detail.
 * Listens for notification responses and navigates to the target email.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

/**
 * Call this hook once in the app layout to wire up notification tap → email detail navigation.
 */
export function useNotificationDeepLink() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Handle notification taps when app is in foreground / background
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const emailId = data?.emailId as string | undefined;
        if (emailId) {
          // Navigate to email detail screen
          router.push(`/(app)/email/${emailId}`);
        }
      },
    );

    // Handle cold-start from notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        const emailId = data?.emailId as string | undefined;
        if (emailId) {
          // Small delay to allow navigation to mount
          setTimeout(() => {
            router.push(`/(app)/email/${emailId}`);
          }, 500);
        }
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}
