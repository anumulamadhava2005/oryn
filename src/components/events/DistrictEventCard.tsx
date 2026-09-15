/**
 * District Event Card — Zomato District Design System.
 * Recreates the exact card styles from District:
 * 1. 'spotlight': Large "In the Spotlight" hero banner with tags, white "RSVP Now" pill, and District flame hype button.
 * 2. 'trending': Vertical 2:3 poster card with giant ranking number (1, 2, 3...), flame hype button, and orange "X are hyped!" text.
 * 3. 'vertical': Clean vertical poster card for "This Week's Releases" and "Upcoming Events".
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import type { DistrictEvent, RSVPStatus } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

export interface DistrictEventCardProps {
  event: DistrictEvent;
  variant?: 'spotlight' | 'trending' | 'vertical';
  rankingNumber?: number;
  cardWidth?: number;
  style?: ViewStyle;
  onPress: (event: DistrictEvent) => void;
  onRsvp: (event: DistrictEvent, status: RSVPStatus) => void;
}

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return 'Date TBA';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Date TBA';

  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function DistrictEventCard({
  event,
  variant = 'vertical',
  rankingNumber,
  cardWidth,
  style,
  onPress,
  onRsvp,
}: DistrictEventCardProps) {
  const [imageError, setImageError] = useState(false);
  const isGoing = event.user_rsvp_status === 'going';
  const isInterested = event.user_rsvp_status === 'interested';
  const isHyped = isGoing || isInterested;
  const goingCount = Number(event.going_count || 0);
  const interestedCount = Number(event.interested_count || 0);
  const totalHyped = goingCount + interestedCount;

  const dateLabel = formatDateLabel(event.event_time);
  const hasPoster = Boolean(event.poster_url) && !imageError;

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT 1: "IN THE SPOTLIGHT" (From Screenshot 5)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'spotlight') {
    return (
      <Pressable
        style={({ pressed }) => [styles.spotlightCard, pressed && styles.cardPressed, style]}
        onPress={() => {
          hapticLight();
          onPress(event);
        }}
      >
        <View style={styles.spotlightPosterWrap}>
          {hasPoster ? (
            <Image
              source={{ uri: event.poster_url! }}
              style={styles.spotlightPoster}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.spotlightPosterFallback}>
              <Ionicons name="film-outline" size={48} color={DISTRICT_THEME.border} />
            </View>
          )}
          <View style={styles.spotlightScrim} />

          {/* Top Badges */}
          <View style={styles.spotlightTopBadges}>
            <View style={styles.spotlightStatusBadge}>
              <Text style={styles.spotlightStatusText}>Spotlight</Text>
            </View>
            {event.organization_category && (
              <View style={styles.spotlightCategoryBadge}>
                <Text style={styles.spotlightCategoryText}>{event.organization_category}</Text>
              </View>
            )}
          </View>

          {/* Overlay Info at Bottom */}
          <View style={styles.spotlightBottomContent}>
            <Text style={styles.spotlightTitle} numberOfLines={2}>
              {event.title}
            </Text>

            {/* Tag Pills */}
            <View style={styles.spotlightTagsRow}>
              {event.organization_name && (
                <View style={styles.spotlightTagPill}>
                  <Text style={styles.spotlightTagPillText}>{event.organization_name}</Text>
                </View>
              )}
              {event.location && (
                <View style={styles.spotlightTagPill}>
                  <Text style={styles.spotlightTagPillText}>{event.location}</Text>
                </View>
              )}
            </View>

            {/* Bottom Actions: "Book tickets" White Pill + Flame Hype Button */}
            <View style={styles.spotlightActionsRow}>
              <Pressable
                style={[styles.spotlightRsvpBtn, isGoing && styles.spotlightRsvpBtnActive]}
                onPress={(e) => {
                  e.stopPropagation();
                  hapticSuccess();
                  onRsvp(event, isGoing ? 'interested' : 'going');
                }}
              >
                <Text style={[styles.spotlightRsvpBtnText, isGoing && styles.spotlightRsvpBtnTextActive]}>
                  {isGoing ? 'Attending ✓' : 'RSVP Now'}
                </Text>
              </Pressable>

              {/* District Flame Hype Button */}
              <Pressable
                style={[styles.flameBtn, isHyped && styles.flameBtnActive]}
                onPress={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  onRsvp(event, isHyped ? 'interested' : 'going');
                }}
                hitSlop={8}
                accessibilityLabel="Hype"
              >
                <Ionicons
                  name="flame"
                  size={18}
                  color={isHyped ? DISTRICT_THEME.accentOrange : '#A0A0AA'}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT 2: "TRENDING ON DISTRICT" (With Giant Ranking Numbers - Screenshot 3)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'trending') {
    return (
      <View style={[styles.trendingContainer, style]}>
        {/* Giant Ranking Number */}
        {rankingNumber != null && (
          <Text style={styles.giantRankingNumber}>{rankingNumber}</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.trendingCard, pressed && styles.cardPressed]}
          onPress={() => {
            hapticLight();
            onPress(event);
          }}
        >
          {/* Vertical 2:3 Poster */}
          <View style={styles.trendingPosterWrap}>
            {hasPoster ? (
              <Image
                source={{ uri: event.poster_url! }}
                style={styles.trendingPoster}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.trendingPosterFallback}>
                <Ionicons name="film-outline" size={32} color={DISTRICT_THEME.border} />
              </View>
            )}
          </View>

          {/* Title and Flame Button */}
          <View style={styles.trendingMetaRow}>
            <Text style={styles.trendingTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Pressable
              style={[styles.compactFlameBtn, isHyped && styles.flameBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                onRsvp(event, isHyped ? 'interested' : 'going');
              }}
              hitSlop={6}
            >
              <Ionicons
                name="flame"
                size={14}
                color={isHyped ? DISTRICT_THEME.accentOrange : '#888892'}
              />
            </Pressable>
          </View>

          {/* Date */}
          <Text style={styles.trendingDate}>{dateLabel}</Text>

          {/* Orange Hype Text */}
          <Text style={styles.trendingHypeText}>
            {totalHyped > 0 ? `${totalHyped}+ are hyped!` : 'Be first to hype!'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT 3: "THIS WEEK'S RELEASES" & UPCOMING VERTICAL POSTER (Screenshot 4)
  // ──────────────────────────────────────────────────────────────────────────
  const dynamicCardStyle = cardWidth ? { width: cardWidth, marginRight: 0 } : null;
  const dynamicPosterWrapStyle = cardWidth ? { width: cardWidth, height: Math.round(cardWidth * 1.38) } : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.verticalCard, dynamicCardStyle, pressed && styles.cardPressed, style]}
      onPress={() => {
        hapticLight();
        onPress(event);
      }}
    >
      {/* 2:3 Poster */}
      <View style={[styles.verticalPosterWrap, dynamicPosterWrapStyle]}>
        {hasPoster ? (
          <Image
            source={{ uri: event.poster_url! }}
            style={styles.verticalPoster}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.verticalPosterFallback}>
            <Ionicons name="film-outline" size={32} color={DISTRICT_THEME.border} />
          </View>
        )}
      </View>

      {/* Info Row: Title + Flame */}
      <View style={styles.verticalInfoRow}>
        <Text style={styles.verticalTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Pressable
          style={[styles.compactFlameBtn, isHyped && styles.flameBtnActive]}
          onPress={(e) => {
            e.stopPropagation();
            hapticLight();
            onRsvp(event, isHyped ? 'interested' : 'going');
          }}
          hitSlop={6}
        >
          <Ionicons
            name="flame"
            size={14}
            color={isHyped ? DISTRICT_THEME.accentOrange : '#888892'}
          />
        </Pressable>
      </View>

      {/* Category / Subtext */}
      <Text style={styles.verticalSubtext} numberOfLines={1}>
        {event.organization_category || 'Campus'} • {event.location || event.building || 'Campus Venue'}
      </Text>

      {/* Orange Hype Text */}
      <Text style={styles.verticalHypeText}>
        {totalHyped > 0 ? `${totalHyped}+ are hyped!` : 'Be first to hype!'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },

  // ── SPOTLIGHT CARD ───────────────────────────────────────────────────
  spotlightCard: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: DISTRICT_THEME.card,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  spotlightPosterWrap: {
    width: '100%',
    height: 310,
    backgroundColor: DISTRICT_THEME.surface,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  spotlightPoster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  spotlightPosterFallback: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15161A',
  },
  spotlightScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 13, 14, 0.45)',
  },
  spotlightTopBadges: {
    position: 'absolute',
    top: Spacing[3.5],
    left: Spacing[3.5],
    right: Spacing[3.5],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotlightStatusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  spotlightStatusText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: '#FFFFFF',
  },
  spotlightCategoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  spotlightCategoryText: {
    fontSize: 11,
    color: DISTRICT_THEME.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  spotlightBottomContent: {
    padding: Spacing[4],
    backgroundColor: 'rgba(12, 13, 14, 0.88)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  spotlightTitle: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginBottom: Spacing[2],
  },
  spotlightTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing[3.5],
  },
  spotlightTagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  spotlightTagPillText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: '#E0E0E6',
  },
  spotlightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  spotlightRsvpBtn: {
    flex: 1,
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingVertical: 11,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightRsvpBtnActive: {
    backgroundColor: DISTRICT_THEME.accentOrange,
  },
  spotlightRsvpBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },
  spotlightRsvpBtnTextActive: {
    color: '#FFFFFF',
  },
  flameBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  flameBtnActive: {
    backgroundColor: DISTRICT_THEME.accentOrangeFaded,
    borderColor: DISTRICT_THEME.accentOrange,
  },

  // ── TRENDING WITH GIANT RANKING NUMBERS ──────────────────────────────
  trendingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: Spacing[3],
    position: 'relative',
  },
  giantRankingNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.12)',
    position: 'absolute',
    left: -10,
    bottom: 25,
    zIndex: 0,
    lineHeight: 96,
  },
  trendingCard: {
    width: 155,
    zIndex: 1,
    marginLeft: 32,
  },
  trendingPosterWrap: {
    width: 155,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: DISTRICT_THEME.card,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: 8,
  },
  trendingPoster: {
    width: '100%',
    height: '100%',
  },
  trendingPosterFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#181A20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  trendingTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 4,
  },
  trendingDate: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 3,
  },
  trendingHypeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },

  // ── VERTICAL CARD ────────────────────────────────────────────────────
  verticalCard: {
    width: 155,
    marginRight: Spacing[3],
  },
  verticalPosterWrap: {
    width: 155,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: DISTRICT_THEME.card,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: 8,
  },
  verticalPoster: {
    width: '100%',
    height: '100%',
  },
  verticalPosterFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#181A20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  verticalTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 4,
  },
  compactFlameBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: DISTRICT_THEME.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  verticalSubtext: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 3,
  },
  verticalHypeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
});
