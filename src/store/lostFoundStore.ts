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
  type LostItem,
  type CreateLostItemPayload,
  type UpdateLostItemPayload,
} from '@/services/lostFoundApi';

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
}

export const useLostFoundStore = create<LostFoundState>()((set, get) => ({
  items: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  selectedCategory: 'All',
  activeTab: 'all',
  searchQuery: '',

  loadItems: async () => {
    const { selectedCategory, searchQuery } = get();
    set({ isLoading: true, error: null });
    try {
      const items = await fetchLostItems({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        limit: 50,
      });
      set({ items, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  refresh: async () => {
    invalidateLostFoundCache();
    await get().loadItems();
  },

  postItem: async (payload: CreateLostItemPayload) => {
    set({ isSubmitting: true, error: null });
    try {
      const newItem = await createLostItem(payload);
      set((s) => ({
        items: [newItem, ...s.items],
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
}));
