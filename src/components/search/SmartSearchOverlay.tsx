/**
 * SmartSearchOverlay — Apple HIG Smart Animate Search Interface.
 * 
 * Features:
 * - Fluid expanding search bar transition from inbox header.
 * - Cancel button glide-in with spring physics.
 * - Staggered discovery suggestions (Recent Searches, Categories, Frequent Senders).
 * - Live fuzzy search results powered by FlashList with EmailCards.
 * - Smooth dismissal restoring the inbox list state without page reload.
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { useSearch } from '@/hooks/useSearch';
import { SearchBar } from '@/components/common/SearchBar';
import { EmailCard } from '@/components/email/EmailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { hapticLight } from '@/utils/haptics';
import { GROUP_META } from '@/constants/categories';
import type { ParsedEmail } from '@/types/email';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEmailPress: (id: string) => void;
}

export function SmartSearchOverlay({ visible, onClose, onEmailPress }: Props) {
  const insets = useSafeAreaInsets();
  const {
    query,
    setQuery,
    results,
    hasQuery,
    recentSearches,
    commitSearch,
    clearRecent,
    suggestions,
  } = useSearch();

  // Reset query on close
  const handleClose = useCallback(() => {
    hapticLight();
    setQuery('');
    onClose();
  }, [onClose, setQuery]);

  // Handle hardware back on Android
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleClose]);

  const handleSuggestionTap = useCallback((term: string) => {
    hapticLight();
    setQuery(term);
    commitSearch(term);
  }, [setQuery, commitSearch]);

  const renderEmailItem = useCallback(
    ({ item }: { item: ParsedEmail }) => (
      <EmailCard
        email={item}
        onPress={(id) => {
          handleClose();
          onEmailPress(id);
        }}
      />
    ),
    [handleClose, onEmailPress],
  );

  const keyExtractor = useCallback((item: ParsedEmail) => item.id, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ─── Smart Header Row ─────────────────────────────────── */}
          <MotiView
            from={{ opacity: 0, translateY: -12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250 }}
            style={styles.headerRow}
          >
            <View style={styles.searchBarWrapper}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => commitSearch()}
                autoFocus={true}
                placeholder="Search emails, senders, deadlines..."
              />
            </View>

            <MotiView
              from={{ opacity: 0, translateX: 16 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            >
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: Opacity.pressed },
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel search"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </MotiView>
          </MotiView>

          {/* ─── Results Count Banner (when querying) ─────────────── */}
          {hasQuery && (
            <MotiView
              from={{ opacity: 0, translateY: -4 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 180 }}
              style={styles.resultCountBar}
            >
              <Text style={styles.resultCountText}>
                {results.length === 0
                  ? 'No matching emails found'
                  : `${results.length} result${results.length !== 1 ? 's' : ''}`}
              </Text>
            </MotiView>
          )}

          {/* ─── Search Canvas ────────────────────────────────────── */}
          {!hasQuery ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.discoveryContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <MotiView
                  from={{ opacity: 0, translateY: 15 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: 50 }}
                  style={styles.discoverySection}
                >
                  <View style={styles.discoverySectionHeader}>
                    <Text style={styles.discoverySectionTitle}>RECENT SEARCHES</Text>
                    <Pressable onPress={() => { hapticLight(); clearRecent(); }} hitSlop={8}>
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  </View>
                  <View style={styles.pillsWrap}>
                    {recentSearches.map((term, i) => (
                      <Pressable
                        key={`recent-${i}`}
                        onPress={() => handleSuggestionTap(term)}
                        style={({ pressed }) => [
                          styles.recentPill,
                          pressed && styles.pillPressed,
                        ]}
                      >
                        <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.recentPillText}>{term}</Text>
                      </Pressable>
                    ))}
                  </View>
                </MotiView>
              )}

              {/* Category Suggestions */}
              {suggestions.groups.length > 0 && (
                <MotiView
                  from={{ opacity: 0, translateY: 15 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: 100 }}
                  style={styles.discoverySection}
                >
                  <View style={styles.discoverySectionHeader}>
                    <Text style={styles.discoverySectionTitle}>CATEGORIES</Text>
                  </View>
                  <View style={styles.pillsWrap}>
                    {suggestions.groups.map((group) => {
                      const meta = GROUP_META[group as keyof typeof GROUP_META];
                      const label = meta?.label ?? group;
                      const groupColor =
                        (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ??
                        Colors.systemBlue;
                      return (
                        <Pressable
                          key={`group-${group}`}
                          onPress={() => handleSuggestionTap(group)}
                          style={({ pressed }) => [
                            styles.categoryPill,
                            { borderColor: groupColor + '40', backgroundColor: groupColor + '15' },
                            pressed && styles.pillPressed,
                          ]}
                        >
                          <View style={[styles.catDot, { backgroundColor: groupColor }]} />
                          <Text style={[styles.categoryPillText, { color: groupColor }]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </MotiView>
              )}

              {/* Frequent Senders */}
              {suggestions.senders.length > 0 && (
                <MotiView
                  from={{ opacity: 0, translateY: 15 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: 150 }}
                  style={styles.discoverySection}
                >
                  <View style={styles.discoverySectionHeader}>
                    <Text style={styles.discoverySectionTitle}>FREQUENT SENDERS</Text>
                  </View>
                  <View style={styles.pillsWrap}>
                    {suggestions.senders.map((sender) => (
                      <Pressable
                        key={`sender-${sender}`}
                        onPress={() => handleSuggestionTap(sender)}
                        style={({ pressed }) => [
                          styles.senderPill,
                          pressed && styles.pillPressed,
                        ]}
                      >
                        <Ionicons name="person-outline" size={12} color={Colors.systemBlue} />
                        <Text style={styles.senderPillText} numberOfLines={1}>
                          {sender}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </MotiView>
              )}
            </ScrollView>
          ) : (
            <FlashList
              data={results}
              renderItem={renderEmailItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title="No matching emails"
                  subtitle={`No emails found matching "${query.trim()}". Try searching for sender, subject, or keywords.`}
                />
              }
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[2],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  searchBarWrapper: {
    flex: 1,
  },
  cancelBtn: {
    paddingVertical: Spacing[1.5],
    paddingHorizontal: Spacing[1],
  },
  cancelText: {
    fontSize: Typography.size.base,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  resultCountBar: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[1.5],
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  resultCountText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  listContent: {
    paddingBottom: Spacing[16],
  },
  discoveryContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[16],
    gap: Spacing[6],
  },
  discoverySection: {
    gap: Spacing[2.5],
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discoverySectionTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  clearText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.medium,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  pillPressed: {
    opacity: 0.7,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recentPillText: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  senderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accentFaded,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentFadedBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  senderPillText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.medium,
    maxWidth: 160,
  },
});
