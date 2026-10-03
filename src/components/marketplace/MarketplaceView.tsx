import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import {
  useMarketplaceStore,
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
} from '@/store/marketplaceStore';
import { useAuthStore } from '@/store/auth';
import { MarketplaceItemCard } from './MarketplaceItemCard';
import { PostMarketplaceItemModal } from './PostMarketplaceItemModal';

export function MarketplaceView() {
  const user = useAuthStore((s) => s.user);
  const {
    items,
    isLoading,
    loadItems,
    refresh,
    selectedCategory,
    searchQuery,
    setSelectedCategory,
    setSearchQuery,
    updateStatus,
    deleteItem,
  } = useMarketplaceStore();

  const [isPostModalVisible, setPostModalVisible] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const handleMarkSold = (id: string) => {
    Alert.alert('Mark as Sold?', 'The item will be marked as sold and no longer available for offers.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Sold',
        onPress: () => updateStatus(id, 'sold'),
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Listing?', 'This will permanently remove your listing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteItem(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar & Sell Button Row */}
      <View style={styles.topControlRow}>
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cycles, calculators, books, lab coats..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.postAdBtn}
          onPress={() => {
            hapticMedium();
            setPostModalVisible(true);
          }}
        >
          <Ionicons name="add" size={16} color="#000000" style={{ marginRight: 4 }} />
          <Text style={styles.postAdBtnText}>Sell</Text>
        </Pressable>
      </View>

      {/* Category Pills Strip */}
      <View style={styles.categoriesWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MARKETPLACE_CATEGORIES}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.categoriesScroll}
          renderItem={({ item }) => {
            const isSel = selectedCategory === item.label;
            return (
              <Pressable
                style={[styles.categoryPill, isSel && styles.categoryPillActive]}
                onPress={() => {
                  hapticLight();
                  setSelectedCategory(item.label);
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={13}
                  color={isSel ? '#000000' : Colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.categoryPillText, isSel && styles.categoryPillTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refresh}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="bag-handle-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Listings Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No items matching "${searchQuery}".`
                : 'No items in this category yet. Be the first to list!'}
            </Text>
            <Pressable
              style={styles.emptySellBtn}
              onPress={() => setPostModalVisible(true)}
            >
              <Text style={styles.emptySellBtnText}>+ Post a Listing</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <MarketplaceItemCard
            item={item}
            currentUserId={user?.id}
            onMarkSold={handleMarkSold}
            onDelete={handleDelete}
          />
        )}
      />

      {/* Post Modal */}
      <PostMarketplaceItemModal
        visible={isPostModalVisible}
        onClose={() => setPostModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    gap: 8,
    marginBottom: Spacing[2.5],
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  postAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  postAdBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  categoriesWrap: {
    marginBottom: Spacing[3],
  },
  categoriesScroll: {
    paddingHorizontal: Spacing[4],
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  categoryPillTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: 80,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[8],
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: Spacing[4],
  },
  emptySellBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  emptySellBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
});
