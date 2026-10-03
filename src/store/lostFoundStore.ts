/**
 * Lost & Found Zustand store.
 * Manages items list, loading/error state, and CRUD operations
 * with optimistic UI updates.
 */

import { create } from 'zustand';
import {
  fetchLostItems,
  createLostItem,
  updateLostItem,
  markItemFound,
  deleteLostItem,
  invalidateLostFoundCache,
  getCachedLostItems,
  type LostItem,
  type CreateLostItemPayload,
  type UpdateLostItemPayload,
} from '@/services/lostFoundApi';
import {
  importLostFoundFromEmail,
  type EmailImportResult,
} from '@/services/lostFoundEmailImporter';

export type LostFoundCategory =
  | 'All'
  | 'Electronics'
  | 'Documents'
  | 'Clothing'
  | 'Keys'
  | 'Wallet'
  | 'Bag'
  | 'Bottle'
  | 'Other';

export type LostFoundTab = 'all' | 'lost' | 'found' | 'my_posts';

export const CATEGORIES: LostFoundCategory[] = [
  'All',
  'Electronics',
  'Documents',
  'Clothing',
  'Keys',
  'Wallet',
  'Bag',
  'Bottle',
  'Other',
];

interface LostFoundState {
  items: LostItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  selectedCategory: LostFoundCategory;
  activeTab: LostFoundTab;
  searchQuery: string;

  // Email sync state
  isEmailSyncing: boolean;
  lastEmailSyncResult: EmailImportResult | null;

  // Actions
  loadItems: () => Promise<void>;
  refresh: () => Promise<void>;
  postItem: (payload: CreateLostItemPayload) => Promise<LostItem>;
  editItem: (id: string, payload: UpdateLostItemPayload) => Promise<LostItem>;
  markFound: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  setCategory: (category: LostFoundCategory) => void;
  setActiveTab: (tab: LostFoundTab) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
  syncFromEmail: () => Promise<EmailImportResult | null>;
  clearEmailSyncResult: () => void;
}

export const useLostFoundStore = create<LostFoundState>()((set, get) => ({
  items: getCachedLostItems(),
  isLoading: false,
  isSubmitting: false,
  error: null,
  selectedCategory: 'All',
  activeTab: 'all',
  searchQuery: '',
  isEmailSyncing: false,
  lastEmailSyncResult: null,

  loadItems: async () => {
    const { selectedCategory, searchQuery, items } = get();
    // Stale-While-Revalidate: only show spinner if no cached items exist
    if (items.length === 0) {
      set({ isLoading: true, error: null });
    }
    try {
      const fetchedItems = await fetchLostItems({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        limit: 50,
      });
      // Deduplicate fetched items by unique id
      const uniqueItems: LostItem[] = [];
      const seenIds = new Set<string>();
      for (const it of fetchedItems) {
        if (!seenIds.has(it.id)) {
          seenIds.add(it.id);
          uniqueItems.push(it);
        }
      }
      // Preserve existing items if network returns empty due to transient error
      const finalItems = uniqueItems.length > 0 ? uniqueItems : (items.length > 0 ? items : uniqueItems);
      set({ items: finalItems, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  refresh: async () => {
    await get().loadItems();
  },

  postItem: async (payload: CreateLostItemPayload) => {
    set({ isSubmitting: true, error: null });
    try {
      const newItem = await createLostItem(payload);
      set((s) => ({
        items: [newItem, ...s.items.filter((i) => i.id !== newItem.id)],
        isSubmitting: false,
      }));
      return newItem;
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      throw err;
    }
  },

  editItem: async (id: string, payload: UpdateLostItemPayload) => {
    set({ isSubmitting: true, error: null });
    try {
      const updated = await updateLostItem(id, payload);
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, ...updated } : i)),
        isSubmitting: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      throw err;
    }
  },

  markFound: async (id: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await markItemFound(id);
      // Remove from local state (item is deleted on server)
      set((s) => ({
        items: s.items.filter((i) => i.id !== id),
        isSubmitting: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      throw err;
    }
  },

  removeItem: async (id: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await deleteLostItem(id);
      set((s) => ({
        items: s.items.filter((i) => i.id !== id),
        isSubmitting: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      throw err;
    }
  },

  setCategory: (category: LostFoundCategory) => {
    set({ selectedCategory: category });
    // Re-fetch with new filter
    get().loadItems();
  },

  setActiveTab: (tab: LostFoundTab) => {
    set({ activeTab: tab });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearError: () => set({ error: null }),

  syncFromEmail: async () => {
    // Prevent concurrent syncs
    if (get().isEmailSyncing) return null;
    set({ isEmailSyncing: true });
    try {
      const result = await importLostFoundFromEmail(get().items);
      set({ isEmailSyncing: false, lastEmailSyncResult: result });
      // If items were imported, refresh the list to include them
      if (result && result.imported > 0) {
        await get().refresh();
      }
      return result;
    } catch (err) {
      console.warn('[LostFoundStore] Email sync failed:', err);
      set({ isEmailSyncing: false });
      return null;
    }
  },

  clearEmailSyncResult: () => set({ lastEmailSyncResult: null }),
}));
