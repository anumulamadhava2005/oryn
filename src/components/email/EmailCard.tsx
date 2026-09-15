/**
 * EmailCard v2 — Borderless Apple Mail list style with gesture-driven swipe actions.
 * Removed rounded group card treatment. Uses hairline dividers, larger snippet preview,
 * and inline category + date for reduced vertical height.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { PriorityDot, CategoryBadge } from '@/components/ui/Badge';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { hapticMedium, hapticLight } from '@/utils/haptics';
import type { ParsedEmail } from '@/types/email';

const SWIPE_THRESHOLD_ACTION = 70;
const SWIPE_THRESHOLD_FULL = 180;

interface Props {
  email: ParsedEmail;
  onPress: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onToggleRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEE');
  return format(d, 'MMM d');
}

function getInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

function getAvatarColor(email: string): string {
  const COLORS = [
    '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#30B0C7',
    '#FF9500', '#34C759', '#636366', '#5E5CE6',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

export const EmailCard = React.memo(function EmailCard({
  email,
  onPress,
  onToggleStar,
  onToggleRead,
  onArchive,
  isFirst = false,
  isLast = false,
}: Props) {
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const leftTriggered = useSharedValue(false);
  const rightTriggered = useSharedValue(false);

  const handlePress = useCallback(() => {
    hapticLight();
    onPress(email.id);
  }, [email.id, onPress]);

  const handleToggleStar = useCallback(() => {
    hapticMedium();
    onToggleStar?.(email.id);
  }, [email.id, onToggleStar]);

  const handleToggleRead = useCallback(() => {
    hapticMedium();
    onToggleRead?.(email.id);
  }, [email.id, onToggleRead]);

  const handleArchive = useCallback(() => {
    hapticMedium();
    onArchive?.(email.id);
  }, [email.id, onArchive]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX;

      if (e.translationX > SWIPE_THRESHOLD_ACTION && !leftTriggered.value) {
        leftTriggered.value = true;
        runOnJS(hapticLight)();
      } else if (e.translationX <= SWIPE_THRESHOLD_ACTION) {
        leftTriggered.value = false;
      }

      if (e.translationX < -SWIPE_THRESHOLD_ACTION && !rightTriggered.value) {
        rightTriggered.value = true;
        runOnJS(hapticLight)();
      } else if (e.translationX >= -SWIPE_THRESHOLD_ACTION) {
        rightTriggered.value = false;
      }
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD_ACTION) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        runOnJS(handleToggleRead)();
      } else if (e.translationX < -SWIPE_THRESHOLD_FULL) {
        translateX.value = withTiming(-500, { duration: 250 });
        cardOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(handleArchive)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD_ACTION) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        runOnJS(handleToggleStar)();
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cardOpacity.value,
  }));

  const leftBgContainerStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 2 ? 1 : 0,
  }));

  const rightBgContainerStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -2 ? 1 : 0,
  }));

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD_ACTION],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD_ACTION],
      [0.6, 1],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD_ACTION, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD_ACTION, 0],
      [1, 0.6],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  });

  const rightBgStyle = useAnimatedStyle(() => {
    const isArchiveZone = translateX.value < -SWIPE_THRESHOLD_FULL;
    return {
      backgroundColor: isArchiveZone
        ? Colors.systemRed
        : Colors.systemYellow,
    };
  });

  const avatarColor = getAvatarColor(email.senderEmail);
  const initial = getInitial(email.sender);

  return (
    <View style={styles.wrapper}>
      {/* Left action background — read/unread (blue) */}
      <Animated.View style={[styles.actionLeft, leftBgContainerStyle]}>
        <Animated.View style={[styles.actionIconWrap, leftActionStyle]}>
          <Ionicons
            name={email.isUnread ? 'mail-open-outline' : 'mail-unread-outline'}
            size={20}
            color={Colors.white}
          />
          <Text style={styles.actionText}>
            {email.isUnread ? 'Read' : 'Unread'}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Right action background — star / archive */}
      <Animated.View style={[styles.actionRight, rightBgStyle, rightBgContainerStyle]}>
        <Animated.View style={[styles.actionIconWrap, rightActionStyle]}>
          <Ionicons
            name={email.isStarred ? 'star-outline' : 'star'}
            size={20}
            color={Colors.white}
          />
          <Text style={styles.actionText}>
            {email.isStarred ? 'Unstar' : 'Star'}
          </Text>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.inner,
              pressed && styles.innerPressed,
            ]}
          >
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
              </View>
              {email.isUnread && <View style={styles.unreadDot} />}
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Row 1: Sender + date + star */}
              <View style={styles.topRow}>
                <Text
                  style={[styles.sender, email.isUnread && styles.senderUnread]}
                  numberOfLines={1}
                >
                  {email.sender}
                </Text>
                <View style={styles.topRight}>
                  {email.isStarred && (
                    <Ionicons name="star" size={12} color={Colors.systemYellow} />
                  )}
                  <Text style={[styles.date, email.isUnread && styles.dateUnread]}>
                    {formatDate(email.date)}
                  </Text>
                </View>
              </View>

              {/* Row 2: Subject + priority indicator + category tag */}
              <View style={styles.subjectRow}>
                <Text
                  style={[styles.subject, email.isUnread && styles.subjectUnread]}
                  numberOfLines={1}
                >
                  {email.subject}
                </Text>
                {email.priority === 'critical' || email.priority === 'high' ? (
                  <PriorityDot priority={email.priority} size={6} />
                ) : null}
              </View>

              {/* Row 3: Single-line snippet + inline category / deadline pill */}
              <View style={styles.snippetRow}>
                <Text style={styles.snippet} numberOfLines={1}>
                  {email.snippet}
                </Text>
                {email.deadline ? (
                  <View style={styles.deadlineTag}>
                    <Ionicons name="alarm-outline" size={10} color={Colors.systemOrange} />
                    <Text style={styles.deadlineTagText}>
                      {email.deadlineLabel ?? 'Due'}
                    </Text>
                  </View>
                ) : (
                  <CategoryBadge category={email.category} />
                )}
              </View>
            </View>
          </Pressable>

          {/* Hairline Divider - inset to align with text */}
          {!isLast && <View style={styles.hairlineDivider} />}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: Colors.systemBlue,
    justifyContent: 'center',
    paddingLeft: Spacing[4],
  },
  actionRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Spacing[4],
  },
  actionIconWrap: {
    alignItems: 'center',
    gap: 3,
  },
  actionText: {
    color: Colors.white,
    fontWeight: Typography.weight.semibold,
    fontSize: 10,
  },
  card: {
    backgroundColor: Colors.background,
    position: 'relative',
  },
  hairlineDivider: {
    position: 'absolute',
    bottom: 0,
    left: 62,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: Spacing[4],
    gap: 12,
  },
  innerPressed: {
    backgroundColor: Colors.card,
  },
  avatarWrap: {
    position: 'relative',
    marginTop: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.systemBlue,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  sender: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    flex: 1,
    fontWeight: Typography.weight.medium,
    marginRight: 8,
  },
  senderUnread: {
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },
  date: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  dateUnread: {
    color: Colors.systemBlue,
    fontWeight: Typography.weight.semibold,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    justifyContent: 'space-between',
  },
  subject: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.regular,
    flex: 1,
  },
  subjectUnread: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  snippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
    marginTop: 1,
  },
  snippet: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  deadlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
  deadlineTagText: {
    fontSize: 10,
    color: Colors.systemOrange,
    fontWeight: Typography.weight.semibold,
  },
});
