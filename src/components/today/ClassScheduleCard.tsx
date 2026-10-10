/**
 * Class Schedule Card for Today Briefing Screen
 * Clean timeline-stripe design with dedicated datepicker:
 * - Compact header with icon, title, program/semester and class count
 * - Stepper bar (← Date →) with calendar icon and "Today" reset button
 * - 7-day quick strip (Mon–Sun pills) matching MessMenuCard pattern
 * - Full calendar date picker modal
 * - Each class uses a colored left accent bar instead of a dark nested card
 * - Inline attendance metrics and quick-mark controls
 * - Bottom links for Attendance and full weekly timetable
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing, Shadows } from '@/constants/theme';
import { useAcademicStore } from '@/store/academicStore';
import { useAttendanceStore } from '@/store/attendanceStore';
import { hapticLight, hapticSuccess, hapticWarning } from '@/utils/haptics';
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

export type WeekdayKey = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

const DAY_MAP: Record<number, WeekdayKey> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
};

const DAY_FULL_NAMES: Record<WeekdayKey, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
};

interface ClassScheduleCardProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  showDatePicker?: boolean;
  onOpenTimetable: () => void;
  onOpenProfile?: () => void;
  onOpenAttendance?: () => void;
  onOpenRoomLocator?: (hall: string) => void;
}

/** Helper to parse time slot string into minutes from midnight */
function parseSlotTimes(timeSlot: string): { start: number; end: number } | null {
  const parts = timeSlot.split('-').map(s => s.trim());
  if (parts.length < 2) return null;
  const endPart = parts[1];
  const isPM = /PM/i.test(endPart);
  const startPart = parts[0];

  const parseHM = (str: string, fallbackPM: boolean) => {
    const m = str.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    let pm = fallbackPM;
    if (/AM/i.test(str)) pm = false;
    else if (/PM/i.test(str)) pm = true;
    else if (h === 12) pm = true;
    else if (h < 7) pm = true;
    else if (h >= 8 && h <= 11) pm = false;
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h * 60 + min;
  };

  const start = parseHM(startPart, isPM);
  const end = parseHM(endPart, isPM);
  if (start === null || end === null) return null;
  return { start, end };
}

