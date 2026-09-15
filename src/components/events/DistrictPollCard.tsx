/**
 * Campus Pulse Live Poll Card — Apple HIG interactive poll component.
 * Minimalist, dark, zero emojis, smooth animated progress fills.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { Poll } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface DistrictPollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
}

export function DistrictPollCard({ poll, onVote }: DistrictPollCardProps) {
  const hasVoted = Boolean(poll.user_voted_option);
  const totalVotes = Math.max(1, poll.total_votes || 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.pollTag}>
          <Ionicons name="stats-chart-outline" size={12} color={Colors.accent} />
          <Text style={styles.pollTagText}>CAMPUS PULSE</Text>
        </View>

        {poll.organization_name && (
          <View style={styles.clubRow}>
            {poll.organization_logo && (
              <Image source={{ uri: poll.organization_logo }} style={styles.clubLogo} />
            )}
            <Text style={styles.clubName} numberOfLines={1}>
              {poll.organization_name}
            </Text>
          </View>
        )}
      </View>

      {/* Question */}
      <Text style={styles.question}>{poll.question}</Text>

      {/* Options List */}
      <View style={styles.optionsList}>
        {poll.options.map((option) => {
          const isSelected = poll.user_voted_option === option.id;
          const voteCount = option.votes_count || 0;
          const percent = hasVoted ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <Pressable
              key={option.id}
              disabled={hasVoted}
              style={({ pressed }) => [
                styles.optionBtn,
                isSelected && styles.optionSelected,
                pressed && !hasVoted && styles.optionPressed,
              ]}
              onPress={() => {
                hapticSuccess();
                onVote(poll.id, option.id);
              }}
              accessibilityLabel={`Vote for ${option.text}`}
            >
              {/* Progress Bar Fill */}
              {hasVoted && (
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(4, percent)}%` },
                    isSelected ? styles.progressSelected : styles.progressDefault,
                  ]}
                />
              )}

              {/* Option Text & Percentage */}
              <View style={styles.optionContent}>
                <View style={styles.optionLabelRow}>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={Colors.accent}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>

                {hasVoted && (
                  <Text style={[styles.percentText, isSelected && styles.percentTextSelected]}>
                    {percent}%
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer Info */}
      <View style={styles.footerRow}>
        <View style={styles.votesCountWrap}>
          <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.votesCount}>
            {poll.total_votes || 0} {poll.total_votes === 1 ? 'student vote' : 'student votes'}
          </Text>
        </View>
        <Text style={styles.statusText}>
          {hasVoted ? 'Vote recorded' : 'Tap option to vote'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2.5],
  },
  pollTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accentFaded,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  pollTagText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '55%',
  },
  clubLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  clubName: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  question: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
    lineHeight: 22,
    marginBottom: Spacing[3],
  },
  optionsList: {
    gap: 8,
    marginBottom: 10,
  },
  optionBtn: {
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: Colors.accentFadedBorder,
    backgroundColor: Colors.accentFaded,
  },
  optionPressed: {
    opacity: 0.8,
  },
  progressFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.md,
  },
  progressDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressSelected: {
    backgroundColor: Colors.accentFaded,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  optionText: {
    fontSize: Typography.size.xs,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
  optionTextSelected: {
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  percentText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  percentTextSelected: {
    color: Colors.accent,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  votesCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  votesCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
});
