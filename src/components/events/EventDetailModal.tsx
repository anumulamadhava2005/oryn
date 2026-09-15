/**
 * Event Detail Screen / Modal — Zomato District Theme.
 * High-impact presentation of real event information:
 * - Back, Share, and Bookmark navigation.
 * - Hero poster banner with real category & tags.
 * - Organizer follow card with verified badge.
 * - Key details (Date & Time, Venue, Admission).
 * - Live Attendance card with capacity progress & District flame hype button.
 * - Authentic Student Inquiries section (strictly user questions, zero fake data).
 * - Sticky bottom action bar with white 'RSVP Now' pill.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Pressable,
  Share,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MMKV } from 'react-native-mmkv';
import { Colors, Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useEventsStore } from '@/store/eventsStore';
import type { DistrictEvent, RSVPStatus } from '@/types/events';
import { hapticLight, hapticSuccess, hapticMedium } from '@/utils/haptics';
import { EventScannerModal } from './EventScannerModal';
import { EventAttendeesModal } from './EventAttendeesModal';
import { EventBroadcastModal } from './EventBroadcastModal';

const eventStorage = new MMKV({ id: 'oryn-event-interactions' });
const broadcastStorage = new MMKV({ id: 'oryn-event-broadcasts' });

interface EventDetailModalProps {
  visible: boolean;
  event: DistrictEvent | null;
  canViewDemographics: boolean;
  onClose: () => void;
  onRsvp: (event: DistrictEvent, status: RSVPStatus) => void;
  onViewDemographics: (eventId: string) => void;
}

interface Inquiry {
  id: string;
  name: string;
  role: string;
  question: string;
  answerAuthor?: string;
  answerText?: string;
  likes: number;
}

function formatDetailDate(dateStr?: string | null): { dateLine: string; kickoffText: string } {
  if (!dateStr) return { dateLine: 'Date TBA', kickoffText: 'Upcoming' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { dateLine: 'Date TBA', kickoffText: 'Upcoming' };

  const dayStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const kickoffText = diffDays <= 0 ? 'Happening today' : diffDays === 1 ? 'Kickoff tomorrow' : `Kickoff in ${diffDays} days`;

  return {
    dateLine: `${dayStr} • ${timeStr}`,
    kickoffText,
  };
}

export function EventDetailModal({
  visible,
  event,
  canViewDemographics,
  onClose,
  onRsvp,
  onViewDemographics,
}: EventDetailModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = useEventsStore((s) => s.isSuperAdmin);
  const userClubRoles = useEventsStore((s) => s.userClubRoles);
  const deleteEvent = useEventsStore((s) => s.deleteEvent);
  const isClubLeadForEvent = Boolean(event && userClubRoles.some((r) => r.organization_id === event.organization_id));
  const isOrganizer = isSuperAdmin || isClubLeadForEvent;

  const [imageError, setImageError] = useState(false);
  const [orgLogoError, setOrgLogoError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [showAskInput, setShowAskInput] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Broadcast & Organizer Reply State
  const [activeBroadcast, setActiveBroadcast] = useState<any | null>(null);
  const [replyingInquiryId, setReplyingInquiryId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<any>(null);

  // Sync inquiries, broadcasts, and bookmarks from MMKV storage when event loads
  useEffect(() => {
    if (!event) return;
    setImageError(false);
    setOrgLogoError(false);
    setReplyingInquiryId(null);
    setReplyText('');

    try {
      const savedBroadcasts = broadcastStorage.getString(`broadcasts_${event.id}`);
      if (savedBroadcasts) {
        const list = JSON.parse(savedBroadcasts);
        setActiveBroadcast(list[0] || null);
      } else {
        setActiveBroadcast(null);
      }
    } catch {
      setActiveBroadcast(null);
    }

    try {
      const savedInq = eventStorage.getString(`inquiries_${event.id}`);
      if (savedInq) {
        setInquiries(JSON.parse(savedInq));
      } else {
        setInquiries([]);
      }
    } catch {
      setInquiries([]);
    }

    try {
      const savedBookmarks = eventStorage.getString('district_bookmarked_events');
      if (savedBookmarks) {
        const list: string[] = JSON.parse(savedBookmarks);
        setIsBookmarked(list.includes(event.id));
      } else {
        setIsBookmarked(false);
      }
    } catch {
      setIsBookmarked(false);
    }
  }, [event?.id]);

  if (!event) return null;

  const isGoing = event.user_rsvp_status === 'going';
  const isInterested = event.user_rsvp_status === 'interested';
  const isHyped = isGoing || isInterested;
  const goingCount = Number(event.going_count || 0);
  const interestedCount = Number(event.interested_count || 0);
  const totalHyped = goingCount + interestedCount;

  // Capacity calculation
  const maxCapacity = 300;
  const capacityPercent = Math.min(100, Math.max(5, Math.round((goingCount / maxCapacity) * 100)));

  const { dateLine, kickoffText } = formatDetailDate(event.event_time);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    hapticLight();

    try {
      const cacheDir = FileSystem.cacheDirectory || '';
      const safeId = (event.id || 'event').replace(/[^a-zA-Z0-9]/g, '_');
      let localImageUri: string | null = null;

      // 1. If event has a poster URL, process and save to a local cache file
      if (event.poster_url) {
        try {
          if (event.poster_url.startsWith('file://')) {
            localImageUri = event.poster_url;
          } else if (event.poster_url.startsWith('data:')) {
            const match = event.poster_url.match(/^data:([^;]+);base64,(.+)$/);
            const mime = match ? match[1] : 'image/jpeg';
            const b64 = match ? match[2] : event.poster_url.split(',')[1] ?? event.poster_url;
            const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
            const uri = `${cacheDir}share_event_${safeId}.${ext}`;
            await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
            localImageUri = uri;
          } else if (event.poster_url.startsWith('http')) {
            const rawExt = event.poster_url.split('?')[0].split('.').pop()?.toLowerCase();
            const ext = rawExt && ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
            const uri = `${cacheDir}share_event_${safeId}.${ext}`;
            const dl = await FileSystem.downloadAsync(event.poster_url, uri);
            localImageUri = dl.uri;
          }
        } catch (downloadErr) {
          console.warn('[EventShare] Poster download failed, falling back to card capture:', downloadErr);
        }
      }

      // 2. If no poster exists or download failed, capture offscreen branded card
      if (!localImageUri && shareCardRef.current) {
        try {
          const capturedUri = await captureRef(shareCardRef, {
            format: 'png',
            quality: 0.95,
          });
          localImageUri = capturedUri;
        } catch (captureErr) {
          console.warn('[EventShare] ViewShot capture failed:', captureErr);
        }
      }

      // 3. Share the local image file
      if (localImageUri) {
        const isAvailable = await Sharing.isAvailableAsync();
        const mime = localImageUri.endsWith('.png')
          ? 'image/png'
          : localImageUri.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';

        if (isAvailable) {
          await Sharing.shareAsync(localImageUri, {
            mimeType: mime,
            dialogTitle: event.title,
            UTI: mime,
          });
          return;
        } else {
          await Share.share({
            url: localImageUri,
            title: event.title,
            message: `Check out ${event.title} hosted by ${event.organization_name || 'campus clubs'} on Oryn!`,
          });
          return;
        }
      }

      // 4. Ultimate fallback to text sharing
      await Share.share({
        title: event.title,
        message: `Check out ${event.title} hosted by ${event.organization_name || 'campus clubs'} on Oryn!\n${event.location ? `📍 ${event.location}` : ''}`,
      });
    } catch (err: any) {
      console.warn('[EventShare] Share error:', err.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = () => {
    if (!event) return;
    hapticMedium();
    Alert.alert(
      'Delete Event',
      `Are you sure you want to permanently delete "${event.title}"? This will cancel all student RSVPs and remove the event from the feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              hapticSuccess();
              onClose();
              Alert.alert('Event Deleted', `"${event.title}" has been deleted.`);
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Could not delete event.');
            }
          },
        },
      ]
    );
  };

  const toggleBookmark = () => {
    hapticLight();
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      const raw = eventStorage.getString('district_bookmarked_events');
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (next) {
        if (!list.includes(event.id)) list.push(event.id);
      } else {
        list = list.filter((id) => id !== event.id);
      }
      eventStorage.set('district_bookmarked_events', JSON.stringify(list));
    } catch {}
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    hapticSuccess();
    const newInq: Inquiry = {
      id: String(Date.now()),
      name: user?.name ? user.name.split(' ')[0] : 'Student',
      role: 'Student • Just now',
      question: newQuestionText.trim(),
      likes: 1,
    };
    const updated = [newInq, ...inquiries];
    setInquiries(updated);
    try {
      eventStorage.set(`inquiries_${event.id}`, JSON.stringify(updated));
    } catch {}
    setNewQuestionText('');
    setShowAskInput(false);
  };

  const handleAddReply = (inquiryId: string) => {
    if (!replyText.trim() || !event) return;
    hapticSuccess();
    const updated = inquiries.map((inq) =>
      inq.id === inquiryId
        ? {
            ...inq,
            answerAuthor: `${event.organization_name || 'Club'} Organizer`,
            answerText: replyText.trim(),
          }
        : inq
    );
    setInquiries(updated);
    try {
      eventStorage.set(`inquiries_${event.id}`, JSON.stringify(updated));
    } catch {}
    setReplyingInquiryId(null);
    setReplyText('');
  };

  const handleDeleteInquiry = (inquiryId: string) => {
    if (!event) return;
    hapticLight();
    const updated = inquiries.filter((i) => i.id !== inquiryId);
    setInquiries(updated);
    try {
      eventStorage.set(`inquiries_${event.id}`, JSON.stringify(updated));
    } catch {}
  };

  const tagsList = Array.isArray(event.tags) ? event.tags : [];
  const hasPoster = Boolean(event.poster_url) && !imageError;
  const hasOrgLogo = Boolean(event.organization_logo) && !orgLogoError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ── Top Navigation Bar ── */}
        <View style={styles.navBar}>
          <Pressable
            style={styles.navIconBtn}
            onPress={() => {
              hapticLight();
              onClose();
            }}
            hitSlop={12}
            accessibilityLabel="Close"
          >
            <Ionicons name="arrow-back" size={22} color={DISTRICT_THEME.text} />
          </Pressable>

          <View style={styles.navRightActions}>
            {isOrganizer && (
              <Pressable
                style={styles.navIconBtn}
                onPress={handleDelete}
                hitSlop={12}
                accessibilityLabel="Delete Event"
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Pressable>
            )}

            <Pressable
              style={styles.navIconBtn}
              onPress={handleShare}
              disabled={isSharing}
              hitSlop={12}
              accessibilityLabel="Share Event Image"
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={DISTRICT_THEME.text} />
              ) : (
                <Ionicons name="share-outline" size={21} color={DISTRICT_THEME.text} />
              )}
            </Pressable>

            <Pressable
              style={styles.navIconBtn}
              onPress={toggleBookmark}
              hitSlop={12}
              accessibilityLabel="Bookmark"
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={21}
                color={isBookmarked ? DISTRICT_THEME.accentOrange : DISTRICT_THEME.text}
              />
            </Pressable>
          </View>
        </View>

        {/* ── Scrollable Details ── */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 95 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Hero Poster Banner */}
          <View style={styles.heroWrap}>
            {hasPoster ? (
              <Image
                source={{ uri: event.poster_url! }}
                style={styles.heroImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.heroFallback}>
                <Ionicons name="film-outline" size={54} color={DISTRICT_THEME.border} />
              </View>
            )}
            <View style={styles.heroScrim} />

            {/* Bottom Overlay Pills */}
            <View style={styles.heroPillsRow}>
              {event.organization_category && (
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{event.organization_category.toUpperCase()}</Text>
                </View>
              )}
              {event.priority === 'Critical' && (
                <View style={styles.heroPillOrange}>
                  <Text style={styles.heroPillOrangeText}>FEATURED</Text>
                </View>
              )}
            </View>
          </View>

          {/* Active Attendee Broadcast Alert */}
          {activeBroadcast && (
            <View style={styles.broadcastAlertBanner}>
              <View style={styles.broadcastAlertHeader}>
                <Ionicons name="megaphone" size={13} color={DISTRICT_THEME.accentOrange} style={{ marginRight: 6 }} />
                <Text style={styles.broadcastAlertBadge}>ANNOUNCEMENT • {activeBroadcast.type.toUpperCase()}</Text>
                <Text style={styles.broadcastAlertTime}>{activeBroadcast.createdAt}</Text>
              </View>
              <Text style={styles.broadcastAlertTitle}>{activeBroadcast.title}</Text>
              <Text style={styles.broadcastAlertMsg}>{activeBroadcast.message}</Text>
            </View>
          )}

          {/* 2. Real Tags Row (only if tags exist) */}
          {tagsList.length > 0 && (
            <View style={styles.tagsRow}>
              {tagsList.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag.startsWith('#') ? tag : `#${tag}`}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 3. Title & Description */}
          <Text style={styles.title}>{event.title}</Text>
          {Boolean(event.description || event.summary) && (
            <Text style={styles.description}>
              {event.description || event.summary}
            </Text>
          )}

          {/* 4. Club / Organizer Card */}
          {event.organization_name && (
            <View style={styles.organizerCard}>
              <View style={styles.organizerLogoWrap}>
                {hasOrgLogo ? (
                  <Image
                    source={{ uri: event.organization_logo! }}
                    style={styles.organizerLogo}
                    onError={() => setOrgLogoError(true)}
                  />
                ) : (
                  <View style={styles.organizerLogoPlaceholder}>
                    <Text style={styles.organizerLogoInitial}>
                      {event.organization_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.organizerMeta}>
                <View style={styles.organizerNameRow}>
                  <Text style={styles.organizerName} numberOfLines={1}>
                    {event.organization_name}
                  </Text>
                  {event.organization_verified && (
                    <Ionicons name="checkmark-circle" size={14} color="#60A5FA" />
                  )}
                </View>
                <Text style={styles.organizerSubtext} numberOfLines={1}>
                  {event.organization_category ? `${event.organization_category} Club` : 'Campus Organization'}
                </Text>
              </View>

              <Pressable
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={() => {
                  hapticLight();
                  setIsFollowing(!isFollowing);
                }}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* 5. Key Details */}
          <View style={styles.metaSection}>
            {/* Date & Time */}
            <View style={styles.metaRow}>
              <View style={styles.metaIconCircle}>
                <Ionicons name="calendar-outline" size={17} color={DISTRICT_THEME.accentOrange} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>DATE & TIME</Text>
                <Text style={styles.metaValue}>{dateLine}</Text>
                <Text style={styles.kickoffText}>{kickoffText}</Text>
              </View>
            </View>

            {/* Campus Venue */}
            {(event.location || event.building) && (
              <View style={styles.metaRow}>
                <View style={styles.metaIconCircle}>
                  <Ionicons name="location-outline" size={17} color={DISTRICT_THEME.accentOrange} />
                </View>
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>CAMPUS VENUE</Text>
                  <Text style={styles.metaValue}>
                    {event.building
                      ? `${event.building}${event.room_number ? ` • ${event.room_number}` : ''}`
                      : event.location}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 6. Live Attendance & Hype Card */}
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceLabelRow}>
                <Ionicons name="flame" size={16} color={DISTRICT_THEME.accentOrange} />
                <Text style={styles.attendanceTitle}>Live Attendance</Text>
              </View>
              <Text style={styles.attendanceCounts}>
                {goingCount} going, {interestedCount} interested
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${capacityPercent}%` }]} />
            </View>

            {/* Segmented RSVP Controls */}
            <View style={styles.rsvpSegmentRow}>
              <Pressable
                style={[styles.rsvpSegmentBtn, isGoing ? styles.rsvpSegmentActive : styles.rsvpSegmentInactive]}
                onPress={() => {
                  hapticSuccess();
                  onRsvp(event, isGoing ? 'interested' : 'going');
                }}
              >
                <Ionicons
                  name={isGoing ? 'checkmark' : 'checkmark-outline'}
                  size={15}
                  color={isGoing ? '#000000' : DISTRICT_THEME.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.rsvpSegmentText, isGoing && styles.rsvpSegmentTextActive]}>
                  {isGoing ? "I'm Going ✓" : "I'm Going"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.rsvpSegmentBtn, isInterested ? styles.rsvpSegmentActive : styles.rsvpSegmentInactive]}
                onPress={() => {
                  hapticLight();
                  onRsvp(event, isInterested ? 'going' : 'interested');
                }}
              >
                <Ionicons
                  name={isInterested ? 'flame' : 'flame-outline'}
                  size={15}
                  color={isInterested ? DISTRICT_THEME.accentOrange : DISTRICT_THEME.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.rsvpSegmentText, isInterested && styles.rsvpSegmentTextActive]}>
                  Interested
                </Text>
              </Pressable>
            </View>

            {/* Demographics for Club Heads & Super Admin */}
            {canViewDemographics && (
              <Pressable
                style={styles.demographicsTrigger}
                onPress={() => {
                  hapticLight();
                  onViewDemographics(event.id);
                }}
              >
                <Ionicons name="bar-chart-outline" size={14} color={DISTRICT_THEME.accentOrange} />
                <Text style={styles.demographicsTriggerText}>View Organizer Demographics</Text>
                <Ionicons name="chevron-forward" size={13} color={DISTRICT_THEME.accentOrange} />
              </Pressable>
            )}

            {/* Organizer Operations (Club Lead & Super Admin) */}
            {isOrganizer && (
              <View style={styles.organizerControlPanel}>
                <View style={styles.organizerHeaderRow}>
                  <Text style={styles.organizerControlHeader}>ORGANIZER WORKSPACE</Text>
                  <Pressable
                    style={styles.openStudioLink}
                    onPress={() => {
                      hapticLight();
                      onClose();
                      router.push({
                        pathname: '/(app)/creator-studio' as any,
                        params: { eventId: event.id },
                      });
                    }}
                  >
                    <Text style={styles.openStudioLinkText}>Open Full Studio Screen →</Text>
                  </Pressable>
                </View>
                <View style={styles.organizerControlGrid}>
                  <Pressable
                    style={styles.organizerControlBtn}
                    onPress={() => {
                      hapticLight();
                      setShowScannerModal(true);
                    }}
                  >
                    <Ionicons name="scan" size={15} color={DISTRICT_THEME.text} />
                    <Text style={styles.organizerControlBtnText}>Gate Scanner</Text>
                  </Pressable>

                  <Pressable
                    style={styles.organizerControlBtn}
                    onPress={() => {
                      hapticLight();
                      setShowAttendeesModal(true);
                    }}
                  >
                    <Ionicons name="people" size={15} color="#60A5FA" />
                    <Text style={styles.organizerControlBtnText}>Attendees & CSV</Text>
                  </Pressable>

                  <Pressable
                    style={styles.organizerControlBtn}
                    onPress={() => {
                      hapticLight();
                      setShowBroadcastModal(true);
                    }}
                  >
                    <Ionicons name="megaphone" size={15} color="#F59E0B" />
                    <Text style={styles.organizerControlBtnText}>Broadcast Alert</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.organizerControlBtn, styles.organizerControlBtnDanger]}
                    onPress={handleDelete}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    <Text style={[styles.organizerControlBtnText, { color: '#EF4444' }]}>Delete Event</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* 7. Schedule & Sessions Timeline */}
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleHeaderRow}>
              <Ionicons name="time-outline" size={16} color={DISTRICT_THEME.accentOrange} />
              <Text style={styles.scheduleTitle}>Event Schedule & Sessions</Text>
            </View>

            <View style={styles.timelineList}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftNode}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>Session 1 • Check-In & Inauguration</Text>
                  <Text style={styles.timelineDesc}>Gate check-in, opening address, problem statement announcement</Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftNode}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>Session 2 • Main Sprint & Hack Phase</Text>
                  <Text style={styles.timelineDesc}>Design, development, and mentor checkpoint rounds</Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftNode}>
                  <View style={[styles.timelineDot, styles.timelineDotEnd]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>Session 3 • Final Demos & Awards</Text>
                  <Text style={styles.timelineDesc}>Final pitches, jury evaluation, winner prize distribution</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 8. Student Inquiries Section (Strictly user-submitted, zero mock questions) */}
          <View style={styles.inquiriesSection}>
            <View style={styles.inquiriesHeader}>
              <Text style={styles.inquiriesTitle}>Student Inquiries ({inquiries.length})</Text>
              <Pressable
                style={styles.askQuestionBtn}
                onPress={() => {
                  hapticLight();
                  setShowAskInput(!showAskInput);
                }}
              >
                <Text style={styles.askQuestionText}>+ Ask Question</Text>
              </Pressable>
            </View>

            {/* Input Box */}
            {showAskInput && (
              <View style={styles.askInputBox}>
                <TextInput
                  style={styles.askInputField}
                  placeholder="Ask event organizers a question..."
                  placeholderTextColor={DISTRICT_THEME.textMuted}
                  value={newQuestionText}
                  onChangeText={setNewQuestionText}
                  autoFocus
                />
                <Pressable style={styles.submitQuestionBtn} onPress={handleAddQuestion}>
                  <Text style={styles.submitQuestionText}>Post</Text>
                </Pressable>
              </View>
            )}

            {/* Inquiries list or clean prompt */}
            {inquiries.length === 0 ? (
              <Pressable
                style={styles.inquiryPromptBanner}
                onPress={() => {
                  hapticLight();
                  setShowAskInput(true);
                }}
              >
                <Text style={styles.inquiryPromptText}>Have an inquiry for organizers?</Text>
                <Text style={styles.inquiryPromptAction}>Ask now →</Text>
              </Pressable>
            ) : (
              inquiries.map((inq) => (
                <View key={inq.id} style={styles.inquiryCard}>
                  <View style={styles.inquiryUserRow}>
                    <Text style={styles.inquiryUserName}>{inq.name}</Text>
                    <Text style={styles.inquiryUserRole}>• {inq.role}</Text>
                    {isOrganizer && (
                      <Pressable
                        style={styles.deleteInquiryBtn}
                        onPress={() => handleDeleteInquiry(inq.id)}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={13} color={DISTRICT_THEME.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.inquiryQuestion}>{inq.question}</Text>

                  {/* Organizer Answer Box */}
                  {inq.answerText && (
                    <View style={styles.organizerAnswerBox}>
                      <View style={styles.organizerAnswerHeader}>
                        <View style={styles.organizerBadgePill}>
                          <Ionicons name="checkmark-circle" size={11} color="#60A5FA" style={{ marginRight: 3 }} />
                          <Text style={styles.organizerBadgePillText}>ORGANIZER</Text>
                        </View>
                        <Text style={styles.organizerAnswerAuthor}>{inq.answerAuthor || 'Club Lead'}</Text>
                      </View>
                      <Text style={styles.organizerAnswerText}>{inq.answerText}</Text>
                    </View>
                  )}

                  {/* Organizer Reply Trigger */}
                  {isOrganizer && !inq.answerText && (
                    <View style={styles.organizerReplyRow}>
                      {replyingInquiryId === inq.id ? (
                        <View style={styles.replyBox}>
                          <TextInput
                            style={styles.replyInput}
                            placeholder="Write official organizer answer..."
                            placeholderTextColor={DISTRICT_THEME.textMuted}
                            value={replyText}
                            onChangeText={setReplyText}
                            autoFocus
                          />
                          <View style={styles.replyActions}>
                            <Pressable
                              style={styles.replyCancelBtn}
                              onPress={() => {
                                setReplyingInquiryId(null);
                                setReplyText('');
                              }}
                            >
                              <Text style={styles.replyCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              style={styles.replySubmitBtn}
                              onPress={() => handleAddReply(inq.id)}
                            >
                              <Text style={styles.replySubmitText}>Post Answer</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.replyPromptBtn}
                          onPress={() => {
                            hapticLight();
                            setReplyingInquiryId(inq.id);
                          }}
                        >
                          <Ionicons name="return-down-forward" size={12} color={DISTRICT_THEME.accentOrange} style={{ marginRight: 4 }} />
                          <Text style={styles.replyPromptText}>Reply as Organizer</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* ── Sticky Bottom Action Bar ── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.bottomPassInfo}>
            <Text style={styles.bottomPassTier}>Campus Event</Text>
            <Text style={styles.bottomPassSubtitle}>
              {totalHyped > 0 ? `${totalHyped} students attending` : 'Open Entry'}
            </Text>
          </View>

          <View style={styles.bottomButtonsRow}>
            {isGoing && (
              <Pressable
                style={styles.passTicketBtn}
                onPress={() => {
                  hapticLight();
                  setShowPassModal(true);
                }}
                accessibilityLabel="View Pass"
              >
                <Ionicons name="qr-code-outline" size={17} color={DISTRICT_THEME.text} />
              </Pressable>
            )}

            <Pressable
              style={[styles.claimPassBtn, isGoing && styles.claimPassBtnActive]}
              onPress={() => {
                hapticSuccess();
                onRsvp(event, isGoing ? 'interested' : 'going');
              }}
            >
              <Ionicons
                name={isGoing ? 'checkmark-circle' : 'ticket-outline'}
                size={17}
                color={isGoing ? '#FFFFFF' : '#000000'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.claimPassText, isGoing && styles.claimPassTextActive]}>
                {isGoing ? 'Attending ✓' : 'RSVP Now'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Digital Campus Entry Pass Sheet ── */}
        <Modal
          visible={showPassModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPassModal(false)}
        >
          <View style={styles.passModalOverlay}>
            <Pressable style={styles.passModalBackdrop} onPress={() => setShowPassModal(false)} />
            <View style={styles.passCardSheet}>
              <View style={styles.passCardTop}>
                <View style={styles.passBadgeVerified}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.passBadgeVerifiedText}>CONFIRMED ENTRY PASS</Text>
                </View>
                <Pressable
                  style={styles.passCloseBtn}
                  onPress={() => setShowPassModal(false)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color={DISTRICT_THEME.text} />
                </Pressable>
              </View>

              <Text style={styles.passEventTitle} numberOfLines={2}>{event.title}</Text>
              <Text style={styles.passEventOrg}>{event.organization_name || 'Campus Club'}</Text>

              {/* Ticket details grid */}
              <View style={styles.passDetailsGrid}>
                <View style={styles.passGridCol}>
                  <Text style={styles.passGridLabel}>ATTENDEE</Text>
                  <Text style={styles.passGridVal} numberOfLines={1}>{user?.name || 'Student'}</Text>
                </View>
                <View style={styles.passGridCol}>
                  <Text style={styles.passGridLabel}>VENUE</Text>
                  <Text style={styles.passGridVal} numberOfLines={1}>{event.room_number || event.building || event.location || 'Campus'}</Text>
                </View>
              </View>

              {/* QR Code Container */}
              <View style={styles.passQrContainer}>
                <View style={styles.passQrBox}>
                  <Ionicons name="qr-code" size={110} color={DISTRICT_THEME.text} />
                </View>
                <Text style={styles.passTicketCode}>
                  ORYN-EVT-{event.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.passScanNote}>
                  Present at the campus entrance or club check-in desk
                </Text>
              </View>

              <Pressable
                style={styles.passDoneBtn}
                onPress={() => setShowPassModal(false)}
              >
                <Text style={styles.passDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        {/* ── Organizer Operations Modals ── */}
        <EventScannerModal
          visible={showScannerModal}
          event={event}
          onClose={() => setShowScannerModal(false)}
        />
        <EventAttendeesModal
          visible={showAttendeesModal}
          event={event}
          onClose={() => setShowAttendeesModal(false)}
        />
        <EventBroadcastModal
          visible={showBroadcastModal}
          event={event}
          onClose={() => setShowBroadcastModal(false)}
          onBroadcastPublished={() => {
            try {
              const savedBroadcasts = broadcastStorage.getString(`broadcasts_${event.id}`);
              if (savedBroadcasts) {
                const list = JSON.parse(savedBroadcasts);
                setActiveBroadcast(list[0] || null);
              }
            } catch {}
          }}
        />
        {/* ── Offscreen Branded Event Share Card for ViewShot ── */}
        <View style={styles.offscreenShareWrap} pointerEvents="none">
          <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 0.95 }} style={styles.shareCardContainer}>
            <View style={styles.shareCardHeader}>
              <View style={styles.shareCardBrandRow}>
                <View style={styles.shareCardLogoDot} />
                <Text style={styles.shareCardBrandText}>ORYN CAMPUS EVENTS</Text>
              </View>
              {event.organization_category && (
                <View style={styles.shareCardCategoryPill}>
                  <Text style={styles.shareCardCategoryText}>{event.organization_category}</Text>
                </View>
              )}
            </View>

            <Text style={styles.shareCardTitle}>{event.title}</Text>

            {event.summary ? (
              <Text style={styles.shareCardSummary} numberOfLines={3}>
                {event.summary}
              </Text>
            ) : null}

            <View style={styles.shareCardMetaBox}>
              <View style={styles.shareCardMetaRow}>
                <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                <Text style={styles.shareCardMetaText}>{dateLine}</Text>
              </View>
              <View style={styles.shareCardMetaRow}>
                <Ionicons name="time-outline" size={15} color="#FFFFFF" />
                <Text style={styles.shareCardMetaText}>{kickoffText}</Text>
              </View>
              {(event.location || event.building) && (
                <View style={styles.shareCardMetaRow}>
                  <Ionicons name="location-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.shareCardMetaText}>
                    {[event.location, event.building, event.room_number].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.shareCardFooter}>
              <View style={styles.shareCardOrgWrap}>
                <Text style={styles.shareCardOrgLabel}>ORGANIZED BY</Text>
                <Text style={styles.shareCardOrgName}>{event.organization_name || 'Campus Club'}</Text>
              </View>
              <View style={styles.shareCardFooterRight}>
                <Text style={styles.shareCardFooterApp}>Get Oryn</Text>
              </View>
            </View>
          </ViewShot>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DISTRICT_THEME.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2.5],
    backgroundColor: DISTRICT_THEME.background,
  },
  navIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DISTRICT_THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  heroWrap: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: DISTRICT_THEME.card,
    position: 'relative',
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#16171B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 13, 14, 0.4)',
  },
  heroPillsRow: {
    position: 'absolute',
    bottom: Spacing[3],
    left: Spacing[3],
    flexDirection: 'row',
    gap: Spacing[2],
  },
  heroPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  heroPillOrange: {
    backgroundColor: DISTRICT_THEME.accentOrange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroPillOrangeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[2.5],
  },
  tagChip: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  tagText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: DISTRICT_THEME.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    lineHeight: 28,
    marginBottom: Spacing[2],
  },
  description: {
    fontSize: 14,
    color: DISTRICT_THEME.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing[4],
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: 16,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: Spacing[4],
  },
  organizerLogoWrap: {
    marginRight: Spacing[3],
  },
  organizerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  organizerLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  organizerLogoInitial: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: '#94A3B8',
  },
  organizerMeta: {
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  organizerSubtext: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  followBtn: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  followingBtn: {
    backgroundColor: DISTRICT_THEME.border,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  followingBtnText: {
    color: DISTRICT_THEME.textSecondary,
  },
  metaSection: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DISTRICT_THEME.card,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  metaTextWrap: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  kickoffText: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: DISTRICT_THEME.accentOrange,
  },
  attendanceCard: {
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: 16,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: Spacing[4],
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  attendanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendanceTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  attendanceCounts: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: DISTRICT_THEME.surface,
    overflow: 'hidden',
    marginBottom: Spacing[3],
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DISTRICT_THEME.accentOrange,
    borderRadius: 3,
  },
  rsvpSegmentRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  rsvpSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  rsvpSegmentInactive: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  rsvpSegmentActive: {
    backgroundColor: '#FFFFFF',
  },
  rsvpSegmentText: {
    fontSize: 13,
    fontWeight: Typography.weight.semibold,
    color: DISTRICT_THEME.text,
  },
  rsvpSegmentTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  demographicsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing[3],
    paddingTop: Spacing[2.5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DISTRICT_THEME.border,
  },
  demographicsTriggerText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: DISTRICT_THEME.accentOrange,
  },
  inquiriesSection: {
    marginBottom: Spacing[4],
  },
  inquiriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  inquiriesTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  askQuestionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  askQuestionText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  askInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.accentOrange,
    marginBottom: Spacing[3],
    gap: Spacing[2],
  },
  askInputField: {
    flex: 1,
    fontSize: 13,
    color: DISTRICT_THEME.text,
    paddingVertical: 4,
  },
  submitQuestionBtn: {
    backgroundColor: DISTRICT_THEME.accentOrange,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  submitQuestionText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  inquiryCard: {
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: Spacing[2.5],
  },
  inquiryUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  inquiryUserName: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  inquiryUserRole: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  inquiryQuestion: {
    fontSize: 13,
    color: DISTRICT_THEME.text,
    lineHeight: 18,
  },
  inquiryPromptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  inquiryPromptText: {
    fontSize: 12,
    color: DISTRICT_THEME.textSecondary,
  },
  inquiryPromptAction: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  broadcastAlertBanner: {
    backgroundColor: '#1E140F',
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 30, 0.35)',
    marginBottom: Spacing[3.5],
  },
  broadcastAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  broadcastAlertBadge: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
    letterSpacing: 0.5,
    flex: 1,
  },
  broadcastAlertTime: {
    fontSize: 10,
    color: DISTRICT_THEME.textMuted,
  },
  broadcastAlertTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  broadcastAlertMsg: {
    fontSize: 12,
    color: DISTRICT_THEME.textSecondary,
    lineHeight: 16,
  },
  scheduleSection: {
    marginBottom: Spacing[5],
    paddingTop: Spacing[2],
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing[3],
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineLeftNode: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DISTRICT_THEME.accentOrange,
    marginTop: 4,
  },
  timelineDotEnd: {
    backgroundColor: '#10B981',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: DISTRICT_THEME.border,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: Spacing[3],
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    lineHeight: 16,
  },
  deleteInquiryBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  organizerAnswerBox: {
    marginTop: Spacing[2.5],
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing[2.5],
    borderLeftWidth: 2,
    borderLeftColor: '#60A5FA',
  },
  organizerAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  organizerBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  organizerBadgePillText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  organizerAnswerAuthor: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.textMuted,
  },
  organizerAnswerText: {
    fontSize: 12,
    color: DISTRICT_THEME.text,
    lineHeight: 16,
  },
  organizerReplyRow: {
    marginTop: Spacing[2],
  },
  replyBox: {
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.md,
    padding: Spacing[2],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  replyInput: {
    fontSize: 12,
    color: DISTRICT_THEME.text,
    paddingVertical: 4,
    minHeight: 36,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  replyCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: DISTRICT_THEME.cardElevated,
  },
  replyCancelText: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    fontWeight: Typography.weight.medium,
  },
  replySubmitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: DISTRICT_THEME.accentOrange,
  },
  replySubmitText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  replyPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  replyPromptText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  organizerControlPanel: {
    marginTop: Spacing[3.5],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: DISTRICT_THEME.border,
  },
  organizerControlHeader: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.textMuted,
    letterSpacing: 0.8,
  },
  organizerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2.5],
  },
  openStudioLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  openStudioLinkText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  organizerControlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  organizerControlBtn: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DISTRICT_THEME.cardElevated,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    gap: 6,
  },
  organizerControlBtnDanger: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  organizerControlBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    backgroundColor: 'rgba(26, 26, 26, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DISTRICT_THEME.border,
  },
  bottomPassInfo: {
    flex: 1,
    marginRight: Spacing[3],
  },
  bottomPassTier: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  bottomPassSubtitle: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },
  claimPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  claimPassBtnActive: {
    backgroundColor: DISTRICT_THEME.accentOrange,
  },
  claimPassText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },
  claimPassTextActive: {
    color: '#FFFFFF',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passTicketBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: DISTRICT_THEME.card,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  passModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[4],
  },
  passModalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  passCardSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: 24,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  passCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  passBadgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  passBadgeVerifiedText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
    letterSpacing: 0.5,
  },
  passCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DISTRICT_THEME.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passEventTitle: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 4,
  },
  passEventOrg: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    marginBottom: Spacing[4],
  },
  passDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  passGridCol: {
    flex: 1,
  },
  passGridLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  passGridVal: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  passQrContainer: {
    alignItems: 'center',
    backgroundColor: '#0C0D0E',
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  passQrBox: {
    padding: 10,
    backgroundColor: '#1E2026',
    borderRadius: Radius.md,
    marginBottom: 10,
  },
  passTicketCode: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
    letterSpacing: 1,
    marginBottom: 4,
  },
  passScanNote: {
    fontSize: 10,
    color: DISTRICT_THEME.textMuted,
    textAlign: 'center',
  },
  passDoneBtn: {
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingVertical: 12,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  passDoneBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },
  offscreenShareWrap: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
  },
  shareCardContainer: {
    width: 360,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  shareCardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCardLogoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  shareCardBrandText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#EFEFEF',
    letterSpacing: 1,
  },
  shareCardCategoryPill: {
    backgroundColor: '#272727',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  shareCardCategoryText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: '#EFEFEF',
  },
  shareCardTitle: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 8,
  },
  shareCardSummary: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 16,
  },
  shareCardMetaBox: {
    backgroundColor: '#212121',
    borderRadius: Radius.lg,
    padding: 14,
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  shareCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCardMetaText: {
    fontSize: 13,
    fontWeight: Typography.weight.medium,
    color: '#EFEFEF',
  },
  shareCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  shareCardOrgWrap: {
    flex: 1,
    marginRight: 12,
  },
  shareCardOrgLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  shareCardOrgName: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  shareCardFooterRight: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  shareCardFooterApp: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
});
