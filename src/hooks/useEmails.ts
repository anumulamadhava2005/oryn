/**
 * useEmails hook.
 * Exposes filtered / sorted emails from the store plus convenience selectors.
 */

import { useMemo } from 'react';
import { useEmailsStore } from '@/store/emails';
import type { ParsedEmail, Priority, CategoryGroup } from '@/types/email';
import { isAfter, startOfDay, endOfDay } from 'date-fns';
import { isOfficialEmail } from '@/classifiers/category';

export interface FrequentSenderInfo {
  email: string;
  name: string;
  count: number;
  isOfficial: boolean;
  latestDate: number;
}

export function useEmails() {
  const store = useEmailsStore();
  const filtered = store.getFilteredEmails();

  const frequentSenders = useMemo(() => {
    const map = new Map<string, FrequentSenderInfo>();
    for (const e of store.emails) {
      if (!e.senderEmail) continue;
      const lowerEmail = e.senderEmail.toLowerCase();
      const existing = map.get(lowerEmail);
      if (existing) {
        existing.count += 1;
        if (e.date > existing.latestDate) {
          existing.latestDate = e.date;
          if (e.sender && e.sender !== e.senderEmail) {
            existing.name = e.sender;
          }
        }
      } else {
        map.set(lowerEmail, {
          email: lowerEmail,
          name: e.sender || e.senderEmail,
          count: 1,
          isOfficial: isOfficialEmail(e.senderEmail),
          latestDate: e.date,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.latestDate - a.latestDate;
    });
  }, [store.emails]);

  const stats = useMemo(() => {
    const all = store.emails;
    const unreadCount = all.filter(e => e.isUnread).length;
    const importantCount = all.filter(e => e.isImportant || e.priority === 'critical' || e.priority === 'high').length;

    const today = new Date();
    const todayStart = startOfDay(today).getTime();
    const todayEnd = endOfDay(today).getTime();
    const upcomingDeadlines = all
      .filter(e => {
        if (!e.deadline) return false;
        const d = new Date(e.deadline).getTime();
        return d >= Date.now() && d <= todayEnd + 7 * 86_400_000;
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 10);

    const criticalAlerts = all
      .filter(e => e.priority === 'critical')
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);

    const placementEmails = all
      .filter(e => e.categoryGroup === 'placement')
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);

    const assignments = all
      .filter(e => e.category === 'assignment' || e.category === 'quiz' || e.category === 'exam')
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);

    const todayEmails = all.filter(e => e.date >= todayStart && e.date <= todayEnd);

    return {
      totalCount: all.length,
      unreadCount,
      importantCount,
      upcomingDeadlines,
      criticalAlerts,
      placementEmails,
      assignments,
      todayEmails,
    };
  }, [store.emails]);

  return {
    emails: filtered,
    allEmails: store.emails,
    frequentSenders,
    filters: store.filters,
    sortOrder: store.sortOrder,
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,
    setSortOrder: store.setSortOrder,
    toggleStarred: store.toggleStarred,
    toggleUnread: store.toggleUnread,
    stats,
    getEmailById: (id: string) => store.emails.find(e => e.id === id) ?? null,
  };
}
