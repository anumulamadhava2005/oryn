/**
 * SkeletonLoader — Apple HIG shimmer placeholder for loading states.
 * Uses Moti for smooth pulse animation.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = Radius.sm, style }: SkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.25 }}
      animate={{ opacity: 0.5 }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
      }}
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceHigh,
        },
        style,
      ]}
    />
  );
}

/** Skeleton for a single EmailCard */
export function EmailCardSkeleton() {
  return (
    <View style={styles.emailCard}>
      <View style={styles.emailCardLeft}>
        <SkeletonBox width={10} height={10} borderRadius={5} />
      </View>
      <View style={styles.emailCardContent}>
        <View style={styles.emailCardTopRow}>
          <SkeletonBox width={120} height={14} />
          <SkeletonBox width={50} height={12} />
        </View>
        <SkeletonBox width="90%" height={14} style={{ marginTop: 6 }} />
        <SkeletonBox width="70%" height={12} style={{ marginTop: 4 }} />
        <View style={styles.emailCardBottomRow}>
          <SkeletonBox width={60} height={18} borderRadius={Radius.full} />
          <SkeletonBox width={80} height={18} borderRadius={Radius.full} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton for the SmartCard highlight widget */
export function SmartCardSkeleton() {
  return (
    <View style={styles.smartCard}>
      <View style={styles.smartCardHeader}>
        <SkeletonBox width={24} height={24} borderRadius={Radius.sm} />
        <SkeletonBox width={100} height={14} />
      </View>
      <SkeletonBox width="80%" height={12} style={{ marginTop: 8 }} />
      <SkeletonBox width="60%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

/** Skeleton for the CategoryChips bar */
export function CategoryChipsSkeleton() {
  return (
    <View style={styles.chipsRow}>
      {[80, 70, 90, 60, 75].map((w, i) => (
        <SkeletonBox key={i} width={w} height={32} borderRadius={Radius.full} />
      ))}
    </View>
  );
}

/** Full inbox skeleton — header + 6 email card placeholders */
export function InboxSkeleton() {
  return (
    <View style={styles.inboxSkeleton}>
      {/* Stats bar skeleton */}
      <View style={styles.statsRow}>
        {[1, 2, 3, 4].map((_, i) => (
          <SkeletonBox key={i} width={70} height={28} borderRadius={Radius.full} />
        ))}
      </View>

      {/* Smart cards skeleton */}
      <View style={styles.smartCardsRow}>
        <SmartCardSkeleton />
        <SmartCardSkeleton />
      </View>

      {/* Category chips skeleton */}
      <CategoryChipsSkeleton />

      {/* Email list skeleton */}
      {[1, 2, 3, 4, 5, 6].map((_, i) => (
        <EmailCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emailCard: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  emailCardLeft: {
    paddingTop: 4,
  },
  emailCardContent: {
    flex: 1,
    gap: 2,
  },
  emailCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailCardBottomRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: 8,
  },
  smartCard: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  smartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
  },
  inboxSkeleton: {
    gap: Spacing[4],
    paddingTop: Spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    justifyContent: 'space-between',
  },
  smartCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
});
