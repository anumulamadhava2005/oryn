/**
 * ClassificationFeedback — allows users to confirm or correct email categorization.
 * Stores corrections in MMKV for future classifier weighting.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { MMKV } from 'react-native-mmkv';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GROUP_META } from '@/constants/categories';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import type { Category, CategoryGroup } from '@/types/email';

const storage = new MMKV({ id: 'oryn-feedback' });
const CORRECTIONS_KEY = 'classification:corrections';

interface Correction {
  emailId: string;
  originalCategory: Category;
  originalGroup: CategoryGroup;
  correctedGroup: CategoryGroup;
  timestamp: number;
}

function getCorrections(): Correction[] {
  const raw = storage.getString(CORRECTIONS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Correction[]; }
  catch { return []; }
}

function saveCorrection(correction: Correction): void {
  const corrections = getCorrections().filter(c => c.emailId !== correction.emailId);
  corrections.push(correction);
  // Keep last 200 corrections
  storage.set(CORRECTIONS_KEY, JSON.stringify(corrections.slice(-200)));
}

export function getCorrectionsForGroup(group: CategoryGroup): number {
  return getCorrections().filter(c => c.correctedGroup === group).length;
}

interface Props {
  emailId: string;
  currentCategory: Category;
  currentGroup: CategoryGroup;
  onCategoryChange: (category: Category, group: CategoryGroup) => void;
}

const ALL_GROUPS: CategoryGroup[] = [
  'academics', 'placement', 'mess', 'hostel', 'technical',
  'GCR', 'admin', 'events', 'important', 'general',
];

export function ClassificationFeedback({ emailId, currentCategory, currentGroup, onCategoryChange }: Props) {
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [showPicker, setShowPicker] = useState(false);

  const handleCorrect = useCallback(() => {
    hapticLight();
    setFeedback('correct');
    setShowPicker(false);
  }, []);

  const handleIncorrect = useCallback(() => {
    hapticLight();
    setFeedback('incorrect');
    setShowPicker(true);
  }, []);

  const handleSelectGroup = useCallback((group: CategoryGroup) => {
    hapticSuccess();
    const category = group as unknown as Category;
    saveCorrection({
      emailId,
      originalCategory: currentCategory,
      originalGroup: currentGroup,
      correctedGroup: group,
      timestamp: Date.now(),
    });
    onCategoryChange(category, group);
    setFeedback('correct');
    setShowPicker(false);
  }, [emailId, currentCategory, currentGroup, onCategoryChange]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="sparkles-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.headerText}>Is this categorized correctly?</Text>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          onPress={handleCorrect}
          style={({ pressed }) => [
            styles.feedbackBtn,
            feedback === 'correct' && styles.feedbackBtnActive,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons
            name={feedback === 'correct' ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={feedback === 'correct' ? Colors.systemGreen : Colors.textMuted}
          />
          <Text style={[
            styles.feedbackBtnText,
            feedback === 'correct' && { color: Colors.systemGreen },
          ]}>
            Yes
          </Text>
        </Pressable>

        <Pressable
          onPress={handleIncorrect}
          style={({ pressed }) => [
            styles.feedbackBtn,
            feedback === 'incorrect' && styles.feedbackBtnIncorrect,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons
            name={feedback === 'incorrect' ? 'thumbs-down' : 'thumbs-down-outline'}
            size={16}
            color={feedback === 'incorrect' ? Colors.systemOrange : Colors.textMuted}
          />
          <Text style={[
            styles.feedbackBtnText,
            feedback === 'incorrect' && { color: Colors.systemOrange },
          ]}>
            No, fix it
          </Text>
        </Pressable>
      </View>

      <AnimatePresence>
        {showPicker && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={styles.pickerLabel}>Select the correct category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {ALL_GROUPS.filter(g => g !== currentGroup).map((group) => {
                const meta = GROUP_META[group as keyof typeof GROUP_META];
                const color = (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemGray;
                return (
                  <Pressable
                    key={group}
                    onPress={() => handleSelectGroup(group)}
                    style={({ pressed }) => [
                      styles.groupPill,
                      { borderColor: color + '50', backgroundColor: color + '15' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.groupPillText, { color }]}>
                      {meta?.label ?? group}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>

      {feedback === 'correct' && (
        <Text style={styles.thankYou}>Thanks for the feedback! 🎉</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedbackBtnActive: {
    backgroundColor: Colors.successFaded,
    borderColor: Colors.success + '40',
  },
  feedbackBtnIncorrect: {
    backgroundColor: Colors.warningFaded,
    borderColor: Colors.warning + '40',
  },
  feedbackBtnText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  pickerLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: Spacing[1],
    marginBottom: 4,
  },
  pickerRow: {
    gap: Spacing[2],
    paddingBottom: 2,
  },
  groupPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  groupPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  thankYou: {
    fontSize: Typography.size.xs,
    color: Colors.systemGreen,
    fontWeight: Typography.weight.medium,
  },
});
