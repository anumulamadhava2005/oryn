/**
 * SyncProgress — Full-screen animated sync progress overlay.
 * Shows phases: Connecting → Fetching → Analyzing → Done.
 * Renders emails progressively as they arrive.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useSyncStore, type SyncStore } from '@/store/sync';
import { OrynLogo } from '@/components/common/OrynLogo';

const PHASE_META: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  fetching_ids:      { label: 'Connecting to Gmail…',     icon: 'cloud-outline',      color: Colors.systemBlue },
  fetching_messages: { label: 'Fetching your emails…',    icon: 'download-outline',   color: Colors.systemIndigo },
  parsing:           { label: 'Analyzing priorities…',     icon: 'sparkles-outline',   color: Colors.systemPurple },
  done:              { label: 'All done!',                 icon: 'checkmark-circle',   color: Colors.systemGreen },
};

export function SyncProgressScreen() {
  const phase = useSyncStore((s: SyncStore) => s.phase);
  const fetched = useSyncStore((s: SyncStore) => s.fetched);
  const total = useSyncStore((s: SyncStore) => s.total);
  const error = useSyncStore((s: SyncStore) => s.error);
  const status = useSyncStore((s: SyncStore) => s.status);

  const phaseMeta = PHASE_META[phase ?? 'fetching_ids'] ?? PHASE_META.fetching_ids;
  const progress = total > 0 ? Math.round((fetched / total) * 100) : 0;

  const phaseSteps = useMemo(() => [
    { key: 'fetching_ids', label: 'Connect to Gmail' },
    { key: 'fetching_messages', label: 'Download emails' },
    { key: 'parsing', label: 'Classify & extract' },
    { key: 'done', label: 'Ready!' },
  ], []);

  const currentPhaseIndex = phaseSteps.findIndex(s => s.key === phase);

  if (status === 'error' && error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'timing', duration: 400 }}
          >
            <View style={[styles.iconRing, { borderColor: Colors.systemRed + '40' }]}>
              <Ionicons name="alert-circle" size={40} color={Colors.systemRed} />
            </View>
          </MotiView>
          <Text style={styles.title}>Sync Failed</Text>
          <Text style={styles.subtitle}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        {/* Animated Oryn Logo */}
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          key={phase}
        >
          <OrynLogo size={88} borderRadius={44} style={{ borderWidth: 2, borderColor: phaseMeta.color + '60' }} />
        </MotiView>

        {/* Phase label */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          key={`label-${phase}`}
        >
          <Text style={styles.title}>{phaseMeta.label}</Text>
        </MotiView>

        {/* Progress bar */}
        {total > 0 && phase !== 'done' && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <MotiView
                animate={{ width: `${Math.max(progress, 3)}%` as any }}
                transition={{ type: 'timing', duration: 300 }}
                style={[styles.progressFill, { backgroundColor: phaseMeta.color }]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {fetched} of {total} emails
            </Text>
          </View>
        )}

        {/* Step indicator */}
        <View style={styles.stepsContainer}>
          {phaseSteps.map((step, idx) => {
            const isCompleted = idx < currentPhaseIndex;
            const isCurrent = idx === currentPhaseIndex;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={[
                  styles.stepDot,
                  isCompleted && styles.stepDotCompleted,
                  isCurrent && styles.stepDotCurrent,
                ]}>
                  {isCompleted && (
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isCurrent && styles.stepLabelCurrent,
                ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          🔒 All processing happens on your device
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[4],
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: Typography.tracking.tight,
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  progressWrap: {
    width: '100%',
    gap: Spacing[2],
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  stepsContainer: {
    gap: Spacing[3],
    paddingTop: Spacing[4],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.surfaceHigh,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    borderColor: Colors.systemGreen,
    backgroundColor: Colors.systemGreen,
  },
  stepDotCurrent: {
    borderColor: Colors.systemBlue,
    backgroundColor: Colors.systemBlue + '30',
  },
  stepLabel: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  stepLabelCompleted: {
    color: Colors.textSecondary,
  },
  stepLabelCurrent: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  privacyNote: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing[6],
  },
});
