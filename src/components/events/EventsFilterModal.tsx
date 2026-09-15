/**
 * EventsFilterModal — Apple HIG Bottom Sheet Modal for filtering Campus Events.
 * Allows choosing categories with crisp icons and zero vibe-coded blue styling.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { DISTRICT_CATEGORIES, type DistrictCategory } from '@/store/eventsStore';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface EventsFilterModalProps {
  visible: boolean;
  activeCategory: DistrictCategory;
  onClose: () => void;
  onApplyCategory: (cat: DistrictCategory) => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  All: 'grid-outline',
  Technical: 'code-slash-outline',
  Cultural: 'musical-notes-outline',
  Design: 'color-palette-outline',
  Hardware: 'hardware-chip-outline',
  Gaming: 'game-controller-outline',
  Workshops: 'construct-outline',
  Sports: 'football-outline',
};

export function EventsFilterModal({
  visible,
  activeCategory,
  onClose,
  onApplyCategory,
}: EventsFilterModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState<DistrictCategory>(activeCategory);

  useEffect(() => {
    setSelectedCat(activeCategory);
  }, [activeCategory, visible]);

  const handleApply = () => {
    hapticSuccess();
    onApplyCategory(selectedCat);
    onClose();
  };

  const handleReset = () => {
    hapticLight();
    setSelectedCat('All');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Apple Grab Handle */}
          <View style={styles.grabHandle} />

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleReset} hitSlop={10} style={styles.headerActionBtn}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>

            <Text style={styles.headerTitle}>Filter Events</Text>

            <Pressable
              onPress={() => {
                hapticLight();
                onClose();
              }}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Category</Text>

            <View style={styles.optionsCard}>
              {DISTRICT_CATEGORIES.map((cat, idx) => {
                const isSelected = selectedCat === cat;
                const isLast = idx === DISTRICT_CATEGORIES.length - 1;
                const icon = CATEGORY_ICONS[cat] || 'grid-outline';

                return (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      !isLast && styles.optionRowBorder,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => {
                      hapticLight();
                      setSelectedCat(cat);
                    }}
                  >
                    <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                      <Ionicons
                        name={icon}
                        size={17}
                        color={isSelected ? Colors.text : Colors.textMuted}
                      />
                    </View>

                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {cat}
                    </Text>

                    {isSelected && (
                      <Ionicons name="checkmark" size={19} color={Colors.text} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Action Button */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
              onPress={handleApply}
            >
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
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
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  headerActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resetText: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing[4],
    paddingBottom: Spacing[6],
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.wider,
    marginBottom: Spacing[2.5],
    paddingLeft: Spacing[1],
  },
  optionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: 13,
    gap: 12,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderMuted,
  },
  optionRowSelected: {
    backgroundColor: Colors.surfaceElevated,
  },
  optionRowPressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: Colors.surfaceHigh,
  },
  optionLabel: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  optionLabelSelected: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  footer: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2.5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  applyBtn: {
    backgroundColor: Colors.text,
    height: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnPressed: {
    opacity: 0.9,
  },
  applyBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.background,
  },
});
