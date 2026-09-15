/**
 * Badge — priority and category label chips styled after Apple HIG color psychology.
 * Vibrant semantic color tints for high-visibility priority and category differentiation.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius } from '@/constants/theme';
import { CATEGORY_META } from '@/constants/categories';
import type { Category, Priority } from '@/types/email';
import { Ionicons } from '@expo/vector-icons';

import { usePreferencesStore } from '@/store/preferences';

// ── Priority badge config ───────────────────────────────────────────────────

export function getPriorityConfig(priority: Priority, mode: 'vibrant' | 'monochrome' = 'vibrant') {
  if (mode === 'monochrome') {
    switch (priority) {
      case 'critical':
        return { label: 'CRITICAL', bg: '#EFEFEF', border: '#FFFFFF', fg: '#1A1A1A', dot: '#EFEFEF' };
      case 'high':
        return { label: 'HIGH', bg: '#C7C7CC', border: '#E5E5E7', fg: '#1A1A1A', dot: '#C7C7CC' };
      case 'medium':
        return { label: 'MED', bg: 'rgba(154, 154, 158, 0.20)', border: 'rgba(154, 154, 158, 0.40)', fg: '#EFEFEF', dot: '#9A9A9E' };
      case 'low':
        return { label: 'LOW', bg: 'rgba(99, 99, 102, 0.18)', border: 'rgba(99, 99, 102, 0.35)', fg: 'rgba(239, 239, 239, 0.75)', dot: '#636366' };
      case 'ignore':
      default:
        return { label: 'IGN', bg: 'rgba(72, 72, 74, 0.15)', border: 'rgba(72, 72, 74, 0.30)', fg: 'rgba(239, 239, 239, 0.45)', dot: '#48484A' };
    }
  }

  // Vibrant mode (Apple HIG semantic palette)
  switch (priority) {
    case 'critical':
      return { label: 'CRITICAL', bg: Colors.priority.criticalFaded, border: Colors.priority.critical + '40', fg: Colors.priority.critical, dot: Colors.priority.critical };
    case 'high':
      return { label: 'HIGH', bg: Colors.priority.highFaded, border: Colors.priority.high + '40', fg: Colors.priority.high, dot: Colors.priority.high };
    case 'medium':
      return { label: 'MED', bg: Colors.priority.mediumFaded, border: Colors.priority.medium + '40', fg: Colors.priority.medium, dot: Colors.priority.medium };
    case 'low':
      return { label: 'LOW', bg: Colors.priority.lowFaded, border: Colors.priority.low + '40', fg: Colors.priority.low, dot: Colors.priority.low };
    case 'ignore':
    default:
      return { label: 'IGN', bg: Colors.priority.ignoreFaded, border: Colors.priority.ignore + '40', fg: Colors.priority.ignore, dot: Colors.priority.ignore };
  }
}

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const themeMode = usePreferencesStore(s => s.themeMode);
  const cfg = getPriorityConfig(priority, themeMode);
  if (!cfg) return null;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
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
  showIcon?: boolean;
  showEmoji?: boolean;
}

export function CategoryBadge({ category, showIcon = false, showEmoji = false }: CategoryBadgeProps) {
  const themeMode = usePreferencesStore(s => s.themeMode);
  const meta = (category && CATEGORY_META[category]) ? CATEGORY_META[category] : CATEGORY_META.general;
  const isMono = themeMode === 'monochrome';
  const groupColor = (Colors.categoryGroup[meta.group as keyof typeof Colors.categoryGroup] as string) ?? (isMono ? '#D1D1D6' : Colors.systemBlue);

  const badgeBg = isMono ? 'rgba(239, 239, 239, 0.12)' : groupColor + '18';
  const badgeBorder = isMono ? 'rgba(255, 255, 255, 0.15)' : groupColor + '35';
  const textColor = isMono ? '#EFEFEF' : groupColor;

  return (
    <View
      style={[
        styles.badge,
        styles.categoryBadge,
        {
          backgroundColor: badgeBg,
          borderColor: badgeBorder,
        },
      ]}
    >
      {showIcon && meta.icon && (
        <Ionicons name={meta.icon as any} size={10} color={textColor} />
      )}
      <Text style={[styles.badgeText, { color: textColor }]}>
        {showEmoji && meta.emoji ? `${meta.emoji} ${meta.label}` : meta.label}
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
  const themeMode = usePreferencesStore(s => s.themeMode);
  const cfg = getPriorityConfig(priority, themeMode);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: cfg ? cfg.dot : Colors.textMuted,
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
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