export function ClassScheduleCard({
  selectedDate: propSelectedDate,
  onDateChange,
  showDatePicker = false,
  onOpenTimetable,
  onOpenProfile,
  onOpenAttendance,
  onOpenRoomLocator,
}: ClassScheduleCardProps) {
  const { program, semester, batch, getWeeklySchedule } = useAcademicStore();
  const {
    getCourseStats,
    getTodayLogForSlot,
    markAttendance,
    undoLastAction,
  } = useAttendanceStore();

  const [activeDate, setActiveDate] = useState<Date>(propSelectedDate || new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [modalViewMonth, setModalViewMonth] = useState<Date>(activeDate);

  // Sync with prop if provided
  useEffect(() => {
    if (propSelectedDate) {
      setActiveDate(propSelectedDate);
    }
  }, [propSelectedDate]);

  const isTodaySelected = useMemo(() => isToday(activeDate), [activeDate]);
  const isViewingToday = isTodaySelected;
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dayOfWeek = activeDate.getDay();
  const activeDayKey = DAY_MAP[dayOfWeek] ?? 'MON';
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Compute schedule for the active day
  const weeklySchedule = getWeeklySchedule();
  const currentDaySlots = weeklySchedule[activeDayKey] || [];

  // Calculate 7-day strip around activeDate (Mon to Sun)
  const stripDays = useMemo(() => {
    const start = startOfWeek(activeDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [activeDate]);

  const handleDateSelect = (d: Date) => {
    hapticLight();
    setActiveDate(d);
    onDateChange?.(d);
  };

  const handlePrevDay = () => {
    hapticLight();
    const next = subDays(activeDate, 1);
    setActiveDate(next);
    onDateChange?.(next);
  };

  const handleNextDay = () => {
    hapticLight();
    const next = addDays(activeDate, 1);
    setActiveDate(next);
    onDateChange?.(next);
  };

  const handleResetToday = () => {
    hapticLight();
    const today = new Date();
    setActiveDate(today);
    onDateChange?.(today);
  };

  // Calendar Modal Days Matrix
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(modalViewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(modalViewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [modalViewMonth]);

  const scheduledItems = useMemo(() => {
    if (isWeekend) return [];
    return currentDaySlots.flatMap(slot =>
      slot.courses.map(course => ({
        slotCode: slot.slotCode,
        timeSlot: slot.timeSlot,
        course,
      }))
    );
  }, [currentDaySlots, isWeekend]);

  const ongoingIdx = useMemo(() => {
    if (!isViewingToday) return -1;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < scheduledItems.length; i++) {
      const timing = parseSlotTimes(scheduledItems[i].timeSlot);
      if (!timing) continue;
      if (nowMinutes >= timing.start && nowMinutes <= timing.end) {
        return i;
      }
    }
    return -1;
  }, [isViewingToday, scheduledItems]);

  const classesCountLabel = useMemo(() => {
    const count = scheduledItems.length;
    if (isViewingToday) {
      return `${count} ${count === 1 ? 'Class' : 'Classes'} Today`;
    }
    return `${count} ${count === 1 ? 'Class' : 'Classes'}`;
  }, [scheduledItems.length, isViewingToday]);

  return (
    <View style={styles.card}>
      {/* ─── Compact Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconSquircle}>
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Schedule</Text>
          <Pressable
            onPress={onOpenProfile}
            style={({ pressed }) => pressed && styles.pressedScale}
            hitSlop={6}
          >
            <Text style={styles.headerSubtitle}>
              {program} · {semester}{semester === 'Semester 3' && (program.includes('CSE') || program.includes('AI')) ? ` · ${batch}` : ''}
            </Text>
          </Pressable>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{classesCountLabel}</Text>
        </View>
      </View>

      {/* ─── Date Navigation & Stepper Bar (if standalone) ─── */}
      {showDatePicker && (
        <>
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
                setModalViewMonth(activeDate);
                setShowDatePickerModal(true);
              }}
              style={({ pressed }) => [styles.dateTitleBtn, pressed && styles.pressedScale]}
              accessibilityRole="button"
              accessibilityLabel="Open calendar date picker"
            >
              <Ionicons name="calendar-outline" size={14} color="#007AFF" />
              <Text style={styles.dateTitleText}>
                {isTodaySelected ? `Today (${format(activeDate, 'MMM d')})` : format(activeDate, 'EEE, MMM d, yyyy')}
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
              const isSelected = isSameDay(d, activeDate);
              const isTodayDay = isToday(d);
              const dayKey = DAY_MAP[d.getDay()];
              const dayClassesCount = dayKey ? (weeklySchedule[dayKey]?.length ?? 0) : 0;

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
                  {dayClassesCount > 0 && (
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
        </>
      )}

      {/* ─── Class List ─── */}
      {scheduledItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.systemGreen} />
          <Text style={styles.emptyTitle}>
            {isWeekend
              ? 'Weekend — No classes scheduled'
              : `No classes on ${DAY_FULL_NAMES[activeDayKey]}`}
          </Text>
        </View>
      ) : (
        <View style={styles.classList}>
          {scheduledItems.map((item, idx) => {
            const isOngoing = idx === ongoingIdx;
            const attendanceStats = getCourseStats(item.course.id);
            const todayLog = isViewingToday
              ? getTodayLogForSlot(item.course.id, todayDateStr, item.timeSlot)
              : null;

            return (
              <View
                key={`${item.timeSlot}-${item.course.id}-${idx}`}
                style={styles.classRow}
              >
                {/* Colored left accent bar */}
                <View
                  style={[
                    styles.accentBar,
                    isOngoing
                      ? styles.accentBarLive
                      : attendanceStats.statusLevel === 'good'
                      ? styles.accentBarGood
                      : attendanceStats.statusLevel === 'warning'
                      ? styles.accentBarWarning
                      : styles.accentBarCritical,
                  ]}
                />

                <View style={styles.classContent}>
                  {/* Top: Slot code, course name, live chip */}
                  <View style={styles.classTopRow}>
                    <Text style={styles.slotCode}>{item.slotCode}</Text>
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      {item.course.code} — {item.course.name}
                    </Text>
                    {isOngoing && (
                      <View style={styles.liveChip}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>NOW</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom: Time, room, attendance %, quick mark */}
                  <View style={styles.classBottomRow}>
                    <View style={styles.metaRow}>
                      <Text style={styles.timeText}>{item.timeSlot}</Text>
                      {item.course.hall ? (
                        <Pressable
                          onPress={() => {
                            hapticLight();
                            onOpenRoomLocator?.(item.course.hall);
                          }}
                          hitSlop={4}
                        >
                          <Text style={styles.hallText}>
                            {item.course.hall}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Text style={styles.metaSep}>·</Text>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          onOpenAttendance?.();
                        }}
                        style={styles.attendanceInline}
                        hitSlop={4}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            attendanceStats.statusLevel === 'good'
                              ? styles.statusDotGood
                              : attendanceStats.statusLevel === 'warning'
                              ? styles.statusDotWarning
                              : styles.statusDotCritical,
                          ]}
                        />
                        <Text style={styles.attendanceText}>
                          {attendanceStats.percentage}%
                          {attendanceStats.safeBunks > 0
                            ? ` · ${attendanceStats.safeBunks} safe`
                            : attendanceStats.mustAttend > 0
                            ? ` · ${attendanceStats.mustAttend} needed`
                            : ''}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Quick Mark */}
                    {isViewingToday && (
                      <View style={styles.quickMark}>
                        {todayLog ? (
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              undoLastAction(item.course.id);
                            }}
                            style={[
                              styles.loggedPill,
                              todayLog.status === 'present'
                                ? styles.loggedPillPresent
                                : styles.loggedPillAbsent,
                            ]}
                            hitSlop={4}
                          >
                            <Ionicons
                              name={todayLog.status === 'present' ? 'checkmark' : 'close'}
                              size={10}
                              color={todayLog.status === 'present' ? Colors.systemGreen : Colors.systemRed}
                            />
                            <Text
                              style={[
                                styles.loggedPillText,
                                todayLog.status === 'present' ? styles.textGood : styles.textCritical,
                              ]}
                            >
                              {todayLog.status === 'present' ? 'Present' : 'Absent'}
                            </Text>
                          </Pressable>
                        ) : (
                          <View style={styles.markBtns}>
                            <Pressable
                              onPress={() => {
                                hapticSuccess();
                                markAttendance(
                                  item.course.id,
                                  item.course.code,
                                  item.course.name,
                                  'present',
                                  todayDateStr,
                                  item.timeSlot
                                );
                              }}
                              style={({ pressed }) => [
                                styles.markBtn,
                                styles.markBtnPresent,
                                pressed && styles.pressedScale,
                              ]}
                              hitSlop={4}
                            >
                              <Ionicons name="checkmark" size={12} color={Colors.systemGreen} />
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                hapticWarning();
                                markAttendance(
                                  item.course.id,
                                  item.course.code,
                                  item.course.name,
                                  'absent',
                                  todayDateStr,
                                  item.timeSlot
                                );
                              }}
                              style={({ pressed }) => [
                                styles.markBtn,
                                styles.markBtnAbsent,
                                pressed && styles.pressedScale,
                              ]}
                              hitSlop={4}
                            >
                              <Ionicons name="close" size={12} color={Colors.systemRed} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Bottom Actions ─── */}
      <View style={styles.footerRow}>
        {onOpenAttendance && (
          <Pressable
            onPress={() => {
              hapticLight();
              onOpenAttendance();
            }}
            style={({ pressed }) => [styles.footerLink, pressed && styles.pressedScale]}
            hitSlop={6}
          >
            <Ionicons name="pie-chart-outline" size={12} color={Colors.systemGreen} />
            <Text style={styles.footerLinkTextGreen}>Attendance</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            hapticLight();
            onOpenTimetable();
          }}
          style={({ pressed }) => [styles.footerLink, pressed && styles.pressedScale]}
          hitSlop={6}
        >
          <Text style={styles.footerLinkTextBlue}>Full Timetable</Text>
          <Ionicons name="chevron-forward" size={12} color="#007AFF" />
        </Pressable>
      </View>

      {/* ─── Full Date Picker Modal ─── */}
      {showDatePicker && (
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
                  <Text style={styles.modalTitle}>Select Schedule Date</Text>
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
                  const isSelected = isSameDay(d, activeDate);
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  pressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconSquircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  countBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: '#5AADFF',
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

  // ─── Empty ───
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },

  // ─── Class List ───
  classList: {
    gap: 2,
  },

  // ─── Individual Class Row (timeline style) ───
  classRow: {
    flexDirection: 'row',
    minHeight: 54,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
    marginVertical: 2,
  },
  accentBarLive: {
    backgroundColor: '#007AFF',
  },
  accentBarGood: {
    backgroundColor: 'rgba(52, 199, 89, 0.50)',
  },
  accentBarWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.55)',
  },
  accentBarCritical: {
    backgroundColor: 'rgba(255, 59, 48, 0.55)',
  },
  classContent: {
    flex: 1,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },

  // ─── Top row: slot, name, live ───
  classTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotCode: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#AF52DE',
    width: 18,
  },
  courseTitle: {
    fontSize: 13.5,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    flex: 1,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  liveText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#5AADFF',
    letterSpacing: 0.5,
  },

  // ─── Bottom row: time, room, attendance, marks ───
  classBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  timeText: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontWeight: Typography.weight.regular,
  },
  hallText: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  metaSep: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  attendanceInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusDotGood: {
    backgroundColor: Colors.systemGreen,
  },
  statusDotWarning: {
    backgroundColor: Colors.systemOrange,
  },
  statusDotCritical: {
    backgroundColor: Colors.systemRed,
  },
  attendanceText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },

  // ─── Quick Mark ───
  quickMark: {
    marginLeft: 8,
  },
  loggedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  loggedPillPresent: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  loggedPillAbsent: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
  },
  loggedPillText: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
  },
  textGood: {
    color: Colors.systemGreen,
  },
  textCritical: {
    color: Colors.systemRed,
  },
  markBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBtnPresent: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  markBtnAbsent: {
    backgroundColor: 'rgba(255, 69, 58, 0.10)',
  },

  // ─── Footer ───
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  footerLinkTextGreen: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemGreen,
  },
  footerLinkTextBlue: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: '#007AFF',
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
