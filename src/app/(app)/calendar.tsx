/**
 * Calendar Screen — Visual monthly/weekly plot of all extracted academic and placement deadlines.
 * High-density timeline view categorized by urgency and category.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isAfter,
  isBefore,
  startOfDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useEmails } from '@/hooks/useEmails';
import { CategoryBadge } from '@/components/ui/Badge';
import { hapticLight } from '@/utils/haptics';
import type { ParsedEmail } from '@/types/email';

export default function CalendarScreen() {
  const router = useRouter();
  const { emails } = useEmails();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Filter emails with deadlines
  const deadlineEmails = useMemo(() => {
    return emails
      .filter(e => e.deadline != null)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [emails]);

  // Days in current week view
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Deadlines on selected date
  const selectedDayDeadlines = useMemo(() => {
    return deadlineEmails.filter(e =>
      isSameDay(new Date(e.deadline!), selectedDate)
    );
  }, [deadlineEmails, selectedDate]);

  const handlePrevWeek = useCallback(() => {
    hapticLight();
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    hapticLight();
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const handleToday = useCallback(() => {
    hapticLight();
    const today = new Date();
    setSelectedDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.systemBlue} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Academic Calendar</Text>
        <Pressable onPress={handleToday} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
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
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const count = deadlineEmails.filter(e => isSameDay(new Date(e.deadline!), day)).length;

            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => {
                  hapticLight();
                  setSelectedDate(day);
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

                {/* Deadline indicator dot */}
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
            {isSameDay(selectedDate, new Date())
              ? 'DEADLINES TODAY'
              : `DEADLINES FOR ${format(selectedDate, 'MMM d, yyyy').toUpperCase()}`}
          </Text>
          <Text style={styles.countBadge}>{selectedDayDeadlines.length} items</Text>
        </View>

        {/* Selected Day Deadlines List */}
        {selectedDayDeadlines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={40} color={Colors.systemGreen} />
            <Text style={styles.emptyTitle}>No deadlines scheduled</Text>
            <Text style={styles.emptySubtitle}>You are all clear for this date.</Text>
          </View>
        ) : (
          <View style={styles.deadlineList}>
            {selectedDayDeadlines.map((item) => {
              const isPast = isBefore(new Date(item.deadline!), startOfDay(new Date()));
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/(app)/email/${item.id}`)}
                  style={styles.deadlineItemCard}
                >
                  <View style={styles.itemHeader}>
                    <CategoryBadge category={item.category} />
                    <Text style={[styles.timeText, isPast && styles.timeTextPast]}>
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
            const isPast = isBefore(dDate, startOfDay(new Date()));
            return (
              <Pressable
                key={`all-${item.id}`}
                onPress={() => router.push(`/(app)/email/${item.id}`)}
                style={styles.timelineCard}
              >
                <View style={[styles.timelineBar, { backgroundColor: isPast ? Colors.systemGray : Colors.systemOrange }]} />
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
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentFaded,
  },
  todayBtnText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.bold,
  },
  container: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[12],
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[2],
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
    marginTop: Spacing[2],
  },
  sectionTitle: {
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
