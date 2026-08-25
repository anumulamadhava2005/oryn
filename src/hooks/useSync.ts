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

export function useSync() {
  const emailStore = useEmailsStore();
  const syncStore = useSyncStore();

  /** Load cached emails immediately from MMKV (instant, no network) */
  const loadFromCache = useCallback(() => {
    const cached = getAllCachedEmails();
    if (cached.length > 0) {
      emailStore.setEmails(cached);
    }
    const lastAt = getLastSyncAt();
    if (lastAt) syncStore.setLastSyncAt(lastAt);
  }, [emailStore, syncStore]);

  /** Run the first-ever or forced full sync — streams emails as parsed */
  const runInitialSync = useCallback(async () => {
    syncStore.startSync();
    try {
      await setupNotificationChannel();
      const { emails } = await initialSync(
        (event) => {
          syncStore.updateProgress(event);
        },
        // Stream each parsed email to the store immediately
        (email) => {
          emailStore.appendEmail(email);
        },
      );
      // Load all cached emails (merged & deduplicated) into store
      const allCached = getAllCachedEmails();
      emailStore.setEmails(allCached.length > 0 ? allCached : emails);
      await processNewEmailNotifications(emails, { isBackground: false });
      syncStore.finishSync(Date.now());
      hapticSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      syncStore.setError(msg);
    }
  }, [emailStore, syncStore]);

  /** Run incremental sync (only new messages since last sync) */
  const runIncrementalSync = useCallback(async () => {
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

      syncStore.finishSync(Date.now());
      hapticSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      syncStore.setError(msg);
    }
  }, [emailStore, syncStore]);

  return {
    status: syncStore.status,
    phase: syncStore.phase,
    fetched: syncStore.fetched,
    total: syncStore.total,
    lastSyncAt: syncStore.lastSyncAt,
    error: syncStore.error,
    isSyncing: syncStore.status === 'syncing',
    loadFromCache,
    runInitialSync,
    runIncrementalSync,
  };
}
