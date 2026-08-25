/**
 * Elective Selection Modal for 3rd & 4th Year Students (Semester 5 & 7).
 * Allows searching, filtering, and opting into elective courses from the university pool.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAcademicStore } from '@/store/academicStore';
import { Course } from '@/constants/academicData';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface ElectiveSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ElectiveSelectionModal({ visible, onClose }: ElectiveSelectionModalProps) {
  const {
    semester,
    program,
    selectedElectiveIds,
    toggleElective,
    getAvailableElectives,
    getCoreCourses,
    clearElectives,
  } = useAcademicStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Compute directly — store methods use get() internally
  const allElectives = getAvailableElectives();
  const coreCourses = getCoreCourses();

  // Extract all occupied slots by core courses to detect slot conflicts
  const coreSlots = useMemo(() => {
    const slotsSet = new Set<string>();
    coreCourses.forEach(c => {
      if (c.slot) {
        c.slot.split(/[\/\,\s\(\)]+/).forEach(t => {
          if (t.trim()) slotsSet.add(t.trim().toUpperCase());
        });
      }
    });
    return slotsSet;
  }, [coreCourses]);

  const filteredElectives = useMemo(() => {
    if (!searchQuery.trim()) return allElectives;
    const q = searchQuery.toLowerCase().trim();
    return allElectives.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.faculty.toLowerCase().includes(q) ||
        c.slot.toLowerCase().includes(q) ||
        c.hall.toLowerCase().includes(q)
    );
  }, [allElectives, searchQuery]);

  const handleToggle = (courseId: string) => {
    hapticLight();
    toggleElective(courseId);
  };

  const handleDone = () => {
    hapticSuccess();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Select Elective Courses</Text>
            <Text style={styles.headerSubtitle}>
              {semester} · {selectedElectiveIds.length} Selected
            </Text>
          </View>
          <Pressable onPress={handleDone} hitSlop={10} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search elective name, code, faculty, slot..."
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

        {/* Clear Presets Bar */}
        {selectedElectiveIds.length > 0 && (
          <View style={styles.clearBar}>
            <Text style={styles.selectedCountText}>
              {selectedElectiveIds.length} elective{selectedElectiveIds.length > 1 ? 's' : ''} opted
            </Text>
            <Pressable
              onPress={() => {
                hapticLight();
                clearElectives();
              }}
            >
              <Text style={styles.clearText}>Clear All</Text>
            </Pressable>
          </View>
        )}

        {/* Electives Roster */}
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredElectives.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="book-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No electives match your search criteria</Text>
            </View>
          ) : (
            filteredElectives.map((c) => {
              const isSelected = selectedElectiveIds.includes(c.id);

              // Check if elective slot conflicts with core course slot
              const electiveTokens = c.slot.split(/[\/\,\s\(\)]+/).filter(Boolean);
              const hasConflict = electiveTokens.some(t => coreSlots.has(t.toUpperCase()));

              return (
                <Pressable
                  key={c.id}
                  style={({ pressed }) => [
                    styles.card,
                    isSelected && styles.cardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleToggle(c.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.codePill}>
                      <Text style={styles.codePillText}>{c.code}</Text>
                    </View>

                    <View style={styles.slotPill}>
                      <Text style={styles.slotPillText}>Slot {c.slot || 'N/A'}</Text>
                    </View>

                    {hasConflict && (
                      <View style={styles.conflictBadge}>
                        <Ionicons name="warning-outline" size={12} color={Colors.systemOrange} />
                        <Text style={styles.conflictText}>Slot Conflict</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.courseName}>{c.name}</Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{c.faculty || 'Faculty TBD'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{c.hall || 'Room TBD'}</Text>
                    </View>
                  </View>

                  <View style={styles.checkWrap}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                    </View>
                    <Text style={[styles.checkLabel, isSelected && styles.checkLabelActive]}>
                      {isSelected ? 'Opted In' : 'Tap to Opt In'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  headerTitleWrap: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.medium,
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
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
  },
  clearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  selectedCountText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  clearText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemRed,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardSelected: {
    borderColor: Colors.systemBlue,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  codePill: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
    borderRadius: 4,
  },
  slotPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemPurple,
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  conflictText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
  courseName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  metaRow: {
    gap: 4,
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
  checkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[1],
    paddingTop: Spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  checkLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  checkLabelActive: {
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
});
