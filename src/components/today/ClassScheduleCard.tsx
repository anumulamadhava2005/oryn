/**
 * Class Schedule Card for Today Briefing Screen
 * Displays active day's slot-based classes with live indicator & timetable trigger.
 * Reacts instantly to program, semester, and elective selection updates.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAcademicStore } from '@/store/academicStore';
import { hapticLight } from '@/utils/haptics';

interface ClassScheduleCardProps {
  selectedDate?: Date;
  onOpenTimetable: () => void;
}

const DAY_MAP: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'WEEKEND'> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
};

export function ClassScheduleCard({
  selectedDate = new Date(),
  onOpenTimetable,
}: ClassScheduleCardProps) {
  const { program, semester, timetableVersion, getWeeklySchedule } = useAcademicStore();

  const dayOfWeek = selectedDate.getDay();
  const dayKey = DAY_MAP[dayOfWeek] ?? 'MON';
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Compute directly — no useMemo. Store methods use get() internally so
  // they always read the latest state. The component re-renders when any
  // subscribed store field changes, which is sufficient.
  const weeklySchedule = getWeeklySchedule();

  const daySlots = weeklySchedule[dayKey] || [];
  const scheduledItems = daySlots.flatMap(slot =>
    slot.courses.map(course => ({
      slotCode: slot.slotCode,
      timeSlot: slot.timeSlot,
      course,
    }))
  );
  const classesCount = scheduledItems.length;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => {
        hapticLight();
        onOpenTimetable();
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar-outline" size={16} color={Colors.white} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Academic Schedule</Text>
            <Text style={styles.subtitle}>
              {program} · {semester}
            </Text>
          </View>
        </View>

        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>
            {isWeekend ? 'Weekend' : `${classesCount} Classes ${selectedDate.getDay() === new Date().getDay() ? 'Today' : 'Scheduled'}`}
          </Text>
        </View>
      </View>

      {/* Class Items Summary */}
      {isWeekend ? (
        <View style={styles.weekendRow}>
          <Ionicons name="happy-outline" size={20} color={Colors.systemGreen} />
          <Text style={styles.weekendText}>No scheduled classes on weekend. Enjoy!</Text>
        </View>
      ) : classesCount === 0 ? (
        <View style={styles.weekendRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.systemBlue} />
          <Text style={styles.weekendText}>No classes scheduled for {dayKey}</Text>
        </View>
      ) : (
        <View style={styles.classesGrid}>
          {scheduledItems
            .slice(0, 3)
            .map((item, idx) => {
              const isElective = item.course.program === 'Electives & Minors' || item.course.sourceFile === 'Electives_Aug 2026.xlsx';
              return (
                <View key={`${item.timeSlot}-${item.course.id}-${idx}`} style={styles.classRow}>
                  <View style={[styles.slotTag, isElective && styles.slotTagElective]}>
                    <Text style={[styles.slotTagText, isElective && styles.slotTagTextElective]}>
                      {item.slotCode}
                    </Text>
                  </View>
                  <View style={styles.classInfo}>
                    <View style={styles.classCodeRow}>
                      <Text style={styles.classCode} numberOfLines={1}>
                        {item.course.code} — {item.course.name}
                      </Text>
                    </View>
                    <Text style={styles.classTime}>
                      {item.timeSlot} {item.course.hall ? `· Room ${item.course.hall}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}

          {classesCount > 3 && (
            <Text style={styles.moreText}>+ {classesCount - 3} more classes scheduled</Text>
          )}
        </View>
      )}

      {/* Footer trigger */}
      <View style={styles.footer}>
        <Text style={styles.footerActionText}>Tap to open full weekly timetable</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.systemBlue} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    gap: 2,
  },
  title: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  badgePill: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  weekendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.cardHover,
    padding: Spacing[3],
    borderRadius: Radius.lg,
  },
  weekendText: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  classesGrid: {
    gap: Spacing[2],
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.cardHover,
    padding: Spacing[3],
    borderRadius: Radius.lg,
  },
  slotTag: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTagElective: {
    backgroundColor: 'rgba(175, 82, 222, 0.15)',
  },
  slotTagText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  slotTagTextElective: {
    color: Colors.systemPurple,
  },
  classInfo: {
    flex: 1,
    gap: 2,
  },
  classCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classCode: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  classTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  moreText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
    paddingLeft: Spacing[1],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerActionText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
});
