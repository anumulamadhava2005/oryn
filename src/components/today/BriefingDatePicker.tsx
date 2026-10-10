/**
 * Unified Briefing Date Picker for Today Screen
 * Controls both Academic Schedule and Campus Mess Menu simultaneously.
 * Features:
 * - Date stepper bar (← Today (Oct 3) →) with calendar icon and "Today" reset button
 * - 7-day quick strip (Mon–Sun pills) with active highlight and event dots
 * - Full calendar date picker modal with quick presets, month navigation, and day matrix
 */

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing, Shadows } from '@/constants/theme';
import { hapticLight } from '@/utils/haptics';
import {
  format,
  addDays,
  subDays,
  isToday,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';

interface BriefingDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  hasEventsOnDay?: (date: Date) => boolean;
}

export function BriefingDatePicker({
  selectedDate,
  onDateChange,
  hasEventsOnDay,
}: BriefingDatePickerProps) {
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [modalViewMonth, setModalViewMonth] = useState<Date>(selectedDate);

  const isTodaySelected = useMemo(() => isToday(selectedDate), [selectedDate]);

  // Calculate 7-day strip around selectedDate (Mon to Sun)
  const stripDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  const handleDateSelect = (d: Date) => {
    hapticLight();
    onDateChange(d);
  };

  const handlePrevDay = () => {
    hapticLight();
    onDateChange(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    hapticLight();
    onDateChange(addDays(selectedDate, 1));
  };

  const handleResetToday = () => {
    hapticLight();
    onDateChange(new Date());
  };

  // Calendar Modal Days Matrix
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(modalViewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(modalViewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [modalViewMonth]);

  return (
    <View style={styles.container}>
      {/* ─── Date Navigation & Stepper Bar ─── */}
      <View style={styles.dateSelectorBar}>
        <Pressable
          onPress={handlePrevDay}
          style={({ pressed }) => [styles.dateNavBtn, pressed && styles.pressedScale]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <Ionicons name="chevron-back" size={15} color={Colors.text} />
        </Pressable>

        <Pressable
          onPress={() => {
            hapticLight();
            setModalViewMonth(selectedDate);
            setShowDatePickerModal(true);
          }}
          style={({ pressed }) => [styles.dateTitleBtn, pressed && styles.pressedScale]}
          accessibilityRole="button"
          accessibilityLabel="Open calendar date picker"
        >
          <Ionicons name="calendar-outline" size={14} color="#007AFF" />
          <Text style={styles.dateTitleText}>
            {isTodaySelected ? `Today (${format(selectedDate, 'MMM d')})` : format(selectedDate, 'EEE, MMM d, yyyy')}
          </Text>
          <Ionicons name="chevron-down" size={12} color={Colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={handleNextDay}
          style={({ pressed }) => [styles.dateNavBtn, pressed && styles.pressedScale]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Ionicons name="chevron-forward" size={15} color={Colors.text} />
        </Pressable>

        {!isTodaySelected && (
          <Pressable
            onPress={handleResetToday}
            style={({ pressed }) => [styles.todayResetBtn, pressed && styles.pressedScale]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Return to today"
          >
            <Ionicons name="today-outline" size={12} color="#007AFF" />
            <Text style={styles.todayResetText}>Today</Text>
          </Pressable>
        )}
      </View>

      {/* ─── 7-Day Quick Strip ─── */}
      <View style={styles.dayStrip}>
        {stripDays.map((d) => {
          const isSelected = isSameDay(d, selectedDate);
          const isTodayDay = isToday(d);
          const hasEvents = hasEventsOnDay ? hasEventsOnDay(d) : false;

          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => handleDateSelect(d)}
              style={({ pressed }) => [
                styles.dayStripPill,
                isSelected && styles.dayStripPillSelected,
                isTodayDay && !isSelected && styles.dayStripPillToday,
                pressed && styles.pressedScale,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${format(d, 'EEEE, MMMM d')}${isSelected ? ', selected' : ''}`}
            >
              <Text style={[styles.dayStripSub, isSelected && styles.dayStripTextSelected]}>
                {format(d, 'EEE').toUpperCase()}
              </Text>
              <Text style={[styles.dayStripNum, isSelected && styles.dayStripTextSelected]}>
                {format(d, 'd')}
              </Text>
              {hasEvents && (
                <View
                  style={[
                    styles.dayStripDot,
                    isSelected ? styles.dayStripDotSelected : styles.dayStripDotActive,
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ─── Full Date Picker Modal ─── */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDatePickerModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="calendar" size={16} color="#007AFF" />
                <Text style={styles.modalTitle}>Select Date</Text>
              </View>
              <Pressable
                onPress={() => setShowDatePickerModal(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close date picker"
              >
                <Ionicons name="close" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Quick Preset Buttons */}
            <View style={styles.presetRow}>
              <Pressable
                onPress={() => {
                  handleDateSelect(new Date());
                  setShowDatePickerModal(false);
                }}
                style={styles.presetBtn}
              >
                <Text style={styles.presetText}>Today</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  handleDateSelect(addDays(new Date(), 1));
                  setShowDatePickerModal(false);
                }}
                style={styles.presetBtn}
              >
                <Text style={styles.presetText}>Tomorrow</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  handleDateSelect(subDays(new Date(), 1));
                  setShowDatePickerModal(false);
                }}
                style={styles.presetBtn}
              >
                <Text style={styles.presetText}>Yesterday</Text>
              </Pressable>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNavRow}>
              <Pressable
                onPress={() => {
                  hapticLight();
                  setModalViewMonth(prev => subMonths(prev, 1));
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={20} color="#007AFF" />
              </Pressable>
              <Text style={styles.monthNavTitle}>
                {format(modalViewMonth, 'MMMM yyyy')}
              </Text>
              <Pressable
                onPress={() => {
                  hapticLight();
                  setModalViewMonth(prev => addMonths(prev, 1));
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </Pressable>
            </View>

            {/* Weekday Header Labels */}
            <View style={styles.calendarHeaderGrid}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayStr) => (
                <Text key={dayStr} style={styles.calendarDayHeader}>
                  {dayStr}
                </Text>
              ))}
            </View>

            {/* Calendar Days Matrix Grid */}
            <View style={styles.calendarDaysGrid}>
              {calendarDays.map((d) => {
                const isSelected = isSameDay(d, selectedDate);
                const isCurrentMonth = isSameMonth(d, modalViewMonth);
                const isTodayDay = isToday(d);

                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => {
                      handleDateSelect(d);
                      setShowDatePickerModal(false);
                    }}
                    style={[
                      styles.calendarDayCell,
                      isSelected && styles.calendarDayCellSelected,
                      isTodayDay && !isSelected && styles.calendarDayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !isCurrentMonth && styles.calendarDayTextDimmed,
                        isSelected && styles.calendarDayTextSelected,
                        isTodayDay && !isSelected && styles.calendarDayTextToday,
                      ]}
                    >
                      {format(d, 'd')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  pressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // ─── Date Navigation Bar ───
  dateSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[2],
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dateNavBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
  },
  dateTitleText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  todayResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  todayResetText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#007AFF',
  },

  // ─── 7-Day Quick Strip ───
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayStripPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 2,
  },
  dayStripPillSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayStripPillToday: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  dayStripSub: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  dayStripNum: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  dayStripTextSelected: {
    color: '#FFFFFF',
  },
  dayStripDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    marginTop: 1,
  },
  dayStripDotActive: {
    backgroundColor: '#007AFF',
  },
  dayStripDotSelected: {
    backgroundColor: '#FFFFFF',
  },

  // ─── Calendar Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[4],
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  presetBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  monthNavTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  calendarHeaderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  calendarDayHeader: {
    width: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  calendarDayCellSelected: {
    backgroundColor: '#007AFF',
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  calendarDayText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  calendarDayTextDimmed: {
    color: Colors.textMuted,
    opacity: 0.4,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  calendarDayTextToday: {
    color: '#007AFF',
    fontWeight: Typography.weight.bold,
  },
});
