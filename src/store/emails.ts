/**
 * Emails Zustand store.
 * Holds all parsed emails in memory, supports filter/sort.
 */

import { create } from 'zustand';
import type { Category, CategoryGroup, ParsedEmail, Priority } from '@/types/email';

export type SortOrder = 'date_desc' | 'date_asc' | 'priority';

export interface EmailFilters {
  unreadOnly: boolean;
  importantOnly: boolean;
  hasDeadline: boolean;
  group: CategoryGroup | null;
  category: Category | null;
  priority: Priority | null;
  dateRange: 'today' | 'this_week' | null;
  preferredSendersOnly?: boolean;
  preferredSenderEmails?: string[];
}

const DEFAULT_FILTERS: EmailFilters = {
  unreadOnly: false,
  importantOnly: false,
  hasDeadline: false,
  group: null,
  category: null,
  priority: null,
  dateRange: null,
  preferredSendersOnly: false,
  preferredSenderEmails: [],
};

export interface EmailsStore {
  emails: ParsedEmail[];
  filters: EmailFilters;
  sortOrder: SortOrder;

  setEmails: (emails: ParsedEmail[]) => void;
  prependEmails: (emails: ParsedEmail[]) => void;
  appendEmail: (email: ParsedEmail) => void;
  archiveEmail: (id: string) => ParsedEmail | undefined;
  updateEmailCategory: (id: string, category: Category, group: CategoryGroup) => void;
  setFilters: (patch: Partial<EmailFilters>) => void;
  resetFilters: () => void;
  setSortOrder: (order: SortOrder) => void;
  toggleStarred: (id: string) => void;
  toggleUnread: (id: string) => void;
  getFilteredEmails: () => ParsedEmail[];
}

export const useEmailsStore = create<EmailsStore>()((set, get) => ({
  emails: [],
  filters: DEFAULT_FILTERS,
  sortOrder: 'date_desc',

  setEmails: (emails) => set({ emails }),

  prependEmails: (newEmails) =>
    set((s) => {
      const existingIds = new Set(s.emails.map(e => e.id));
      const deduped = newEmails.filter(e => !existingIds.has(e.id));
      return { emails: [...deduped, ...s.emails] };
    }),

  appendEmail: (email) =>
    set((s) => {
      if (s.emails.some(e => e.id === email.id)) return s;
      return { emails: [...s.emails, email] };
    }),

  archiveEmail: (id) => {
    const email = get().emails.find(e => e.id === id);
    set((s) => ({ emails: s.emails.filter(e => e.id !== id) }));
    return email;
  },

  updateEmailCategory: (id, category, group) =>
    set((s) => ({
      emails: s.emails.map((e) =>
        e.id === id ? { ...e, category, categoryGroup: group } : e,
      ),
    })),

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  resetFilters: () =>
    set({ filters: DEFAULT_FILTERS }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  toggleStarred: (id) =>
    set((s) => ({
      emails: s.emails.map((e) => (e.id === id ? { ...e, isStarred: !e.isStarred } : e)),
    })),

  toggleUnread: (id) =>
    set((s) => ({
      emails: s.emails.map((e) => (e.id === id ? { ...e, isUnread: !e.isUnread } : e)),
    })),

  getFilteredEmails: () => {
    const { emails, filters, sortOrder } = get();
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

    let result = emails.filter(email => {
      if (filters.unreadOnly && !email.isUnread) return false;
      if (filters.importantOnly && !email.isImportant) return false;
      if (filters.hasDeadline && !email.deadline) return false;
      if (filters.group && email.categoryGroup !== filters.group) return false;
      if (filters.category && !email.categories.includes(filters.category)) return false;
      if (filters.priority && email.priority !== filters.priority) return false;
      if (filters.dateRange === 'today' && email.date < startOfToday.getTime()) return false;
      if (filters.dateRange === 'this_week' && email.date < startOfWeek.getTime()) return false;
      if (
        filters.preferredSendersOnly &&
        filters.preferredSenderEmails &&
        filters.preferredSenderEmails.length > 0
      ) {
        const senderEmailLower = email.senderEmail.toLowerCase();
        if (!filters.preferredSenderEmails.some(e => e.toLowerCase() === senderEmailLower)) {
          return false;
        }
      }
      return true;
    });

    if (sortOrder === 'date_desc') {
      result = [...result].sort((a, b) => b.date - a.date);
    } else if (sortOrder === 'date_asc') {
      result = [...result].sort((a, b) => a.date - b.date);
    } else if (sortOrder === 'priority') {
      const ORDER: Record<string, number> = {
        critical: 0, high: 1, medium: 2, low: 3, ignore: 4,
      };
      result = [...result].sort((a, b) => {
        const diff = (ORDER[a.priority] ?? 5) - (ORDER[b.priority] ?? 5);
        return diff !== 0 ? diff : b.date - a.date;
      });
    }

    return result;
  },
}));
