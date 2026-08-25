/**
 * Badge — priority and category label chips styled after Apple HIG tags.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_META } from '@/constants/categories';
import type { Category, Priority } from '@/types/email';

// ── Priority badge ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; fg: string }> = {
  critical: { label: 'CRITICAL', bg: Colors.priority.criticalFaded, fg: Colors.priority.critical },
  high:     { label: 'HIGH',     bg: Colors.priority.highFaded,     fg: Colors.priority.high },
  medium:   { label: 'MED',      bg: Colors.priority.mediumFaded,   fg: Colors.priority.medium },
  low:      { label: 'LOW',      bg: Colors.priority.lowFaded,      fg: Colors.priority.low },
  ignore:   { label: 'IGN',      bg: Colors.priority.ignoreFaded,   fg: Colors.priority.ignore },
};

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.bg, borderColor: cfg.fg + '40' },
        size === 'md' && styles.badgeMd,
      ]}
    >
      <Text style={[styles.badgeText, { color: cfg.fg }, size === 'md' && styles.badgeTextMd]}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ── Category badge ──────────────────────────────────────────────────────────

interface CategoryBadgeProps {
  category: Category;
  showEmoji?: boolean;
}

export function CategoryBadge({ category, showEmoji = false }: CategoryBadgeProps) {
  const meta = (category && CATEGORY_META[category]) ? CATEGORY_META[category] : CATEGORY_META.general;
  const groupColor = (Colors.categoryGroup[meta.group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemBlue;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: groupColor + '18',
          borderColor: groupColor + '35',
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: groupColor }]}>
        {showEmoji ? `${meta.emoji} ${meta.label}` : meta.label}
      </Text>
    </View>
  );
}

// ── Priority dot ────────────────────────────────────────────────────────────

interface PriorityDotProps {
  priority: Priority;
  size?: number;
}

export function PriorityDot({ priority, size = 7 }: PriorityDotProps) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: cfg.fg,
      }}
    />
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    letterSpacing: Typography.tracking.wider,
    textTransform: 'uppercase',
  },
  badgeTextMd: {
    fontSize: Typography.size.xs,
  },
});
