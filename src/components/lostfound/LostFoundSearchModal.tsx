/**
 * LostFoundSearchModal — Apple HIG Animated Search Overlay for Lost & Found.
 * Smooth entrance animation, auto-focused search, instant live filtering,
 * and pure monochrome dark styling without vibe-coded blue accents.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { LostItem } from '@/services/lostFoundApi';
import { hapticLight } from '@/utils/haptics';

interface LostFoundSearchModalProps {
  visible: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  items: LostItem[];
  onSelectItem: (item: LostItem) => void;
  onClose: () => void;
}

export function LostFoundSearchModal({
  visible,
  searchQuery,
  onSearchChange,
  items,
  onSelectItem,
  onClose,
}: LostFoundSearchModalProps) {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.trim().toLowerCase();

  const filteredItems = isSearching
    ? items.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const locMatch = item.location_found?.toLowerCase().includes(q);
        const buildingMatch = item.building?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        return titleMatch || descMatch || locMatch || buildingMatch || catMatch;
      })
    : [];

  const recentItems = items.slice(0, 6);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
          style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          {/* Apple Grab Handle */}
          <View style={styles.grabHandle} />

          {/* Navigation & Search Bar Header */}
          <View style={styles.headerRow}>
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={17} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search lost & found items..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={onSearchChange}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => onSearchChange('')}
                  hitSlop={8}
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                hapticLight();
                onClose();
              }}
              hitSlop={6}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Results List */}
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isSearching ? (
              /* Recent / Suggested Items */
              <View>
                <Text style={styles.sectionTitle}>Recent Items</Text>
                <View style={styles.listWrap}>
                  {recentItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.itemRow, pressed && styles.rowPressed]}
                      onPress={() => {
                        hapticLight();
                        onClose();
                        onSelectItem(item);
                      }}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.itemThumb} />
                      ) : (
                        <View style={styles.thumbFallback}>
                          <Ionicons
                            name={item.status === 'found' ? 'checkmark-circle-outline' : 'help-circle-outline'}
                            size={18}
                            color={Colors.textMuted}
                          />
                        </View>
                      )}

                      <View style={styles.itemInfo}>
                        <View style={styles.titleRow}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={[styles.statusTag, item.status === 'found' ? styles.statusTagFound : styles.statusTagLost]}>
                            <Text style={styles.statusTagText}>
                              {item.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.itemMeta} numberOfLines={1}>
                          {item.building || item.location_found || item.category || 'Campus'}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : filteredItems.length > 0 ? (
              /* Search Match Results */
              <View>
                <Text style={styles.sectionTitle}>Results ({filteredItems.length})</Text>
                <View style={styles.listWrap}>
                  {filteredItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.itemRow, pressed && styles.rowPressed]}
                      onPress={() => {
                        hapticLight();
                        onClose();
                        onSelectItem(item);
                      }}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.itemThumb} />
                      ) : (
                        <View style={styles.thumbFallback}>
                          <Ionicons
                            name={item.status === 'found' ? 'checkmark-circle-outline' : 'help-circle-outline'}
                            size={18}
                            color={Colors.textMuted}
                          />
                        </View>
                      )}

                      <View style={styles.itemInfo}>
                        <View style={styles.titleRow}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={[styles.statusTag, item.status === 'found' ? styles.statusTagFound : styles.statusTagLost]}>
                            <Text style={styles.statusTagText}>
                              {item.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.itemMeta} numberOfLines={1}>
                          {item.building ? `${item.building} • ` : ''}{item.location_found || item.category}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              /* No Results State */
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No matching items found</Text>
                <Text style={styles.emptyText}>
                  Try searching for keywords like "AirPods", "Keys", "Hostel", or "Library".
                </Text>
              </View>
            )}
          </ScrollView>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  searchField: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cancelBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  content: {
    padding: Spacing[4],
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing[2.5],
  },
  listWrap: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
  },
  thumbFallback: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    flex: 1,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusTagFound: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  statusTagLost: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
  },
  itemMeta: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  rowPressed: {
    opacity: 0.8,
  },
  emptyWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
