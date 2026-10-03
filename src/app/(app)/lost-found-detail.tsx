/**
 * Lost & Found Item Detail Screen.
 * Full-screen view showing complete mail description, unblurred images,
 * campus map location, finder/loser info, and direct contact options.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Dimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { useLostFoundStore } from '@/store/lostFoundStore';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { useResponsive } from '@/hooks/useResponsive';
import { hapticLight, hapticMedium, hapticSuccess } from '@/utils/haptics';
import { CampusMapPicker, CAMPUS_BUILDINGS } from '@/components/lostfound/CampusMapPicker';
import { FullScreenImageViewer } from '@/components/lostfound/FullScreenImageViewer';
import {
  getCategoryMeta,
  parseMetadata,
  parsePosterDetails,
  formatDateTime,
  timeAgo,
  getHumanizedSubtitle,
  shareLostFoundItem,
} from '@/utils/lostFoundHelpers';
import { fetchLostItemById, type LostItem, type UpdateLostItemPayload } from '@/services/lostFoundApi';
import { EditModal } from '@/components/lostfound/EditModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LostFoundDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet, maxContentWidth } = useResponsive();

  const user = useAuthStore((s: AuthStore) => s.user);
  const currentUserId = user?.id || user?.email || null;

  const items = useLostFoundStore((s) => s.items);
  const markFound = useLostFoundStore((s) => s.markFound);
  const removeItem = useLostFoundStore((s) => s.removeItem);
  const editItem = useLostFoundStore((s) => s.editItem);
  const loadItems = useLostFoundStore((s) => s.loadItems);

  const [remoteItem, setRemoteItem] = useState<LostItem | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [mapViewerOpen, setMapViewerOpen] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Locate item from store or fallback
  const item: LostItem | null = useMemo(() => {
    if (!id) return null;
    const found = items.find((i) => String(i.id) === String(id));
    return found || remoteItem;
  }, [id, items, remoteItem]);

  // Load item if not present in memory
  useEffect(() => {
    if (!item && id) {
      setIsLoadingItem(true);
      fetchLostItemById(id)
        .then((res) => {
          if (res) setRemoteItem(res);
          else loadItems();
        })
        .catch(() => {})
        .finally(() => setIsLoadingItem(false));
    }
  }, [id, item]);

  const themeMode = usePreferencesStore((s) => s.themeMode);
  const meta = item ? getCategoryMeta(item.category, themeMode) : null;
  const isOwner = !!(item && currentUserId && (item.poster_id === currentUserId || (user?.email && item.poster_email?.toLowerCase() === user.email.toLowerCase())));
  const isFound = item?.status === 'found';

  const metadata = useMemo(() => {
    if (!item) return null;
    return parseMetadata(item.description);
  }, [item?.description]);

  const poster = useMemo(() => {
    if (!item) return null;
    return parsePosterDetails(item);
  }, [item]);

  const humanizedSubtitle = useMemo(() => {
    if (!item) return '';
    return getHumanizedSubtitle(item);
  }, [item]);

  // Detected campus building
  const matchedBuilding = useMemo(() => {
    if (!item?.building) return null;
    const lower = item.building.toLowerCase();
    return (
      CAMPUS_BUILDINGS.find(
        (b) =>
          b.name.toLowerCase() === lower ||
          b.shortName.toLowerCase() === lower ||
          lower.includes(b.shortName.toLowerCase()) ||
          b.name.toLowerCase().includes(lower),
      ) ?? null
    );
  }, [item?.building]);

  const pinLat = item?.latitude != null ? Number(item.latitude) : NaN;
  const pinLng = item?.longitude != null ? Number(item.longitude) : NaN;
  const hasPin = !isNaN(pinLat) && !isNaN(pinLng);

  const effectiveLat = hasPin ? pinLat : matchedBuilding?.latitude ?? null;
  const effectiveLng = hasPin ? pinLng : matchedBuilding?.longitude ?? null;
  const canOpenMap = effectiveLat != null && effectiveLng != null;

  // Contact info
  const phoneMatch = item?.contact_info?.match(/(\+?\d[\d\s-]{8,})/);
  const phoneNumber = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : null;
  const contactEmail = item?.poster_email || (item?.contact_info?.includes('@') ? item?.contact_info : null);

  const handleBack = useCallback(() => {
    hapticLight();
    if (from === 'search') {
      router.replace('/(app)/search');
    } else if (from === 'today') {
      router.replace('/(app)/today');
    } else {
      router.replace('/(app)/lost-found');
    }
  }, [from, router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const handleShare = useCallback(async () => {
    if (!item || isSharing) return;
    setIsSharing(true);
    hapticLight();
    try {
      await shareLostFoundItem(item);
    } catch {} finally {
      setIsSharing(false);
    }
  }, [item, isSharing]);

  const handleCall = () => {
    if (!phoneNumber) {
      Alert.alert('No Phone', 'No phone number provided in report.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    if (!phoneNumber || !item) {
      Alert.alert('No Phone', 'No phone number provided in report.');
      return;
    }
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const statusBadge = isFound ? 'FOUND' : 'LOST';
    const locationText = [item.building, item.location_found].filter(Boolean).join(' · ');
    const descSnippet = metadata?.cleanDescription ? metadata.cleanDescription.slice(0, 260).trim() : '';
    const dateFormatted = item.created_at ? formatDateTime(item.created_at) : '';

    const lines = [
      `*Hi! I saw your post on Oryn Lost & Found:*`,
      ``,
      `📌 *Item:* [${statusBadge}] ${item.title}`,
      item.category ? `📂 *Category:* ${item.category}` : null,
      locationText ? `📍 *Location:* ${locationText}` : null,
      dateFormatted ? `📅 *Reported:* ${dateFormatted}` : null,
      descSnippet ? `\n📝 *Details:*\n${descSnippet}` : null,
    ].filter(Boolean);

    if (item.image_url) {
      lines.push(`\n🖼️ *Photo:* ${item.image_url}`);
    }

    const msg = encodeURIComponent(lines.join('\n'));
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
  };

  const handleEmail = () => {
    if (!item) return;
    const email = contactEmail || 'support@oryn.app';
    const sub = encodeURIComponent(`Re: ${item.title} (Oryn Lost & Found)`);
    const body = encodeURIComponent(
      `Hi ${item.poster_name || ''},\n\nI am contacting you regarding your Lost & Found report for "${item.title}".\n\n`
    );
    Linking.openURL(`mailto:${email}?subject=${sub}&body=${body}`);
  };

  const handleMarkResolved = async () => {
    if (!item) return;
    Alert.alert(
      'Mark as Resolved',
      'Are you sure this item has been returned or found? This will update its status.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          onPress: async () => {
            try {
              hapticSuccess();
              await markFound(item.id);
              handleBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!item) return;
    Alert.alert(
      'Delete Post',
      'This will permanently delete this post from Lost & Found. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticMedium();
              await removeItem(item.id);
              handleBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleEditSubmit = async (editId: string, payload: UpdateLostItemPayload) => {
    try {
      setIsSubmitting(true);
      const updated = await editItem(editId, payload);
      setRemoteItem(updated);
      hapticSuccess();
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingItem) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (!item || !metadata || !poster || !meta) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.textMuted} />
        <Text style={styles.notFoundTitle}>Item Not Found</Text>
        <Text style={styles.notFoundSub}>This post may have been resolved or deleted.</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonLarge}>
          <Text style={styles.backButtonLargeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { isUrgent, reward, custody, secretQuestion, cleanDescription } = metadata;
  const statusColor = isFound ? '#10B981' : '#F97316';
  const statusLabel = isFound ? 'FOUND' : 'LOST';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={12}
          style={styles.topBarBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} numberOfLines={1}>
          Item Details
        </Text>

        <TouchableOpacity
          onPress={handleShare}
          disabled={isSharing}
          hitSlop={12}
          style={styles.topBarBtn}
          accessibilityLabel="Share post"
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Ionicons name="share-outline" size={20} color={Colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Main Scroll ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentContainer, isTablet && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {/* ── Unblurred Hero Photo ── */}
          {item.image_url ? (
            <Pressable
              onPress={() => setImageViewerOpen(true)}
              style={styles.heroWrap}
              accessibilityLabel="View full size image"
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.heroImg}
                resizeMode="cover"
              />
              <View style={styles.heroTapHint}>
                <Ionicons name="expand" size={12} color={Colors.white} />
                <Text style={styles.heroTapHintText}>Tap to zoom</Text>
              </View>

              {/* Status Badge overlay */}
              <View style={[styles.heroStatusBadge, { backgroundColor: statusColor }]}>
                <View style={styles.heroStatusDot} />
                <Text style={styles.heroStatusText}>{statusLabel}</Text>
              </View>
            </Pressable>
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon as any} size={56} color={meta.color} />
              <View style={[styles.heroStatusBadge, { backgroundColor: statusColor }]}>
                <View style={styles.heroStatusDot} />
                <Text style={styles.heroStatusText}>{statusLabel}</Text>
              </View>
            </View>
          )}

          {/* ── Tags / Badges Row ── */}
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
              <Ionicons name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[styles.catBadgeText, { color: meta.color }]}>{item.category || 'Other'}</Text>
            </View>

            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={11} color="#FF3B30" />
                <Text style={styles.urgentBadgeText}>URGENT</Text>
              </View>
            )}

            {reward && (
              <View style={styles.rewardBadge}>
                <Ionicons name="gift-outline" size={11} color="#F59E0B" />
                <Text style={styles.rewardBadgeText}>Reward: {reward}</Text>
              </View>
            )}

            <View style={styles.statusPill}>
              <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* ── Title & Meta ── */}
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.subtitle}>{humanizedSubtitle}</Text>

          {/* ── Description from Mail ── */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.sectionTitle}>DESCRIPTION FROM REPORT</Text>
            </View>
            <Text style={styles.descriptionText} selectable>
              {cleanDescription || 'No description provided in the report.'}
            </Text>
          </View>

          {/* ── Pinned Location & Campus Map ── */}
          {(hasPin || canOpenMap || item.building || item.location_found || custody) && (
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="location-outline" size={14} color={Colors.systemOrange} />
                <Text style={styles.sectionTitle}>LOCATION DETAILS</Text>
              </View>

              {/* Location textual details */}
              <View style={styles.locationDetailsList}>
                {item.building && (
                  <View style={styles.locDetailRow}>
                    <Ionicons name="business" size={15} color={Colors.textSecondary} />
                    <Text style={styles.locDetailText}>
                      Building: <Text style={styles.locDetailBold}>{item.building}</Text>
                    </Text>
                  </View>
                )}
                {item.location_found && (
                  <View style={styles.locDetailRow}>
                    <Ionicons name="pin" size={15} color={Colors.systemOrange} />
                    <Text style={styles.locDetailText}>
                      Specific Spot: <Text style={styles.locDetailBold}>{item.location_found}</Text>
                    </Text>
                  </View>
                )}
                {custody && (
                  <View style={styles.locDetailRow}>
                    <Ionicons name="shield-checkmark" size={15} color={Colors.systemGreen} />
                    <Text style={styles.locDetailText}>
                      Currently Kept At: <Text style={styles.locDetailBold}>{custody}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Interactive Mini-Map */}
              {canOpenMap && (
                <View style={styles.mapContainer}>
                  <CampusMapPicker
                    readOnly
                    readOnlyLat={effectiveLat}
                    readOnlyLng={effectiveLng}
                    readOnlyLabel={item.building || matchedBuilding?.name || 'Campus Location'}
                    isViewerVisible={mapViewerOpen}
                    onCloseViewer={() => setMapViewerOpen(false)}
                    onPressPreview={() => setMapViewerOpen(true)}
                  />
                </View>
              )}
            </View>
          )}

          {/* ── Ownership Verification (Secret Question) ── */}
          {secretQuestion && (
            <View style={styles.verificationBox}>
              <View style={styles.verificationHeader}>
                <Ionicons name="lock-closed" size={15} color="#F59E0B" />
                <Text style={styles.verificationTitle}>Ownership Verification</Text>
              </View>
              <Text style={styles.verificationPrompt}>
                To verify that this item belongs to you, answer the reporter's question:
              </Text>
              <Text style={styles.verificationQuestion}>"{secretQuestion}"</Text>
            </View>
          )}

          {/* ── Reporter / Poster Profile ── */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.sectionTitle}>REPORTED BY</Text>
            </View>

            <View style={styles.posterRow}>
              {item.poster_avatar ? (
                <Image source={{ uri: item.poster_avatar }} style={styles.posterAvatarImg} />
              ) : (
                <View style={[styles.posterAvatarFallback, { backgroundColor: poster.avatarColor }]}>
                  <Text style={styles.posterAvatarText}>{poster.initials}</Text>
                </View>
              )}
              <View style={styles.posterMetaCol}>
                <Text style={styles.posterName}>{poster.displayName}</Text>
                {poster.rollNumber ? (
                  <Text style={styles.posterSub}>Roll No: {poster.rollNumber}</Text>
                ) : (
                  <Text style={styles.posterSub}>Verified Campus Student</Text>
                )}
                {item.poster_email && (
                  <View style={styles.posterEmailRow}>
                    <Ionicons name="mail-unread-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.posterEmail}>{item.poster_email}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Actions: Contact (Non-owner) or Management (Owner) ── */}
          {!isOwner ? (
            <View style={styles.contactCard}>
              <Text style={styles.contactHeader}>CONTACT & CLAIM</Text>
              <Text style={styles.contactSub}>Reach out to coordinate item recovery on campus.</Text>

              <View style={styles.contactBtnGroup}>
                {phoneNumber && (
                  <TouchableOpacity onPress={handleCall} style={[styles.actionBtn, styles.callBtn]}>
                    <Ionicons name="call" size={16} color={Colors.white} />
                    <Text style={styles.actionBtnWhiteText}>Call</Text>
                  </TouchableOpacity>
                )}

                {phoneNumber && (
                  <TouchableOpacity onPress={handleWhatsApp} style={[styles.actionBtn, styles.waBtn]}>
                    <Ionicons name="logo-whatsapp" size={16} color={Colors.white} />
                    <Text style={styles.actionBtnWhiteText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleEmail} style={[styles.actionBtn, styles.emailBtn]}>
                  <Ionicons name="mail" size={16} color={Colors.text} />
                  <Text style={styles.actionBtnText}>Email</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.safetyNote}>
                <Ionicons name="shield-checkmark-outline" size={14} color={Colors.systemGreen} />
                <Text style={styles.safetyNoteText}>
                  Always arrange handovers at public campus locations (e.g. Library reception, Hostel warden desk).
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.ownerCard}>
              <Text style={styles.contactHeader}>POST MANAGEMENT</Text>
              <Text style={styles.contactSub}>You are the author of this post.</Text>

              <TouchableOpacity onPress={handleMarkResolved} style={styles.ownerActionBtn}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.systemGreen} />
                <Text style={styles.ownerActionBtnText}>Mark as Resolved</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.ownerActionBtn}>
                <Ionicons name="pencil-outline" size={18} color={Colors.text} />
                <Text style={styles.ownerActionBtnText}>Edit Post</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDelete} style={[styles.ownerActionBtn, styles.ownerDeleteBtn]}>
                <Ionicons name="trash-outline" size={18} color={Colors.systemRed} />
                <Text style={[styles.ownerActionBtnText, { color: Colors.systemRed }]}>Delete Post</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.systemRed} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full-screen Image Viewer */}
      {item.image_url && (
        <FullScreenImageViewer
          visible={imageViewerOpen}
          imageUri={item.image_url}
          onClose={() => setImageViewerOpen(false)}
        />
      )}

      {/* Edit Post Modal */}
      {isEditModalVisible && item && (
        <EditModal
          visible={isEditModalVisible}
          item={item}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notFoundTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  notFoundSub: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: 20,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonLargeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
  },

  // ── Top Bar ──
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // ── Scroll Content ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  contentContainer: {
    gap: 16,
  },

  // ── Hero Photo ──
  heroWrap: {
    width: '100%',
    height: 240,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#161618',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroTapHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTapHintText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: Typography.weight.medium,
  },
  heroPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroStatusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  heroStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },

  // ── Badges Row ──
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
  },
  urgentBadgeText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: Typography.weight.bold,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  rewardBadgeText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: Typography.weight.semibold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
  },

  // ── Title ──
  itemTitle: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -8,
  },

  // ── Section Box ──
  cardSection: {
    backgroundColor: '#121214',
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#E0E0E0',
  },

  // ── Location ──
  locationDetailsList: {
    gap: 8,
  },
  locDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  locDetailBold: {
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
  mapContainer: {
    marginTop: 4,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // ── Verification Question ──
  verificationBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    gap: 6,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  verificationPrompt: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  verificationQuestion: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.text,
    fontWeight: Typography.weight.medium,
    marginTop: 2,
  },

  // ── Poster Profile ──
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  posterAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
  },
  posterAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterAvatarText: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
  },
  posterMetaCol: {
    flex: 1,
    gap: 2,
  },
  posterName: {
    fontSize: 15,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  posterSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  posterEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  posterEmail: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // ── Contact Card (Non-owner) ──
  contactCard: {
    backgroundColor: '#141416',
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  contactHeader: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  contactSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -6,
  },
  contactBtnGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtn: {
    backgroundColor: Colors.systemGreen,
  },
  waBtn: {
    backgroundColor: '#25D366',
  },
  emailBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnWhiteText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: Typography.weight.semibold,
  },
  actionBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: Typography.weight.semibold,
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  safetyNoteText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },

  // ── Owner Card ──
  ownerCard: {
    backgroundColor: '#141416',
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  ownerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownerDeleteBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  ownerActionBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
});
