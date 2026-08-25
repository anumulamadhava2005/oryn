/**
 * Search screen — upgraded with fuzzy search, recent searches, and category/sender suggestions.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useSearch } from '@/hooks/useSearch';
import { SearchBar } from '@/components/common/SearchBar';
import { EmailCard } from '@/components/email/EmailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { hapticLight } from '@/utils/haptics';
import { GROUP_META } from '@/constants/categories';
import type { ParsedEmail } from '@/types/email';

export default function SearchScreen() {
  const router = useRouter();
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

  const handleEmailPress = useCallback(
    (id: string) => router.push(`/(app)/email/${id}`),
    [router],
  );

  const handleSuggestionTap = useCallback((term: string) => {
    hapticLight();
    setQuery(term);
    commitSearch(term);
  }, [setQuery, commitSearch]);

  const renderItem = useCallback(
    ({ item }: { item: ParsedEmail }) => (
      <EmailCard email={item} onPress={handleEmailPress} />
    ),
    [handleEmailPress],
  );

  const keyExtractor = useCallback((item: ParsedEmail) => item.id, []);

  // Show discovery UI when no query is entered
  const showDiscovery = !hasQuery;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => commitSearch()}
            autoFocus={false}
          />
          {hasQuery && (
            <Text style={styles.resultCount}>
              {results.length === 0
                ? 'No results'
                : `${results.length} result${results.length !== 1 ? 's' : ''}`}
            </Text>
          )}
        </View>

        {showDiscovery ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.discoveryContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.discoverySection}>
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
              </View>
            )}

            {/* Top Senders */}
            {suggestions.senders.length > 0 && (
              <View style={styles.discoverySection}>
                <Text style={styles.discoverySectionTitle}>TOP SENDERS</Text>
                <View style={styles.pillsWrap}>
                  {suggestions.senders.map((sender, i) => (
                    <Pressable
                      key={`sender-${i}`}
                      onPress={() => handleSuggestionTap(sender)}
                      style={({ pressed }) => [
                        styles.senderPill,
                        pressed && styles.pillPressed,
                      ]}
                    >
                      <Ionicons name="person-outline" size={13} color={Colors.systemBlue} />
                      <Text style={styles.senderPillText} numberOfLines={1}>{sender}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Category Quick Filters */}
            {suggestions.groups.length > 0 && (
              <View style={styles.discoverySection}>
                <Text style={styles.discoverySectionTitle}>BROWSE BY CATEGORY</Text>
                <View style={styles.pillsWrap}>
                  {suggestions.groups.map((group, i) => {
                    const meta = GROUP_META[group as keyof typeof GROUP_META];
                    const color = (Colors.categoryGroup[group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemGray;
                    return (
                      <Pressable
                        key={`group-${i}`}
                        onPress={() => handleSuggestionTap(group)}
                        style={({ pressed }) => [
                          styles.categoryPill,
                          { borderColor: color + '40', backgroundColor: color + '15' },
                          pressed && styles.pillPressed,
                        ]}
                      >
                        <Text style={[styles.categoryPillText, { color }]}>
                          {meta?.label ?? group}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Hint */}
            <View style={styles.hintWrap}>
              <Ionicons name="sparkles-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.hintText}>
                Search by sender, course code, company, faculty name, or any keyword
              </Text>
            </View>
          </ScrollView>
        ) : results.length === 0 ? (
          <EmptyState
            emoji="🫙"
            title="No results"
            subtitle={`Nothing matched "${query}"`}
          />
        ) : (
          <FlashList
            data={results}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  resultCount: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
    paddingLeft: Spacing[1],
  },
  listContent: {
    paddingBottom: Spacing[16],
  },

  // Discovery UI
  discoveryContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[16],
    gap: Spacing[6],
  },
  discoverySection: {
    gap: Spacing[2],
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
    backgroundColor: Colors.card,
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
    maxWidth: 140,
  },
  categoryPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingTop: Spacing[2],
  },
  hintText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
});
