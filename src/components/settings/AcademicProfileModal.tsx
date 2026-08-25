/**
 * Academic Profile Selection Modal
 * Allows student to select program/branch and current semester.
 * Provides elective selection options for 3rd & 4th year students.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import {
  PROGRAM_OPTIONS,
  SEMESTER_OPTIONS,
  ProgramType,
  SemesterType,
} from '@/constants/academicData';
import { useAcademicStore } from '@/store/academicStore';
import { ElectiveSelectionModal } from '@/components/academic/ElectiveSelectionModal';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface AcademicProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenTimetable?: () => void;
}

export function AcademicProfileModal({
  visible,
  onClose,
  onOpenTimetable,
}: AcademicProfileModalProps) {
  const {
    program,
    semester,
    selectedElectiveIds,
    setProgram,
    setSemester,
    isElectivesAvailable,
  } = useAcademicStore();

  const [showElectiveModal, setShowElectiveModal] = useState(false);

  const canChooseElectives = isElectivesAvailable();

  const handleSelectProgram = (p: ProgramType) => {
    hapticLight();
    setProgram(p);
  };

  const handleSelectSemester = (s: SemesterType) => {
    hapticLight();
    setSemester(s);
  };

  const handleDone = () => {
    hapticSuccess();
    onClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent onRequestClose={onClose}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle}>Academic Profile</Text>
            <Pressable onPress={handleDone} hitSlop={10} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Select your enrolled branch/program and active semester to generate your personalized class schedule and view eligible courses.
            </Text>

            {/* Program Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Enrolled Program / Branch</Text>
              <View style={styles.cardGroup}>
                {PROGRAM_OPTIONS.map((item, idx) => {
                  const isSelected = program === item;
                  const isLast = idx === PROGRAM_OPTIONS.length - 1;
                  return (
                    <Pressable
                      key={item}
                      style={({ pressed }) => [
                        styles.rowItem,
                        isSelected && styles.selectedRow,
                        pressed && styles.pressedRow,
                        !isLast && styles.borderBottom,
                      ]}
                      onPress={() => handleSelectProgram(item)}
                    >
                      <View style={styles.rowLeft}>
                        <View style={[styles.badgeIcon, isSelected && styles.badgeIconActive]}>
                          <Ionicons
                            name={item.includes('Dual') ? 'school' : 'book'}
                            size={16}
                            color={isSelected ? Colors.white : Colors.systemBlue}
                          />
                        </View>
                        <Text style={[styles.rowTitle, isSelected && styles.rowTitleActive]}>
                          {item}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.systemBlue} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Semester Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Active Semester</Text>
              <View style={styles.grid2x2}>
                {SEMESTER_OPTIONS.map((sem) => {
                  const isSelected = semester === sem;
                  return (
                    <Pressable
                      key={sem}
                      style={({ pressed }) => [
                        styles.semCard,
                        isSelected && styles.semCardActive,
                        pressed && styles.pressedRow,
                      ]}
                      onPress={() => handleSelectSemester(sem)}
                    >
                      <Text style={[styles.semNumber, isSelected && styles.semNumberActive]}>
                        {sem.replace('Semester ', 'SEM ')}
                      </Text>
                      <Text style={[styles.semLabel, isSelected && styles.semLabelActive]}>{sem}</Text>
                      {isSelected && (
                        <View style={styles.semCheck}>
                          <Ionicons name="checkmark" size={14} color={Colors.white} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Electives Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Electives & Minors</Text>
              {canChooseElectives ? (
                <Pressable
                  style={({ pressed }) => [styles.electiveCard, pressed && styles.pressedRow]}
                  onPress={() => {
                    hapticLight();
                    setShowElectiveModal(true);
                  }}
                >
                  <View style={styles.electiveLeft}>
                    <View style={styles.electiveIconBox}>
                      <Ionicons name="sparkles" size={18} color={Colors.systemPurple} />
                    </View>
                    <View style={styles.electiveTexts}>
                      <Text style={styles.electiveTitle}>Choose Semester Electives</Text>
                      <Text style={styles.electiveSub}>
                        {selectedElectiveIds.length > 0
                          ? `${selectedElectiveIds.length} elective${selectedElectiveIds.length > 1 ? 's' : ''} opted in`
                          : 'Tap to browse and select electives'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : (
                <View style={styles.noElectivesBox}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
                  <Text style={styles.noElectivesText}>
                    1st Year ({semester}) has a mandatory core curriculum. Elective selection is available for Semester 3, 5, & 7.
                  </Text>
                </View>
              )}
            </View>

            {/* View Timetable Button */}
            {onOpenTimetable && (
              <Pressable
                style={({ pressed }) => [styles.timetableBtn, pressed && styles.timetableBtnPressed]}
                onPress={() => {
                  onClose();
                  onOpenTimetable();
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.white} />
                <Text style={styles.timetableBtnText}>View Class Schedule & Eligible Courses</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </Pressable>
            )}
          </ScrollView>
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  doneBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  doneText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[6],
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  section: {
    gap: Spacing[3],
  },
  sectionHeader: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.widest,
    paddingLeft: Spacing[1],
  },
  cardGroup: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
  },
  selectedRow: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  pressedRow: {
    opacity: 0.8,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  badgeIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconActive: {
    backgroundColor: Colors.systemBlue,
  },
  rowTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  rowTitleActive: {
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  semCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[1],
    position: 'relative',
  },
  semCardActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: Colors.systemBlue,
  },
  semNumber: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
    letterSpacing: Typography.tracking.wider,
  },
  semNumberActive: {
    color: Colors.systemBlue,
  },
  semLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  semLabelActive: {
    color: Colors.systemBlue,
  },
  semCheck: {
    position: 'absolute',
    top: Spacing[3],
    right: Spacing[3],
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  electiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  electiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  electiveIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  electiveTexts: {
    gap: 2,
    flex: 1,
  },
  electiveTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  electiveSub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  noElectivesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.cardHover,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noElectivesText: {
    flex: 1,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  timetableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.systemBlue,
    paddingVertical: 14,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.xl,
    marginTop: Spacing[2],
  },
  timetableBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  timetableBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
  },
});
