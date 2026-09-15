/**
 * Inbox screen v2 — Content-first redesign.
 * Flattened header: Title → Unified Filter Row → Alert Banners → Email List
 * Removed redundant section labels, category wrapper, and stat segment bar.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  RefreshControl,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { useEmails } from '@/hooks/useEmails';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { hapticSuccess } from '@/utils/haptics';
import { useEmailsStore } from '@/store/emails';
import { usePreferredSendersStore } from '@/store/preferredSenders';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EmailCard } from '@/components/email/EmailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { InboxSkeleton } from '@/components/common/SkeletonLoader';
import { UndoToast } from '@/components/common/UndoToast';
import { SmartSearchOverlay } from '@/components/search/SmartSearchOverlay';
import type { ParsedEmail, CategoryGroup } from '@/types/email';

type StatFilter = 'all' | 'unread' | 'important' | 'deadlines';

function InboxContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { emails, stats, filters, setFilters, resetFilters, toggleStarred, toggleUnread } = useEmails();
  const { isSyncing, runIncrementalSync, runInitialSync, lastSyncAt } = useSync();
  const archiveEmail = useEmailsStore(s => s.archiveEmail);
  const prependEmails = useEmailsStore(s => s.prependEmails);
  const { selectedSenders, activeFilter, setActiveFilter } = usePreferredSendersStore();

  const listRef = useRef<FlashListRef<ParsedEmail>>(null);
  const prevFilterSignatureRef = useRef<string>('');

  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Compute filter signature to detect any filter changes / resets
  const filterSignature = useMemo(
    () =>
      `${activeStatFilter}|${filters.group ?? ''}|${filters.category ?? ''}|${filters.unreadOnly}|${filters.importantOnly}|${filters.hasDeadline}|${filters.priority ?? ''}|${activeFilter}`,
    [activeStatFilter, filters, activeFilter],
  );

  // Automatically reset scroll offset to top whenever any filter is applied, switched, or cleared
  useEffect(() => {
    if (prevFilterSignatureRef.current && prevFilterSignatureRef.current !== filterSignature) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
    prevFilterSignatureRef.current = filterSignature;
  }, [filterSignature]);

  // Keep preferred senders filter synced with store
  useEffect(() => {
    setFilters({
      preferredSendersOnly: activeFilter,
      preferredSenderEmails: selectedSenders,
    });
  }, [activeFilter, selectedSenders, setFilters]);

  // Undo state
  const [undoState, setUndoState] = useState<{
    visible: boolean;
    message: string;
    email: ParsedEmail | null;
    action: 'star' | 'read' | 'archive';
  }>({ visible: false, message: '', email: null, action: 'archive' });

  // Sync stat filter selection to emails filter state
  const handleStatFilterChange = useCallback(
    (filter: StatFilter) => {
      setActiveStatFilter(filter);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      switch (filter) {
        case 'unread':
          setFilters({ unreadOnly: true, importantOnly: false, hasDeadline: false });
          break;
        case 'important':
          setFilters({ unreadOnly: false, importantOnly: true, hasDeadline: false });
          break;
        case 'deadlines':
          setFilters({ unreadOnly: false, importantOnly: false, hasDeadline: true });
          break;
        case 'all':
        default:
          resetFilters();
          break;
      }
    },
    [setFilters, resetFilters],
  );

  const handleGroupFilter = useCallback(
    (group: CategoryGroup | null) => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setFilters({ group, category: null });
      // Reset stat filter when switching groups
      if (group) setActiveStatFilter('all');
    },
    [setFilters],
  );

  const hasFilter =
    filters.unreadOnly ||
    filters.importantOnly ||
    filters.hasDeadline ||
    filters.group != null ||
    filters.category != null ||
    filters.priority != null ||
    filters.dateRange != null;

  const onRefresh = useCallback(() => {
    if (!lastSyncAt) runInitialSync();
    else runIncrementalSync();
  }, [lastSyncAt, runInitialSync, runIncrementalSync]);

  const handleEmailPress = useCallback(
    (id: string) => router.push(`/(app)/email/${id}`),
    [router],
  );

  const handleArchive = useCallback((id: string) => {
    const archived = archiveEmail(id);
    if (archived) {
      setUndoState({
        visible: true,
        message: 'Email archived',
        email: archived,
        action: 'archive',
      });
    }
  }, [archiveEmail]);

  const handleUndo = useCallback(() => {
    if (undoState.email && undoState.action === 'archive') {
      prependEmails([undoState.email]);
    }
  }, [undoState, prependEmails]);

  const handleUndoDismiss = useCallback(() => {
    setUndoState(s => ({ ...s, visible: false }));
  }, []);

  const groupCounts = useMemo(() => buildGroupCounts(emails), [emails]);

  // Show skeleton while initial data hasn't loaded yet
  const showSkeleton = emails.length === 0 && isSyncing;

  const renderHeaderComponent = useMemo(() => {
    return (
      <View style={styles.headerStack}>
        <DashboardHeader
          user={user}
          unreadCount={stats.unreadCount}
          importantCount={stats.importantCount}
          upcomingDeadlines={stats.upcomingDeadlines}
          totalCount={stats.totalCount}
          activeStatFilter={activeStatFilter}
          onSelectStatFilter={handleStatFilterChange}
          onSync={onRefresh}
          isSyncing={isSyncing}
          onDeadlinePress={() => handleStatFilterChange('deadlines')}
          selectedGroup={filters.group ?? null}
          onSelectGroup={handleGroupFilter}
          groupCounts={groupCounts}
          isPreferredActive={activeFilter}
          preferredSenderCount={selectedSenders.length}
          onTogglePreferredFilter={() => setActiveFilter(!activeFilter)}
          onSearchPress={() => setIsSearchOpen(true)}
        />

        {/* Filter status bar — only when filtered */}
        {hasFilter && (
          <View style={styles.filterStatusBar}>
            <Text style={styles.filterStatusText}>
              {emails.length} result{emails.length !== 1 ? 's' : ''}
            </Text>
            <Pressable
              onPress={() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: false });
                resetFilters();
                setActiveStatFilter('all');
              }}
              hitSlop={8}
            >
              <Text style={styles.clearFilterText}>Clear filters</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }, [
    user,
    stats,
    activeStatFilter,
    handleStatFilterChange,
    onRefresh,
    isSyncing,
    filters,
    handleGroupFilter,
    groupCounts,
    hasFilter,
    emails.length,
    resetFilters,
    setFilters,
    activeFilter,
    selectedSenders.length,
    setActiveFilter,
  ]);

  const renderEmailItem = useCallback(
    ({ item, index }: { item: ParsedEmail; index: number }) => (
      <EmailCard
        email={item}
        onPress={handleEmailPress}
        onToggleStar={toggleStarred}
        onToggleRead={toggleUnread}
        onArchive={handleArchive}
        isFirst={index === 0}
        isLast={index === emails.length - 1}
      />
    ),
    [handleEmailPress, toggleStarred, toggleUnread, handleArchive, emails.length],
  );

  const keyExtractor = useCallback((item: ParsedEmail) => item.id, []);

  if (showSkeleton) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <InboxSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlashList
        ref={listRef}
        data={emails}
        renderItem={renderEmailItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeaderComponent}
        ListEmptyComponent={
          <EmptyState
            icon="mail-open-outline"
            title={hasFilter ? 'No matching emails' : 'Inbox is empty'}
            subtitle={
              hasFilter
                ? 'Try resetting your filter options'
                : 'Pull down to sync your latest Gmail messages'
            }
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={onRefresh}
            tintColor={Colors.systemBlue}
            colors={[Colors.systemBlue]}
          />
        }
      />
      <UndoToast
        visible={undoState.visible}
        message={undoState.message}
        onUndo={handleUndo}
        onDismiss={handleUndoDismiss}
      />
      <SmartSearchOverlay
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onEmailPress={handleEmailPress}
      />
    </SafeAreaView>
  );
}

/** Wrap with error boundary */
export default function InboxScreen() {
  return (
    <ErrorBoundary fallbackTitle="Inbox couldn't load">
      <InboxContent />
    </ErrorBoundary>
  );
}

/** Count emails per category group for chip badges */
function buildGroupCounts(emails: ParsedEmail[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of emails) {
    if (e.categoryGroup) {
      counts[e.categoryGroup] = (counts[e.categoryGroup] ?? 0) + 1;
    }
  }
  return counts;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: Spacing[6],
  },
  headerStack: {
    gap: Spacing[1.5],
    paddingBottom: Spacing[1],
  },
  filterStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[1],
  },
  filterStatusText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  clearFilterText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
});
