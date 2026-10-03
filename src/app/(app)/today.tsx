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
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { isOfficialEmail } from '@/classifiers/category';
import { CategoryBadge } from '@/components/ui/Badge';
import { MessMenuCard } from '@/components/today/MessMenuCard';
import { ClassScheduleCard } from '@/components/today/ClassScheduleCard';
import { TriageFeed } from '@/components/today/TriageFeed';
import { getPersonalizedGreetingName } from '@/utils/userHelpers';
import { deduplicateActionItems } from '@/utils/actionItemDeduplicator';
import { TimetableModal } from '@/components/academic/TimetableModal';
import { AcademicProfileModal } from '@/components/settings/AcademicProfileModal';
import { AttendanceModal } from '@/components/academic/AttendanceModal';
import { RoomLocatorModal } from '@/components/academic/RoomLocatorModal';
import { useResponsive } from '@/hooks/useResponsive';
import type { ParsedEmail } from '@/types/email';

export default function TodayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isTablet } = useResponsive();
  const { user } = useAuth();
  const { stats, allEmails } = useEmails();

  const [activeTab, setActiveTab] = useState<'briefing' | 'calendar'>(
    params.tab === 'calendar' ? 'calendar' : 'briefing'
  );

  React.useEffect(() => {
    if (params.tab === 'calendar' || params.tab === 'briefing') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);
  const [selectedBriefingDate, setSelectedBriefingDate] = useState<Date>(new Date());
  const [isWeekExpanded, setIsWeekExpanded] = useState(false);

  const threeDays = useMemo(() => {
    const today = new Date();
    return [today, addDays(today, 1), addDays(today, 2)];
  }, []);

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showRoomLocator, setShowRoomLocator] = useState(false);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);

  const name = useMemo(() => getPersonalizedGreetingName(user), [user]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const handleEmailPress = useCallback(
    (id: string) => { hapticLight(); router.push(`/(app)/email/${id}?from=today` as any); },
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

  // Action items from today's official emails
  const todayActionItems = useMemo(() => {
    const items: Array<{ email: ParsedEmail; action: string }> = [];
    for (const e of todayEmails) {
      for (const action of e.actionItems.slice(0, 2)) {
        items.push({ email: e, action });
      }
    }
    return items.slice(0, 10);
  }, [todayEmails]);

  // Deduplicated action items
  const dedupedActionItems = useMemo(() => {
    return deduplicateActionItems(todayActionItems);
  }, [todayActionItems]);

  // Urgent vs upcoming deadlines
  const overdueDeadlines = useMemo(() => {
    return todayDeadlines.filter(e => isPast(new Date(e.deadline!)));
  }, [todayDeadlines]);

  const dueTodayDeadlines = useMemo(() => {
    return todayDeadlines.filter(e => !isPast(new Date(e.deadline!)));
  }, [todayDeadlines]);

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
      {/* Top Bar with Segmented Control */}
      <View style={[styles.topControlRow, isTablet && { maxWidth: 760, width: '100%', alignSelf: 'center' }]}>
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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isTablet && { maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 120 },
        ]}
      >
        {activeTab === 'briefing' ? (
          <>
            {/* ─── Hero Summary Area with Breathing Room (Pillars 1 & 5) ─── */}
            <MotiView
              from={{ opacity: 0, translateY: -8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400 }}
              style={styles.heroCard}
            >
              <View style={styles.heroHeader}>
                <Text style={styles.heroDate}>{format(new Date(), 'EEEE, MMMM d').toUpperCase()}</Text>
                <Text style={styles.heroGreeting}>{greeting}, {name}</Text>
              </View>

              {/* 3-Tier Semantic Status Pills */}
              <View style={styles.heroStatusRow}>
                {/* 1. Urgent / Overdue or Due Today (Red) */}
                {(overdueDeadlines.length > 0 || dueTodayDeadlines.length > 0) && (
                  <View style={styles.heroPillUrgent}>
                    <Ionicons name="alert-circle" size={13} color="#EF4444" />
                    <Text style={styles.heroPillTextUrgent}>
                      {overdueDeadlines.length + dueTodayDeadlines.length}{' '}
                      {overdueDeadlines.length + dueTodayDeadlines.length === 1 ? 'deadline' : 'deadlines'} due
                    </Text>
                  </View>
                )}

                {/* 2. Action Needed (Accent Blue) */}
                {dedupedActionItems.length > 0 && (
                  <View style={styles.heroPillAction}>
                    <Ionicons name="checkbox-outline" size={13} color="#3B82F6" />
                    <Text style={styles.heroPillTextAction}>
                      {dedupedActionItems.length} action{dedupedActionItems.length === 1 ? '' : 's'} needed
                    </Text>
                  </View>
                )}

                {/* 3. Informational (Neutral Gray) */}
                {todayEmails.length > 0 && (
                  <View style={styles.heroPillNeutral}>
                    <Ionicons name="mail-unread-outline" size={13} color="#A1A1AA" />
                    <Text style={styles.heroPillTextNeutral}>
                      {todayEmails.length} campus update{todayEmails.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                )}

                {/* All Clear Fallback */}
                {overdueDeadlines.length === 0 &&
                  dueTodayDeadlines.length === 0 &&
                  dedupedActionItems.length === 0 && (
                    <View style={styles.heroPillSuccess}>
                      <Ionicons name="checkmark-circle-outline" size={13} color="#10B981" />
                      <Text style={styles.heroPillTextSuccess}>All caught up</Text>
                    </View>
                  )}
              </View>

              {/* Glanceable Day Focus Strip: Today + Next 2 Days with Week Toggle */}
              <View style={styles.heroPickerContainer}>
                <View style={styles.heroPickerHeader}>
                  <Text style={styles.heroPickerLabel}>
                    {isWeekExpanded ? 'THIS WEEK' : 'SCHEDULE FOCUS'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setIsWeekExpanded((p) => !p);
                    }}
                    hitSlop={8}
                    style={styles.heroPickerToggle}
                    accessibilityRole="button"
                    accessibilityLabel={isWeekExpanded ? 'Show 3 days focus' : 'Expand to full week'}
                  >
                    <Text style={styles.heroPickerToggleText}>
                      {isWeekExpanded ? 'Show 3 Days' : 'Full Week'}
                    </Text>
                    <Ionicons
                      name={isWeekExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color="#A1A1AA"
                    />
                  </Pressable>
                </View>

                {isWeekExpanded ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.heroDaysScroll}
                  >
                    {weekDays.map((day) => {
                      const isSelected = isSameDay(day, selectedBriefingDate);
                      const isTodayDate = isSameDay(day, new Date());
                      const dayDeadlinesCount = deadlineEmails.filter((e) =>
                        isSameDay(new Date(e.deadline!), day)
                      ).length;

                      return (
                        <Pressable
                          key={day.toISOString()}
                          onPress={() => {
                            hapticLight();
                            setSelectedBriefingDate(day);
                          }}
                          style={[
                            styles.spaciousDayCard,
                            styles.spaciousDayCardWeek,
                            isSelected && styles.spaciousDayCardSelected,
                            isTodayDate && !isSelected && styles.spaciousDayCardToday,
                          ]}
                        >
                          <Text style={[styles.spaciousDayName, isSelected && styles.spaciousDayTextSelected]}>
                            {isTodayDate ? 'TODAY' : format(day, 'EEE').toUpperCase()}
                          </Text>
                          <Text style={[styles.spaciousDayNum, isSelected && styles.spaciousDayTextSelected]}>
                            {format(day, 'd')}
                          </Text>
                          {dayDeadlinesCount > 0 ? (
                            <View style={styles.dayBadgeDot}>
                              <View style={[styles.dayDot, isSelected ? styles.dayDotSelected : styles.dayDotActive]} />
                            </View>
                          ) : (
                            <View style={styles.dayDotPlaceholder} />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.heroDaysRow}>
                    {threeDays.map((day) => {
                      const isSelected = isSameDay(day, selectedBriefingDate);
                      const isTodayDate = isSameDay(day, new Date());
                      const dayDeadlinesCount = deadlineEmails.filter((e) =>
                        isSameDay(new Date(e.deadline!), day)
                      ).length;

                      return (
                        <Pressable
                          key={day.toISOString()}
                          onPress={() => {
                            hapticLight();
                            setSelectedBriefingDate(day);
                          }}
                          style={[
                            styles.spaciousDayCard,
                            isSelected && styles.spaciousDayCardSelected,
                            isTodayDate && !isSelected && styles.spaciousDayCardToday,
                          ]}
                        >
                          <Text style={[styles.spaciousDayName, isSelected && styles.spaciousDayTextSelected]}>
                            {isTodayDate ? 'TODAY' : format(day, 'EEE').toUpperCase()}
                          </Text>
                          <Text style={[styles.spaciousDayNum, isSelected && styles.spaciousDayTextSelected]}>
                            {format(day, 'd')}
                          </Text>
                          {dayDeadlinesCount > 0 ? (
                            <View style={styles.dayBadgeDot}>
                              <View style={[styles.dayDot, isSelected ? styles.dayDotSelected : styles.dayDotActive]} />
                            </View>
                          ) : (
                            <View style={styles.dayDotPlaceholder} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Quick Return to Today button if an upcoming day is selected */}
                {!isSameDay(selectedBriefingDate, new Date()) && (
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setSelectedBriefingDate(new Date());
                    }}
                    style={styles.heroResetBtn}
                  >
                    <Ionicons name="arrow-undo-outline" size={13} color="#3B82F6" />
                    <Text style={styles.heroResetText}>
                      Viewing {format(selectedBriefingDate, 'EEEE, MMM d')} · Tap to return to Today
                    </Text>
                  </Pressable>
                )}
              </View>
            </MotiView>

            {/* 1. Academic Schedule & Timetable (Driven by selectedBriefingDate) */}
            <View style={styles.sectionDivider} />

            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
              <ClassScheduleCard
                selectedDate={selectedBriefingDate}
                onOpenTimetable={() => setShowTimetableModal(true)}
                onOpenProfile={() => setShowAcademicModal(true)}
                onOpenAttendance={() => setShowAttendanceModal(true)}
                onOpenRoomLocator={(hall) => {
                  setSelectedRoomCode(hall);
                  setShowRoomLocator(true);
                }}
              />
            </MotiView>

            {/* 2. Campus Mess Menu (Driven by selectedBriefingDate) */}
            <View style={styles.sectionDivider} />

            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 100 }}
            >
              <MessMenuCard
                selectedDate={selectedBriefingDate}
                onDateChange={setSelectedBriefingDate}
                collapsible
                defaultCollapsed={false}
              />
            </MotiView>

            {/* 3. Triage-First "Needs Your Action Today" & Clustered Activity Feed */}
            <View style={styles.sectionDivider} />

            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 150 }}
            >
              <TriageFeed
                overdueDeadlines={overdueDeadlines}
                dueTodayDeadlines={dueTodayDeadlines}
                actionItems={dedupedActionItems}
                criticalAlerts={stats.criticalAlerts}
                allCampusEmails={officialCampusEmails}
                onEmailPress={handleEmailPress}
              />
            </MotiView>
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
              <Text style={styles.sectionTitle}>
                {isSameDay(selectedCalendarDate, new Date())
                  ? 'DEADLINES TODAY'
                  : `DEADLINES FOR ${format(selectedCalendarDate, 'MMM d, yyyy').toUpperCase()}`}
              </Text>
              <Text style={styles.sectionCount}>{selectedDayDeadlines.length} items</Text>
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
              <Text style={styles.sectionTitle}>ALL UPCOMING DEADLINES</Text>
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
        selectedDate={activeTab === 'calendar' ? selectedCalendarDate : undefined}
        onClose={() => setShowTimetableModal(false)}
        onOpenProfileSettings={() => setShowAcademicModal(true)}
      />

      <AcademicProfileModal
        visible={showAcademicModal}
        onClose={() => setShowAcademicModal(false)}
        onOpenTimetable={() => setShowTimetableModal(true)}
      />

      <AttendanceModal
        visible={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
      />

      <RoomLocatorModal
        visible={showRoomLocator}
        initialRoomCode={selectedRoomCode}
        onClose={() => setShowRoomLocator(false)}
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
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.lg,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  segmentBtnActive: {
    backgroundColor: Colors.card,
    ...Shadows.sm,
  },
  segmentText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[6],
    gap: Spacing[3],
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginVertical: Spacing[1],
  },
  heroCard: {
    gap: Spacing[3],
  },
  heroHeader: {
    gap: 4,
  },
  heroDate: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  heroStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    alignItems: 'center',
  },
  heroPillUrgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: Spacing[2.5],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  heroPillTextUrgent: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#EF4444',
  },
  heroPillAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: Spacing[2.5],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  heroPillTextAction: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#3B82F6',
  },
  heroPillNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 5,
    paddingHorizontal: Spacing[2.5],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroPillTextNeutral: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: '#A1A1AA',
  },
  heroPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: Spacing[2.5],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  heroPillTextSuccess: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#10B981',
  },
  heroPickerContainer: {
    gap: Spacing[2],
    marginTop: 2,
  },
  heroPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  heroPickerLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    color: Colors.textMuted,
  },
  heroPickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  heroPickerToggleText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: '#A1A1AA',
  },
  heroDaysRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  heroDaysScroll: {
    gap: Spacing[2],
    paddingVertical: 2,
  },
  spaciousDayCard: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[1.5],
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 2,
  },
  spaciousDayCardWeek: {
    width: 58,
    flex: undefined,
  },
  spaciousDayCardSelected: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  spaciousDayCardToday: {
    borderColor: 'rgba(0, 122, 255, 0.45)',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  spaciousDayName: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  spaciousDayNum: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  spaciousDayTextSelected: {
    color: '#FFFFFF',
  },
  dayBadgeDot: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotPlaceholder: {
    height: 6,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dayDotActive: {
    backgroundColor: '#EF4444',
  },
  dayDotSelected: {
    backgroundColor: '#3B82F6',
  },
  heroResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginTop: 2,
  },
  heroResetText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: '#3B82F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
    paddingLeft: Spacing['0.5'],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.text,
  },
  dayCardToday: {
    borderColor: Colors.textSecondary,
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
    backgroundColor: Colors.textMuted,
  },
  dotSelected: {
    backgroundColor: Colors.text,
  },
  dotCount: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: Typography.weight.bold,
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
