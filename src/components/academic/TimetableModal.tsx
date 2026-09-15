/**
 * Timetable & Eligible Courses View Modal
 * Displays weekly slot-based class schedule & eligible core/elective curriculum courses.
 * Provides instant 1-tap semester switching & elective selection.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAcademicStore, ScheduledSlotEntry } from '@/store/academicStore';
import { Course, SEMESTER_OPTIONS, SemesterType } from '@/constants/academicData';
import { ElectiveSelectionModal } from '@/components/academic/ElectiveSelectionModal';
import { hapticLight } from '@/utils/haptics';

export type DayType = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export const DAYS: DayType[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export const DAY_MAP: Record<number, DayType> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
};

export function getTodayDayKey(date: Date = new Date()): DayType {
  const day = date.getDay();
  // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri. Weekends default to Monday.
  return DAY_MAP[day] ?? 'MON';
}

interface TimetableModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenProfileSettings?: () => void;
  initialDay?: DayType;
  selectedDate?: Date;
}

type TabType = 'schedule' | 'courses';

export function TimetableModal({
  visible,
  onClose,
  onOpenProfileSettings,
  initialDay,
  selectedDate,
}: TimetableModalProps) {
  const {
    program,
    semester,
    selectedElectiveIds,
    setSemester,
    isElectivesAvailable,
    getEligibleCourses,
    getWeeklySchedule,
  } = useAcademicStore();

  const getTargetDay = () =>
    initialDay ?? (selectedDate ? getTodayDayKey(selectedDate) : getTodayDayKey());

  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [selectedDay, setSelectedDay] = useState<DayType>(getTargetDay);
  const [searchQuery, setSearchQuery] = useState('');
  const [showElectiveModal, setShowElectiveModal] = useState(false);

  // Automatically reset to today's day (or specified day/date) whenever the modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDay(getTargetDay());
      setActiveTab('schedule');
    }
  }, [visible, initialDay, selectedDate]);

  const canChooseElectives = isElectivesAvailable();

  // Compute directly during render — no useMemo. Store methods call get()
  // internally, so they always read latest state. useMemo was hiding stale
  // closures because the function references (getWeeklySchedule etc.) are
  // stable and never change, so React thought the deps hadn't changed.
  const eligibleCourses = getEligibleCourses();
  const weeklySchedule = getWeeklySchedule();

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return eligibleCourses;
    const q = searchQuery.toLowerCase().trim();
    return eligibleCourses.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.faculty.toLowerCase().includes(q) ||
        c.slot.toLowerCase().includes(q) ||
        c.hall.toLowerCase().includes(q)
    );
  }, [eligibleCourses, searchQuery]);

  const currentDaySlots = weeklySchedule[selectedDay] || [];

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Academic Timetable</Text>
              <Pressable
                style={styles.profileBadge}
                onPress={() => {
                  hapticLight();
                  if (onOpenProfileSettings) onOpenProfileSettings();
                }}
              >
                <Text style={styles.profileBadgeText}>
                  {program}
                </Text>
                <Ionicons name="settings-outline" size={12} color={Colors.systemBlue} />
              </Pressable>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Interactive Semester Switcher Bar */}
          <View style={styles.semesterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.semesterScroll}
            >
              {SEMESTER_OPTIONS.map((sem) => {
                const isSelected = semester === sem;
                return (
                  <Pressable
                    key={sem}
                    style={[styles.semPill, isSelected && styles.semPillActive]}
                    onPress={() => {
                      hapticLight();
                      setSemester(sem);
                    }}
                  >
                    <Text style={[styles.semPillText, isSelected && styles.semPillTextActive]}>
                      {sem}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {canChooseElectives && (
              <Pressable
                style={styles.electiveHeaderBtn}
                onPress={() => {
                  hapticLight();
                  setShowElectiveModal(true);
                }}
              >
                <Ionicons name="bookmarks-outline" size={13} color={Colors.systemPurple} />
                <Text style={styles.electiveHeaderBtnText}>
                  Electives ({selectedElectiveIds.length})
                </Text>
              </Pressable>
            )}
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
              onPress={() => {
                hapticLight();
                setActiveTab('schedule');
              }}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={activeTab === 'schedule' ? Colors.white : Colors.textMuted}
              />
              <Text style={[styles.tabBtnText, activeTab === 'schedule' && styles.tabBtnTextActive]}>
                Class Schedule
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'courses' && styles.tabBtnActive]}
              onPress={() => {
                hapticLight();
                setActiveTab('courses');
              }}
            >
              <Ionicons
                name="list"
                size={16}
                color={activeTab === 'courses' ? Colors.white : Colors.textMuted}
              />
              <Text style={[styles.tabBtnText, activeTab === 'courses' && styles.tabBtnTextActive]}>
                Courses ({eligibleCourses.length})
              </Text>
            </Pressable>
          </View>

          {activeTab === 'schedule' ? (
            <View style={styles.mainArea}>
              {/* Days Strip */}
              <View style={styles.dayStrip}>
                {DAYS.map(day => {
                  const isSelected = selectedDay === day;
                  const isToday = getTodayDayKey() === day;
                  return (
                    <Pressable
                      key={day}
                      style={[styles.dayPill, isSelected && styles.dayPillActive]}
                      onPress={() => {
                        hapticLight();
                        setSelectedDay(day);
                      }}
                    >
                      <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                        {day}
                      </Text>
                      {isToday && (
                        <View style={[styles.todayIndicatorDot, isSelected && { backgroundColor: Colors.systemBlue }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <ScrollView contentContainerStyle={styles.scheduleList} showsVerticalScrollIndicator={false}>
                {currentDaySlots.map((slot, idx) => {
                  const isLunch = slot.slotCode === 'LUNCH';
                  const hasCourses = slot.courses.length > 0;
                  const hasElective = slot.courses.some(
                    c => c.program === 'Electives & Minors' || c.sourceFile === 'Electives_Aug 2026.xlsx'
                  );

                  return (
                    <View
                      key={`${slot.timeSlot}-${idx}`}
                      style={[
                        styles.slotCard,
                        isLunch && styles.slotCardLunch,
                        hasCourses && styles.slotCardCourse,
                        hasElective && styles.slotCardElective,
                      ]}
                    >
                      <View style={styles.slotTimeBox}>
                        <Text style={styles.slotTimeText}>{slot.timeSlot}</Text>
                        <View
                          style={[
                            styles.slotBadge,
                            isLunch && styles.slotBadgeLunch,
                            hasElective && styles.slotBadgeElective,
                          ]}
                        >
                          <Text style={styles.slotBadgeText}>
                            SLOT {slot.slotCode}
                          </Text>
                        </View>
                        {slot.courses.length > 1 && (
                          <View style={styles.multiCourseBadge}>
                            <Text style={styles.multiCourseBadgeText}>
                              {slot.courses.length}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.slotContent}>
                        {isLunch ? (
                          <View style={styles.lunchRow}>
                            <Ionicons name="restaurant-outline" size={16} color={Colors.systemOrange} />
                            <Text style={styles.lunchText}>Lunch Break</Text>
                          </View>
                        ) : hasCourses ? (
                          <View style={styles.multiCourseList}>
                            {slot.courses.map((course, cIdx) => {
                              const isElective = course.program === 'Electives & Minors' || course.sourceFile === 'Electives_Aug 2026.xlsx';
                              return (
                                <View
                                  key={`${course.id}-${cIdx}`}
                                  style={[
                                    styles.courseDetails,
                                    cIdx > 0 && styles.courseDetailsDivider,
                                  ]}
                                >
                                  <View style={styles.courseHeader}>
                                    <Text style={styles.courseCode}>{course.code}</Text>
                                    {isElective ? (
                                      <View style={styles.electiveBadge}>
                                        <Text style={styles.electiveBadgeText}>ELECTIVE</Text>
                                      </View>
                                    ) : (
                                      <View style={styles.coreBadge}>
                                        <Text style={styles.coreBadgeText}>CORE</Text>
                                      </View>
                                    )}
                                    {course.hall && (
                                      <View style={styles.hallBadge}>
                                        <Ionicons name="location-outline" size={12} color={Colors.systemBlue} />
                                        <Text style={styles.hallText}>{course.hall}</Text>
                                      </View>
                                    )}
                                  </View>

                                  <Text style={styles.courseName}>{course.name}</Text>
                                  {course.faculty ? (
                                    <Text style={styles.facultyText}>
                                      Faculty: {course.faculty}
                                    </Text>
                                  ) : null}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.freeRow}>
                            <Text style={styles.freeText}>No class scheduled in this slot</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            /* Eligible Courses List Tab */
            <View style={styles.mainArea}>
              <View style={styles.coursesContent}>
                {canChooseElectives && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.electiveBanner,
                      pressed && styles.electiveBannerPressed,
                    ]}
                    onPress={() => {
                      hapticLight();
                      setShowElectiveModal(true);
                    }}
                  >
                    <View style={styles.bannerLeft}>
                      <Ionicons name="bookmarks-outline" size={18} color={Colors.systemPurple} />
                      <View style={styles.bannerTexts}>
                        <Text style={styles.bannerTitle}>Elective Selection Open</Text>
                        <Text style={styles.bannerSub}>
                          {selectedElectiveIds.length > 0
                            ? `${selectedElectiveIds.length} elective course${selectedElectiveIds.length > 1 ? 's' : ''} active in schedule`
                            : 'Browse & opt into department electives'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bannerAction}>
                      <Text style={styles.bannerActionText}>Manage</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.systemPurple} />
                    </View>
                  </Pressable>
                )}

                {/* Search Bar */}
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search course code, title, faculty, hall, or slot..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Courses List */}
                <ScrollView contentContainerStyle={styles.coursesList} showsVerticalScrollIndicator={false}>
                  {filteredCourses.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                      <Text style={styles.emptyText}>No courses match your query</Text>
                    </View>
                  ) : (
                    filteredCourses.map((c, idx) => {
                      const isElective = c.program === 'Electives & Minors' || c.sourceFile === 'Electives_Aug 2026.xlsx';
                      return (
                        <View
                          key={`${c.id}-${idx}`}
                          style={[
                            styles.courseCard,
                            isElective && styles.courseCardElective,
                          ]}
                        >
                          <View style={styles.courseCardHeader}>
                            <View style={styles.codePill}>
                              <Text style={styles.codePillText}>{c.code}</Text>
                            </View>

                            <View style={styles.slotPill}>
                              <Text style={styles.slotPillText}>Slot {c.slot || 'N/A'}</Text>
                            </View>

                            {isElective ? (
                              <View style={styles.electiveBadge}>
                                <Text style={styles.electiveBadgeText}>ELECTIVE</Text>
                              </View>
                            ) : (
                              <View style={styles.coreBadge}>
                                <Text style={styles.coreBadgeText}>CORE</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.courseCardName}>{c.name}</Text>

                          <View style={styles.courseMetaGrid}>
                            <View style={styles.metaItem}>
                              <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                              <Text style={styles.metaText}>{c.faculty || 'Faculty TBD'}</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                              <Text style={styles.metaText}>{c.hall || 'Room TBD'}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <ElectiveSelectionModal
        visible={showElectiveModal}
        onClose={() => setShowElectiveModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  profileBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  semesterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  semPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardHover,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  semPillActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  semPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  semPillTextActive: {
    color: Colors.white,
  },
  electiveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(175, 82, 222, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginLeft: 'auto',
  },
  electiveHeaderBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemPurple,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  tabBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  mainArea: {
    flex: 1,
  },
  dayStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayPillActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: Colors.systemBlue,
  },
  dayPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  dayPillTextActive: {
    color: Colors.systemBlue,
    fontWeight: Typography.weight.bold,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.systemBlue,
    marginTop: 3,
  },
  scheduleList: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[3],
    paddingBottom: Spacing[10],
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    minHeight: 70,
  },
  slotCardLunch: {
    backgroundColor: 'rgba(255, 149, 0, 0.05)',
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  slotCardCourse: {
    borderColor: Colors.systemBlue + '40',
  },
  slotCardElective: {
    borderColor: Colors.systemPurple + '50',
    backgroundColor: 'rgba(175, 82, 222, 0.03)',
  },
  slotTimeBox: {
    width: 100,
    backgroundColor: Colors.cardHover,
    padding: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
  },
  slotTimeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  slotBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotBadgeLunch: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  slotBadgeElective: {
    backgroundColor: 'rgba(175, 82, 222, 0.15)',
  },
  slotBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  multiCourseBadge: {
    backgroundColor: Colors.systemPurple,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  multiCourseBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
  },
  slotContent: {
    flex: 1,
    padding: Spacing[3],
    justifyContent: 'center',
  },
  lunchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  lunchText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
  multiCourseList: {
    gap: Spacing[3],
  },
  courseDetails: {
    gap: 3,
  },
  courseDetailsDivider: {
    paddingTop: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  courseCode: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  electiveBadge: {
    backgroundColor: 'rgba(175, 82, 222, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  electiveBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemPurple,
  },
  coreBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coreBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  hallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hallText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  courseName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  facultyText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  freeRow: {
    justifyContent: 'center',
  },
  freeText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  coursesContent: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  electiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(175, 82, 222, 0.08)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(175, 82, 222, 0.3)',
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    marginBottom: Spacing[3],
  },
  electiveBannerPressed: {
    opacity: 0.8,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
  },
  bannerTexts: {
    gap: 2,
    flex: 1,
  },
  bannerTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemPurple,
  },
  bannerSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bannerActionText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemPurple,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    marginBottom: Spacing[3],
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
  },
  coursesList: {
    gap: Spacing[3],
    paddingBottom: Spacing[10],
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[10],
    gap: Spacing[2],
  },
  emptyText: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  courseCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  courseCardElective: {
    borderColor: 'rgba(175, 82, 222, 0.3)',
    backgroundColor: 'rgba(175, 82, 222, 0.03)',
  },
  courseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codePill: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  codePillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  slotPill: {
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  slotPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemPurple,
  },
  courseCardName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  courseMetaGrid: {
    gap: 4,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
});
