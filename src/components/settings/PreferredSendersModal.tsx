/**
 * PreferredSendersModal — Apple HIG styled modal sheet for choosing prominent senders
 * and managing default app-open inbox filter settings.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Switch,
  FlatList,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { usePreferredSendersStore } from '@/store/preferredSenders';
import { useEmails, type FrequentSenderInfo } from '@/hooks/useEmails';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PreferredSendersModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { frequentSenders } = useEmails();
  const {
    selectedSenders,
    filterOnAppOpen,
    setSelectedSenders,
    setFilterOnAppOpen,
    toggleSender,
    clearSelectedSenders,
  } = usePreferredSendersStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Filtered senders based on search query
  const displaySenders = useMemo(() => {
    if (!searchQuery.trim()) return frequentSenders;
    const q = searchQuery.toLowerCase().trim();
    return frequentSenders.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [frequentSenders, searchQuery]);

  const selectedSet = useMemo(() => new Set(selectedSenders), [selectedSenders]);

  const handleSelectTop5 = useCallback(() => {
    hapticLight();
    const top5 = frequentSenders.slice(0, 5).map((s) => s.email);
    setSelectedSenders(top5);
  }, [frequentSenders, setSelectedSenders]);

  const handleSelectOfficial = useCallback(() => {
    hapticLight();
    const official = frequentSenders.filter((s) => s.isOfficial).map((s) => s.email);
    setSelectedSenders(official);
  }, [frequentSenders, setSelectedSenders]);

  const handleClearAll = useCallback(() => {
    hapticLight();
    clearSelectedSenders();
  }, [clearSelectedSenders]);

  const handleToggleSingle = useCallback((email: string) => {
    hapticLight();
    toggleSender(email);
  }, [toggleSender]);

  const handleSaveAndClose = useCallback(() => {
    hapticSuccess();
    onClose();
  }, [onClose]);

  const renderSenderItem = useCallback(
    ({ item }: { item: FrequentSenderInfo }) => {
      const isSelected = selectedSet.has(item.email);
      const initial = (item.name || item.email || '?')[0].toUpperCase();

      return (
        <Pressable
          onPress={() => handleToggleSingle(item.email)}
          style={({ pressed }) => [
            styles.senderRow,
            isSelected && styles.senderRowSelected,
            pressed && styles.senderRowPressed,
          ]}
        >
          <View style={[styles.avatar, item.isOfficial && styles.avatarOfficial]}>
            <Text style={[styles.avatarText, item.isOfficial && styles.avatarTextOfficial]}>
              {initial}
            </Text>
          </View>

          <View style={styles.senderInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.senderName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isOfficial && (
                <View style={styles.officialBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={Colors.systemBlue} />
                  <Text style={styles.officialBadgeText}>Official</Text>
                </View>
              )}
            </View>
            <Text style={styles.senderEmail} numberOfLines={1}>
              {item.email}
            </Text>
          </View>

          <View style={styles.rightAction}>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{item.count} mails</Text>
            </View>

            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
          </View>
        </Pressable>
      );
    },
    [selectedSet, handleToggleSingle]
  );

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
          <View style={styles.grabHandle} />
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleWrap}>
              <Text style={styles.modalTitle}>Preferred Senders</Text>
              <Text style={styles.modalSubtitle}>
                Choose prominent senders to prioritize in your inbox view.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

        {/* Master App Open Filter Switch Card */}
        <View style={styles.switchCard}>
          <View style={styles.switchIconBox}>
            <Ionicons name="funnel-outline" size={20} color={Colors.systemBlue} />
          </View>
          <View style={styles.switchInfo}>
            <Text style={styles.switchTitle}>Filter Inbox on App Open</Text>
            <Text style={styles.switchSubtext}>
              Automatically show selected senders when opening Oryn
            </Text>
          </View>
          <Switch
            value={filterOnAppOpen}
            onValueChange={(val) => {
              hapticLight();
              setFilterOnAppOpen(val);
            }}
            trackColor={{ false: Colors.border, true: Colors.systemBlue }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Quick Presets & Search */}
        <View style={styles.presetSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            <Pressable onPress={handleSelectTop5} style={styles.presetChip}>
              <Ionicons name="star-outline" size={13} color={Colors.systemBlue} />
              <Text style={styles.presetChipText}>Top 5 Frequent</Text>
            </Pressable>

            <Pressable onPress={handleSelectOfficial} style={styles.presetChip}>
              <Ionicons name="shield-outline" size={13} color={Colors.systemIndigo} />
              <Text style={styles.presetChipText}>Official Senders</Text>
            </Pressable>

            {selectedSenders.length > 0 && (
              <Pressable onPress={handleClearAll} style={[styles.presetChip, styles.clearChip]}>
                <Ionicons name="close-circle-outline" size={13} color={Colors.systemRed} />
                <Text style={[styles.presetChipText, { color: Colors.systemRed }]}>
                  Clear ({selectedSenders.length})
                </Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Search Box */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search senders by name or email..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Sender List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            PROMINENT SENDERS ({displaySenders.length})
          </Text>
          <Text style={styles.listHeaderSelectedCount}>
            {selectedSenders.length} selected
          </Text>
        </View>

        {/* Senders List */}
        <FlatList
          data={displaySenders}
          renderItem={renderSenderItem}
          keyExtractor={(item) => item.email}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No senders found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'Try another search term' : 'Sync emails to see your frequent senders'}
              </Text>
            </View>
          }
        />

        {/* Bottom Save Action Bar */}
        <View style={styles.bottomBar}>
          <Pressable onPress={handleSaveAndClose} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              Done ({selectedSenders.length} Selected)
            </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    backgroundColor: Colors.background,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  modalHeaderTitleWrap: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  modalSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: Typography.size.xs * 1.35,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[3],
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
    ...Shadows.sm,
  },
  switchIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchInfo: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  switchSubtext: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  presetSection: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[3],
    gap: 10,
  },
  presetsRow: {
    gap: Spacing[2],
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearChip: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  presetChipText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[1],
  },
  listHeaderTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  listHeaderSelectedCount: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[16],
    gap: Spacing[2],
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },
  senderRowSelected: {
    borderColor: 'rgba(0, 122, 255, 0.4)',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  senderRowPressed: {
    backgroundColor: Colors.cardHover,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarOfficial: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  avatarText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
  },
  avatarTextOfficial: {
    color: Colors.systemBlue,
  },
  senderInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    flexShrink: 1,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  senderEmail: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  countChip: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countChipText: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  emptyContainer: {
    paddingVertical: Spacing[8],
    alignItems: 'center',
    gap: Spacing[2],
  },
  emptyTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  emptySub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: Spacing[4],
    left: Spacing[4],
    right: Spacing[4],
  },
  saveBtn: {
    backgroundColor: Colors.systemBlue,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
});
