/**
 * CategoryChips — Apple HIG horizontal category filter pills with crisp 16px margins and badge counters.
 */

import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_GROUP_ORDER, GROUP_META } from '@/constants/categories';
import { hapticLight } from '@/utils/haptics';
import type { CategoryGroup } from '@/types/email';

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

interface Props {
  selected: CategoryGroup | null;
  onSelect: (group: CategoryGroup | null) => void;
  counts?: Partial<Record<CategoryGroup, number>>;
}

export function CategoryChips({ selected, onSelect, counts }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* All chip */}
        <Pressable
          onPress={() => { hapticLight(); onSelect(null); }}
          style={({ pressed }) => [
            styles.chip,
            selected === null && styles.chipActive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons
            name="layers-outline"
            size={14}
            color={selected === null ? Colors.systemBlue : Colors.textMuted}
          />
          <Text
            style={[styles.chipLabel, selected === null && styles.chipLabelActive]}
          >
            All
          </Text>
        </Pressable>

        {CATEGORY_GROUP_ORDER.map((group) => {
          const meta = GROUP_META[group];
          const isActive = selected === group;
          const count = counts?.[group];
          const groupColor =
            (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ??
            Colors.systemBlue;
          const iconName = GROUP_ICONS[group] ?? 'folder-outline';

          return (
            <Pressable
              key={group}
              onPress={() => { hapticLight(); onSelect(isActive ? null : group); }}
              style={({ pressed }) => [
                styles.chip,
                isActive && [
                  styles.chipActive,
                  {
                    backgroundColor: groupColor + '20',
                    borderColor: groupColor + '50',
                  },
                ],
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name={iconName}
                size={14}
                color={isActive ? groupColor : Colors.textMuted}
              />
              <Text
                style={[
                  styles.chipLabel,
                  isActive && [styles.chipLabelActive, { color: groupColor }],
                ]}
              >
                {meta.label}
              </Text>
              {count !== undefined && count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: isActive ? groupColor : Colors.cardHover },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      { color: isActive ? Colors.white : Colors.textSecondary },
                    ]}
                  >
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: Spacing[1],
  },
  container: {
    paddingHorizontal: Spacing[4],
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 32,
  },
  chipActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.18)',
    borderColor: 'rgba(0, 122, 255, 0.4)',
  },
  chipLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  chipLabelActive: {
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  countBadge: {
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
  },
});
