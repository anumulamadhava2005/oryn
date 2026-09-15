/**
 * Club Detail Modal — Apple HIG Profile Sheet.
 * Showcases club info, verified status, communication links, and scheduled events with zero emojis.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { Club, DistrictEvent } from '@/types/events';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '@/utils/haptics';

interface ClubDetailModalProps {
  visible: boolean;
  club: Club | null;
  clubEvents?: DistrictEvent[];
  onClose: () => void;
  onSelectEvent: (event: DistrictEvent) => void;
}

export function ClubDetailModal({
  visible,
  club,
  clubEvents = [],
  onClose,
  onSelectEvent,
}: ClubDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [bannerError, setBannerError] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);

  if (!club) return null;

  const hostedEvents = clubEvents.length > 0
    ? clubEvents
    : (Array.isArray(club.events) ? club.events : []);

  const handleOpenInstagram = () => {
    if (club.instagram_handle) {
      const handle = club.instagram_handle.replace('@', '');
      Linking.openURL(`https://instagram.com/${handle}`).catch(() => {});
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.grabHandle} />
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Banner */}
          {club.banner_url && !bannerError ? (
            <View style={styles.bannerWrap}>
              <Image
                source={{ uri: club.banner_url }}
                style={styles.banner}
                resizeMode="cover"
                onError={() => setBannerError(true)}
              />
              <View style={styles.bannerScrim} />

              <Pressable
                style={styles.closeBtn}
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                hitSlop={8}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={Colors.text} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.bannerMinimal}>
              <Pressable
                style={styles.closeBtnMinimal}
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                hitSlop={8}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={Colors.text} />
              </Pressable>
            </View>
          )}

          {/* Club Header Info */}
          <View style={styles.headerBody}>
            <View style={styles.avatarWrap}>
              {club.logo_url && !logoError ? (
                <Image
                  source={{ uri: club.logo_url }}
                  style={styles.avatar}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <View style={styles.avatarMonogram}>
                  <Text style={styles.avatarMonogramText}>
                    {club.name ? club.name.charAt(0).toUpperCase() : 'C'}
                  </Text>
                </View>
              )}
              {club.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-sharp" size={11} color={Colors.white} />
                </View>
              )}
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.clubName}>{club.name}</Text>
              {club.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{club.category}</Text>
                </View>
              )}
            </View>

            {/* Club Metadata Row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>
                  {club.followers_count || 0} members
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="shield-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>
                  Lead: {club.lead_name || 'Student Council'}
                </Text>
              </View>
            </View>

            {/* Social & Contact Actions */}
            <View style={styles.socialRow}>
              {club.instagram_handle && (
                <Pressable style={styles.contactBtn} onPress={handleOpenInstagram}>
                  <Ionicons name="logo-instagram" size={14} color={Colors.text} />
                  <Text style={styles.contactBtnText}>@{club.instagram_handle.replace('@', '')}</Text>
                </Pressable>
              )}

              {club.contact_email && (
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => Linking.openURL(`mailto:${club.contact_email}`)}
                >
                  <Ionicons name="mail-outline" size={14} color={Colors.text} />
                  <Text style={styles.contactBtnText}>Email</Text>
                </Pressable>
              )}
            </View>

            {/* About / Bio */}
            {club.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>About</Text>
                <Text style={styles.descriptionText}>{club.description}</Text>
              </View>
            ) : null}

            {/* Core Team & Leadership */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Core Team & Leadership</Text>
              <View style={styles.leadershipCard}>
                <View style={styles.leaderRow}>
                  <View style={styles.leaderAvatar}>
                    <Ionicons name="person" size={16} color="#FF5E1E" />
                  </View>
                  <View style={styles.leaderMeta}>
                    <View style={styles.leaderNameRow}>
                      <Text style={styles.leaderName}>{club.lead_name || 'Student President'}</Text>
                      <View style={styles.leaderBadgePill}>
                        <Text style={styles.leaderBadgePillText}>PRESIDENT</Text>
                      </View>
                    </View>
                    <Text style={styles.leaderRoleSub}>
                      {club.lead_email || club.contact_email || 'Campus Club Lead'}
                    </Text>
                  </View>
                </View>

                <View style={styles.leaderDivider} />

                <View style={styles.leaderRow}>
                  <View style={[styles.leaderAvatar, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                    <Ionicons name="school" size={16} color="#60A5FA" />
                  </View>
                  <View style={styles.leaderMeta}>
                    <View style={styles.leaderNameRow}>
                      <Text style={styles.leaderName}>Faculty Advisory Council</Text>
                      <View style={[styles.leaderBadgePill, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
                        <Text style={[styles.leaderBadgePillText, { color: '#60A5FA' }]}>ADVISOR</Text>
                      </View>
                    </View>
                    <Text style={styles.leaderRoleSub}>Faculty Mentorship & SAC Operations</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Hosted Events */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>
                Events by this Club ({hostedEvents.length})
              </Text>

              {hostedEvents.length > 0 ? (
                hostedEvents.map((ev) => (
                  <Pressable
                    key={ev.id}
                    style={styles.eventItem}
                    onPress={() => {
                      hapticLight();
                      onClose();
                      onSelectEvent(ev);
                    }}
                  >
                    {ev.poster_url ? (
                      <Image source={{ uri: ev.poster_url }} style={styles.eventThumb} />
                    ) : (
                      <View style={styles.eventThumbPlaceholder}>
                        <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
                      </View>
                    )}
                    <View style={styles.eventItemDetails}>
                      <Text style={styles.eventItemTitle} numberOfLines={1}>
                        {ev.title}
                      </Text>
                      <View style={styles.eventItemMetaRow}>
                        <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.eventItemLocation} numberOfLines={1}>
                          {ev.location || 'Campus'}
                        </Text>
                      </View>
                      <View style={styles.eventItemMetaRow}>
                        <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.eventItemAttendees}>
                          {Number(ev.going_count || 0) + Number(ev.interested_count || 0)} attending
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>No upcoming events scheduled yet.</Text>
              )}
            </View>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  bannerWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing[4],
    right: Spacing[4],
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bannerMinimal: {
    height: 70,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtnMinimal: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarMonogram: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: Colors.background,
    backgroundColor: Colors.accentFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMonogramText: {
    fontSize: 28,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
  },
  eventThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    paddingHorizontal: Spacing[4],
    transform: [{ translateY: -36 }],
  },
  avatarWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: Spacing[3],
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: Colors.background,
    backgroundColor: Colors.surface,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  clubName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  categoryBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Spacing[3.5],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing[4],
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing[4],
  },
  sectionHeading: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.tracking.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing[2],
  },
  descriptionText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  eventThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  eventItemDetails: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  eventItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventItemLocation: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  eventItemAttendees: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  leadershipCard: {
    backgroundColor: '#16171B',
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: '#22242B',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 94, 30, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leaderMeta: {
    flex: 1,
  },
  leaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaderName: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  leaderBadgePill: {
    backgroundColor: 'rgba(255, 94, 30, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  leaderBadgePillText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#FF5E1E',
    letterSpacing: 0.5,
  },
  leaderRoleSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  leaderDivider: {
    height: 1,
    backgroundColor: '#22242B',
    marginVertical: Spacing[3],
  },
});
