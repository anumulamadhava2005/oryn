/**
 * Analytics Screen — Weekly Academic Digest & Productivity Insights.
 * Visualizes email volumes, category distribution, deadline completion, and time saved.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useEmails } from '@/hooks/useEmails';
import { GROUP_META } from '@/constants/categories';
import { hapticLight } from '@/utils/haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const router = useRouter();
  const { emails, stats } = useEmails();

  const metrics = useMemo(() => {
    const total = emails.length;
    const unread = emails.filter(e => e.isUnread).length;
    const deadlines = emails.filter(e => e.deadline != null).length;
    const placements = emails.filter(e => e.categoryGroup === 'placement').length;
    const academics = emails.filter(e => e.categoryGroup === 'academics').length;

    // Time saved calculation: ~1.5 minutes per email classified/summarized automatically
    const minutesSaved = Math.round(total * 1.5);
    const hoursSaved = (minutesSaved / 60).toFixed(1);

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    emails.forEach(e => {
      if (e.categoryGroup) {
        categoryCounts[e.categoryGroup] = (categoryCounts[e.categoryGroup] || 0) + 1;
      }
    });

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      unread,
      deadlines,
      placements,
      academics,
      hoursSaved,
      topCategories,
    };
  }, [emails]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.systemBlue} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Weekly Digest</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Ionicons name="trending-up-outline" size={24} color={Colors.systemYellow} />
            <Text style={styles.heroTitle}>Productivity Boost</Text>
          </View>
          <Text style={styles.heroBigText}>{metrics.hoursSaved} Hours Saved</Text>
          <Text style={styles.heroSubtitle}>
            Oryn auto-classified {metrics.total} emails & extracted {metrics.deadlines} critical deadlines this week.
          </Text>
        </View>

        {/* 4 KPI Grid */}
        <View style={styles.grid}>
          <View style={styles.kpiCard}>
            <Ionicons name="mail" size={20} color={Colors.systemBlue} />
            <Text style={styles.kpiValue}>{metrics.total}</Text>
            <Text style={styles.kpiLabel}>Total Emails</Text>
          </View>
          <View style={styles.kpiCard}>
            <Ionicons name="alarm" size={20} color={Colors.systemOrange} />
            <Text style={styles.kpiValue}>{metrics.deadlines}</Text>
            <Text style={styles.kpiLabel}>Deadlines</Text>
          </View>

          <View style={styles.kpiCard}>
            <Ionicons name="briefcase" size={20} color={Colors.systemIndigo} />
            <Text style={styles.kpiValue}>{metrics.placements}</Text>
            <Text style={styles.kpiLabel}>Placements</Text>
          </View>

          <View style={styles.kpiCard}>
            <Ionicons name="school" size={20} color={Colors.systemGreen} />
            <Text style={styles.kpiValue}>{metrics.academics}</Text>
            <Text style={styles.kpiLabel}>Academics</Text>
          </View>
        </View>

        {/* Category Breakdown Progress Bars */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>EMAIL CATEGORY BREAKDOWN</Text>

          <View style={styles.categoryList}>
            {metrics.topCategories.map(([group, count]) => {
              const meta = GROUP_META[group as keyof typeof GROUP_META];
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              const color = (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) || Colors.systemBlue;

              return (
                <View key={group} style={styles.catRow}>
                  <View style={styles.catMeta}>
                    <Text style={styles.catName}>{meta?.label || group}</Text>
                    <Text style={styles.catCount}>{count} ({pct}%)</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Insight Highlight Card */}
        <View style={styles.insightCard}>
          <Ionicons name="bulb-outline" size={22} color={Colors.systemYellow} />
          <View style={styles.insightTextWrap}>
            <Text style={styles.insightTitle}>Campus Insight</Text>
            <Text style={styles.insightBody}>
              Placement alerts form {metrics.total > 0 ? Math.round((metrics.placements / metrics.total) * 100) : 0}% of your inbox. Keep deadline notifications enabled!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -Spacing[2],
  },
  backText: {
    fontSize: Typography.size.md,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.medium,
  },
  headerTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  container: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[12],
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.systemYellow + '40',
    gap: Spacing[2],
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemYellow,
    letterSpacing: Typography.tracking.wider,
    textTransform: 'uppercase',
  },
  heroBigText: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  heroSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  kpiCard: {
    width: (SCREEN_WIDTH - Spacing[4] * 2 - Spacing[3]) / 2,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  kpiValue: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  kpiLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  categoryList: {
    gap: Spacing[3],
  },
  catRow: {
    gap: 6,
  },
  catMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catName: {
    fontSize: Typography.size.xs,
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  catCount: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  barBg: {
    height: 8,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardHover,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightTextWrap: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  insightBody: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
