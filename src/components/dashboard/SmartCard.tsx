/**
 * SmartCard v2 — Compact inline alert banner for high-priority items.
 * Thin left accent border, single-line preview. Saves vertical space.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import type { ParsedEmail } from '@/types/email';

interface Props {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  emails: ParsedEmail[];
  accentColor: string;
  onPress: () => void;
}

export function SmartCard({
  title,
  icon,
  emails,
  accentColor,
  onPress,
}: Props) {
  if (emails.length === 0) return null;

  const firstEmail = emails[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        { borderLeftColor: accentColor },
        pressed && { opacity: Opacity.pressed },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}>
        <Ionicons name={icon} size={15} color={accentColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: accentColor + '20' }]}>
            <Text style={[styles.countText, { color: accentColor }]}>
              {emails.length}
            </Text>
          </View>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {firstEmail.subject}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: Spacing[3],
    gap: Spacing[3],
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  title: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
  },
  preview: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
});
