/**
 * LostFoundFilterModal — Apple HIG Bottom Sheet Modal for filtering Lost & Found items.
 * Allows filtering by item category and status (All / Lost / Found / Mine).
 * Pure monochrome Apple design, no vibe-coded blue styling.
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
import { hapticLight, hapticSuccess } from '@/utils/haptics';

import {
  CATEGORIES,
  type LostFoundCategory,
  type LostFoundTab,
} from '@/store/lostFoundStore';

export type { LostFoundCategory, LostFoundTab };

const CATEGORY_ICONS: Record<LostFoundCategory, React.ComponentProps<typeof Ionicons>['name']> = {
  All: 'grid-outline',
  Electronics: 'phone-portrait-outline',
  Documents: 'document-text-outline',
  Clothing: 'shirt-outline',
  Keys: 'key-outline',
  Wallet: 'wallet-outline',
  Bag: 'bag-handle-outline',
  Bottle: 'water-outline',
  Other: 'cube-outline',
};

const STATUS_OPTIONS: { key: LostFoundTab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'all', label: 'All Items', icon: 'layers-outline' },
  { key: 'lost', label: 'Lost Only', icon: 'help-circle-outline' },
  { key: 'found', label: 'Found Only', icon: 'checkmark-circle-outline' },
  { key: 'my_posts', label: 'My Posts', icon: 'person-outline' },
];

interface LostFoundFilterModalProps {
  visible: boolean;
  activeTab: LostFoundTab;
  activeCategory: LostFoundCategory;
  onClose: () => void;
  onApply: (tab: LostFoundTab, category: LostFoundCategory) => void;
}

export function LostFoundFilterModal({
  visible,
  activeTab,
  activeCategory,
  onClose,
  onApply,
}: LostFoundFilterModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<LostFoundTab>(activeTab);
  const [selectedCat, setSelectedCat] = useState<LostFoundCategory>(
    activeCategory || 'All'
  );

  useEffect(() => {
    setSelectedTab(activeTab);
    setSelectedCat(activeCategory || 'All');
  }, [activeTab, activeCategory, visible]);

  const handleApply = () => {
    hapticSuccess();
    onApply(selectedTab, selectedCat);
    onClose();
  };

  const handleReset = () => {
    hapticLight();
    setSelectedTab('all');
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

            <Text style={styles.headerTitle}>Filter Items</Text>

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
            {/* Status Scope Section */}
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedTab === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={({ pressed }) => [
                      styles.statusPill,
                      isSelected && styles.statusPillSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      hapticLight();
                      setSelectedTab(opt.key);
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={15}
                      color={isSelected ? Colors.text : Colors.textMuted}
                    />
                    <Text style={[styles.statusPillText, isSelected && styles.statusPillTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Category Section */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing[4] }]}>Category</Text>
            <View style={styles.optionsCard}>
              {CATEGORIES.map((cat, idx) => {
                const isSelected = selectedCat === cat;
                const isLast = idx === CATEGORIES.length - 1;
                const icon = CATEGORY_ICONS[cat] || 'grid-outline';

                return (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      !isLast && styles.optionRowBorder,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      hapticLight();
                      setSelectedCat(cat);
                    }}
                  >
                    <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                      <Ionicons
                        name={icon}
                        size={16}
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

          {/* Footer */}
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
    marginBottom: Spacing[2],
    paddingLeft: Spacing[1],
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusPillSelected: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.textSecondary,
  },
  statusPillText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  statusPillTextSelected: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
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
    paddingVertical: 12,
    gap: 12,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderMuted,
  },
  optionRowSelected: {
    backgroundColor: Colors.surfaceElevated,
  },
  pressed: {
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
