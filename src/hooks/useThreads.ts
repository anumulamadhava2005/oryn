/**
 * useThreads hook — groups emails by threadId for conversation view.
 */

import { useMemo } from 'react';
import { useEmailsStore } from '@/store/emails';
import type { ParsedEmail } from '@/types/email';

export interface Thread {
  threadId: string;
  /** All emails in the thread, oldest first */
  messages: ParsedEmail[];
  /** The latest (most recent) message */
  latest: ParsedEmail;
  /** Total message count */
  count: number;
  /** Any unread messages? */
  hasUnread: boolean;
  /** Any starred messages? */
  hasStarred: boolean;
  /** Category from the latest message */
  category: string;
  categoryGroup: string;
}

export function useThreads() {
  const emails = useEmailsStore(s => s.emails);

  const threads = useMemo(() => {
    const map = new Map<string, ParsedEmail[]>();

    for (const email of emails) {
      const tid = email.threadId || email.id;
      const existing = map.get(tid);
      if (existing) {
        existing.push(email);
      } else {
        map.set(tid, [email]);
      }
    }

    const result: Thread[] = [];
    for (const [threadId, messages] of map) {
      // Sort messages chronologically (oldest first)
      messages.sort((a, b) => a.date - b.date);
      const latest = messages[messages.length - 1];
      result.push({
        threadId,
        messages,
        latest,
        count: messages.length,
        hasUnread: messages.some(m => m.isUnread),
        hasStarred: messages.some(m => m.isStarred),
        category: latest.category,
        categoryGroup: latest.categoryGroup,
      });
    }

    // Sort threads by latest message date (newest first)
    result.sort((a, b) => b.latest.date - a.latest.date);
    return result;
  }, [emails]);

  const multiMessageThreads = useMemo(
    () => threads.filter(t => t.count > 1),
    [threads],
  );

  return {
    threads,
    multiMessageThreads,
    threadCount: threads.length,
  };
}
