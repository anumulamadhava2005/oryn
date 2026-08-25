/**
 * SyncStatus — Apple HIG styled pill showing last-sync time or live progress with Ionicons.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useSyncStore, type SyncStore } from '@/store/sync';

export function SyncStatus() {
  const status = useSyncStore((s: SyncStore) => s.status);
  const fetched = useSyncStore((s: SyncStore) => s.fetched);
  const total = useSyncStore((s: SyncStore) => s.total);
  const lastSyncAt = useSyncStore((s: SyncStore) => s.lastSyncAt);
  const error = useSyncStore((s: SyncStore) => s.error);

  if (error && status === 'error') {
    return (
      <View style={[styles.pill, styles.errorPill]}>
        <Ionicons name="alert-circle" size={12} color={Colors.systemRed} />
        <Text style={styles.errorText}>Sync failed</Text>
      </View>
    );
  }

  if (status === 'syncing') {
    return (
      <View style={styles.pill}>
        <ActivityIndicator size="small" color={Colors.systemBlue} style={{ transform: [{ scale: 0.7 }] }} />
        <Text style={styles.text}>
          {total > 0 ? `${fetched} / ${total}` : 'Syncing…'}
        </Text>
      </View>
    );
  }

  if (!lastSyncAt) return null;

  const label = formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });

  return (
    <View style={styles.pill}>
      <View style={styles.greenDot} />
      <Text style={styles.text}>Synced {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  errorPill: {
    backgroundColor: Colors.errorFaded,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  text: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.systemGreen,
  },
  errorText: {
    fontSize: Typography.size.xs,
    color: Colors.systemRed,
    fontWeight: Typography.weight.semibold,
  },
});
