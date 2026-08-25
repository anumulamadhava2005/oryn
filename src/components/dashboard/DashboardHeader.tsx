/**
 * DashboardHeader v2 — Simplified, content-first design.
 * Clean title, inline sync, single unified filter row.
 * No more avatar greeting, logo duplication, or separate stat segments.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { hapticLight } from '@/utils/haptics';
import { CATEGORY_GROUP_ORDER, GROUP_META } from '@/constants/categories';
import type { GoogleUser } from '@/types/auth';
import type { ParsedEmail, CategoryGroup } from '@/types/email';

type StatFilter = 'all' | 'unread' | 'important' | 'deadlines';

interface Props {
  user: GoogleUser | null;
  unreadCount: number;
  importantCount: number;
  upcomingDeadlines: ParsedEmail[];
  totalCount: number;
  activeStatFilter: StatFilter;
  onSelectStatFilter: (filter: StatFilter) => void;
  onSync: () => void;
  isSyncing: boolean;
  onDeadlinePress?: () => void;
  // Category filter
  selectedGroup: CategoryGroup | null;
  onSelectGroup: (group: CategoryGroup | null) => void;
  groupCounts: Record<string, number>;
  // Preferred senders
  isPreferredActive?: boolean;
  preferredSenderCount?: number;
  onTogglePreferredFilter?: () => void;
}

// Group icons
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
}: Props) {
  return (
    <View style={styles.container}>
      {/* ─── Title Row ─────────────────────────────────────────────────── */}
      <View style={styles.titleRow}>
        <Text style={styles.largeTitle}>Inbox</Text>
        <View style={styles.titleActions}>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
          <Pressable
            onPress={() => { hapticLight(); onSync(); }}
            disabled={isSyncing}
            hitSlop={10}
            style={({ pressed }) => [
              styles.syncBtn,
              pressed && { opacity: Opacity.pressed },
            ]}
          >
            <Ionicons
              name={isSyncing ? 'sync' : 'refresh-outline'}
              size={18}
              color={isSyncing ? Colors.systemBlue : Colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* ─── Unified Filter Row ────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {/* Stat filters */}
        <FilterChip
          label="All"
          icon="mail-outline"
          value={totalCount}
          isActive={activeStatFilter === 'all' && selectedGroup === null}
          onPress={() => { onSelectStatFilter('all'); onSelectGroup(null); }}
        />
        <FilterChip
          label="Unread"
          icon="mail-unread-outline"
          value={unreadCount}
          isActive={activeStatFilter === 'unread'}
          onPress={() => onSelectStatFilter('unread')}
          accentColor={Colors.systemBlue}
        />
        {upcomingDeadlines.length > 0 && (
          <FilterChip
            label="Deadlines"
            icon="alarm-outline"
            value={upcomingDeadlines.length}
            isActive={activeStatFilter === 'deadlines'}
            onPress={() => onSelectStatFilter('deadlines')}
            accentColor={Colors.systemOrange}
          />
        )}
        {importantCount > 0 && (
          <FilterChip
            label="Urgent"
            icon="warning-outline"
            value={importantCount}
            isActive={activeStatFilter === 'important'}
            onPress={() => onSelectStatFilter('important')}
            accentColor={Colors.systemRed}
          />
        )}

        {/* Preferred senders */}
        {preferredSenderCount > 0 && onTogglePreferredFilter && (
          <FilterChip
            label="Preferred"
            icon="star"
            isActive={isPreferredActive}
            onPress={() => onTogglePreferredFilter()}
            accentColor={Colors.systemPurple}
          />
        )}

        {/* Divider dot */}
        <View style={styles.filterDivider} />

        {/* Category group chips */}
        {CATEGORY_GROUP_ORDER.map((group) => {
          const count = groupCounts?.[group];
          if (!count || count === 0) return null;
          const meta = GROUP_META[group];
          const groupColor = (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemBlue;
          const iconName = GROUP_ICONS[group] ?? 'folder-outline';

          return (
            <FilterChip
              key={group}
              label={meta.label}
              icon={iconName}
              value={count}
              isActive={selectedGroup === group}
              onPress={() => onSelectGroup(selectedGroup === group ? null : group)}
              accentColor={groupColor}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── FilterChip ─────────────────────────────────────────────────────────────

function FilterChip({
  label,
  icon,
  value,
  isActive,
  onPress,
  accentColor = Colors.systemBlue,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value?: number;
  isActive: boolean;
  onPress: () => void;
  accentColor?: string;
}) {
  return (
    <Pressable
      onPress={() => { hapticLight(); onPress(); }}
      style={({ pressed }) => [
        styles.chip,
        isActive && [
          styles.chipActive,
          {
            backgroundColor: accentColor + '18',
            borderColor: accentColor + '45',
          },
        ],
        pressed && { opacity: Opacity.pressed },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={isActive ? accentColor : Colors.textMuted}
      />
      <Text
        style={[
          styles.chipLabel,
          isActive && { color: accentColor, fontWeight: Typography.weight.semibold },
        ]}
      >
        {label}
      </Text>
      {value !== undefined && value > 0 && (
        <Text
          style={[
            styles.chipCount,
            isActive && { color: accentColor },
          ]}
        >
          {value > 99 ? '99+' : value}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing[2],
    gap: Spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
  },
  largeTitle: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemBlue,
  },
  unreadText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  syncBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Unified filter row
  filterRow: {
    paddingHorizontal: Spacing[4],
    gap: 8,
    alignItems: 'center',
  },
  filterDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textDisabled,
    marginHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    height: 36,
  },
  chipActive: {
    // Dynamic bg/border set inline
  },
  chipLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  chipCount: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    marginLeft: 1,
  },
});
