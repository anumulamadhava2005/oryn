/**
 * Today Screen — Intelligently merged Daily Briefing & Academic Calendar dashboard.
 * Provides seamless tab segmenting between "Briefing" (Daily Summary) and "Calendar" (Interactive Timeline).
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import {
  format,
  formatDistanceToNow,
  isPast,
  differenceInHours,
  startOfWeek,
  addDays,
  isSameDay,
  isBefore,
  startOfDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useEmails } from '@/hooks/useEmails';
import { useAuth } from '@/hooks/useAuth';
import { hapticLight } from '@/utils/haptics';
import { CATEGORY_META, GROUP_META } from '@/constants/categories';
import { isOfficialEmail } from '@/classifiers/category';
import { CategoryBadge } from '@/components/ui/Badge';
import { MessMenuCard } from '@/components/today/MessMenuCard';
import { ClassScheduleCard } from '@/components/today/ClassScheduleCard';
import { TimetableModal } from '@/components/academic/TimetableModal';
import { AcademicProfileModal } from '@/components/settings/AcademicProfileModal';
import type { ParsedEmail } from '@/types/email';

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { stats, allEmails } = useEmails();

  const [activeTab, setActiveTab] = useState<'briefing' | 'calendar'>('briefing');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showAcademicModal, setShowAcademicModal] = useState(false);

  const name = user?.givenName ?? user?.name?.split(' ')[0] ?? 'there';
  const todayStr = format(new Date(), 'EEEE, MMMM d');

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const handleEmailPress = useCallback(
    (id: string) => { hapticLight(); router.push(`/(app)/email/${id}`); },
    [router],
  );

  // Official campus emails only for briefing, action items & calendar
  const officialCampusEmails = useMemo(() => {
    return allEmails.filter(e => isOfficialEmail(e.senderEmail) && e.categoryGroup !== 'general');
  }, [allEmails]);

  // Today's deadlines (from official campus emails)
  const todayDeadlines = useMemo(() => {
    const now = new Date();
    return officialCampusEmails
      .filter(e => {
        if (!e.deadline) return false;
        const d = new Date(e.deadline);
        const hoursUntil = differenceInHours(d, now);
        return hoursUntil >= -24 && hoursUntil <= 24;
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [officialCampusEmails]);

  // Today's new official campus emails
  const todayEmails = useMemo(() => {
    const startOfToday = startOfDay(new Date()).getTime();
    return officialCampusEmails.filter(e => e.date >= startOfToday);
  }, [officialCampusEmails]);

  // Category breakdown for today
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of todayEmails) {
      if (e.categoryGroup && e.categoryGroup !== 'general') {
        counts[e.categoryGroup] = (counts[e.categoryGroup] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [todayEmails]);

  // Action items from today's official emails
  const todayActionItems = useMemo(() => {
    const items: Array<{ email: ParsedEmail; action: string }> = [];
    for (const e of todayEmails) {
      for (const action of e.actionItems.slice(0, 2)) {
        items.push({ email: e, action });
      }
    }
    return items.slice(0, 6);
  }, [todayEmails]);

  // Calendar logic: official deadlines only
  const deadlineEmails = useMemo(() => {
    return officialCampusEmails
      .filter(e => e.deadline != null)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [officialCampusEmails]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const selectedDayDeadlines = useMemo(() => {
    return deadlineEmails.filter(e =>
      isSameDay(new Date(e.deadline!), selectedCalendarDate)
    );
  }, [deadlineEmails, selectedCalendarDate]);

  const handlePrevWeek = useCallback(() => {
    hapticLight();
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    hapticLight();
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const hasNoContent = todayDeadlines.length === 0 && todayEmails.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Top Bar with Segmented Control & Analytics Button */}
      <View style={styles.topControlRow}>
        <View style={styles.segmentContainer}>
          <Pressable
            onPress={() => { hapticLight(); setActiveTab('briefing'); }}
            style={[styles.segmentBtn, activeTab === 'briefing' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, activeTab === 'briefing' && styles.segmentTextActive]}>
              Briefing
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { hapticLight(); setActiveTab('calendar'); }}
            style={[styles.segmentBtn, activeTab === 'calendar' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, activeTab === 'calendar' && styles.segmentTextActive]}>
              Calendar
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
          <Pressable
            onPress={() => { hapticLight(); router.push('/(app)/analytics'); }}
            style={styles.analyticsBtn}
          >
            <Ionicons name="stats-chart" size={16} color={Colors.systemBlue} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {activeTab === 'briefing' ? (
          <>
            {/* Greeting Header */}
            <MotiView
              from={{ opacity: 0, translateY: -12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
              style={styles.greetingSection}
            >
              <Text style={styles.dateLabel}>{todayStr.toUpperCase()}</Text>
              <Text style={styles.greeting}>{greeting}, {name}</Text>
              <Text style={styles.summaryLine}>
                {todayEmails.length > 0
                  ? `${todayEmails.length} new email${todayEmails.length !== 1 ? 's' : ''} today`
                  : 'No new emails today'
                }
                {todayDeadlines.length > 0 && ` · ${todayDeadlines.length} deadline${todayDeadlines.length !== 1 ? 's' : ''}`}
              </Text>
            </MotiView>

            {/* Class Schedule Card */}
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
              <ClassScheduleCard
                selectedDate={new Date()}
                onOpenTimetable={() => setShowTimetableModal(true)}
              />
            </MotiView>

            {/* Campus Mess Menu */}
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 100 }}
            >
              <MessMenuCard />
            </MotiView>

            {/* All Clear State */}
            {hasNoContent && (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 400, delay: 200 }}
                style={styles.allClearCard}
              >
                <Text style={styles.allClearEmoji}>🎉</Text>
                <Text style={styles.allClearTitle}>All Clear!</Text>
                <Text style={styles.allClearSubtitle}>No deadlines or urgent emails today. Enjoy your day!</Text>
              </MotiView>
            )}

            {/* Deadlines Section */}
            {todayDeadlines.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 100 }}
              >
                <Text style={styles.sectionTitle}>⏰ DEADLINES</Text>
                <View style={styles.sectionCard}>
                  {todayDeadlines.map((email, idx) => {
                    const deadline = new Date(email.deadline!);
                    const isOverdue = isPast(deadline);
                    const timeLabel = isOverdue
                      ? `Overdue · ${formatDistanceToNow(deadline)} ago`
                      : `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`;

                    return (
                      <Pressable
                        key={email.id}
                        onPress={() => handleEmailPress(email.id)}
                        style={({ pressed }) => [
                          styles.deadlineRow,
                          idx < todayDeadlines.length - 1 && styles.rowBorder,
                          pressed && styles.rowPressed,
                        ]}
                      >
                        <View style={[styles.deadlineIcon, isOverdue && styles.deadlineIconOverdue]}>
                          <Ionicons
                            name={isOverdue ? 'alert-circle' : 'alarm-outline'}
                            size={16}
                            color={isOverdue ? Colors.systemRed : Colors.systemOrange}
                          />
                        </View>
                        <View style={styles.deadlineContent}>
                          <Text style={styles.deadlineSubject} numberOfLines={1}>{email.subject}</Text>
                          <Text style={[styles.deadlineTime, isOverdue && styles.deadlineTimeOverdue]}>
                            {timeLabel}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              </MotiView>
            )}

            {/* Action Items Section */}
            {todayActionItems.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 200 }}
              >
                <Text style={styles.sectionTitle}>✅ ACTION ITEMS</Text>
                <View style={styles.sectionCard}>
                  {todayActionItems.map((item, idx) => (
                    <Pressable
                      key={`${item.email.id}-${idx}`}
                      onPress={() => handleEmailPress(item.email.id)}
                      style={({ pressed }) => [
                        styles.actionRow,
                        idx < todayActionItems.length - 1 && styles.rowBorder,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.actionCheckbox}>
                        <Ionicons name="square-outline" size={18} color={Colors.systemBlue} />
                      </View>
                      <View style={styles.actionContent}>
                        <Text style={styles.actionText} numberOfLines={2}>{item.action}</Text>
                        <Text style={styles.actionSource} numberOfLines={1}>from: {item.email.sender}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </MotiView>
            )}

            {/* Critical / Urgent Emails Section */}
            {stats.criticalAlerts.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 300 }}
              >
                <Text style={styles.sectionTitle}>🚨 REQUIRES ATTENTION</Text>
                <View style={styles.sectionCard}>
                  {stats.criticalAlerts.map((email, idx) => (
                    <Pressable
                      key={email.id}
                      onPress={() => handleEmailPress(email.id)}
                      style={({ pressed }) => [
                        styles.criticalRow,
                        idx < stats.criticalAlerts.length - 1 && styles.rowBorder,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.criticalDot} />
                      <View style={styles.criticalContent}>
                        <Text style={styles.criticalSubject} numberOfLines={1}>{email.subject}</Text>
                        <Text style={styles.criticalSender} numberOfLines={1}>
                          {email.sender} · {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </MotiView>
            )}

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 400 }}
              >
                <Text style={styles.sectionTitle}>📊 TODAY'S BREAKDOWN</Text>
                <View style={styles.breakdownGrid}>
                  {categoryBreakdown.map(([group, count]) => {
                    const meta = GROUP_META[group as keyof typeof GROUP_META];
                    const color = (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemGray;
                    return (
                      <View key={group} style={[styles.breakdownCard, { borderColor: color + '30' }]}>
                        <Text style={[styles.breakdownCount, { color }]}>{count}</Text>
                        <Text style={styles.breakdownLabel} numberOfLines={1}>{meta?.label ?? group}</Text>
                      </View>
                    );
                  })}
                </View>
              </MotiView>
            )}
          </>
        ) : (
          /* Calendar Tab Content */
          <View style={styles.calContainer}>
            {/* Month Nav */}
            <View style={styles.monthRow}>
              <Pressable onPress={handlePrevWeek} hitSlop={12}>
                <Ionicons name="chevron-back" size={20} color={Colors.systemBlue} />
              </Pressable>
              <Text style={styles.monthText}>
                {format(currentWeekStart, 'MMMM yyyy')}
              </Text>
              <Pressable onPress={handleNextWeek} hitSlop={12}>
                <Ionicons name="chevron-forward" size={20} color={Colors.systemBlue} />
              </Pressable>
            </View>

            {/* 7-Day Horizontal Strip */}
            <View style={styles.weekStrip}>
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedCalendarDate);
                const isToday = isSameDay(day, new Date());
                const count = deadlineEmails.filter(e => isSameDay(new Date(e.deadline!), day)).length;

                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => {
                      hapticLight();
                      setSelectedCalendarDate(day);
                    }}
                    style={[
                      styles.dayCard,
                      isSelected && styles.dayCardSelected,
                      isToday && !isSelected && styles.dayCardToday,
                    ]}
                  >
                    <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                      {format(day, 'EEE')}
                    </Text>
                    <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                      {format(day, 'd')}
                    </Text>

                    {count > 0 && (
                      <View style={styles.dotRow}>
                        <View style={[styles.dot, isSelected && styles.dotSelected]} />
                        {count > 1 && <Text style={styles.dotCount}>{count}</Text>}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Selected Date Summary */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleText}>
                {isSameDay(selectedCalendarDate, new Date())
                  ? 'DEADLINES TODAY'
                  : `DEADLINES FOR ${format(selectedCalendarDate, 'MMM d, yyyy').toUpperCase()}`}
              </Text>
              <Text style={styles.countBadge}>{selectedDayDeadlines.length} items</Text>
            </View>

            {selectedDayDeadlines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle-outline" size={36} color={Colors.systemGreen} />
                <Text style={styles.emptyTitle}>No deadlines scheduled</Text>
                <Text style={styles.emptySubtitle}>You are all clear for this date.</Text>
              </View>
            ) : (
              <View style={styles.deadlineList}>
                {selectedDayDeadlines.map((item) => {
                  const isPastItem = isBefore(new Date(item.deadline!), startOfDay(new Date()));
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleEmailPress(item.id)}
                      style={styles.deadlineItemCard}
                    >
                      <View style={styles.itemHeader}>
                        <CategoryBadge category={item.category} />
                        <Text style={[styles.timeText, isPastItem && styles.timeTextPast]}>
                          {format(new Date(item.deadline!), 'h:mm a')}
                        </Text>
                      </View>

                      <Text style={styles.itemSubject} numberOfLines={2}>{item.subject}</Text>
                      <Text style={styles.itemSender}>From: {item.sender}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* All Upcoming Deadlines Timeline */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleText}>ALL UPCOMING DEADLINES</Text>
            </View>

            <View style={styles.allDeadlinesList}>
              {deadlineEmails.map((item) => {
                const dDate = new Date(item.deadline!);
                const isPastItem = isBefore(dDate, startOfDay(new Date()));
                return (
                  <Pressable
                    key={`all-${item.id}`}
                    onPress={() => handleEmailPress(item.id)}
                    style={styles.timelineCard}
                  >
                    <View style={[styles.timelineBar, { backgroundColor: isPastItem ? Colors.systemGray : Colors.systemOrange }]} />
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineMeta}>
                        <Text style={styles.timelineDateText}>
                          {format(dDate, 'EEE, MMM d · h:mm a')}
                        </Text>
                        <CategoryBadge category={item.category} />
                      </View>
                      <Text style={styles.timelineSubject} numberOfLines={1}>{item.subject}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <TimetableModal
        visible={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        onOpenProfileSettings={() => setShowAcademicModal(true)}
      />

      <AcademicProfileModal
        visible={showAcademicModal}
        onClose={() => setShowAcademicModal(false)}
        onOpenTimetable={() => setShowTimetableModal(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.lg,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  segmentBtnActive: {
    backgroundColor: Colors.card,
    ...Shadows.sm,
  },
  segmentText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  analyticsBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[16],
    gap: Spacing[4],
  },
  greetingSection: {
    gap: Spacing[1],
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  greeting: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  summaryLine: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  allClearCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[8],
    alignItems: 'center',
    gap: Spacing[2],
  },
  allClearEmoji: {
    fontSize: 48,
  },
  allClearTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  allClearSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
    marginBottom: Spacing[2],
    paddingLeft: Spacing[1],
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    backgroundColor: Colors.cardHover,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    gap: Spacing[3],
  },
  deadlineIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warningFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadlineIconOverdue: {
    backgroundColor: Colors.errorFaded,
  },
  deadlineContent: {
    flex: 1,
    gap: 2,
  },
  deadlineSubject: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  deadlineTime: {
    fontSize: Typography.size.xs,
    color: Colors.systemOrange,
    fontWeight: Typography.weight.medium,
  },
  deadlineTimeOverdue: {
    color: Colors.systemRed,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing[3],
    gap: Spacing[3],
  },
  actionCheckbox: {
    paddingTop: 2,
  },
  actionContent: {
    flex: 1,
    gap: 2,
  },
  actionText: {
    fontSize: Typography.size.sm,
    color: Colors.text,
    lineHeight: Typography.size.sm * 1.4,
  },
  actionSource: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    gap: Spacing[3],
  },
  criticalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.systemRed,
  },
  criticalContent: {
    flex: 1,
    gap: 2,
  },
  criticalSubject: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  criticalSender: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
    flex: 1,
  },
  breakdownCount: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  breakdownLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  // Calendar View Styles
  calContainer: {
    gap: Spacing[4],
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[1],
  },
  monthText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  dayCardSelected: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  dayCardToday: {
    borderColor: Colors.systemBlue,
  },
  dayName: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  dayNum: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  dayTextSelected: {
    color: '#FFF',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.systemOrange,
  },
  dotSelected: {
    backgroundColor: '#FFF',
  },
  dotCount: {
    fontSize: 9,
    color: Colors.systemOrange,
    fontWeight: Typography.weight.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[1],
  },
  sectionTitleText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  countBadge: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  emptyBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  deadlineList: {
    gap: Spacing[2],
  },
  deadlineItemCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
  timeTextPast: {
    color: Colors.textMuted,
  },
  itemSubject: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  itemSender: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  allDeadlinesList: {
    gap: Spacing[2],
  },
  timelineCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineBar: {
    width: 4,
  },
  timelineContent: {
    flex: 1,
    padding: Spacing[3],
    gap: 4,
  },
  timelineMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDateText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  timelineSubject: {
    fontSize: Typography.size.xs,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
});
