/**
 * Email Detail Screen v2 — Flowing borderless layout.
 * Three logical sections instead of 8 cards:
 *   1. Header zone (borderless): sender + subject + badges
 *   2. AI Insights (collapsible panel)
 *   3. Content zone (borderless): email body fills remaining space
 * Links and attachments are inline. Bottom bar is compact.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius, Shadows, Opacity } from '@/constants/theme';
import { useEmails } from '@/hooks/useEmails';
import { CATEGORY_META } from '@/constants/categories';
import { hapticMedium, hapticLight } from '@/utils/haptics';
import { HtmlEmailRenderer } from '@/components/email/HtmlEmailRenderer';
import { ClassificationFeedback } from '@/components/email/ClassificationFeedback';
import { useEmailsStore } from '@/store/emails';
import type { Category, ParsedEmail, Attachment } from '@/types/email';

// ─── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: ParsedEmail['priority'] }) {
  const COLOR_MAP: Record<string, string> = {
    critical: Colors.priority.critical,
    high: Colors.priority.high,
    medium: Colors.priority.medium,
    low: Colors.priority.low,
    ignore: Colors.priority.ignore,
  };
  const FADED_MAP: Record<string, string> = {
    critical: Colors.priority.criticalFaded,
    high: Colors.priority.highFaded,
    medium: Colors.priority.mediumFaded,
    low: Colors.priority.lowFaded,
    ignore: Colors.priority.ignoreFaded,
  };
  const color = COLOR_MAP[priority] ?? Colors.textMuted;
  const bg = FADED_MAP[priority] ?? Colors.surface;

  return (
    <View style={[styles.priorityBadge, { backgroundColor: bg, borderColor: color + '40' }]}>
      <View style={[styles.priorityDot, { backgroundColor: color }]} />
      <Text style={[styles.priorityBadgeText, { color }]}>{priority.toUpperCase()}</Text>
    </View>
  );
}

// ─── Category Pill ─────────────────────────────────────────────────────────────
function CategoryPill({ category }: { category: string }) {
  const meta = (category && CATEGORY_META[category as keyof typeof CATEGORY_META])
    ? CATEGORY_META[category as keyof typeof CATEGORY_META]
    : CATEGORY_META.general;
  const groupColor = (Colors.categoryGroup[meta.group as keyof typeof Colors.categoryGroup] as string) ?? Colors.systemBlue;

  return (
    <View style={[styles.catPill, { backgroundColor: groupColor + '15', borderColor: groupColor + '30' }]}>
      <Text style={styles.catEmoji}>{meta.emoji}</Text>
      <Text style={[styles.catLabel, { color: groupColor }]}>{meta.label}</Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getEmailById, toggleStarred, toggleUnread } = useEmails();
  const updateEmailCategory = useEmailsStore(s => s.updateEmailCategory);

  const email = useMemo(() => (id ? getEmailById(id) : null), [id, getEmailById]);

  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const [showHtml, setShowHtml] = useState(true);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const handleBack = useCallback(() => router.back(), [router]);

  const handleToggleStar = useCallback(() => {
    if (email) { hapticMedium(); toggleStarred(email.id); }
  }, [email, toggleStarred]);

  const handleToggleUnread = useCallback(() => {
    if (email) { hapticMedium(); toggleUnread(email.id); }
  }, [email, toggleUnread]);

  const handleShare = useCallback(async () => {
    if (!email) return;
    hapticLight();
    await Share.share({
      title: email.subject,
      message: `From: ${email.sender} (${email.senderEmail})\nSubject: ${email.subject}\n\n${email.body.slice(0, 500)}`,
    });
  }, [email]);

  const handleReply = useCallback(() => {
    if (!email) return;
    hapticLight();
    const url = `mailto:${email.senderEmail}?subject=Re: ${encodeURIComponent(email.subject)}`;
    Linking.openURL(url).catch(() => {});
  }, [email]);

  const handleLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  const toggleActionItem = (index: number) => {
    setCheckedActions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (!email) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.notFound}>
          <Ionicons name="mail-unread-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundText}>Email not found</Text>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Return to Inbox</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const relLabel = formatDistanceToNow(new Date(email.date), { addSuffix: true });
  const dateLabel = format(new Date(email.date), 'MMM d, yyyy · h:mm a');

  const hasEntities =
    email.extractedEntities.courseCodes.length > 0 ||
    email.extractedEntities.facultyNames.length > 0 ||
    email.extractedEntities.companyNames.length > 0 ||
    email.extractedEntities.venueNames.length > 0;

  const hasInsights = email.actionItems.length > 0 || email.deadline || hasEntities;
  const deadlineDate = email.deadline ? new Date(email.deadline) : null;
  const isDeadlinePast = deadlineDate ? deadlineDate.getTime() < Date.now() : false;

  // Auto-expand insights if there's a deadline
  const showInsights = insightsExpanded || !!email.deadline;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* ─── Nav Bar ───────────────────────────────────────────────────────── */}
      <View style={styles.topNav}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.navBack}>
          <Ionicons name="chevron-back" size={24} color={Colors.systemBlue} />
          <Text style={styles.navBackText}>Inbox</Text>
        </Pressable>

        <View style={styles.navRightActions}>
          <Pressable onPress={handleToggleStar} hitSlop={12} style={styles.navIconBtn}>
            <Ionicons
              name={email.isStarred ? 'star' : 'star-outline'}
              size={22}
              color={email.isStarred ? Colors.systemOrange : Colors.textSecondary}
            />
          </Pressable>
          <Pressable onPress={handleShare} hitSlop={12} style={styles.navIconBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ SECTION 1: Header (borderless) ═══════════════════════════════ */}
        <View style={styles.headerSection}>
          {/* Sender */}
          <View style={styles.senderRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(email.sender || email.senderEmail || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{email.sender || email.senderEmail}</Text>
              <Text style={styles.senderMeta} numberOfLines={1}>
                To me · {relLabel}
              </Text>
            </View>
          </View>

          {/* Subject */}
          <Text style={styles.subject}>{email.subject || '(No Subject)'}</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <PriorityBadge priority={email.priority} />
            <CategoryPill category={email.category} />
            {email.categories
              .filter((c) => c !== email.category)
              .slice(0, 2)
              .map((cat) => (
                <CategoryPill key={cat} category={cat} />
              ))}
          </View>

          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>

        {/* ═══ SECTION 2: AI Insights (collapsible) ════════════════════════ */}
        {hasInsights && (
          <View style={styles.insightsSection}>
            <Pressable
              onPress={() => { hapticLight(); setInsightsExpanded(!showInsights); }}
              style={styles.insightsHeader}
            >
              <View style={styles.insightsHeaderLeft}>
                <Ionicons name="sparkles" size={16} color={Colors.systemBlue} />
                <Text style={styles.insightsTitle}>AI Insights</Text>
                {email.actionItems.length > 0 && (
                  <View style={styles.insightsBadge}>
                    <Text style={styles.insightsBadgeText}>{email.actionItems.length}</Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={showInsights ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textMuted}
              />
            </Pressable>

            {showInsights && (
              <View style={styles.insightsBody}>
                {/* Deadline */}
                {email.deadline && deadlineDate && (
                  <View style={[styles.deadlineRow, isDeadlinePast && styles.deadlineRowExpired]}>
                    <Ionicons
                      name={isDeadlinePast ? 'alert-circle' : 'alarm-outline'}
                      size={16}
                      color={isDeadlinePast ? Colors.systemRed : Colors.systemOrange}
                    />
                    <Text style={styles.deadlineText}>
                      {isDeadlinePast ? 'Overdue: ' : 'Due: '}
                      {email.deadlineLabel ?? format(deadlineDate, 'EEE, MMM d · h:mm a')}
                    </Text>
                    <Text style={[styles.deadlineRel, isDeadlinePast && { color: Colors.systemRed }]}>
                      {formatDistanceToNow(deadlineDate, { addSuffix: true })}
                    </Text>
                  </View>
                )}

                {/* Action Items */}
                {email.actionItems.length > 0 && (
                  <View style={styles.actionList}>
                    {email.actionItems.map((item, i) => {
                      const isChecked = !!checkedActions[i];
                      return (
                        <Pressable
                          key={i}
                          onPress={() => toggleActionItem(i)}
                          style={styles.actionItem}
                        >
                          <Ionicons
                            name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={isChecked ? Colors.systemGreen : Colors.systemBlue}
                          />
                          <Text style={[styles.actionItemText, isChecked && styles.actionItemDone]}>
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Entities */}
                {hasEntities && (
                  <View style={styles.entitiesWrap}>
                    {email.extractedEntities.courseCodes.length > 0 &&
                      renderEntityRow('Courses', email.extractedEntities.courseCodes, Colors.systemBlue)}
                    {email.extractedEntities.facultyNames.length > 0 &&
                      renderEntityRow('Faculty', email.extractedEntities.facultyNames, Colors.systemPurple)}
                    {email.extractedEntities.venueNames.length > 0 &&
                      renderEntityRow('Venues', email.extractedEntities.venueNames, Colors.systemTeal)}
                    {email.extractedEntities.companyNames.length > 0 &&
                      renderEntityRow('Company', email.extractedEntities.companyNames, Colors.systemOrange)}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══ SECTION 3: Email Body (borderless, fills space) ═════════════ */}
        <View style={styles.bodySection}>
          {email.htmlBody && (
            <View style={styles.bodyToggleRow}>
              <Pressable
                onPress={() => { hapticLight(); setShowHtml(!showHtml); }}
                hitSlop={8}
              >
                <Text style={styles.toggleText}>
                  {showHtml ? '◉ Rich' : '○ Plain'}
                </Text>
              </Pressable>
            </View>
          )}
          {showHtml && email.htmlBody ? (
            <HtmlEmailRenderer html={email.htmlBody} estimatedHeight={200} />
          ) : (
            <Text style={styles.emailBody} selectable>
              {email.body.trim() || '(No content provided in email message)'}
            </Text>
          )}
        </View>

        {/* ─── Classification Feedback ─────────────────────────────────────── */}
        <View style={styles.feedbackSection}>
          <ClassificationFeedback
            emailId={email.id}
            currentCategory={email.category}
            currentGroup={email.categoryGroup}
            onCategoryChange={(cat, grp) => {
              updateEmailCategory(email.id, cat, grp);
            }}
          />
        </View>

        {/* ─── Inline Links ────────────────────────────────────────────────── */}
        {email.extractedLinks.length > 0 && (
          <View style={styles.inlineSection}>
            <Text style={styles.inlineSectionTitle}>
              Links ({email.extractedLinks.length})
            </Text>
            {email.extractedLinks.slice(0, 6).map((url, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleLink(url)}
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: Opacity.pressed }]}
              >
                <Ionicons name="link-outline" size={14} color={Colors.systemBlue} />
                <Text style={styles.linkText} numberOfLines={1}>{url}</Text>
                <Ionicons name="open-outline" size={12} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ─── Inline Attachments ──────────────────────────────────────────── */}
        {email.attachments.length > 0 && (
          <View style={styles.inlineSection}>
            <Text style={styles.inlineSectionTitle}>
              Attachments ({email.attachments.length})
            </Text>
            {email.attachments.map((att: Attachment, idx: number) => (
              <View key={idx} style={styles.attachRow}>
                <Ionicons name="document-attach-outline" size={16} color={Colors.systemBlue} />
                <View style={styles.attachInfo}>
                  <Text style={styles.attachName} numberOfLines={1}>{att.filename}</Text>
                  <Text style={styles.attachMime}>{att.mimeType}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom Action Bar ─────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <Pressable onPress={handleReply} style={styles.replyBtn}>
          <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>

        <View style={styles.bottomActions}>
          <Pressable onPress={handleToggleUnread} style={styles.bottomIconBtn} hitSlop={8}>
            <Ionicons
              name={email.isUnread ? 'mail-open-outline' : 'mail-unread-outline'}
              size={20}
              color={Colors.text}
            />
          </Pressable>
          <Pressable onPress={handleToggleStar} style={styles.bottomIconBtn} hitSlop={8}>
            <Ionicons
              name={email.isStarred ? 'star' : 'star-outline'}
              size={20}
              color={email.isStarred ? Colors.systemOrange : Colors.text}
            />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.bottomIconBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color={Colors.text} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Entity Row Helper ─────────────────────────────────────────────────────────
function renderEntityRow(label: string, items: string[], color: string) {
  return (
    <View key={label} style={styles.entityRow}>
      <Text style={styles.entityLabel}>{label}</Text>
      <View style={styles.entityPills}>
        {items.map((item, idx) => (
          <View key={idx} style={[styles.entityPill, { backgroundColor: color + '15' }]}>
            <Text style={[styles.entityPillText, { color }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navBackText: {
    fontSize: Typography.size.md,
    color: Colors.systemBlue,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  navIconBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
    flexGrow: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  notFoundText: {
    fontSize: Typography.size.md,
    color: Colors.textMuted,
  },
  backBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.systemBlue,
    borderRadius: Radius.md,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.semibold,
  },

  // ═══ Section 1: Header ════════════════════════════════════════════════════
  headerSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Colors.systemBlue + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  senderInfo: {
    flex: 1,
    gap: 1,
  },
  senderName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  senderMeta: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  subject: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    lineHeight: Typography.size.xl * 1.25,
    letterSpacing: Typography.tracking.tight,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    alignItems: 'center',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wider,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  catEmoji: {
    fontSize: 12,
  },
  catLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
  },
  dateLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },

  // ═══ Section 2: AI Insights ═══════════════════════════════════════════════
  insightsSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  insightsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  insightsTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  insightsBadge: {
    backgroundColor: Colors.systemBlue + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  insightsBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  insightsBody: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.warningFaded,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  deadlineRowExpired: {
    backgroundColor: Colors.errorFaded,
  },
  deadlineText: {
    flex: 1,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  deadlineRel: {
    fontSize: Typography.size.xs,
    color: Colors.systemOrange,
    fontWeight: Typography.weight.medium,
  },
  actionList: {
    gap: Spacing[2],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    paddingVertical: 4,
  },
  actionItemText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
    lineHeight: Typography.size.sm * 1.4,
  },
  actionItemDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  entitiesWrap: {
    gap: Spacing[2],
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  entityLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    width: 56,
  },
  entityPills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  entityPill: {
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  entityPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },

  // ═══ Section 3: Body ══════════════════════════════════════════════════════
  bodySection: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    minHeight: 200,
  },
  bodyToggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing[2],
  },
  toggleText: {
    fontSize: Typography.size.xs,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  emailBody: {
    fontSize: Typography.size.base,
    color: Colors.text,
    lineHeight: Typography.size.base * 1.6,
  },

  // ─── Inline sections (links, attachments) ─────────────────────────────────
  inlineSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    gap: Spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  inlineSectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: 6,
  },
  linkText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.systemBlue,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: 6,
  },
  attachInfo: {
    flex: 1,
  },
  attachName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  attachMime: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },

  feedbackSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },

  // ─── Bottom Bar ───────────────────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.systemBlue,
    paddingHorizontal: Spacing[4],
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  replyBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  bottomIconBtn: {
    padding: 4,
  },
});
