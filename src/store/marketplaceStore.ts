/**
 * Campus Peer-to-Peer Marketplace Store
 *
 * Real database-backed student marketplace for IIITDM Kancheepuram:
 * - Direct peer-to-peer exchange for cycles, mattresses, calculators, lab coats, and books.
 * - Zero dummy / mock data: Completely database-driven from PostgreSQL oryn_marketplace table.
 * - MMKV offline persistence ('oryn-campus-marketplace').
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import {
  fetchMarketplaceItems,
  createMarketplaceItem,
  updateMarketplaceItemStatus,
  deleteMarketplaceItem,
  getCachedMarketplaceItems,
  type MarketplaceItem,
  type MarketplaceCategory,
  type ItemCondition,
  type CreateMarketplaceItemPayload,
} from '@/services/marketplaceApi';

export { MarketplaceItem, MarketplaceCategory, ItemCondition };

const storage = new MMKV({ id: 'oryn-campus-marketplace' });
const STORAGE_KEY = 'marketplace_items_v2';

export const MARKETPLACE_CATEGORIES: { label: MarketplaceCategory; icon: string }[] = [
  { label: 'All', icon: 'apps-outline' },
  { label: 'Cycles', icon: 'bicycle-outline' },
  { label: 'Electronics', icon: 'hardware-chip-outline' },
  { label: 'Books & Notes', icon: 'book-outline' },
  { label: 'Hostel Essentials', icon: 'bed-outline' },
  { label: 'Lab Gear', icon: 'shirt-outline' },
  { label: 'Other', icon: 'pricetag-outline' },
];

function loadSavedItems(): MarketplaceItem[] {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return getCachedMarketplaceItems();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface MarketplaceStore {
  items: MarketplaceItem[];
  isLoading: boolean;
  selectedCategory: MarketplaceCategory;
  searchQuery: string;

  loadItems: () => Promise<void>;
  refresh: () => Promise<void>;
  setSelectedCategory: (cat: MarketplaceCategory) => void;
  setSearchQuery: (query: string) => void;
  addItem: (item: CreateMarketplaceItemPayload) => Promise<MarketplaceItem | null>;
  updateStatus: (id: string, status: 'available' | 'reserved' | 'sold') => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCache: () => void;
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  items: loadSavedItems(),
  isLoading: false,
  selectedCategory: 'All',
  searchQuery: '',

  loadItems: async () => {
    if (get().items.length === 0) {
      set({ isLoading: true });
    }
    try {
      const items = await fetchMarketplaceItems({
        category: get().selectedCategory,
        search: get().searchQuery,
      });
      const finalItems = items.length > 0 ? items : (get().items.length > 0 ? get().items : items);
      set({ items: finalItems, isLoading: false });
      if (items.length > 0 && !get().searchQuery && get().selectedCategory === 'All') {
        storage.set(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    try {
      const items = await fetchMarketplaceItems({
        category: get().selectedCategory,
        search: get().searchQuery,
      });
      if (items.length > 0) {
        set({ items });
        if (!get().searchQuery && get().selectedCategory === 'All') {
          storage.set(STORAGE_KEY, JSON.stringify(items));
        }
      }
    } catch {}
  },

  setSelectedCategory: (selectedCategory) => {
    set({ selectedCategory });
    get().loadItems();
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  addItem: async (itemData) => {
    const created = await createMarketplaceItem(itemData);
    if (created) {
      const next = [created, ...get().items.filter(i => i.id !== created.id)];
      set({ items: next });
      storage.set(STORAGE_KEY, JSON.stringify(next));
      return created;
    }
    return null;
  },

  updateStatus: async (id, status) => {
    // Optimistic update
    const next = get().items.map((i) => (i.id === id ? { ...i, status } : i));
    set({ items: next });
    storage.set(STORAGE_KEY, JSON.stringify(next));
    await updateMarketplaceItemStatus(id, status);
  },

  deleteItem: async (id) => {
    // Optimistic delete
    const next = get().items.filter((i) => i.id !== id);
    set({ items: next });
    storage.set(STORAGE_KEY, JSON.stringify(next));
    await deleteMarketplaceItem(id);
  },

  clearCache: () => {
    storage.delete(STORAGE_KEY);
    set({ items: [] });
  },
}));
