/**
 * Class Schedule Card for Today Briefing Screen
 * Matches the requested screenshot design:
 * - Blue calendar icon squircle + "Academic Schedule" title + program/semester subtitle
 * - "X Classes Today" blue pill on top-right
 * - Inset class items with slot code badge (purple squircle), Course Code — Name, Time & Room
 * - Integrated Present / Absent attendance logger & Safe Bunk Forecaster per class
 * - Bottom links for Bunk Forecaster and "Tap to open full weekly timetable >"
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius } from '@/constants/theme';
import { useAcademicStore } from '@/store/academicStore';
import { useAttendanceStore } from '@/store/attendanceStore';
import { hapticLight, hapticSuccess, hapticWarning } from '@/utils/haptics';

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
  selectedDate = new Date(),
  onOpenTimetable,
  onOpenProfile,
  onOpenAttendance,
  onOpenRoomLocator,
}: ClassScheduleCardProps) {
  const { program, semester, getWeeklySchedule } = useAcademicStore();
  const {
    getCourseStats,
    getTodayLogForSlot,
    markAttendance,
    undoLastAction,
  } = useAttendanceStore();

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dayOfWeek = selectedDate.getDay();
  const activeDayKey = DAY_MAP[dayOfWeek] ?? 'MON';
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Compute schedule for the active day
  const weeklySchedule = getWeeklySchedule();
  const currentDaySlots = weeklySchedule[activeDayKey] || [];

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

  // Ongoing class detection if viewing today
  const isViewingToday = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()
    );
  }, [selectedDate]);

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
      {/* ─── Top Header (Screenshot Match) ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Blue calendar icon squircle */}
          <View style={styles.iconSquircle}>
            <Ionicons name="calendar" size={20} color="#FFFFFF" />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Academic Schedule</Text>
            <Pressable
              onPress={onOpenProfile}
              style={({ pressed }) => [styles.subtitleBtn, pressed && styles.pressedScale]}
              hitSlop={6}
            >
              <Text style={styles.headerSubtitle}>
                {program} · {semester}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Right blue pill badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{classesCountLabel}</Text>
        </View>
      </View>

      {/* ─── Class Inset Cards ─── */}
      {scheduledItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={26} color={Colors.systemGreen} />
          <Text style={styles.emptyTitle}>
            {isWeekend
              ? `Weekend · No classes scheduled`
              : `No classes scheduled for ${DAY_FULL_NAMES[activeDayKey]}`}
          </Text>
          <Text style={styles.emptySubtitle}>Enjoy your free time!</Text>
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
                style={[
                  styles.classInset,
                  isOngoing && styles.classInsetOngoing,
                ]}
              >
                {/* Main Class Row (Slot squircle + Code — Title + Time & Hall) */}
                <View style={styles.classTopRow}>
                  {/* Purple Slot Squircle */}
                  <View style={[styles.slotBadge, isOngoing && styles.slotBadgeOngoing]}>
                    <Text style={[styles.slotBadgeText, isOngoing && styles.slotBadgeTextOngoing]}>
                      {item.slotCode}
                    </Text>
                  </View>

                  {/* Course Name & Details */}
                  <View style={styles.classDetails}>
                    <View style={styles.courseTitleRow}>
                      <Text style={styles.courseTitle} numberOfLines={1}>
                        {item.course.code} — {item.course.name}
                      </Text>
                      {isOngoing && (
                        <View style={styles.liveNowChip}>
                          <Text style={styles.liveNowText}>LIVE</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.timeHallRow}>
                      <Text style={styles.timeHallText}>
                        {item.timeSlot}
                        {item.course.hall ? (
                          <Text
                            onPress={() => {
                              hapticLight();
                              onOpenRoomLocator?.(item.course.hall);
                            }}
                            style={styles.hallLinkText}
                          >
                            {` · Room ${item.course.hall}`}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ─── Integrated Bunk Forecaster & Attendance Row ─── */}
                <View style={styles.attendanceDivider} />

                <View style={styles.attendanceFooterRow}>
                  {/* Bunk Forecaster metrics pill (tappable to open full Bunk Forecaster modal) */}
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      onOpenAttendance?.();
                    }}
                    style={({ pressed }) => [styles.bunkMetricBtn, pressed && styles.pressedScale]}
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
                    <Text style={styles.bunkMetricPercent}>
                      {attendanceStats.percentage}%
                    </Text>
                    <Text style={styles.bunkMetricLabel}>
                      {attendanceStats.safeBunks > 0
                        ? ` · ${attendanceStats.safeBunks} safe bunk${attendanceStats.safeBunks === 1 ? '' : 's'}`
                        : attendanceStats.mustAttend > 0
                        ? ` · Need ${attendanceStats.mustAttend} classes`
                        : ' · At 75% limit'}
                    </Text>
                  </Pressable>

                  {/* 1-Tap Quick Mark: Present / Absent */}
                  {isViewingToday && (
                    <View style={styles.quickMarkContainer}>
                      {todayLog ? (
                        <Pressable
                          onPress={() => {
                            hapticLight();
                            undoLastAction(item.course.id);
                          }}
                          style={[
                            styles.loggedBadge,
                            todayLog.status === 'present'
                              ? styles.loggedBadgePresent
                              : styles.loggedBadgeAbsent,
                          ]}
                          hitSlop={4}
                        >
                          <Ionicons
                            name={todayLog.status === 'present' ? 'checkmark-circle' : 'close-circle'}
                            size={11}
                            color={todayLog.status === 'present' ? Colors.systemGreen : Colors.systemRed}
                          />
                          <Text
                            style={[
                              styles.loggedBadgeText,
                              todayLog.status === 'present' ? styles.textGood : styles.textCritical,
                            ]}
                          >
                            {todayLog.status === 'present' ? 'Attended' : 'Absent'} (Undo)
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={styles.actionButtonGroup}>
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
                              styles.actionBtn,
                              styles.actionBtnPresent,
                              pressed && styles.pressedScale,
                            ]}
                            hitSlop={4}
                          >
                            <Ionicons name="checkmark" size={11} color={Colors.systemGreen} />
                            <Text style={styles.actionBtnTextPresent}>Present</Text>
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
                              styles.actionBtn,
                              styles.actionBtnAbsent,
                              pressed && styles.pressedScale,
                            ]}
                            hitSlop={4}
                          >
                            <Ionicons name="close" size={11} color={Colors.systemRed} />
                            <Text style={styles.actionBtnTextAbsent}>Absent</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Bottom Actions (Bunk Forecaster & Screenshot Timetable Link) ─── */}
      <View style={styles.footerLinksCol}>
        {onOpenAttendance && (
          <Pressable
            onPress={() => {
              hapticLight();
              onOpenAttendance();
            }}
            style={({ pressed }) => [styles.bunkForecasterFooterRow, pressed && styles.pressedScale]}
            hitSlop={6}
          >
            <View style={styles.bunkForecasterFooterLeft}>
              <Ionicons name="pie-chart-outline" size={13} color={Colors.systemGreen} />
              <Text style={styles.bunkForecasterFooterText}>Bunk Forecaster & Attendance</Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={Colors.systemGreen} />
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            hapticLight();
            onOpenTimetable();
          }}
          style={({ pressed }) => [styles.bottomLinkRow, pressed && styles.pressedScale]}
          hitSlop={6}
        >
          <Text style={styles.bottomLinkText}>Tap to open full weekly timetable</Text>
          <Ionicons name="chevron-forward" size={14} color="#007AFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer Card matching screenshot
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  pressedScale: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  // Header Row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subtitleBtn: {
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: Typography.weight.medium,
  },
  countBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: Typography.weight.semibold,
    color: '#3898FF',
  },

  // Empty Container
  emptyContainer: {
    backgroundColor: '#141416',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Class List & Inset Item matching screenshot
  classList: {
    gap: 10,
  },
  classInset: {
    backgroundColor: '#141416',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    gap: 9,
  },
  classInsetOngoing: {
    borderColor: 'rgba(0, 122, 255, 0.35)',
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
  },
  classTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  slotBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(175, 82, 222, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeOngoing: {
    backgroundColor: '#007AFF',
  },
  slotBadgeText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#D084F8',
  },
  slotBadgeTextOngoing: {
    color: '#FFFFFF',
  },
  classDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  courseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courseTitle: {
    fontSize: 13.5,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  liveNowChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveNowText: {
    fontSize: 8.5,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  timeHallRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeHallText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: Typography.weight.regular,
  },
  hallLinkText: {
    color: '#A1A1AA',
    fontWeight: Typography.weight.medium,
  },

  // Inset Attendance Divider & Footer Row
  attendanceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  attendanceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 1,
  },
  bunkMetricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
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
  bunkMetricPercent: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#E4E4E7',
  },
  bunkMetricLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },

  // 1-Tap Attendance Controls
  quickMarkContainer: {
    marginLeft: 8,
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  loggedBadgePresent: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  loggedBadgeAbsent: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  loggedBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
  },
  textGood: {
    color: Colors.systemGreen,
  },
  textCritical: {
    color: Colors.systemRed,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  actionBtnPresent: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  actionBtnAbsent: {
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  actionBtnTextPresent: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemGreen,
  },
  actionBtnTextAbsent: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemRed,
  },

  // Bottom Links (Screenshot Match)
  footerLinksCol: {
    paddingTop: 4,
    gap: 8,
  },
  bunkForecasterFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 6,
  },
  bunkForecasterFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bunkForecasterFooterText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemGreen,
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bottomLinkText: {
    fontSize: 12.5,
    fontWeight: Typography.weight.semibold,
    color: '#007AFF',
  },
});
