/**
 * MessMenuCard — Enhanced with Date Selection & Emil Kowalski's Design Engineering Principles.
 *
 * Features:
 * 1. Date Selector Stepper & 7-Day Quick Strip for instantaneous menu day selection.
 * 2. Full Month Calendar Picker Modal to pick any date in past or future.
 * 3. Tactile press feedback (`scale: 0.97`) on all interactive buttons.
 * 4. Animated active tab slider using spring physics.
 * 5. Pulsing live aura dot on "SERVED NOW" badge when viewing current date/meal.
 * 6. Dynamic detection of email-based mess menu updates & changes with direct navigation.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import {
  MESS_MENU,
  getCurrentMealType,
  getMealTimeLabel,
  getWeekType,
  getDayName,
  type MealType,
  type WeekType,
} from '@/constants/messMenu';
import { fetchRemoteMessMenu } from '@/services/orynApi';
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
} from 'date-fns';
import { useEmails } from '@/hooks/useEmails';
import { useMessFeedbackStore } from '@/store/messFeedbackStore';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import type { ParsedEmail } from '@/types/email';

const RATING_TAGS = ['Delicious', 'Fresh', 'Cold Food', 'Shortage', 'Hygiene Issue', 'Crowded'];

interface Props {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  showDatePicker?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const MEALS: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

const MEAL_ICONS: Record<MealType, React.ComponentProps<typeof Ionicons>['name']> = {
  breakfast: 'cafe-outline',
  lunch: 'restaurant-outline',
  snacks: 'fast-food-outline',
  dinner: 'moon-outline',
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

/** Helper to identify emails sent strictly by Mess Affairs regarding menu/schedule changes on target date */
function findMessChangeNotice(emails: ParsedEmail[], targetDate: Date = new Date()): ParsedEmail | null {
  for (const email of emails) {
    const emailDate = new Date(email.date);
    if (!isSameDay(emailDate, targetDate)) {
      continue;
    }

    const sender = ((email.sender || '') + ' ' + (email.senderEmail || '')).toLowerCase();
    const subjectAndContent = (email.subject + ' ' + email.snippet + ' ' + (email.body || '')).toLowerCase();

    const isMessAffairsSender =
      sender.includes('mess affairs') ||
      sender.includes('messaffairs') ||
      sender.includes('mess.affairs') ||
      sender.includes('mess_affairs');

    const mentionsMessAffairs =
      subjectAndContent.includes('mess affairs') ||
      subjectAndContent.includes('mess affairs team') ||
      subjectAndContent.includes('mess affairs committee');

    if (isMessAffairsSender || mentionsMessAffairs) {
      return email;
    }
  }

  return null;
}

