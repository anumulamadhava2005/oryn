/**
 * Email cache service backed by react-native-mmkv.
 * Stores parsed emails keyed by message ID.
 * Supports incremental writes, batch reads, and cache invalidation.
 */

import { MMKV } from 'react-native-mmkv';
import type { CachedEmail, ParsedEmail } from '@/types/email';

const storage = new MMKV({ id: 'oryn-email-cache' });

// Meta keys
const HISTORY_ID_KEY = 'sync:historyId';
const EMAIL_INDEX_KEY = 'sync:emailIndex'; // JSON array of IDs
const LAST_SYNC_KEY = 'sync:lastSyncAt';

// --------------------------------------------------------------------------
// Index management (keeps ordered list of IDs)
// --------------------------------------------------------------------------

function readIndex(): string[] {
  const raw = storage.getString(EMAIL_INDEX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
}

function writeIndex(ids: string[]): void {
  storage.set(EMAIL_INDEX_KEY, JSON.stringify(ids));
}

// --------------------------------------------------------------------------
// Public cache API
// --------------------------------------------------------------------------

/** Persist a single parsed email */
export function cacheEmail(email: CachedEmail): void {
  storage.set(`email:${email.parsed.id}`, JSON.stringify(email));
}

/** Persist many emails at once */
export function cacheEmails(emails: CachedEmail[]): void {
  if (emails.length === 0) return;

  const existingIds = new Set(readIndex());
  const newIds: string[] = [];

  for (const email of emails) {
    storage.set(`email:${email.parsed.id}`, JSON.stringify(email));
    if (!existingIds.has(email.parsed.id)) {
      newIds.push(email.parsed.id);
    }
  }

  if (newIds.length > 0) {
    // Prepend new IDs (newest first)
    const merged = [...newIds, ...readIndex()];
    writeIndex(merged);
  }
}

/** Retrieve a single cached email by ID */
export function getCachedEmail(id: string): CachedEmail | null {
  const raw = storage.getString(`email:${id}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as CachedEmail; }
  catch { return null; }
}

/** Retrieve all cached parsed emails, ordered newest-first */
export function getAllCachedEmails(): ParsedEmail[] {
  const ids = readIndex();
  const results: ParsedEmail[] = [];
  for (const id of ids) {
    const cached = getCachedEmail(id);
    if (cached) results.push(cached.parsed);
  }
  return results;
}

/** Get only the cached IDs — avoids deserialising all messages */
export function getCachedEmailIds(): string[] {
  return readIndex();
}

/** Check if an email is cached and whether its hash is still valid */
export function isEmailCached(id: string, newHash: string): boolean {
  const cached = getCachedEmail(id);
  return cached !== null && cached.parsed.cacheHash === newHash;
}

/** Delete a single email from cache */
export function deleteCachedEmail(id: string): void {
  storage.delete(`email:${id}`);
  const idx = readIndex().filter(i => i !== id);
  writeIndex(idx);
}

/** Clear all cached emails but preserve sync state */
export function clearEmailCache(): void {
  const ids = readIndex();
  for (const id of ids) {
    storage.delete(`email:${id}`);
  }
  writeIndex([]);
}

/** Full reset including sync state */
export function clearAllCache(): void {
  storage.clearAll();
}

// --------------------------------------------------------------------------
// Sync state
// --------------------------------------------------------------------------

export function getStoredHistoryId(): string | null {
  return storage.getString(HISTORY_ID_KEY) ?? null;
}

export function setStoredHistoryId(historyId: string): void {
  storage.set(HISTORY_ID_KEY, historyId);
}

export function getLastSyncAt(): number | null {
  const v = storage.getNumber(LAST_SYNC_KEY);
  return v ?? null;
}

export function setLastSyncAt(ts: number): void {
  storage.set(LAST_SYNC_KEY, ts);
}

export function getCachedCount(): number {
  return readIndex().length;
}
