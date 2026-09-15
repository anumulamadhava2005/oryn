/**
 * Campus Events Search Modal — Apple HIG Search interface.
 * Clean, minimal search with real event discovery and zero fake metrics.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { DistrictEvent } from '@/types/events';
import { hapticLight } from '@/utils/haptics';

interface DistrictSearchModalProps {
  visible: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  trendingEvents: DistrictEvent[];
  filteredEvents: DistrictEvent[];
  onSelectEvent: (event: DistrictEvent) => void;
  onClose: () => void;
}

export function DistrictSearchModal({
  visible,
  searchQuery,
  onSearchChange,
  trendingEvents,
  filteredEvents,
  onSelectEvent,
  onClose,
}: DistrictSearchModalProps) {
  const insets = useSafeAreaInsets();
  const isSearching = searchQuery.trim().length > 0;
  const suggestions = trendingEvents.slice(0, 6);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
          style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.grabHandle} />
          {/* Navigation & Search Bar */}
          <View style={styles.headerRow}>
          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, clubs, venues..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => onSearchChange('')}
                hitSlop={8}
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.cancelBtn}
            onPress={() => {
              hapticLight();
              onClose();
            }}
            hitSlop={6}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isSearching ? (
            /* Suggested / Trending Events */
            <View>
              <Text style={styles.sectionTitle}>Suggestions</Text>
              <View style={styles.suggestionsList}>
                {suggestions.map((event) => (
                  <Pressable
                    key={event.id}
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.rowPressed]}
                    onPress={() => {
                      hapticLight();
                      onClose();
                      onSelectEvent(event);
                    }}
                  >
                    {event.poster_url ? (
                      <Image source={{ uri: event.poster_url }} style={styles.suggestionThumb} />
                    ) : (
                      <View style={[styles.suggestionThumb, styles.thumbFallback]}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
                      </View>
                    )}
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.suggestionMeta} numberOfLines={1}>
                        {event.organization_name || 'Campus'} • {event.building || event.location || 'Main Hall'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            /* Search Results */
            <View>
              <Text style={styles.sectionTitle}>Results ({filteredEvents.length})</Text>
              {filteredEvents.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Results Found</Text>
                  <Text style={styles.emptyText}>No campus events match "{searchQuery}"</Text>
                </View>
              ) : (
                filteredEvents.map((event) => (
                  <Pressable
                    key={event.id}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                    onPress={() => {
                      hapticLight();
                      onClose();
                      onSelectEvent(event);
                    }}
                  >
                    {event.poster_url ? (
                      <Image source={{ uri: event.poster_url }} style={styles.resultThumb} />
                    ) : (
                      <View style={[styles.resultThumb, styles.thumbFallback]}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
                      </View>
                    )}
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {event.organization_name || 'Campus'} • {event.location || 'Hall'}
                      </Text>
                      <View style={styles.attendeeRow}>
                        <Ionicons name="people-outline" size={11} color={Colors.textSecondary} />
                        <Text style={styles.attendeeText}>
                          {Number(event.going_count || 0)} attending
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </ScrollView>
        </MotiView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  searchField: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cancelBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  content: {
    padding: Spacing[4],
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing[3],
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  suggestionThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing[3],
    borderRadius: Radius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  resultThumb: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  resultDetails: {
    flex: 1,
  },
  resultTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  resultSub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  rowPressed: {
    opacity: 0.8,
  },
  emptyWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