export function MessMenuCard({
  selectedDate: propSelectedDate,
  onDateChange,
  showDatePicker = false,
  collapsible = false,
  defaultCollapsed = false,
}: Props) {
  const router = useRouter();
  const { allEmails } = useEmails();

  const [activeDate, setActiveDate] = useState<Date>(propSelectedDate || new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [modalViewMonth, setModalViewMonth] = useState<Date>(activeDate);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  // Sync with prop if provided
  useEffect(() => {
    if (propSelectedDate) {
      setActiveDate(propSelectedDate);
    }
  }, [propSelectedDate]);

  const isTodaySelected = useMemo(() => isToday(activeDate), [activeDate]);
  const currentMeal = useMemo(() => getCurrentMealType(activeDate), [activeDate]);
  const defaultWeekType = useMemo(() => getWeekType(activeDate), [activeDate]);
  const dayName = useMemo(() => getDayName(activeDate), [activeDate]);

  const [activeMeal, setActiveMeal] = useState<MealType>(currentMeal);
  const [manualWeekType, setManualWeekType] = useState<WeekType | null>(null);
  const [remoteMenu, setRemoteMenu] = useState<any>(null);

  const { submitFeedback, getFeedback, getMealCampusStats, loadCampusStats } = useMessFeedbackStore();
  const feedbackDateStr = useMemo(() => format(activeDate, 'yyyy-MM-dd'), [activeDate]);
  const userFeedback = getFeedback(feedbackDateStr, activeMeal);
  const campusStats = getMealCampusStats(activeMeal);

  useEffect(() => {
    loadCampusStats(feedbackDateStr);
  }, [feedbackDateStr, loadCampusStats]);

  const handleRate = (rating: number) => {
    hapticSuccess();
    submitFeedback(feedbackDateStr, activeMeal, rating, userFeedback?.tags || []);
  };

  const handleToggleTag = (tag: string) => {
    hapticLight();
    const curTags = userFeedback?.tags || [];
    const nextTags = curTags.includes(tag) ? curTags.filter(t => t !== tag) : [...curTags, tag];
    submitFeedback(feedbackDateStr, activeMeal, userFeedback?.rating || 4, nextTags);
  };

  // When activeDate changes, update activeMeal to currentMeal of that date
  useEffect(() => {
    setActiveMeal(getCurrentMealType(activeDate));
    setManualWeekType(null); // reset manual override when date changes
  }, [activeDate]);

  // Fetch remote mess menu from https://api.cruxel.xyz/oryn/mess-menu
  useEffect(() => {
    let isMounted = true;
    fetchRemoteMessMenu().then(data => {
      if (isMounted && data) {
        setRemoteMenu(data);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const weekType = manualWeekType ?? defaultWeekType;

  const mealData = useMemo(() => {
    return remoteMenu?.[weekType]?.[dayName]?.[activeMeal] || MESS_MENU[weekType]?.[dayName]?.[activeMeal];
  }, [remoteMenu, weekType, dayName, activeMeal]);

  // Scan emails for mess modification announcements on active date
  const messNoticeEmail = useMemo(() => findMessChangeNotice(allEmails, activeDate), [allEmails, activeDate]);

  const isCurrentMeal = isTodaySelected && activeMeal === getCurrentMealType(new Date());
  const timeLabel = getMealTimeLabel(activeMeal);

  // Calculate 7-day strip around activeDate (Mon to Sun)
  const stripDays = useMemo(() => {
    const start = startOfWeek(activeDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [activeDate]);

  const handleDateSelect = (d: Date) => {
    hapticLight();
    setActiveDate(d);
    onDateChange?.(d);
  };

  const handlePrevDay = () => {
    hapticLight();
    const next = subDays(activeDate, 1);
    setActiveDate(next);
    onDateChange?.(next);
  };

  const handleNextDay = () => {
    hapticLight();
    const next = addDays(activeDate, 1);
    setActiveDate(next);
    onDateChange?.(next);
  };

  const handleResetToday = () => {
    hapticLight();
    const today = new Date();
    setActiveDate(today);
    onDateChange?.(today);
  };

  const handleWeekToggle = () => {
    hapticLight();
    setManualWeekType(w => {
      const cur = w ?? defaultWeekType;
      return cur === 'even' ? 'odd' : 'even';
    });
  };

  const handleMealChange = (m: MealType) => {
    hapticLight();
    setActiveMeal(m);
  };

  const handleNoticePress = (emailId: string) => {
    hapticLight();
    router.push(`/(app)/email/${emailId}?from=today` as any);
  };

  // Calendar Modal Days Matrix
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(modalViewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(modalViewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [modalViewMonth]);

  // Compact single-line view (Point 2)
  if (collapsible && !isExpanded) {
    const mealLabel = MEAL_LABELS[activeMeal] || 'Meal';
    const items = mealData?.items || [];
    const previewItems = items.slice(0, 3).join(', ');
    const remainingCount = items.length > 3 ? items.length - 3 : 0;
    const previewText = previewItems
      ? `${previewItems}${remainingCount > 0 ? ` +${remainingCount} more` : ''}`
      : 'View daily mess schedule';

    return (
      <Pressable
        style={({ pressed }) => [styles.compactBar, pressed && styles.pressedScale]}
        onPress={() => {
          hapticLight();
          setIsExpanded(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Mess menu: ${mealLabel}, ${previewText}`}
      >
        <View style={styles.compactLeft}>
          <View style={styles.compactIconBox}>
            <Ionicons name="restaurant-outline" size={15} color={Colors.systemOrange} />
          </View>
          <View style={styles.compactTextCol}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {mealLabel}: <Text style={styles.compactItems}>{previewText}</Text>
            </Text>
            <Text style={styles.compactSub} numberOfLines={1}>
              {timeLabel} · Tap to expand
            </Text>
          </View>
        </View>

        <View style={styles.compactRight}>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.headerIconBox}>
            <Ionicons name="restaurant" size={15} color={Colors.systemOrange} />
          </View>
          <View>
            <Text style={styles.headerLabel}>CAMPUS MESS MENU</Text>
            <Text style={styles.daySublabel}>
              {dayName} · {weekType.toUpperCase()} WEEK
            </Text>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          {collapsible && (
            <Pressable
              onPress={() => {
                hapticLight();
                setIsExpanded(false);
              }}
              style={({ pressed }) => [
                styles.collapseBtn,
                pressed && styles.pressedScale,
              ]}
              hitSlop={8}
            >
              <Text style={styles.collapseBtnText}>Collapse</Text>
              <Ionicons name="chevron-up" size={12} color={Colors.textSecondary} />
            </Pressable>
          )}

          {/* Week Switcher Button */}
          <Pressable
            onPress={handleWeekToggle}
            style={({ pressed }) => [
              styles.weekToggleBtn,
              pressed && styles.pressedScale,
            ]}
            hitSlop={8}
          >
            <Text style={styles.weekToggleText}>{weekType.toUpperCase()} WEEK</Text>
            <Ionicons name="swap-horizontal" size={13} color={Colors.systemOrange} />
          </Pressable>
        </View>
      </View>

      {/* Date Navigation & Stepper Bar (if standalone) */}
      {showDatePicker && (
        <>
          <View style={styles.dateSelectorBar}>
            <Pressable
              onPress={handlePrevDay}
              style={({ pressed }) => [styles.dateNavBtn, pressed && styles.pressedScale]}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={15} color={Colors.text} />
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                setModalViewMonth(activeDate);
                setShowDatePickerModal(true);
              }}
              style={({ pressed }) => [styles.dateTitleBtn, pressed && styles.pressedScale]}
            >
              <Ionicons name="calendar-outline" size={14} color={Colors.systemOrange} />
              <Text style={styles.dateTitleText}>
                {isTodaySelected ? `Today (${format(activeDate, 'MMM d')})` : format(activeDate, 'EEE, MMM d, yyyy')}
              </Text>
              <Ionicons name="chevron-down" size={12} color={Colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={handleNextDay}
              style={({ pressed }) => [styles.dateNavBtn, pressed && styles.pressedScale]}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={15} color={Colors.text} />
            </Pressable>

            {!isTodaySelected && (
              <Pressable
                onPress={handleResetToday}
                style={({ pressed }) => [styles.todayResetBtn, pressed && styles.pressedScale]}
                hitSlop={6}
              >
                <Ionicons name="today-outline" size={12} color={Colors.systemBlue} />
                <Text style={styles.todayResetText}>Today</Text>
              </Pressable>
            )}
          </View>

          {/* 7-Day Quick Strip */}
          <View style={styles.dayStrip}>
            {stripDays.map((d) => {
              const isSelected = isSameDay(d, activeDate);
              const isTodayDay = isToday(d);
              return (
                <Pressable
                  key={d.toISOString()}
                  onPress={() => handleDateSelect(d)}
                  style={({ pressed }) => [
                    styles.dayStripPill,
                    isSelected && styles.dayStripPillSelected,
                    isTodayDay && !isSelected && styles.dayStripPillToday,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={[styles.dayStripSub, isSelected && styles.dayStripTextSelected]}>
                    {format(d, 'EEE').toUpperCase()}
                  </Text>
                  <Text style={[styles.dayStripNum, isSelected && styles.dayStripTextSelected]}>
                    {format(d, 'd')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Segmented Meal Control Bar */}
      <View style={styles.segmentedTrack}>
        {MEALS.map((m) => {
          const isActive = activeMeal === m;
          const isNow = isTodaySelected && m === getCurrentMealType(new Date());
          return (
            <Pressable
              key={m}
              onPress={() => handleMealChange(m)}
              style={({ pressed }) => [
                styles.segmentBtn,
                pressed && styles.pressedScale,
              ]}
            >
              {isActive && (
                <MotiView
                  from={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 150 }}
                  style={styles.activeSegmentIndicator}
                />
              )}
              <View style={styles.segmentContent}>
                <Ionicons
                  name={MEAL_ICONS[m]}
                  size={13}
                  color={isActive ? Colors.systemOrange : Colors.textMuted}
                />
                <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                  {MEAL_LABELS[m]}
                </Text>
                {isNow && !isActive && <View style={styles.nowDotInactive} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Status & Time Bar */}
      <View style={styles.statusRow}>
        <View style={styles.timeTag}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.timeTagText}>{timeLabel}</Text>
        </View>

        <View style={styles.statusRightGroup}>
          {campusStats && campusStats.totalRatings > 0 ? (
            <View style={styles.campusRatingBadge}>
              <Ionicons name="star" size={11} color={Colors.systemYellow} />
              <Text style={styles.campusRatingText}>
                {campusStats.averageRating} ({campusStats.totalRatings})
              </Text>
            </View>
          ) : (
            <View style={[styles.campusRatingBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Ionicons name="star-outline" size={11} color={Colors.textMuted} />
              <Text style={[styles.campusRatingText, { color: Colors.textMuted }]}>
                Rate Meal
              </Text>
            </View>
          )}

          {isCurrentMeal && (
            <View style={styles.liveBadgeContainer}>
              <MotiView
                from={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{
                  type: 'timing',
                  duration: 1400,
                  loop: true,
                  repeatReverse: false,
                }}
                style={styles.pulseAura}
              />
              <View style={styles.liveBadgeDot} />
              <Text style={styles.liveBadgeText}>SERVED NOW</Text>
            </View>
          )}
        </View>
      </View>

      {/* Animated Meal Content Body */}
      <MotiView
        key={`${activeDate.toISOString()}-${weekType}-${dayName}-${activeMeal}`}
        from={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 180 }}
        style={styles.menuBody}
      >
        {mealData ? (
          <>
            {/* Unified Dish Grid */}
            <View style={styles.mainGrid}>
              {[...mealData.main, ...mealData.accompaniments].map((dish, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.dishPill,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={styles.dishPillText}>{dish}</Text>
                </Pressable>
              ))}
            </View>

            {/* Metadata Footer: Beverage, Dessert, Extras */}
            <View style={styles.metaRow}>
              {mealData.beverage && (
                <View style={styles.chip}>
                  <Ionicons name="cafe" size={12} color={Colors.systemBlue} />
                  <Text style={styles.chipText}>{mealData.beverage}</Text>
                </View>
              )}
              {mealData.dessert && (
                <View style={[styles.chip, styles.dessertChip]}>
                  <Ionicons name="ice-cream" size={12} color={Colors.systemPink ?? '#FF2D55'} />
                  <Text style={[styles.chipText, styles.dessertText]}>{mealData.dessert}</Text>
                </View>
              )}
              {mealData.extras?.map((extra: string, idx: number) => (
                <View key={idx} style={styles.chip}>
                  <Ionicons name="star-outline" size={12} color={Colors.systemYellow} />
                  <Text style={styles.chipText}>{extra}</Text>
                </View>
              ))}
            </View>

            {/* Anonymous Student Rating Widget */}
            <View style={styles.ratingWidgetContainer}>
              <View style={styles.ratingWidgetHeader}>
                <Text style={styles.ratingWidgetTitle}>
                  {userFeedback ? `Your Rating: ${userFeedback.rating} ★` : `Rate this ${MEAL_LABELS[activeMeal]}`}
                </Text>
                <Text style={styles.ratingWidgetSubtitle}>
                  {userFeedback ? 'Anonymous to Mess Affairs' : 'Tap star to review'}
                </Text>
              </View>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => {
                  const isFilled = (userFeedback?.rating || 0) >= star;
                  return (
                    <Pressable
                      key={star}
                      onPress={() => handleRate(star)}
                      style={({ pressed }) => [styles.starBtn, pressed && styles.pressedScale]}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={isFilled ? 'star' : 'star-outline'}
                        size={22}
                        color={isFilled ? Colors.systemYellow : '#52525B'}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {userFeedback && (
                <View style={styles.ratingTagsWrap}>
                  {RATING_TAGS.map(tag => {
                    const isSelected = userFeedback.tags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => handleToggleTag(tag)}
                        style={[
                          styles.ratingTagChip,
                          isSelected && styles.ratingTagChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ratingTagText,
                            isSelected && styles.ratingTagTextSelected,
                          ]}
                        >
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No menu items listed for this meal.</Text>
          </View>
        )}
      </MotiView>

      {/* Email Mess Change Notice Banner */}
      {messNoticeEmail && (
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <Pressable
            onPress={() => handleNoticePress(messNoticeEmail.id)}
            style={({ pressed }) => [
              styles.noticeBanner,
              pressed && styles.pressedScale,
            ]}
          >
            <View style={styles.noticeIconBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.systemOrange} />
            </View>
            <View style={styles.noticeContent}>
              <View style={styles.noticeTitleRow}>
                <Text style={styles.noticeHeader}>MESS AFFAIRS NOTICE</Text>
                <Text style={styles.noticeTag}>OFFICIAL UPDATE</Text>
              </View>
              <Text style={styles.noticeSubject} numberOfLines={1}>
                {messNoticeEmail.subject}
              </Text>
              <Text style={styles.noticeSnippet} numberOfLines={1}>
                {messNoticeEmail.snippet}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        </MotiView>
      )}

      {/* Full Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePickerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePickerModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDatePickerModal(false)}
          >
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Mess Menu Date</Text>
                <Pressable
                  onPress={() => setShowDatePickerModal(false)}
                  hitSlop={8}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </Pressable>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetRow}>
                <Pressable
                  onPress={() => {
                    handleDateSelect(new Date());
                    setShowDatePickerModal(false);
                  }}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetText}>Today</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    handleDateSelect(addDays(new Date(), 1));
                    setShowDatePickerModal(false);
                  }}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetText}>Tomorrow</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    handleDateSelect(subDays(new Date(), 1));
                    setShowDatePickerModal(false);
                  }}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetText}>Yesterday</Text>
                </Pressable>
              </View>

              {/* Month Navigation */}
              <View style={styles.monthNavRow}>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setModalViewMonth(prev => subMonths(prev, 1));
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.systemOrange} />
                </Pressable>
                <Text style={styles.monthNavTitle}>
                  {format(modalViewMonth, 'MMMM yyyy')}
                </Text>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setModalViewMonth(prev => addMonths(prev, 1));
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.systemOrange} />
                </Pressable>
              </View>

              {/* Weekday Header Labels */}
              <View style={styles.calendarHeaderGrid}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayStr) => (
                  <Text key={dayStr} style={styles.calendarDayHeader}>
                    {dayStr}
                  </Text>
                ))}
              </View>

              {/* Calendar Days Matrix Grid */}
              <View style={styles.calendarDaysGrid}>
                {calendarDays.map((d) => {
                  const isSelected = isSameDay(d, activeDate);
                  const isCurrentMonth = isSameMonth(d, modalViewMonth);
                  const isTodayDay = isToday(d);

                  return (
                    <Pressable
                      key={d.toISOString()}
                      onPress={() => {
                        handleDateSelect(d);
                        setShowDatePickerModal(false);
                      }}
                      style={[
                        styles.calendarDayCell,
                        isSelected && styles.calendarDayCellSelected,
                        isTodayDay && !isSelected && styles.calendarDayCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !isCurrentMonth && styles.calendarDayTextDimmed,
                          isSelected && styles.calendarDayTextSelected,
                          isTodayDay && !isSelected && styles.calendarDayTextToday,
                        ]}
                      >
                        {format(d, 'd')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    gap: Spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  daySublabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginTop: 1,
  },
  weekToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.25)',
  },
  weekToggleText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
    letterSpacing: Typography.tracking.wider,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
  dateSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[2],
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dateNavBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
  },
  dateTitleText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  todayResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  todayResetText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayStripPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 2,
  },
  dayStripPillSelected: {
    backgroundColor: Colors.systemOrange,
    borderColor: Colors.systemOrange,
  },
  dayStripPillToday: {
    borderColor: Colors.systemOrange,
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
  },
  dayStripSub: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  dayStripNum: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  dayStripTextSelected: {
    color: '#FFFFFF',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    position: 'relative',
  },
  activeSegmentIndicator: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Radius.sm,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  segmentText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  segmentTextActive: {
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },
  nowDotInactive: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.systemOrange,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    position: 'relative',
  },
  pulseAura: {
    position: 'absolute',
    left: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemOrange,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.systemOrange,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
    letterSpacing: Typography.tracking.wider,
  },
  menuBody: {
    gap: Spacing[3],
  },
  mainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dishPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  dishPillText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dessertChip: {
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
  },
  chipText: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  dessertText: {
    color: Colors.systemPink ?? '#FF2D55',
    fontWeight: Typography.weight.semibold,
  },
  emptyContainer: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.25)',
    marginTop: Spacing[1],
  },
  noticeIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 149, 0, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeContent: {
    flex: 1,
    gap: 2,
  },
  noticeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeHeader: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
    letterSpacing: Typography.tracking.wider,
  },
  noticeTag: {
    fontSize: 8,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.widest,
  },
  noticeSubject: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  noticeSnippet: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[4],
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  presetBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  monthNavTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  calendarHeaderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  calendarDayHeader: {
    width: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  calendarDayCellSelected: {
    backgroundColor: Colors.systemOrange,
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: Colors.systemOrange,
  },
  calendarDayText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  calendarDayTextDimmed: {
    color: Colors.textMuted,
    opacity: 0.4,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  calendarDayTextToday: {
    color: Colors.systemOrange,
    fontWeight: Typography.weight.bold,
  },
  // Compact Mess Menu Bar Styles (Point 2)
  compactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  compactIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactTextCol: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  compactItems: {
    color: '#D4D4D8',
    fontWeight: Typography.weight.medium,
  },
  compactSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.50)',
    marginTop: 1,
  },
  compactRight: {
    paddingLeft: 4,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  collapseBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  statusRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campusRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 214, 10, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  campusRatingText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.systemYellow,
  },
  ratingWidgetContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing[3],
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  ratingWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingWidgetTitle: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  ratingWidgetSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  starBtn: {
    padding: 2,
  },
  ratingTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  ratingTagChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingTagChipSelected: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  ratingTagText: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: '#A1A1AA',
  },
  ratingTagTextSelected: {
    color: Colors.systemOrange,
    fontWeight: Typography.weight.bold,
  },
});
