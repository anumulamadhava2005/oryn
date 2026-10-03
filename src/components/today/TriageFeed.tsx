/**
 * TriageFeed — Apple HIG-grounded Actionable Briefing & Clustered Activity Feed.
 *
 * Implements the 6 core UX pillars:
 * 1. 3-Tier Semantic Palette: Urgent Red (#EF4444) → Action Blue (#3B82F6) → Neutral Gray (#71717A). No rainbow tag chaos.
 * 2. Glanceable vs Scrollable: Short "Needs your action today" VIP task checklist (max 3–5 items) separated from the broader campus updates.
 * 3. Categorical Clustering: Groups activity into Academics, Deadlines, Clubs & Activities, and Announcements with collapsible accordions.
 * 4. Minimalist 2-Line Rows: 1-line crisp title + 1-line muted subtext (source + time). Zero redundant badges.
 * 5. Muted / Low-Priority States: Completed and read items fade to 45% opacity so unread/active items draw immediate focus.
 * 6. Authentic Empty States: Clean "All Caught Up" card when zero actions are pending.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { Colors, Typography, Radius } from '@/constants/theme';
import { hapticSuccess, hapticLight } from '@/utils/haptics';
import { useActionItemStore } from '@/store/actionItemStore';
import type { DeduplicatedActionItem } from '@/utils/actionItemDeduplicator';
import type { ParsedEmail } from '@/types/email';

// ─── 3-Tier Semantic Palette ─────────────────────────────────────
const SEMANTIC_COLORS = {
  urgentRed: '#EF4444',
  urgentRedBg: 'rgba(239, 68, 68, 0.12)',
  actionBlue: '#3B82F6',
  actionBlueBg: 'rgba(59, 130, 246, 0.12)',
  neutralGray: '#71717A',
  neutralGrayLight: '#A1A1AA',
  neutralBorder: 'rgba(255, 255, 255, 0.05)',
  cardBg: 'rgba(255, 255, 255, 0.02)',
  subCardBg: 'rgba(255, 255, 255, 0.01)',
};

export type CampusCategoryCluster = 'academics' | 'deadlines' | 'clubs' | 'announcements';

interface TriageFeedProps {
  overdueDeadlines: ParsedEmail[];
  dueTodayDeadlines: ParsedEmail[];
  actionItems: DeduplicatedActionItem[];
  criticalAlerts: ParsedEmail[];
  allCampusEmails?: ParsedEmail[];
  onEmailPress: (id: string) => void;
}

interface ActionTaskItem {
  id: string;
  type: 'overdue' | 'due_today' | 'action_task' | 'alert';
  title: string;
  subtext: string;
  emailId: string;
  actionKey?: string;
  isCompleted?: boolean;
}

export function TriageFeed({
  overdueDeadlines,
  dueTodayDeadlines,
  actionItems,
  criticalAlerts,
  allCampusEmails = [],
  onEmailPress,
}: TriageFeedProps) {
  const completedMap = useActionItemStore((s) => s.completedMap);
  const toggleCompleted = useActionItemStore((s) => s.toggleCompleted);

  // Expanded state for "Needs Your Action Today" (if more than 4 items)
  const [showAllActions, setShowAllActions] = useState(false);

  // Master collapse state for the broader Campus Activity Feed
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);

  // Collapsible category accordions: Academics, Deadlines, Clubs, Announcements
  const [expandedCategories, setExpandedCategories] = useState<Record<CampusCategoryCluster, boolean>>({
    academics: true,
    deadlines: true,
    clubs: true,
    announcements: false,
  });

  const toggleCategory = useCallback((cat: CampusCategoryCluster) => {
    hapticLight();
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const handleToggleTask = useCallback(
    (key: string) => {
      const isDone = toggleCompleted(key);
      if (isDone) {
        hapticSuccess();
      } else {
        hapticLight();
      }
    },
    [toggleCompleted]
  );

  // ─── 1. Build Unified "Needs Your Action Today" List (Max 3–5) ───
  const actionTasks = useMemo(() => {
    const list: ActionTaskItem[] = [];

    // Overdue Deadlines (Urgent Red)
    for (const email of overdueDeadlines) {
      const d = new Date(email.deadline!);
      list.push({
        id: `overdue-${email.id}`,
        type: 'overdue',
        title: email.subject,
        subtext: `Overdue by ${formatDistanceToNow(d)} · ${email.sender}`,
        emailId: email.id,
      });
    }

    // Deadlines Due Today (Action Needed)
    for (const email of dueTodayDeadlines) {
      const d = new Date(email.deadline!);
      list.push({
        id: `due-${email.id}`,
        type: 'due_today',
        title: email.subject,
        subtext: `Due Today at ${format(d, 'h:mm a')} · ${email.sender}`,
        emailId: email.id,
      });
    }

    // Action Checklist Tasks (With Checkboxes)
    for (const item of actionItems) {
      const isDone = !!completedMap[item.key];
      const sender = item.allSenders[0] || item.email.sender;
      list.push({
        id: `task-${item.key}`,
        type: 'action_task',
        title: item.action,
        subtext: `Action required · ${sender}`,
        emailId: item.email.id,
        actionKey: item.key,
        isCompleted: isDone,
      });
    }

    // Critical Alerts
    for (const email of criticalAlerts) {
      list.push({
        id: `alert-${email.id}`,
        type: 'alert',
        title: email.subject,
        subtext: `Important notice · ${email.sender}`,
        emailId: email.id,
      });
    }

    // Sort: incomplete items first, completed items push to bottom
    return list.sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return 0;
    });
  }, [overdueDeadlines, dueTodayDeadlines, actionItems, criticalAlerts, completedMap]);

  const pendingActionsCount = useMemo(
    () => actionTasks.filter((t) => !t.isCompleted).length,
    [actionTasks]
  );

  const displayedTasks = useMemo(() => {
    if (showAllActions) return actionTasks;
    return actionTasks.slice(0, 4);
  }, [actionTasks, showAllActions]);

  // ─── 2. Cluster Campus Activity by Category ───────────────────────
  const clusteredActivity = useMemo(() => {
    const academics: ParsedEmail[] = [];
    const deadlines: ParsedEmail[] = [];
    const clubs: ParsedEmail[] = [];
    const announcements: ParsedEmail[] = [];

    // Filter to avoid repeating emails that are already in the action task list
    const actionEmailIds = new Set(actionTasks.map((t) => t.emailId));

    for (const email of allCampusEmails) {
      if (actionEmailIds.has(email.id)) continue;

      if (email.deadline != null) {
        deadlines.push(email);
        continue;
      }

      const cat = email.category || '';
      const group = email.categoryGroup || '';

      if (
        group === 'academics' ||
        group === 'placement' ||
        [
          'lecture',
          'lab',
          'assignment',
          'quiz',
          'exam',
          'midsem',
          'endsem',
          'attendance',
          'marks',
          'academic_office',
          'classroom',
          'nptel',
        ].includes(cat)
      ) {
        academics.push(email);
      } else if (
        group === 'events' ||
        group === 'technical' ||
        [
          'cultural_affairs',
          'sports_affairs',
          'fest',
          'club_event',
          'tech_club',
          'hackathon',
          'workshop',
        ].includes(cat)
      ) {
        clubs.push(email);
      } else {
        announcements.push(email);
      }
    }

    return {
      academics: academics.slice(0, 5),
      deadlines: deadlines.slice(0, 5),
      clubs: clubs.slice(0, 5),
      announcements: announcements.slice(0, 5),
    };
  }, [allCampusEmails, actionTasks]);

  const totalActivityCount =
    clusteredActivity.academics.length +
    clusteredActivity.deadlines.length +
    clusteredActivity.clubs.length +
    clusteredActivity.announcements.length;

  return (
    <View style={styles.container}>
      {/* ─── SECTION 1: "NEEDS YOUR ACTION TODAY" (Pillar 2) ─── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.sectionHeading}>NEEDS YOUR ACTION TODAY</Text>
          {pendingActionsCount > 0 ? (
            <View
              style={[
                styles.headerBadge,
                overdueDeadlines.length > 0 && styles.headerBadgeUrgent,
              ]}
            >
              <Text
                style={[
                  styles.headerBadgeText,
                  overdueDeadlines.length > 0 && styles.headerBadgeTextUrgent,
                ]}
              >
                {pendingActionsCount}
              </Text>
            </View>
          ) : (
            <View style={styles.headerBadgeMuted}>
              <Text style={styles.headerBadgeTextMuted}>All clear</Text>
            </View>
          )}
        </View>

        {actionTasks.length > 4 && (
          <Pressable
            onPress={() => {
              hapticLight();
              setShowAllActions((p) => !p);
            }}
            hitSlop={8}
            style={styles.expandToggleBtn}
          >
            <Text style={styles.expandToggleText}>
              {showAllActions ? 'Show Less' : `+${actionTasks.length - 4} more`}
            </Text>
            <Ionicons
              name={showAllActions ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={SEMANTIC_COLORS.neutralGrayLight}
            />
          </Pressable>
        )}
      </View>

      {actionTasks.length === 0 ? (
        /* Authentic Apple HIG "All Caught Up" Empty State (Pillar 6) */
        <View style={styles.allClearCard}>
          <View style={styles.allClearIconCircle}>
            <Ionicons name="checkmark-sharp" size={18} color="#10B981" />
          </View>
          <View style={styles.allClearTextWrap}>
            <Text style={styles.allClearTitle}>All caught up for today</Text>
            <Text style={styles.allClearSubtitle}>No pending deadlines or action items.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.actionCard}>
          {displayedTasks.map((task, index) => {
            const isDone = !!task.isCompleted;
            const isFirst = index === 0;

            return (
              <View
                key={task.id}
                style={[
                  styles.taskRow,
                  !isFirst && styles.rowBorderTop,
                  isDone && styles.taskRowDone,
                ]}
              >
                {/* Left Indicator / Checkbox (Pillar 1 3-Tier System) */}
                {task.type === 'action_task' && task.actionKey ? (
                  <Pressable
                    onPress={() => handleToggleTask(task.actionKey!)}
                    hitSlop={12}
                    style={styles.checkboxTouchTarget}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    accessibilityLabel={`Mark "${task.title}" as ${isDone ? 'incomplete' : 'complete'}`}
                  >
                    <View style={[styles.checkboxBox, isDone && styles.checkboxBoxDone]}>
                      {isDone && <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => onEmailPress(task.emailId)}
                    style={styles.indicatorTouchTarget}
                  >
                    <View
                      style={[
                        styles.severityDot,
                        task.type === 'overdue' && styles.severityDotRed,
                        task.type === 'due_today' && styles.severityDotAction,
                        task.type === 'alert' && styles.severityDotAlert,
                      ]}
                    />
                  </Pressable>
                )}

                {/* Minimalist 2-Line Text Row (Pillar 4) */}
                <Pressable
                  onPress={() => onEmailPress(task.emailId)}
                  style={styles.taskContentBody}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.taskTitle, isDone && styles.taskTitleDone]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <Text
                    style={[
                      styles.taskSubtext,
                      task.type === 'overdue' && !isDone && styles.taskSubtextRed,
                    ]}
                    numberOfLines={1}
                  >
                    {task.subtext}
                  </Text>
                </Pressable>

                {/* Subtle Right Chevron */}
                <Pressable
                  onPress={() => onEmailPress(task.emailId)}
                  style={styles.chevronTouchTarget}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={SEMANTIC_COLORS.neutralGray}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── SECTION 2: "CAMPUS ACTIVITY & UPDATES" (Pillars 2 & 3) ─── */}
      {totalActivityCount > 0 && (
        <View style={styles.activitySectionWrap}>
          {/* Header with Collapse/Expand Toggle */}
          <View style={styles.activityHeaderRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.sectionHeading}>CAMPUS ACTIVITY</Text>
              <View style={styles.headerBadgeMuted}>
                <Text style={styles.headerBadgeTextMuted}>
                  {totalActivityCount} {totalActivityCount === 1 ? 'update' : 'updates'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                hapticLight();
                setIsActivityCollapsed((p) => !p);
              }}
              hitSlop={8}
              style={styles.expandToggleBtn}
              accessibilityRole="button"
              accessibilityLabel={isActivityCollapsed ? 'Expand campus activity' : 'Collapse campus activity'}
            >
              <Text style={styles.expandToggleText}>
                {isActivityCollapsed ? 'Expand' : 'Collapse'}
              </Text>
              <Ionicons
                name={isActivityCollapsed ? 'chevron-down' : 'chevron-up'}
                size={12}
                color={SEMANTIC_COLORS.neutralGrayLight}
              />
            </Pressable>
          </View>

          {!isActivityCollapsed && (
            <View style={styles.accordionContainer}>
              {/* Category 1: Academics */}
              {clusteredActivity.academics.length > 0 && (
                <CategoryClusterAccordion
                  title="Academics"
                  icon="school-outline"
                  count={clusteredActivity.academics.length}
                  isExpanded={expandedCategories.academics}
                  onToggle={() => toggleCategory('academics')}
                  emails={clusteredActivity.academics}
                  onEmailPress={onEmailPress}
                />
              )}

              {/* Category 2: Deadlines */}
              {clusteredActivity.deadlines.length > 0 && (
                <CategoryClusterAccordion
                  title="Deadlines"
                  icon="calendar-outline"
                  count={clusteredActivity.deadlines.length}
                  isExpanded={expandedCategories.deadlines}
                  onToggle={() => toggleCategory('deadlines')}
                  emails={clusteredActivity.deadlines}
                  onEmailPress={onEmailPress}
                />
              )}

              {/* Category 3: Clubs & Activities */}
              {clusteredActivity.clubs.length > 0 && (
                <CategoryClusterAccordion
                  title="Clubs & Activities"
                  icon="flag-outline"
                  count={clusteredActivity.clubs.length}
                  isExpanded={expandedCategories.clubs}
                  onToggle={() => toggleCategory('clubs')}
                  emails={clusteredActivity.clubs}
                  onEmailPress={onEmailPress}
                />
              )}

              {/* Category 4: Institute Announcements */}
              {clusteredActivity.announcements.length > 0 && (
                <CategoryClusterAccordion
                  title="Announcements"
                  icon="megaphone-outline"
                  count={clusteredActivity.announcements.length}
                  isExpanded={expandedCategories.announcements}
                  onToggle={() => toggleCategory('announcements')}
                  emails={clusteredActivity.announcements}
                  onEmailPress={onEmailPress}
                />
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Clustered Category Accordion Subcomponent (Pillars 3 & 4) ────

interface CategoryClusterAccordionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  emails: ParsedEmail[];
  onEmailPress: (id: string) => void;
}

function CategoryClusterAccordion({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  emails,
  onEmailPress,
}: CategoryClusterAccordionProps) {
  return (
    <View style={styles.clusterBlock}>
      {/* Accordion Header (Touch Friendly, Quiet Monochrome) */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.clusterHeader,
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${count} items, ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        <View style={styles.clusterHeaderLeft}>
          <Ionicons name={icon} size={15} color={SEMANTIC_COLORS.neutralGrayLight} style={{ marginRight: 8 }} />
          <Text style={styles.clusterHeaderTitle}>{title}</Text>
          <View style={styles.clusterCountPill}>
            <Text style={styles.clusterCountText}>{count}</Text>
          </View>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={SEMANTIC_COLORS.neutralGray}
        />
      </Pressable>

      {/* Accordion Content (Minimalist 2-line rows) */}
      {isExpanded && (
        <View style={styles.clusterContentCard}>
          {emails.map((email, idx) => {
            const isFirst = idx === 0;
            const isUnread = email.isUnread;
            const timeAgo = formatDistanceToNow(new Date(email.date), { addSuffix: true });

            return (
              <Pressable
                key={email.id}
                onPress={() => onEmailPress(email.id)}
                style={({ pressed }) => [
                  styles.activityRow,
                  !isFirst && styles.rowBorderTop,
                  !isUnread && styles.activityRowRead, // Muted low priority (Pillar 6)
                  pressed && { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
                ]}
                accessibilityRole="button"
              >
                {/* Quiet unread indicator dot (3-tier neutral) */}
                <View style={styles.activityDotCol}>
                  {isUnread && <View style={styles.unreadBlueDot} />}
                </View>

                {/* 2-line clean text */}
                <View style={styles.activityBody}>
                  <Text
                    style={[
                      styles.activityTitle,
                      !isUnread && styles.activityTitleMuted,
                    ]}
                    numberOfLines={1}
                  >
                    {email.subject}
                  </Text>
                  <Text style={styles.activitySubtext} numberOfLines={1}>
                    {email.sender} · {timeAgo}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={SEMANTIC_COLORS.neutralGray}
                  style={{ marginLeft: 6 }}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Stylesheet ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  // Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.9,
    color: 'rgba(255, 255, 255, 0.65)',
    textTransform: 'uppercase',
  },
  headerBadge: {
    backgroundColor: SEMANTIC_COLORS.actionBlueBg,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  headerBadgeUrgent: {
    backgroundColor: SEMANTIC_COLORS.urgentRedBg,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
  },
  headerBadgeTextUrgent: {
    color: '#F87171',
  },
  headerBadgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
  },
  headerBadgeTextMuted: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: SEMANTIC_COLORS.neutralGrayLight,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: SEMANTIC_COLORS.neutralGrayLight,
  },

  // Action Tasks Card
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  taskRowDone: {
    opacity: 0.42,
  },
  rowBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SEMANTIC_COLORS.neutralBorder,
  },

  // Checkbox (Apple HIG 44x44pt Target)
  checkboxTouchTarget: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxDone: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },

  // Severity Dots (Pillar 1)
  indicatorTouchTarget: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SEMANTIC_COLORS.neutralGray,
  },
  severityDotRed: {
    backgroundColor: SEMANTIC_COLORS.urgentRed,
  },
  severityDotAction: {
    backgroundColor: SEMANTIC_COLORS.actionBlue,
  },
  severityDotAlert: {
    backgroundColor: '#60A5FA',
  },

  // 2-Line Task Body (Pillar 4)
  taskContentBody: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: Typography.weight.semibold,
    color: '#F4F4F5',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#71717A',
  },
  taskSubtext: {
    fontSize: 12,
    fontWeight: Typography.weight.regular,
    color: SEMANTIC_COLORS.neutralGray,
  },
  taskSubtextRed: {
    color: '#F87171',
  },
  chevronTouchTarget: {
    paddingLeft: 8,
  },

  // All Caught Up Card (Pillar 6)
  allClearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.18)',
    padding: 14,
    gap: 12,
  },
  allClearIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allClearTextWrap: {
    flex: 1,
  },
  allClearTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
    color: '#F4F4F5',
    marginBottom: 1,
  },
  allClearSubtitle: {
    fontSize: 12,
    color: SEMANTIC_COLORS.neutralGray,
  },

  // Section 2: Campus Activity (Pillars 2 & 3)
  activitySectionWrap: {
    marginTop: 22,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  accordionContainer: {
    gap: 10,
  },
  clusterBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clusterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterHeaderTitle: {
    fontSize: 13.5,
    fontWeight: Typography.weight.semibold,
    color: '#E4E4E7',
    letterSpacing: -0.1,
  },
  clusterCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    marginLeft: 7,
  },
  clusterCountText: {
    fontSize: 10.5,
    fontWeight: Typography.weight.bold,
    color: SEMANTIC_COLORS.neutralGrayLight,
  },

  // Clustered Rows Inside Accordion (Pillars 4 & 6)
  clusterContentCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  activityRowRead: {
    opacity: 0.58,
  },
  activityDotCol: {
    width: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  unreadBlueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  activityBody: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13.5,
    fontWeight: Typography.weight.medium,
    color: '#F4F4F5',
    marginBottom: 2,
  },
  activityTitleMuted: {
    color: '#A1A1AA',
    fontWeight: Typography.weight.regular,
  },
  activitySubtext: {
    fontSize: 11.5,
    color: SEMANTIC_COLORS.neutralGray,
  },
});
