/**
 * Background Sync Service — Schedules periodic background tasks via expo-background-task
 * and expo-task-manager to fetch new emails and trigger notifications every 15 minutes.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { incrementalSync } from './sync';
import { processNewEmailNotifications } from './notifications';

export const BACKGROUND_SYNC_TASK = 'ORYN_BACKGROUND_SYNC_TASK';

// Define background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const { newEmails } = await incrementalSync();

    if (newEmails.length > 0) {
      const urgent = newEmails.filter(
        e => e.priority === 'critical' || e.priority === 'high' || e.deadline != null
      );
      if (urgent.length > 0) {
        await processNewEmailNotifications(urgent, { isBackground: true });
      }
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('[BackgroundSyncTask] Error running background fetch:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
      });
    }
  } catch (err) {
    console.warn('[BackgroundSync] Registration skipped or failed:', err);
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
  } catch (err) {
    console.warn('[BackgroundSync] Unregister failed:', err);
  }
}
