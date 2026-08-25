/**
 * WidgetPreview.tsx — Interactive, high-fidelity iOS 18 & Android home screen widget simulator.
 * Provides previews for:
 * 1. Academic Timetable Widget
 * 2. Campus Mess Menu Widget
 * 3. Category-Filtered Mails Widget (Placements, Academics, Events, Hostel, etc.)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import {
  getWidgetAcademicData,
  getWidgetMessData,
  getWidgetCategoryEmailsData,
  EMAIL_CATEGORIES,
  WidgetAcademicData,
  WidgetMessData,
  WidgetCategoryEmailsData,
} from '@/services/widgetDataService';

export type WidgetType = 'academic' | 'mess' | 'emails';
export type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetPreviewProps {
  type?: WidgetType;
  size?: WidgetSize;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  interactive?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Academic Calendar Widget Card
// ---------------------------------------------------------------------------
export function AcademicWidgetCard({ size = 'medium' }: { size?: WidgetSize }) {
  const data: WidgetAcademicData = getWidgetAcademicData();
  const active = data.activeClass;
  const next = data.nextClass;

  if (size === 'small') {
    return (
      <View style={[styles.widgetFrame, styles.smallFrame]}>
        <View style={styles.headerMini}>
          <Ionicons name="calendar-outline" size={14} color={Colors.systemBlue} />
          <Text style={styles.headerTitleMini}>TIMETABLE</Text>
        </View>
        <View style={styles.centerValueWrap}>
          <Text style={styles.smallBigNumber}>{data.totalClassesToday}</Text>
          <Text style={styles.smallSubLabel}>Classes Today</Text>
        </View>
        {active ? (
          <View style={styles.smallFooterBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.smallFooterText} numberOfLines={1}>
              {active.code} ({active.room})
            </Text>
          </View>
        ) : (
          <Text style={styles.smallFooterTextMuted}>All lectures done</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.widgetFrame, size === 'large' ? styles.largeFrame : styles.mediumFrame]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLogo}>
          <Ionicons name="school" size={16} color={Colors.systemBlue} />
          <Text style={styles.headerTitle}>ACADEMIC CALENDAR</Text>
        </View>
        <Text style={styles.headerBadge}>{data.totalClassesToday} Classes Today</Text>
      </View>

      {/* Active Class Box */}
      {active ? (
        <View style={styles.activeClassBanner}>
          <View style={styles.liveTagRow}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>NOW IN SESSION</Text>
            <Text style={styles.timeTag}>{active.timeSlot}</Text>
          </View>
          <Text style={styles.activeCourseTitle} numberOfLines={1}>
            {active.code} · {active.title}
          </Text>
          <Text style={styles.activeVenueText}>
            Room: <Text style={{ color: Colors.systemBlue, fontWeight: '700' }}>{active.room}</Text> · Slot {active.slot}
          </Text>
        </View>
      ) : (
        <View style={styles.noLiveBox}>
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.systemGreen} />
          <Text style={styles.noLiveText}>No active lecture right now</Text>
        </View>
      )}

      {/* Next Class Box */}
      {next && (
        <View style={styles.nextClassRow}>
          <Ionicons name="time-outline" size={15} color={Colors.systemOrange} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nextLabel}>UPCOMING NEXT</Text>
            <Text style={styles.nextTitle} numberOfLines={1}>
              {next.code} — {next.title} ({next.room})
            </Text>
          </View>
        </View>
      )}

      {size === 'large' && data.todayClasses.length > 2 && (
        <View style={styles.largeExtraList}>
          <Text style={styles.remainingTitle}>REMAINING SCHEDULE:</Text>
          {data.todayClasses.slice(2).map((item) => (
            <View key={item.id} style={styles.remainingItemRow}>
              <Text style={styles.remainingCode}>{item.code}</Text>
              <Text style={styles.remainingRoom}>{item.room}</Text>
              <Text style={styles.remainingTime}>{item.timeSlot}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2. Campus Mess Menu Widget Card
// ---------------------------------------------------------------------------
export function MessWidgetCard({ size = 'medium' }: { size?: WidgetSize }) {
  const data: WidgetMessData = getWidgetMessData();

  if (size === 'small') {
    return (
      <View style={[styles.widgetFrame, styles.smallFrame]}>
        <View style={styles.headerMini}>
          <Ionicons name="restaurant-outline" size={14} color={Colors.systemOrange} />
          <Text style={[styles.headerTitleMini, { color: Colors.systemOrange }]}>
            {data.mealType.toUpperCase()}
          </Text>
        </View>
        <View style={styles.centerValueWrap}>
          <Text style={[styles.smallBigText, { color: Colors.text }]} numberOfLines={2}>
            {data.main[0] || 'Mess Menu'}
          </Text>
        </View>
        <Text style={styles.smallFooterTextMuted} numberOfLines={1}>
          {data.dayName} ({data.weekType.toUpperCase()} Wk)
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.widgetFrame, size === 'large' ? styles.largeFrame : styles.mediumFrame]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLogo}>
          <Ionicons name="restaurant" size={16} color={Colors.systemOrange} />
          <Text style={[styles.headerTitle, { color: Colors.systemOrange }]}>
            MESS MENU · {data.mealType.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.headerBadge}>{data.mealTimeLabel}</Text>
      </View>

      <View style={styles.messContentCard}>
        <Text style={styles.daySubHeader}>
          {data.dayName} · <Text style={{ color: Colors.systemOrange, fontWeight: '700' }}>{data.weekType.toUpperCase()} WEEK</Text>
        </Text>

        <View style={styles.mainItemsBox}>
          <Text style={styles.mainItemsLabel}>MAIN DISHES:</Text>
          <Text style={styles.mainItemsText} numberOfLines={size === 'large' ? 3 : 2}>
            {data.main.join('  •  ')}
          </Text>
        </View>

        {data.accompaniments.length > 0 && (
          <Text style={styles.accompanimentText} numberOfLines={1}>
            Sides: {data.accompaniments.slice(0, 4).join(', ')}
          </Text>
        )}

        {data.dessert && (
          <View style={styles.dessertBadge}>
            <Ionicons name="ice-cream-outline" size={13} color={Colors.systemPink || '#FF2D55'} />
            <Text style={styles.dessertText} numberOfLines={1}>
              Dessert: {data.dessert}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3. Category Mails Widget Card
// ---------------------------------------------------------------------------
export function CategoryEmailsWidgetCard({
  size = 'medium',
  selectedCategory = 'Placements',
  onCategoryChange,
}: {
  size?: WidgetSize;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}) {
  const router = useRouter();
  const categoryData: WidgetCategoryEmailsData = getWidgetCategoryEmailsData(selectedCategory);
  const currentEmails = categoryData.emails[selectedCategory] || [];
  const unreadCount = categoryData.unreadCounts[selectedCategory] || 0;

  if (size === 'small') {
    return (
      <View style={[styles.widgetFrame, styles.smallFrame]}>
        <View style={styles.headerMini}>
          <Ionicons name="mail" size={14} color={Colors.systemPurple || '#AF52DE'} />
          <Text style={[styles.headerTitleMini, { color: Colors.systemPurple || '#AF52DE' }]}>
            {selectedCategory.toUpperCase()}
          </Text>
        </View>
        <View style={styles.centerValueWrap}>
          <Text style={[styles.smallBigNumber, { color: Colors.systemPurple || '#AF52DE' }]}>
            {unreadCount}
          </Text>
          <Text style={styles.smallSubLabel}>New Emails</Text>
        </View>
        <Text style={styles.smallFooterTextMuted} numberOfLines={1}>
          {currentEmails[0]?.subject || 'No new mails'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.widgetFrame, size === 'large' ? styles.largeFrame : styles.mediumFrame]}>
      {/* Widget Header & Category Selector */}
      <View style={styles.headerRow}>
        <View style={styles.headerLogo}>
          <Ionicons name="mail-unread" size={16} color={Colors.systemPurple || '#AF52DE'} />
          <Text style={[styles.headerTitle, { color: Colors.systemPurple || '#AF52DE' }]}>
            CAMPUS MAILS
          </Text>
        </View>
        <View style={styles.unreadCountBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCount} Unread</Text>
        </View>
      </View>

      {/* Category Pills Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={{ gap: 6 }}>
        {EMAIL_CATEGORIES.map((cat) => {
          const isSel = cat === selectedCategory;
          return (
            <Pressable
              key={cat}
              onPress={() => {
                hapticLight();
                if (onCategoryChange) onCategoryChange(cat);
              }}
              style={[styles.catPill, isSel && styles.catPillActive]}
            >
              <Text style={[styles.catPillText, isSel && styles.catPillTextActive]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Email Feed Items */}
      <View style={styles.emailListWrap}>
        {currentEmails.slice(0, size === 'large' ? 4 : 2).map((mail) => (
          <Pressable
            key={mail.id}
            onPress={() => {
              hapticMedium();
              router.push(`/(app)/email/${mail.id}`);
            }}
            style={styles.mailRowCard}
          >
            <View style={styles.mailDotCol}>
              {mail.isUnread && <View style={styles.unreadDot} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.senderLine}>
                <Text style={styles.senderName} numberOfLines={1}>
                  {mail.sender}
                </Text>

                {mail.deadlineLabel ? (
                  <View style={styles.deadlineBadge}>
                    <Ionicons name="alarm" size={10} color={Colors.systemOrange} />
                    <Text style={styles.deadlineBadgeText}>{mail.deadlineLabel}</Text>
                  </View>
                ) : (
                  <Text style={styles.mailTime}>{mail.receivedAt}</Text>
                )}
              </View>
              <Text style={styles.mailSubject} numberOfLines={1}>
                {mail.subject}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Combined Widget Preview Switcher
// ---------------------------------------------------------------------------
export function WidgetPreview({
  type = 'academic',
  size = 'medium',
  selectedCategory = 'Placements',
  onCategoryChange,
}: WidgetPreviewProps) {
  if (type === 'academic') {
    return <AcademicWidgetCard size={size} />;
  }
  if (type === 'mess') {
    return <MessWidgetCard size={size} />;
  }
  return (
    <CategoryEmailsWidgetCard
      size={size}
      selectedCategory={selectedCategory}
      onCategoryChange={onCategoryChange}
    />
  );
}

const styles = StyleSheet.create({
  widgetFrame: {
    backgroundColor: 'rgba(26, 29, 36, 0.95)',
    borderRadius: Radius.xl,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: Spacing[2.5],
    ...Shadows.md,
  },
  smallFrame: {
    width: 155,
    height: 155,
    justifyContent: 'space-between',
  },
  mediumFrame: {
    width: '100%',
    minHeight: 165,
  },
  largeFrame: {
    width: '100%',
    minHeight: 280,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
    letterSpacing: 1,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },

  // Small Widget styles
  headerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitleMini: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
    letterSpacing: 0.8,
  },
  centerValueWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  smallBigNumber: {
    fontSize: 32,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  smallBigText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  smallSubLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  smallFooterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemGreen,
  },
  smallFooterText: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
  smallFooterTextMuted: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Academic Widget Box styles
  activeClassBanner: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderRadius: Radius.md,
    padding: Spacing[2.5],
    borderLeftWidth: 3,
    borderLeftColor: Colors.systemBlue,
    gap: 4,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemGreen,
  },
  liveText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemGreen,
    letterSpacing: 0.8,
  },
  timeTag: {
    fontSize: 9,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  activeCourseTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  activeVenueText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  noLiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing[2.5],
    borderRadius: Radius.md,
  },
  noLiveText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  nextClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    padding: Spacing[2],
    borderRadius: Radius.md,
  },
  nextLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
    letterSpacing: 0.6,
  },
  nextTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  largeExtraList: {
    marginTop: 4,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
  remainingTitle: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  remainingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  remainingCode: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  remainingRoom: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  remainingTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // Mess Widget styles
  messContentCard: {
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.systemOrange,
  },
  daySubHeader: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  mainItemsBox: {
    gap: 2,
  },
  mainItemsLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
    letterSpacing: 0.5,
  },
  mainItemsText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    lineHeight: 18,
  },
  accompanimentText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dessertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dessertText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemPink || '#FF2D55',
  },

  // Category Emails Widget styles
  unreadCountBadge: {
    backgroundColor: 'rgba(175, 82, 222, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemPurple || '#AF52DE',
  },
  categoryBar: {
    maxHeight: 28,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  catPillActive: {
    backgroundColor: Colors.systemPurple || '#AF52DE',
  },
  catPillText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  catPillTextActive: {
    color: Colors.white,
    fontWeight: Typography.weight.bold,
  },
  emailListWrap: {
    gap: 6,
  },
  mailRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: Spacing[2],
    borderRadius: Radius.md,
  },
  mailDotCol: {
    width: 6,
    alignItems: 'center',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemPurple || '#AF52DE',
  },
  senderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    flex: 1,
  },
  mailTime: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  mailSubject: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  deadlineBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
});
