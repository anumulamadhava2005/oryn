/**
 * Gmail REST API client.
 * All calls are authenticated via the token obtained from google.ts.
 * Handles pagination, batching, deduplication, and 401 refresh.
 */

import {
  GMAIL_BASE_URL,
  GMAIL_BATCH_SIZE,
  GMAIL_PAGE_SIZE,
  LABEL,
} from '@/constants/gmail';
import { getValidAccessToken } from '@/auth/google';
import type { RawGmailMessage } from '@/types/email';

// --------------------------------------------------------------------------
// Internal fetch helper
// --------------------------------------------------------------------------

async function gmailFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 1,
): Promise<T> {
  const token = await getValidAccessToken();

  const response = await fetch(`${GMAIL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && retries > 0) {
    // Force a token refresh on the next attempt
    return gmailFetch<T>(path, options, retries - 1);
  }

  if (response.status === 429) {
    // Rate limited — back off 2 s and retry once
    await sleep(2000);
    return gmailFetch<T>(path, options, 0);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new GmailApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --------------------------------------------------------------------------
// Error type
// --------------------------------------------------------------------------

export class GmailApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: string,
  ) {
    super(`Gmail API error ${statusCode}: ${body.slice(0, 200)}`);
    this.name = 'GmailApiError';
  }
}

// --------------------------------------------------------------------------
// API response shapes
// --------------------------------------------------------------------------

interface MessageListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface LabelListResponse {
  labels: Array<{ id: string; name: string; type: string }>;
}

interface ProfileResponse {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

interface HistoryListResponse {
  history?: Array<{
    id: string;
    messages?: Array<{ id: string; threadId: string }>;
    messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
  }>;
  nextPageToken?: string;
  historyId: string;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Fetch the user's Gmail profile (includes latest historyId).
 */
export async function fetchProfile(): Promise<ProfileResponse> {
  return gmailFetch<ProfileResponse>('/users/me/profile');
}

/**
 * List message IDs (no full message content).
 * Returns up to `maxResults` IDs from INBOX, newest first.
 */
export async function listMessageIds(opts: {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  q?: string;
}): Promise<{ ids: string[]; nextPageToken: string | undefined }> {
  const params = new URLSearchParams();
  params.set('maxResults', String(opts.maxResults ?? GMAIL_PAGE_SIZE));
  if (opts.pageToken) params.set('pageToken', opts.pageToken);
  if (opts.q) params.set('q', opts.q);
  for (const id of opts.labelIds ?? [LABEL.INBOX]) {
    params.append('labelIds', id);
  }

  const data = await gmailFetch<MessageListResponse>(
    `/users/me/messages?${params.toString()}`,
  );

  return {
    ids: (data.messages ?? []).map(m => m.id),
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Fetch a single full message.
 */
export async function fetchMessage(id: string): Promise<RawGmailMessage> {
  return gmailFetch<RawGmailMessage>(
    `/users/me/messages/${id}?format=full`,
  );
}

/**
 * Fetch multiple messages in parallel, in batches of GMAIL_BATCH_SIZE.
 * Missing / deleted messages are silently dropped.
 */
export async function fetchMessages(
  ids: string[],
  onProgress?: (fetched: number, total: number) => void,
): Promise<RawGmailMessage[]> {
  const results: RawGmailMessage[] = [];

  for (let i = 0; i < ids.length; i += GMAIL_BATCH_SIZE) {
    const chunk = ids.slice(i, i + GMAIL_BATCH_SIZE);
    const fetched = await Promise.allSettled(chunk.map(id => fetchMessage(id)));

    for (const result of fetched) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    onProgress?.(Math.min(i + GMAIL_BATCH_SIZE, ids.length), ids.length);

    // Small pause between batches to avoid burst rate-limiting
    if (i + GMAIL_BATCH_SIZE < ids.length) {
      await sleep(150);
    }
  }

  return results;
}

/**
 * List all message IDs up to `limit`, paginating automatically.
 */
export async function listAllMessageIds(opts: {
  limit: number;
  labelIds?: string[];
  q?: string;
}): Promise<string[]> {
  const all: string[] = [];
  let pageToken: string | undefined;

  while (all.length < opts.limit) {
    const remaining = opts.limit - all.length;
    const { ids, nextPageToken } = await listMessageIds({
      maxResults: Math.min(remaining, GMAIL_PAGE_SIZE),
      pageToken,
      labelIds: opts.labelIds,
      q: opts.q,
    });

    all.push(...ids);
    pageToken = nextPageToken;

    if (!nextPageToken) break;
    await sleep(100);
  }

  return all.slice(0, opts.limit);
}

/**
 * Fetch label definitions (id → name mapping).
 */
export async function fetchLabels(): Promise<Record<string, string>> {
  const data = await gmailFetch<LabelListResponse>('/users/me/labels');
  return Object.fromEntries(data.labels.map(l => [l.id, l.name]));
}

/**
 * Fetch new message IDs since `startHistoryId` for incremental sync.
 */
export async function fetchHistorySince(
  startHistoryId: string,
): Promise<{ newIds: string[]; latestHistoryId: string }> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: 'messageAdded',
  });

  try {
    const data = await gmailFetch<HistoryListResponse>(
      `/users/me/history?${params.toString()}`,
    );

    const newIds: string[] = [];
    for (const record of data.history ?? []) {
      for (const added of record.messagesAdded ?? []) {
        newIds.push(added.message.id);
      }
    }

    return { newIds: [...new Set(newIds)], latestHistoryId: data.historyId };
  } catch (err) {
    if (err instanceof GmailApiError && err.statusCode === 404) {
      // historyId is too old — caller must do a full re-sync
      throw new HistoryExpiredError();
    }
    throw err;
  }
}

export class HistoryExpiredError extends Error {
  constructor() {
    super('History ID expired — full sync required');
    this.name = 'HistoryExpiredError';
  }
}
