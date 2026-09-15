/**
 * SmartBriefingStrip — Compact Apple-style Priority & Deadline pulse.
 * Uses Gestalt grouping to combine multiple priority alerts into a single,
 * high-density actionable strip instead of bulky stacked cards.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { hapticLight } from '@/utils/haptics';
import type { ParsedEmail } from '@/types/email';

interface PriorityItem {
  id: string;
  type: 'critical' | 'deadline' | 'placement';
  label: string;
  count: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
}

interface Props {
  criticalAlerts?: ParsedEmail[];
  upcomingDeadlines?: ParsedEmail[];
  placementEmails?: ParsedEmail[];
  onSelectCritical?: () => void;
  onSelectDeadlines?: () => void;
  onSelectPlacements?: () => void;
}

export function SmartCard({
  criticalAlerts = [],
  upcomingDeadlines = [],
  placementEmails = [],
  onSelectCritical,
  onSelectDeadlines,
  onSelectPlacements,
}: Props) {
  const items: PriorityItem[] = [];

  if (criticalAlerts.length > 0 && onSelectCritical) {
    items.push({
      id: 'critical',
      type: 'critical',
      label: `${criticalAlerts.length} Urgent`,
      count: criticalAlerts.length,
      icon: 'alert-circle',
      color: Colors.systemRed,
      onPress: onSelectCritical,
    });
  }

  if (upcomingDeadlines.length > 0 && onSelectDeadlines) {
    items.push({
      id: 'deadline',
      type: 'deadline',
      label: `${upcomingDeadlines.length} Due Soon`,
      count: upcomingDeadlines.length,
      icon: 'alarm',
      color: Colors.systemOrange,
      onPress: onSelectDeadlines,
    });
  }

  if (placementEmails.length > 0 && onSelectPlacements) {
    items.push({
      id: 'placement',
      type: 'placement',
      label: `${placementEmails.length} Placement`,
      count: placementEmails.length,
      icon: 'briefcase',
      color: Colors.systemIndigo,
      onPress: onSelectPlacements,
    });
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.strip}>
        <View style={styles.labelGroup}>
          <View style={styles.pulseDot} />
          <Text style={styles.briefingTitle}>FOCUS</Text>
        </View>

        <View style={styles.itemsRow}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                hapticLight();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.itemPill,
                { backgroundColor: item.color + '15', borderColor: item.color + '35' },
                pressed && { opacity: Opacity.pressed },
              ]}
              hitSlop={6}
            >
              <Ionicons name={item.icon} size={12} color={item.color} />
              <Text style={[styles.itemText, { color: item.color }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={10} color={item.color + '90'} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[4],
    paddingVertical: 2,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    gap: Spacing[2],
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemRed,
  },
  briefingTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  itemText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
});
