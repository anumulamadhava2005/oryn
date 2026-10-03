import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { DistrictEvent, DemographicsData } from '@/types/events';

interface AnalyticsViewProps {
  activeEvent: DistrictEvent | null;
  gatePercent: number;
  demographicsData: DemographicsData | null;
  isDemographicsLoading: boolean;
}

export function AnalyticsView({
  activeEvent,
  gatePercent,
  demographicsData,
  isDemographicsLoading,
}: AnalyticsViewProps) {
  if (!activeEvent) {
    return (
      <View style={styles.drillDownWrap}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Event Selected</Text>
          <Text style={styles.emptySubtitle}>Select an event to view turnout demographics.</Text>
        </View>
      </View>
    );
  }

  if (isDemographicsLoading) {
    return (
      <View style={styles.drillDownWrap}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={Colors.text} />
          <Text style={styles.loadingText}>Compiling student demographics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.drillDownWrap}>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{activeEvent.going_count || 0}</Text>
          <Text style={styles.metricLbl}>CONFIRMED RSVPS</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{activeEvent.interested_count || 0}</Text>
          <Text style={styles.metricLbl}>CAMPUS HYPED</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{gatePercent}%</Text>
          <Text style={styles.metricLbl}>ATTENDANCE RATE</Text>
        </View>
      </View>

      {/* Department Distribution */}
      <View style={styles.analyticsSectionCard}>
        <Text style={styles.cardHeader}>Branch / Department Distribution</Text>
        {!demographicsData?.by_department || demographicsData.by_department.length === 0 ? (
          <Text style={styles.emptySubtitle}>No department data collected yet.</Text>
        ) : (
          (() => {
            const totalDept =
              demographicsData.by_department.reduce((acc, b) => acc + Number(b.count || 0), 0) || 1;
            return demographicsData.by_department.map((item, idx) => {
              const count = Number(item.count || 0);
              const percentage = Math.round((count / totalDept) * 100);
              return (
                <View key={idx} style={styles.distRow}>
                  <View style={styles.distLabelRow}>
                    <Text style={styles.distLabel}>{item.label}</Text>
                    <Text style={styles.distCount}>
                      {percentage}% ({count})
                    </Text>
                  </View>
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${percentage}%` }]} />
                  </View>
                </View>
              );
            });
          })()
        )}
      </View>

      {/* Semester Breakdown */}
      <View style={styles.analyticsSectionCard}>
        <Text style={styles.cardHeader}>Year & Semester Breakdown</Text>
        {!demographicsData?.by_semester || demographicsData.by_semester.length === 0 ? (
          <Text style={styles.emptySubtitle}>No semester data collected yet.</Text>
        ) : (
          (() => {
            const totalSem =
              demographicsData.by_semester.reduce((acc, b) => acc + Number(b.count || 0), 0) || 1;
            return demographicsData.by_semester.map((item, idx) => {
              const count = Number(item.count || 0);
              const percentage = Math.round((count / totalSem) * 100);
              return (
                <View key={idx} style={styles.distRow}>
                  <View style={styles.distLabelRow}>
                    <Text style={styles.distLabel}>{item.label}</Text>
                    <Text style={styles.distCount}>
                      {percentage}% ({count})
                    </Text>
                  </View>
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${percentage}%` }]} />
                  </View>
                </View>
              );
            });
          })()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drillDownWrap: {
    gap: Spacing[4],
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  analyticsSectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: Spacing[3],
  },
  distRow: {
    marginBottom: Spacing[2.5],
  },
  distLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  distCount: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  distTrack: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    backgroundColor: Colors.text,
    borderRadius: 3,
  },
});
