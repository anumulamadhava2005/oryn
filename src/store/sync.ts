/**
 * Sync state Zustand store.
 * Tracks sync phase, progress, and error state.
 */

import { create } from 'zustand';
import type { SyncProgressEvent } from '@/services/sync';

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export interface SyncStore {
  status: SyncStatus;
  phase: SyncProgressEvent['phase'] | null;
  fetched: number;
  total: number;
  lastSyncAt: number | null;
  error: string | null;

  startSync: () => void;
  updateProgress: (event: SyncProgressEvent) => void;
  finishSync: (at: number) => void;
  setError: (error: string) => void;
  setLastSyncAt: (at: number) => void;
}

export const useSyncStore = create<SyncStore>()((set) => ({
  status: 'idle',
  phase: null,
  fetched: 0,
  total: 0,
  lastSyncAt: null,
  error: null,

  startSync: () =>
    set({ status: 'syncing', error: null, fetched: 0, total: 0 }),

  updateProgress: ({ phase, fetched, total }) =>
    set({ phase, fetched, total }),

  finishSync: (at) =>
    set({ status: 'done', phase: 'done', lastSyncAt: at }),

  setError: (error) =>
    set({ status: 'error', error }),

  setLastSyncAt: (at) =>
    set({ lastSyncAt: at }),
}));
