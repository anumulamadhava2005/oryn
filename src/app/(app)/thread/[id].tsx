/**
 * Thread Detail Screen — Renders an entire conversation thread sequentially.
 * Shows all messages in the thread, expanded/collapsed, with reply action and full timeline.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThreads } from '@/hooks/useThreads';
import { HtmlEmailRenderer } from '@/components/email/HtmlEmailRenderer';
import { CategoryBadge } from '@/components/ui/Badge';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import type { ParsedEmail } from '@/types/email';

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { threads } = useThreads();

  const thread = useMemo(
    () => threads.find(t => t.threadId === id),
    [threads, id],
  );

  // Track expanded message index (default: expand latest message)
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    if (!thread) return {};
    const map: Record<string, boolean> = {};
    thread.messages.forEach((msg, idx) => {
      map[msg.id] = idx === thread.messages.length - 1; // latest expanded
    });
    return map;
  });

  const toggleExpand = useCallback((msgId: string) => {
    hapticLight();
    setExpandedMap(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  }, []);

  const handleBack = useCallback(() => router.back(), [router]);

  if (!thread) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.systemBlue} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Thread Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This conversation thread might have been removed or sync is required.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const latestMsg = thread.latest;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Top Header Navigation */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.systemBlue} />
          <Text style={styles.backText}>Inbox</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <CategoryBadge category={thread.category as any} />
          <Text style={styles.messageCountBadge}>{thread.count} msgs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Thread Subject Title */}
        <View style={styles.titleCard}>
          <Text style={styles.subjectText}>{latestMsg.subject}</Text>
          <Text style={styles.threadMetaText}>
            Conversation with {thread.messages.map(m => m.sender.split(' ')[0]).join(', ')}
          </Text>
        </View>

        {/* Message Accordion Cards */}
        {thread.messages.map((msg, index) => {
          const isExpanded = expandedMap[msg.id] ?? false;
          const isLast = index === thread.messages.length - 1;

          return (
            <View key={msg.id} style={[styles.card, isLast && styles.latestCard]}>
              <Pressable
                onPress={() => toggleExpand(msg.id)}
                style={styles.messageHeader}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarChar}>{msg.sender.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.headerContent}>
                  <View style={styles.senderRow}>
                    <Text style={styles.senderName} numberOfLines={1}>{msg.sender}</Text>
                    <Text style={styles.msgDate}>{format(new Date(msg.date), 'MMM d, h:mm a')}</Text>
                  </View>
                  {!isExpanded && (
                    <Text style={styles.msgSnippet} numberOfLines={1}>{msg.snippet}</Text>
                  )}
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.divider} />
                  <Text style={styles.recipientText}>To: {msg.recipients.join(', ') || 'Me'}</Text>
                  {msg.htmlBody ? (
                    <HtmlEmailRenderer html={msg.htmlBody} estimatedHeight={220} />
                  ) : (
                    <Text style={styles.bodyText} selectable>{msg.body}</Text>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        hapticMedium();
                        Linking.openURL(`mailto:${msg.senderEmail}?subject=Re: ${encodeURIComponent(msg.subject)}`);
                      }}
                      style={styles.replyBtn}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color={Colors.systemBlue} />
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -Spacing[2],
  },
  backText: {
    fontSize: Typography.size.md,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  messageCountBadge: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    backgroundColor: Colors.accentFaded,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    fontWeight: Typography.weight.semibold,
  },
  scrollContent: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[12],
  },
  titleCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: Spacing[1],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subjectText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    lineHeight: 24,
  },
  threadMetaText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  latestCard: {
    borderColor: Colors.systemBlue + '60',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing[2],
  },
  msgDate: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  msgSnippet: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  expandedContent: {
    marginTop: Spacing[3],
    gap: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  recipientText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  bodyText: {
    fontSize: Typography.size.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  replyBtnText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    gap: Spacing[2],
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
