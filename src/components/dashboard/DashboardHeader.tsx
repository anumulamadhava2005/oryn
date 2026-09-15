/**
 * DashboardHeader — Apple HIG content-first Inbox header with Modal Category Filter.
 * 
 * Features:
 * - Clean title row with unread pill, Category Filter Modal trigger, and Sync action.
 * - Primary Scope Segmented Control (All, Unread, Important, Deadlines).
 * - Active category indicator banner with 1-tap clear.
 * - Sleek Category Filter Modal bottom sheet with group icons, counts, and checkmarks.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { CATEGORY_GROUP_ORDER, GROUP_META } from '@/constants/categories';
import { usePreferencesStore } from '@/store/preferences';
import type { GoogleUser } from '@/types/auth';
import type { ParsedEmail, CategoryGroup } from '@/types/email';

export type StatFilter = 'all' | 'unread' | 'important' | 'deadlines';

interface Props {
  user: GoogleUser | null;
  unreadCount: number;
  starredCount?: number;
  importantCount: number;
  upcomingDeadlines: ParsedEmail[];
  totalCount: number;
  activeStatFilter: StatFilter;
  onSelectStatFilter: (filter: StatFilter) => void;
  onSync: () => void;
  isSyncing: boolean;
  onDeadlinePress?: () => void;
  selectedGroup: CategoryGroup | null;
  onSelectGroup: (group: CategoryGroup | null) => void;
  groupCounts: Record<string, number>;
  isPreferredActive?: boolean;
  preferredSenderCount?: number;
  onTogglePreferredFilter?: () => void;
  onSearchPress?: () => void;
}

const GROUP_ICONS: Record<CategoryGroup, React.ComponentProps<typeof Ionicons>['name']> = {
  academics: 'book-outline',
  placement: 'briefcase-outline',
  mess: 'restaurant-outline',
  hostel: 'home-outline',
  technical: 'code-slash-outline',
  GCR: 'school-outline',
  admin: 'shield-checkmark-outline',
  events: 'calendar-outline',
  important: 'warning-outline',
  general: 'apps-outline',
};

export function DashboardHeader({
  user,
  unreadCount,
  starredCount = 0,
  importantCount,
  upcomingDeadlines,
  totalCount,
  activeStatFilter,
  onSelectStatFilter,
  onSync,
  isSyncing,
  onDeadlinePress,
  selectedGroup,
  onSelectGroup,
  groupCounts = {},
  isPreferredActive = false,
  preferredSenderCount = 0,
  onTogglePreferredFilter,
  onSearchPress,
}: Props) {
  const router = useRouter();
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const themeMode = usePreferencesStore(s => s.themeMode);
  const isMono = themeMode === 'monochrome';

  const selectedMeta = selectedGroup ? GROUP_META[selectedGroup] : null;
  const selectedColor = selectedGroup
    ? ((Colors.categoryGroup[selectedGroup as keyof typeof Colors.categoryGroup] as string) ?? (isMono ? Colors.text : Colors.systemBlue))
    : (isMono ? Colors.text : Colors.systemBlue);

  return (
    <View style={styles.container}>
      {/* ─── Topbar / Title Row ────────────────────────────────────────── */}
      <View style={styles.titleRow}>
        <View style={styles.titleWithCount}>
          <Text style={styles.largeTitle}>Inbox</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadCountBadge, isMono && { backgroundColor: 'rgba(239, 239, 239, 0.15)', borderColor: 'rgba(239, 239, 239, 0.35)' }]}>
              <Text style={[styles.unreadCountText, isMono && { color: Colors.text }]}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          {/* Preferred Senders Toggle */}
          {preferredSenderCount > 0 && onTogglePreferredFilter && (
            <Pressable
              onPress={() => {
                hapticLight();
                onTogglePreferredFilter();
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                isPreferredActive && styles.iconBtnActive,
                pressed && { opacity: Opacity.pressed },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name={isPreferredActive ? 'star' : 'star-outline'}
                size={18}
                color={isPreferredActive ? Colors.systemYellow : Colors.textSecondary}
              />
            </Pressable>
          )}

          {/* Category Filter Modal Trigger */}
          <Pressable
            onPress={() => {
              hapticLight();
              setFilterModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.iconBtn,
              selectedGroup !== null && {
                backgroundColor: selectedColor + '20',
                borderColor: selectedColor + '50',
              },
              pressed && { opacity: Opacity.pressed },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={selectedGroup !== null ? 'funnel' : 'funnel-outline'}
              size={17}
              color={selectedGroup !== null ? selectedColor : Colors.textSecondary}
            />
            {selectedGroup !== null && (
              <View style={[styles.filterActiveDot, { backgroundColor: selectedColor }]} />
            )}
          </Pressable>

          {/* Refresh / Sync Button */}
          <Pressable
            onPress={() => {
              hapticLight();
              onSync();
            }}
            disabled={isSyncing}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: Opacity.pressed },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={isSyncing ? 'sync' : 'refresh-outline'}
              size={18}
              color={isSyncing ? Colors.systemBlue : Colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* ─── Search Bar ────────────────────────────────────────── */}
      <View style={styles.searchBarContainer}>
        <Pressable
          onPress={() => {
            hapticLight();
            if (onSearchPress) {
              onSearchPress();
            } else {
              router.push('/(app)/search');
            }
          }}
          style={({ pressed }) => [
            styles.searchBar,
            pressed && styles.searchBarPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search emails"
        >
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search emails, senders, deadlines...</Text>
        </Pressable>
      </View>

      {/* ─── Scope Segmented Control Bar ───────────────────────────────── */}
      <View style={styles.segmentBar}>
        <ScopeSegment
          label="All"
          count={totalCount}
          isActive={activeStatFilter === 'all'}
          onPress={() => onSelectStatFilter('all')}
        />
        <ScopeSegment
          label="Unread"
          count={unreadCount}
          badgeColor={Colors.systemBlue}
          isActive={activeStatFilter === 'unread'}
          onPress={() => onSelectStatFilter('unread')}
        />
        <ScopeSegment
          label="Important"
          count={importantCount}
          badgeColor={Colors.systemRed}
          isActive={activeStatFilter === 'important'}
          onPress={() => onSelectStatFilter('important')}
        />
        <ScopeSegment
          label="Deadlines"
          count={upcomingDeadlines.length}
          badgeColor={Colors.systemOrange}
          isActive={activeStatFilter === 'deadlines'}
          onPress={() => onSelectStatFilter('deadlines')}
        />
      </View>

      {/* ─── Active Category Indicator Chip (if filtered) ──────────────── */}
      {selectedGroup && selectedMeta && (
        <View style={styles.activeFilterRow}>
          <Pressable
            onPress={() => {
              hapticLight();
              setFilterModalVisible(true);
            }}
            style={[styles.activeFilterPill, { borderColor: selectedColor + '40', backgroundColor: selectedColor + '15' }]}
          >
            <Ionicons
              name={GROUP_ICONS[selectedGroup] ?? 'folder-outline'}
              size={14}
              color={selectedColor}
            />
            <Text style={[styles.activeFilterText, { color: selectedColor }]}>
              {selectedMeta.label}
            </Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                onSelectGroup(null);
              }}
              hitSlop={8}
              style={styles.activeFilterClose}
            >
              <Ionicons name="close-circle" size={16} color={selectedColor} />
            </Pressable>
          </Pressable>
        </View>
      )}

      {/* ─── Category Filter Modal Sheet ───────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {/* Grab Handle */}
            <View style={styles.grabHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Category</Text>
              {selectedGroup !== null && (
                <Pressable
                  onPress={() => {
                    hapticMedium();
                    onSelectGroup(null);
                    setFilterModalVisible(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.modalResetText}>Clear</Text>
                </Pressable>
              )}
            </View>

            {/* Category Groups List */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* All / Reset Option */}
              <Pressable
                onPress={() => {
                  hapticLight();
                  onSelectGroup(null);
                  setFilterModalVisible(false);
                }}
                style={({ pressed }) => [
                  styles.modalItem,
                  selectedGroup === null && styles.modalItemSelected,
                  pressed && { opacity: Opacity.pressed },
                ]}
              >
                <View style={styles.modalItemLeft}>
                  <View style={[styles.modalItemIconWrap, { backgroundColor: Colors.surface }]}>
                    <Ionicons name="apps-outline" size={18} color={Colors.text} />
                  </View>
                  <View>
                    <Text style={styles.modalItemLabel}>All Categories</Text>
                    <Text style={styles.modalItemSub}>{totalCount} total messages</Text>
                  </View>
                </View>
                {selectedGroup === null && (
                  <Ionicons name="checkmark" size={18} color={Colors.systemBlue} />
                )}
              </Pressable>

              {/* Each Category Group */}
              {CATEGORY_GROUP_ORDER.map((group) => {
                const meta = GROUP_META[group];
                const count = groupCounts[group] || 0;
                const isSelected = selectedGroup === group;
                const groupColor =
                  (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemBlue;

                return (
                  <Pressable
                    key={group}
                    onPress={() => {
                      hapticLight();
                      onSelectGroup(isSelected ? null : group);
                      setFilterModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.modalItem,
                      isSelected && [styles.modalItemSelected, { borderColor: groupColor + '40' }],
                      pressed && { opacity: Opacity.pressed },
                    ]}
                  >
                    <View style={styles.modalItemLeft}>
                      <View
                        style={[
                          styles.modalItemIconWrap,
                          { backgroundColor: groupColor + '20' },
                        ]}
                      >
                        <Ionicons
                          name={GROUP_ICONS[group] ?? 'folder-outline'}
                          size={18}
                          color={groupColor}
                        />
                      </View>
                      <View>
                        <Text style={[styles.modalItemLabel, isSelected && { color: groupColor }]}>
                          {meta.label}
                        </Text>
                        <Text style={styles.modalItemSub}>
                          {count} message{count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={groupColor} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Scope Segment Sub-component ───────────────────────────────────────────

function ScopeSegment({
  label,
  count,
  badgeColor,
  isActive,
  onPress,
}: {
  label: string;
  count?: number;
  badgeColor?: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.segmentBtn,
        isActive && styles.segmentBtnActive,
        pressed && { opacity: Opacity.pressed },
      ]}
    >
      <Text
        style={[
          styles.segmentLabel,
          isActive && styles.segmentLabelActive,
        ]}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={[
            styles.segmentBadge,
            badgeColor ? { backgroundColor: badgeColor + '18', borderColor: badgeColor + '35' } : null,
            isActive && { backgroundColor: (badgeColor || Colors.systemBlue) + '35', borderColor: (badgeColor || Colors.systemBlue) + '60' },
          ]}
        >
          <Text
            style={[
              styles.segmentBadgeText,
              badgeColor ? { color: badgeColor } : null,
              isActive && { color: badgeColor || Colors.white },
            ]}
          >
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing[1],
    gap: Spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  largeTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  unreadCountBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.35)',
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnActive: {
    backgroundColor: Colors.systemYellow + '20',
    borderColor: Colors.systemYellow + '50',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* ─── Search Bar ──────────────────────────────────────────────────────── */
  searchBarContainer: {
    paddingHorizontal: Spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    height: 38,
    gap: Spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  searchBarPressed: {
    backgroundColor: Colors.surfaceElevated,
    opacity: Opacity.pressed,
  },
  searchPlaceholder: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.tight,
  },

  /* ─── Scope Segment Bar ─────────────────────────────────────────────────── */
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 3,
    marginHorizontal: Spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: Radius.md,
    gap: 4,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderMuted,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
    letterSpacing: 0.1,
  },
  segmentLabelActive: {
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  segmentBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },

  /* ─── Active Filter Chip ───────────────────────────────────────────────── */
  activeFilterRow: {
    paddingHorizontal: Spacing[4],
    flexDirection: 'row',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  activeFilterText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  activeFilterClose: {
    marginLeft: 2,
  },

  /* ─── Modal Sheet ──────────────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '75%',
    paddingBottom: Spacing[8],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  modalResetText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  modalScroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.lg,
    marginBottom: Spacing[1],
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  modalItemSelected: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.systemBlue,
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  modalItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  modalItemSub: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.regular,
    color: Colors.textMuted,
  },
});
