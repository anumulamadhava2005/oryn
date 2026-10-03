/**
 * useSync hook.
 * Orchestrates initial and incremental syncs, loading from cache on startup.
 * Streams emails incrementally during initial sync and appends new emails seamlessly.
 */

import { useCallback } from 'react';
import { getAllCachedEmails, getLastSyncAt } from '@/services/cache';
import { initialSync, incrementalSync } from '@/services/sync';
import { setupNotificationChannel, processNewEmailNotifications } from '@/services/notifications';
import { useEmailsStore } from '@/store/emails';
import { useSyncStore } from '@/store/sync';
import { hapticSuccess } from '@/utils/haptics';

import { useAcademicStore } from '@/store/academicStore';
import { syncLostFoundFromEmail } from '@/services/lostFoundEmailImporter';
import { syncEventsFromEmail } from '@/services/eventsEmailImporter';

export function useSync() {
  const status = useSyncStore((s) => s.status);
  const phase = useSyncStore((s) => s.phase);
  const fetched = useSyncStore((s) => s.fetched);
  const total = useSyncStore((s) => s.total);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const error = useSyncStore((s) => s.error);

  /** Load cached emails immediately from MMKV (instant, no network) */
  const loadFromCache = useCallback(() => {
    const cached = getAllCachedEmails();
    if (cached.length > 0) {
      useEmailsStore.getState().setEmails(cached);
    }
    const lastAt = getLastSyncAt();
    if (lastAt) useSyncStore.getState().setLastSyncAt(lastAt);
  }, []);

  /** Run the first-ever or forced full sync — batches emails to avoid UI freezing */
  const runInitialSync = useCallback(async () => {
    const syncStore = useSyncStore.getState();
    const emailStore = useEmailsStore.getState();
    syncStore.startSync();
    try {
      await setupNotificationChannel();
      let streamBuffer: any[] = [];
      const { emails } = await initialSync(
        (event) => {
          syncStore.updateProgress(event);
        },
        // Buffer streamed emails and flush every 15 items to prevent freezing JS thread
        (email) => {
          streamBuffer.push(email);
          if (streamBuffer.length >= 15) {
            emailStore.prependEmails([...streamBuffer]);
            streamBuffer = [];
          }
        },
      );
      if (streamBuffer.length > 0) {
        emailStore.prependEmails([...streamBuffer]);
        streamBuffer = [];
      }
      // Load all cached emails (merged & deduplicated) into store
      const allCached = getAllCachedEmails();
      emailStore.setEmails(allCached.length > 0 ? allCached : emails);
      await processNewEmailNotifications(emails, { isBackground: false });

      // Sync master timetable & announcements
      await useAcademicStore.getState().syncRemoteTimetable();

      // Automatically import campus events and lost & found items from emails
      syncEventsFromEmail().catch(() => {});
      syncLostFoundFromEmail().catch(() => {});

      syncStore.finishSync(Date.now());
      hapticSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      syncStore.setError(msg);
    }
  }, []);

  /** Run incremental sync (only new messages since last sync) */
  const runIncrementalSync = useCallback(async () => {
    const syncStore = useSyncStore.getState();
    const emailStore = useEmailsStore.getState();
    syncStore.startSync();
    try {
      // First ensure existing cached emails are loaded in store
      const cached = getAllCachedEmails();
      if (cached.length > 0) {
        emailStore.setEmails(cached);
      }

      const { newEmails } = await incrementalSync((event) => {
        syncStore.updateProgress(event);
      });

      if (newEmails.length > 0) {
        emailStore.prependEmails(newEmails);
        await processNewEmailNotifications(newEmails, { isBackground: false });
      }

      // Sync master timetable & announcements
      await useAcademicStore.getState().syncRemoteTimetable();

      // Automatically import campus events and lost & found items from emails
      syncEventsFromEmail().catch(() => {});
      syncLostFoundFromEmail().catch(() => {});

      syncStore.finishSync(Date.now());
      hapticSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      syncStore.setError(msg);
    }
  }, []);

  return {
    status,
    phase,
    fetched,
    total,
    lastSyncAt,
    error,
    isSyncing: status === 'syncing',
    loadFromCache,
    runInitialSync,
    runIncrementalSync,
  };
}
