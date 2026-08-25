/**
 * Gmail sync service.
 * Orchestrates initial sync and incremental sync.
 * All heavy lifting runs in JS but batched to avoid blocking the UI thread.
 */

import {
  fetchProfile,
  fetchLabels,
  listAllMessageIds,
  fetchMessages,
  fetchHistorySince,
  HistoryExpiredError,
} from '@/api/gmail';
import {
  parseHeaders,
  parseEmailBody,
  computeCacheHash,
} from '@/parsers/email';
import { classifyAndEnrich } from '@/classifiers';
import {
  cacheEmails,
  getCachedEmailIds,
  getStoredHistoryId,
  setStoredHistoryId,
  setLastSyncAt,
  isEmailCached,
} from './cache';
import { GMAIL_INITIAL_SYNC_LIMIT } from '@/constants/gmail';
import type { CachedEmail, ParsedEmail, RawGmailMessage } from '@/types/email';

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

function buildParsedEmail(
  raw: RawGmailMessage,
  labelMap: Record<string, string>,
): ParsedEmail {
  const headers = parseHeaders(raw);
  const { body, htmlBody, extractedLinks, attachments } = parseEmailBody(raw);

  const labelNames = (raw.labelIds ?? []).map(id => labelMap[id] ?? id);
  const isUnread = (raw.labelIds ?? []).includes('UNREAD');
  const isStarred = (raw.labelIds ?? []).includes('STARRED');
  const isImportant = (raw.labelIds ?? []).includes('IMPORTANT');

  const classification = classifyAndEnrich({
    subject: headers.subject,
    body,
    senderEmail: headers.senderEmail,
    labelIds: raw.labelIds ?? [],
    emailDate: headers.date,
  });

  const cacheHash = computeCacheHash(raw);

  return {
    id: raw.id,
    threadId: raw.threadId,
    sender: headers.sender,
    senderEmail: headers.senderEmail,
    recipients: headers.recipients,
    cc: headers.cc,
    subject: headers.subject,
    snippet: raw.snippet ?? '',
    body,
    htmlBody,
    date: headers.date,
    labels: raw.labelIds ?? [],
    labelNames,
    isUnread,
    isStarred,
    isImportant,
    attachments,
    extractedLinks,
    ...classification,
    cachedAt: Date.now(),
    cacheHash,
  };
}

async function processAndCacheMessages(
  raws: RawGmailMessage[],
  labelMap: Record<string, string>,
  onProgress?: (done: number, total: number) => void,
  onEmailParsed?: (email: ParsedEmail) => void,
): Promise<ParsedEmail[]> {
  const parsed: ParsedEmail[] = [];
  const toCache: CachedEmail[] = [];

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i];
    try {
      const email = buildParsedEmail(raw, labelMap);
      parsed.push(email);
      toCache.push({ raw, parsed: email, syncedAt: Date.now() });
      // Stream this email to UI immediately
      onEmailParsed?.(email);
    } catch {
      // Silently skip malformed messages
    }
    onProgress?.(i + 1, raws.length);

    // Yield to the JS event loop every 20 messages
    if (i % 20 === 19) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  cacheEmails(toCache);
  return parsed;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export type SyncProgressEvent = {
  phase: 'fetching_ids' | 'fetching_messages' | 'parsing' | 'done';
  fetched: number;
  total: number;
};

export type SyncProgressCallback = (event: SyncProgressEvent) => void;

/**
 * Initial full sync: download up to GMAIL_INITIAL_SYNC_LIMIT messages
 * and parse/cache them all. Streams parsed emails via onEmailParsed.
 */
export async function initialSync(
  onProgress?: SyncProgressCallback,
  onEmailParsed?: (email: ParsedEmail) => void,
): Promise<{ emails: ParsedEmail[]; historyId: string }> {
  onProgress?.({ phase: 'fetching_ids', fetched: 0, total: 0 });

  const [ids, labelMap, profile] = await Promise.all([
    listAllMessageIds({ limit: GMAIL_INITIAL_SYNC_LIMIT }),
    fetchLabels(),
    fetchProfile(),
  ]);

  const cachedIds = new Set(getCachedEmailIds());
  const toFetch = ids.filter(id => !cachedIds.has(id));

  onProgress?.({ phase: 'fetching_messages', fetched: 0, total: toFetch.length });

  const raws = await fetchMessages(toFetch, (fetched, total) => {
    onProgress?.({ phase: 'fetching_messages', fetched, total });
  });

  onProgress?.({ phase: 'parsing', fetched: 0, total: raws.length });

  const emails = await processAndCacheMessages(
    raws,
    labelMap,
    (done, total) => {
      onProgress?.({ phase: 'parsing', fetched: done, total });
    },
    onEmailParsed,
  );

  setStoredHistoryId(profile.historyId);
  setLastSyncAt(Date.now());

  onProgress?.({ phase: 'done', fetched: emails.length, total: emails.length });
  return { emails, historyId: profile.historyId };
}

/**
 * Incremental sync: fetch only messages added since last sync.
 * Falls back to full sync if history ID has expired.
 */
export async function incrementalSync(
  onProgress?: SyncProgressCallback,
): Promise<{ newEmails: ParsedEmail[]; didFallback: boolean }> {
  const historyId = getStoredHistoryId();
  if (!historyId) {
    // No prior sync — run full sync
    const { emails } = await initialSync(onProgress);
    return { newEmails: emails, didFallback: true };
  }

  try {
    const { newIds, latestHistoryId } = await fetchHistorySince(historyId);

    if (newIds.length === 0) {
      setStoredHistoryId(latestHistoryId);
      setLastSyncAt(Date.now());
      return { newEmails: [], didFallback: false };
    }

    onProgress?.({ phase: 'fetching_messages', fetched: 0, total: newIds.length });
    const [raws, labelMap] = await Promise.all([
      fetchMessages(newIds, (f, t) =>
        onProgress?.({ phase: 'fetching_messages', fetched: f, total: t }),
      ),
      fetchLabels(),
    ]);

    onProgress?.({ phase: 'parsing', fetched: 0, total: raws.length });
    const emails = await processAndCacheMessages(raws, labelMap, (done, total) => {
      onProgress?.({ phase: 'parsing', fetched: done, total });
    });

    setStoredHistoryId(latestHistoryId);
    setLastSyncAt(Date.now());

    onProgress?.({ phase: 'done', fetched: emails.length, total: emails.length });
    return { newEmails: emails, didFallback: false };
  } catch (err) {
    if (err instanceof HistoryExpiredError) {
      const { emails } = await initialSync(onProgress);
      return { newEmails: emails, didFallback: true };
    }
    throw err;
  }
}
