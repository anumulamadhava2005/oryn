/**
 * Attendance & Bunk Forecaster Modal
 * Displays enrolled courses with real-time 75%/85% compliance metrics,
 * visual attendance gauges, safe bunk calculator, what-if simulator,
 * and manual adjustment controls.
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAcademicStore } from '@/store/academicStore';
import { useAttendanceStore, CourseAttendanceRecord } from '@/store/attendanceStore';
import { hapticLight, hapticSuccess, hapticWarning } from '@/utils/haptics';

interface AttendanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AttendanceModal({ visible, onClose }: AttendanceModalProps) {
  const { getEligibleCourses, program, semester } = useAcademicStore();
  const {
    records,
    globalThreshold,
    setGlobalThreshold,
    markAttendance,
    undoLastAction,
    setManualCounts,
    resetCourseAttendance,
  } = useAttendanceStore();

  const eligibleCourses = getEligibleCourses();

  // Selected course for "What-If" simulation or manual edit
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [simulateBunkCount, setSimulateBunkCount] = useState<number>(1);
  const [editModalCourse, setEditModalCourse] = useState<CourseAttendanceRecord | null>(null);
  const [editAttendedText, setEditAttendedText] = useState('');
  const [editTotalText, setEditTotalText] = useState('');

  const activeCourses = useMemo(() => {
    // Map eligible courses to attendance records
    return eligibleCourses.map(course => {
      const rec = records[course.id] || {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        attended: 0,
        totalHeld: 0,
        targetThreshold: globalThreshold,
        logs: [],
      };

      const T = rec.targetThreshold / 100;
      const percentage = rec.totalHeld > 0 ? (rec.attended / rec.totalHeld) * 100 : 100;
      let safeBunks = 0;
      let mustAttend = 0;

      if (percentage >= rec.targetThreshold) {
        safeBunks = Math.floor((rec.attended - T * rec.totalHeld) / T);
        if (safeBunks < 0) safeBunks = 0;
      } else {
        mustAttend = Math.ceil((T * rec.totalHeld - rec.attended) / (1 - T));
        if (mustAttend < 0) mustAttend = 0;
      }

      let statusLevel: 'good' | 'warning' | 'critical' = 'good';
      if (percentage < rec.targetThreshold) {
        statusLevel = 'critical';
      } else if (percentage < rec.targetThreshold + 5) {
        statusLevel = 'warning';
      }

      return {
        course,
        record: rec,
        percentage: Math.round(percentage * 10) / 10,
        safeBunks,
        mustAttend,
        statusLevel,
      };
    });
  }, [eligibleCourses, records, globalThreshold]);

  // Overall attendance calculation
  const overallStats = useMemo(() => {
    let totalAttended = 0;
    let totalClasses = 0;

    activeCourses.forEach(c => {
      totalAttended += c.record.attended;
      totalClasses += c.record.totalHeld;
    });

    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 100;
    return {
      totalAttended,
      totalClasses,
      overallPct,
    };
  }, [activeCourses]);

  const handleToggleThreshold = () => {
    hapticLight();
    const next = globalThreshold === 75 ? 85 : 75;
    setGlobalThreshold(next);
  };

  const handleOpenEdit = (record: CourseAttendanceRecord) => {
    hapticLight();
    setEditModalCourse(record);
    setEditAttendedText(record.attended.toString());
    setEditTotalText(record.totalHeld.toString());
  };

  const handleSaveManualEdit = () => {
    if (!editModalCourse) return;
    const att = parseInt(editAttendedText.trim(), 10);
    const tot = parseInt(editTotalText.trim(), 10);

    if (isNaN(att) || isNaN(tot) || att < 0 || tot < 0 || att > tot) {
      Alert.alert('Invalid Counts', 'Attended classes cannot exceed total held classes.');
      return;
    }

    hapticSuccess();
    setManualCounts(editModalCourse.courseId, att, tot);
    setEditModalCourse(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBox}>
              <Ionicons name="pie-chart" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Attendance & Bunk Forecaster</Text>
              <Text style={styles.headerSubtitle}>
                {program} · {semester}
              </Text>
            </View>
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressedScale]} hitSlop={8}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Executive Overview Banner */}
          <View style={styles.summaryBanner}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>OVERALL ATTENDANCE</Text>
              <View style={styles.summaryValueRow}>
                <Text
                  style={[
                    styles.summaryValue,
                    overallStats.overallPct < globalThreshold
                      ? styles.textCritical
                      : overallStats.overallPct < globalThreshold + 5
                      ? styles.textWarning
                      : styles.textGood,
                  ]}
                >
                  {overallStats.overallPct}%
                </Text>
                <View
                  style={[
                    styles.complianceBadge,
                    overallStats.overallPct >= globalThreshold
                      ? styles.complianceBadgeGood
                      : styles.complianceBadgeCritical,
                  ]}
                >
                  <Ionicons
                    name={overallStats.overallPct >= globalThreshold ? 'shield-checkmark' : 'alert-circle'}
                    size={12}
                    color={overallStats.overallPct >= globalThreshold ? Colors.systemGreen : Colors.systemRed}
                  />
                  <Text
                    style={[
                      styles.complianceText,
                      overallStats.overallPct >= globalThreshold ? styles.textGood : styles.textCritical,
                    ]}
                  >
                    {overallStats.overallPct >= globalThreshold ? 'Eligible' : 'At Risk'}
                  </Text>
                </View>
              </View>
              <Text style={styles.summarySub}>
                {overallStats.totalAttended} of {overallStats.totalClasses} total lectures attended
              </Text>
            </View>

            {/* Threshold Selector Button */}
            <Pressable
              onPress={handleToggleThreshold}
              style={({ pressed }) => [styles.thresholdBtn, pressed && styles.pressedScale]}
            >
              <Text style={styles.thresholdBtnLabel}>LIMIT</Text>
              <Text style={styles.thresholdBtnValue}>{globalThreshold}%</Text>
              <Text style={styles.thresholdBtnHelp}>Tap to switch</Text>
            </Pressable>
          </View>

          {/* Courses List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ENROLLED COURSES ({activeCourses.length})</Text>
            <Text style={styles.sectionHelp}>Tap course to simulate bunks</Text>
          </View>

          {activeCourses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Enrolled Courses Found</Text>
              <Text style={styles.emptySubtitle}>
                Configure your program and semester in Timetable Settings to track attendance.
              </Text>
            </View>
          ) : (
            activeCourses.map(item => {
              const isSelected = selectedCourseId === item.course.id;
              const hasData = item.record.totalHeld > 0;

              // Simulated Projected % if selected
              const projectedTotal = item.record.totalHeld + simulateBunkCount;
              const projectedPct =
                projectedTotal > 0
                  ? Math.round((item.record.attended / projectedTotal) * 1000) / 10
                  : 100;

              return (
                <View key={item.course.id} style={[styles.courseCard, isSelected && styles.courseCardSelected]}>
                  {/* Top Row: Course Code, Name & Status */}
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setSelectedCourseId(isSelected ? null : item.course.id);
                    }}
                    style={styles.courseHeaderPressable}
                  >
                    <View style={styles.courseTitleCol}>
                      <View style={styles.codeRow}>
                        <View style={styles.slotPill}>
                          <Text style={styles.slotPillText}>{item.course.slot}</Text>
                        </View>
                        <Text style={styles.courseCode}>{item.course.code}</Text>
                      </View>
                      <Text style={styles.courseName} numberOfLines={1}>
                        {item.course.name}
                      </Text>
                    </View>

                    <View style={styles.percentageCol}>
                      <Text
                        style={[
                          styles.percentageText,
                          item.statusLevel === 'good'
                            ? styles.textGood
                            : item.statusLevel === 'warning'
                            ? styles.textWarning
                            : styles.textCritical,
                        ]}
                      >
                        {hasData ? `${item.percentage}%` : '100%'}
                      </Text>
                      <Text style={styles.ratioText}>
                        {item.record.attended}/{item.record.totalHeld} classes
                      </Text>
                    </View>
                  </Pressable>

                  {/* Visual Progress Bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                          backgroundColor:
                            item.statusLevel === 'good'
                              ? Colors.systemGreen
                              : item.statusLevel === 'warning'
                              ? Colors.systemOrange
                              : Colors.systemRed,
                        },
                      ]}
                    />
                    {/* 75% target threshold marker line */}
                    <View style={[styles.thresholdMarker, { left: `${item.record.targetThreshold}%` }]} />
                  </View>

                  {/* Bunk Forecaster Status Strip */}
                  <View style={styles.bunkForecasterRow}>
                    {item.percentage >= item.record.targetThreshold ? (
                      <View style={styles.bunkStatusLeft}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.systemGreen} />
                        <Text style={styles.bunkSafeText}>
                          {item.safeBunks > 0
                            ? `Safe to bunk next ${item.safeBunks} lecture${item.safeBunks > 1 ? 's' : ''}`
                            : 'No safe bunks remaining (on the boundary)'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.bunkStatusLeft}>
                        <Ionicons name="warning" size={14} color={Colors.systemRed} />
                        <Text style={styles.bunkDangerText}>
                          Must attend next {item.mustAttend} lecture{item.mustAttend > 1 ? 's' : ''} consecutively
                        </Text>
                      </View>
                    )}

                    <Pressable
                      onPress={() => handleOpenEdit(item.record)}
                      style={({ pressed }) => [styles.editBtn, pressed && styles.pressedScale]}
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                  </View>

                  {/* Quick Action Controls (Present, Absent, Undo) */}
                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      onPress={() => {
                        hapticSuccess();
                        markAttendance(item.course.id, item.course.code, item.course.name, 'present');
                      }}
                      style={({ pressed }) => [styles.markBtn, styles.markBtnPresent, pressed && styles.pressedScale]}
                    >
                      <Ionicons name="checkmark" size={14} color={Colors.systemGreen} />
                      <Text style={styles.markBtnTextPresent}>+ Attended</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        hapticWarning();
                        markAttendance(item.course.id, item.course.code, item.course.name, 'absent');
                      }}
                      style={({ pressed }) => [styles.markBtn, styles.markBtnAbsent, pressed && styles.pressedScale]}
                    >
                      <Ionicons name="close" size={14} color={Colors.systemRed} />
                      <Text style={styles.markBtnTextAbsent}>+ Bunked</Text>
                    </Pressable>

                    {item.record.logs.length > 0 && (
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          undoLastAction(item.course.id);
                        }}
                        style={({ pressed }) => [styles.undoBtn, pressed && styles.pressedScale]}
                        hitSlop={6}
                      >
                        <Ionicons name="arrow-undo-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.undoBtnText}>Undo</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* What-If Simulator Drawer (Expanded when selected) */}
                  {isSelected && (
                    <MotiView
                      from={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ type: 'timing', duration: 200 }}
                      style={styles.simulatorDrawer}
                    >
                      <View style={styles.simulatorHeader}>
                        <Ionicons name="calculator-outline" size={14} color={Colors.systemBlue} />
                        <Text style={styles.simulatorTitle}>BUNK IMPACT SIMULATOR</Text>
                      </View>

                      <View style={styles.simulatorControlsRow}>
                        <Text style={styles.simulatorLabel}>If you miss next</Text>
                        <View style={styles.stepperWrap}>
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              setSimulateBunkCount(Math.max(1, simulateBunkCount - 1));
                            }}
                            style={styles.stepperBtn}
                          >
                            <Ionicons name="remove" size={14} color="#FFFFFF" />
                          </Pressable>
                          <Text style={styles.stepperValue}>{simulateBunkCount}</Text>
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              setSimulateBunkCount(simulateBunkCount + 1);
                            }}
                            style={styles.stepperBtn}
                          >
                            <Ionicons name="add" size={14} color="#FFFFFF" />
                          </Pressable>
                        </View>
                        <Text style={styles.simulatorLabel}>class(es):</Text>
                      </View>

                      <View style={styles.simulatorResultBox}>
                        <Text style={styles.simulatorResultText}>
                          Projected Attendance:
                          <Text
                            style={[
                              styles.projectedValue,
                              projectedPct < item.record.targetThreshold ? styles.textCritical : styles.textGood,
                            ]}
                          >
                            {' '}{projectedPct}%
                          </Text>
                        </Text>
                        <Text style={styles.simulatorResultSub}>
                          {projectedPct < item.record.targetThreshold
                            ? '⚠️ Will drop below the mandatory cutoff!'
                            : '✅ Still safely above the 75% limit.'}
                        </Text>
                      </View>
                    </MotiView>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Manual Adjust Modal */}
        {editModalCourse && (
          <Modal transparent animationType="fade" visible={!!editModalCourse}>
            <Pressable style={styles.dialogOverlay} onPress={() => setEditModalCourse(null)}>
              <Pressable style={styles.dialogCard} onPress={e => e.stopPropagation()}>
                <Text style={styles.dialogTitle}>Set Current Counts</Text>
                <Text style={styles.dialogSub}>
                  {editModalCourse.courseCode} — {editModalCourse.courseName}
                </Text>

                <View style={styles.dialogInputRow}>
                  <View style={styles.dialogInputCol}>
                    <Text style={styles.dialogInputLabel}>Attended Classes</Text>
                    <TextInput
                      value={editAttendedText}
                      onChangeText={setEditAttendedText}
                      keyboardType="number-pad"
                      style={styles.dialogInput}
                      placeholder="e.g. 14"
                      placeholderTextColor="#71717A"
                    />
                  </View>

                  <View style={styles.dialogInputCol}>
                    <Text style={styles.dialogInputLabel}>Total Held Classes</Text>
                    <TextInput
                      value={editTotalText}
                      onChangeText={setEditTotalText}
                      keyboardType="number-pad"
                      style={styles.dialogInput}
                      placeholder="e.g. 18"
                      placeholderTextColor="#71717A"
                    />
                  </View>
                </View>

                <View style={styles.dialogActionRow}>
                  <Pressable
                    onPress={() => setEditModalCourse(null)}
                    style={[styles.dialogBtn, styles.dialogBtnCancel]}
                  >
                    <Text style={styles.dialogBtnTextCancel}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveManualEdit}
                    style={[styles.dialogBtn, styles.dialogBtnSave]}
                  >
                    <Text style={styles.dialogBtnTextSave}>Save Counts</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
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
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  content: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: 40,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.xl,
    padding: Spacing[4],
  },
  summaryMetric: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    color: Colors.textMuted,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: Typography.weight.bold,
  },
  complianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  complianceBadgeGood: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  complianceBadgeCritical: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  complianceText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
  },
  summarySub: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  thresholdBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  thresholdBtnLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
    letterSpacing: 0.5,
  },
  thresholdBtnValue: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  thresholdBtnHelp: {
    fontSize: 9,
    color: '#A1A1AA',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    color: Colors.textMuted,
  },
  sectionHelp: {
    fontSize: 11,
    color: Colors.systemBlue,
  },
  courseCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3.5],
    gap: Spacing[2.5],
  },
  courseCardSelected: {
    borderColor: Colors.systemBlue,
  },
  courseHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseTitleCol: {
    flex: 1,
    gap: 3,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotPill: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  slotPillText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  courseCode: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  courseName: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  percentageCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
  },
  ratioText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27272A',
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  thresholdMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
  },
  bunkForecasterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  bunkStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  bunkSafeText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemGreen,
  },
  bunkDangerText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemRed,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editBtnText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing[2.5],
  },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  markBtnPresent: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: 'rgba(52, 199, 89, 0.35)',
  },
  markBtnTextPresent: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.systemGreen,
  },
  markBtnAbsent: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.35)',
  },
  markBtnTextAbsent: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.systemRed,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  undoBtnText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  simulatorDrawer: {
    backgroundColor: '#18181B',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  simulatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  simulatorTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.6,
    color: Colors.systemBlue,
  },
  simulatorControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simulatorLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    paddingHorizontal: 8,
  },
  simulatorResultBox: {
    backgroundColor: '#1E1E22',
    padding: Spacing[2.5],
    borderRadius: Radius.sm,
    gap: 2,
  },
  simulatorResultText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: '#D4D4D8',
  },
  projectedValue: {
    fontWeight: Typography.weight.bold,
  },
  simulatorResultSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    gap: 8,
  },
  emptyTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  textGood: {
    color: Colors.systemGreen,
  },
  textWarning: {
    color: Colors.systemOrange,
  },
  textCritical: {
    color: Colors.systemRed,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[4],
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1C1C1E',
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dialogTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  dialogSub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  dialogInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogInputCol: {
    flex: 1,
    gap: 4,
  },
  dialogInputLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  dialogInput: {
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  dialogActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  dialogBtnCancel: {
    backgroundColor: '#27272A',
  },
  dialogBtnTextCancel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#D4D4D8',
  },
  dialogBtnSave: {
    backgroundColor: Colors.systemBlue,
  },
  dialogBtnTextSave: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
});
