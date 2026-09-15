/**
 * Lost & Found — world-class campus lost and found experience.
 *
 * Design principles:
 * - Apple HIG dark mode, nonchalant luxury aesthetic
 * - Uber-style map pin (center-fixed, map moves under it)
 * - Image-first card layout with status overlay
 * - Animated.spring press-scale micro-interaction on every card
 * - MotiView staggered list entry animations
 * - Full-screen image viewer on tap
 * - Consolidated actions — no repeated features
 * - Owner-only delete, mark-resolved, edit
 * - Read-only pinned location mini-map for viewers
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
  Switch,
  Pressable,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MotiView } from 'moti';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  Opacity,
} from '@/constants/theme';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import {
  useLostFoundStore,
  CATEGORIES,
  type LostFoundCategory,
  type LostFoundTab,
} from '@/store/lostFoundStore';
import type { LostItem, CreateLostItemPayload, UpdateLostItemPayload } from '@/services/lostFoundApi';
import { hapticLight, hapticSuccess, hapticMedium } from '@/utils/haptics';
import { CampusMapPicker, CAMPUS_CENTER, CAMPUS_BUILDINGS } from '@/components/lostfound/CampusMapPicker';
import { ChatGPTAttachmentPicker } from '@/components/lostfound/ChatGPTAttachmentPicker';
import { FullScreenImageViewer } from '@/components/lostfound/FullScreenImageViewer';
import { LostFoundFilterModal } from '@/components/lostfound/LostFoundFilterModal';
import { LostFoundSearchModal } from '@/components/lostfound/LostFoundSearchModal';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// ─── Campus Data ──────────────────────────────────────────────────

const CUSTODY_LOCATIONS = [
  'With Me',
  'Main Gate Security Desk',
  'Hostel Warden Office',
  'Library Front Counter',
  'Department Office',
  'Campus Reception',
  'Other',
];

// ─── Category Icon Map ────────────────────────────────────────────

const CATEGORY_ICONS_VIBRANT: Record<string, { icon: string; color: string; bg: string }> = {
  Electronics: { icon: 'laptop-outline',        color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Documents:   { icon: 'document-text-outline', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.14)' },
  Clothing:    { icon: 'shirt-outline',         color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.14)' },
  Keys:        { icon: 'key-outline',           color: '#30B0C7', bg: 'rgba(48, 176, 199, 0.14)' },
  Wallet:      { icon: 'wallet-outline',        color: '#34C759', bg: 'rgba(52, 199, 89, 0.14)' },
  Bag:         { icon: 'bag-outline',           color: '#5856D6', bg: 'rgba(88, 86, 214, 0.14)' },
  Bottle:      { icon: 'water-outline',         color: '#32ADE6', bg: 'rgba(50, 173, 230, 0.14)' },
  Other:       { icon: 'help-circle-outline',   color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.14)' },
  All:         { icon: 'grid-outline',          color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
};

const CATEGORY_ICONS_MONO: Record<string, { icon: string; color: string; bg: string }> = {
  Electronics: { icon: 'laptop-outline',        color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Documents:   { icon: 'document-text-outline', color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Clothing:    { icon: 'shirt-outline',         color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Keys:        { icon: 'key-outline',           color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Wallet:      { icon: 'wallet-outline',        color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Bag:         { icon: 'bag-outline',           color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Bottle:      { icon: 'water-outline',         color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Other:       { icon: 'help-circle-outline',   color: '#AEAEB2', bg: 'rgba(174, 174, 178, 0.14)' },
  All:         { icon: 'grid-outline',          color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
};

function getCategoryMeta(category: string, mode?: 'vibrant' | 'monochrome') {
  const currentMode = mode ?? usePreferencesStore.getState().themeMode;
  const map = currentMode === 'monochrome' ? CATEGORY_ICONS_MONO : CATEGORY_ICONS_VIBRANT;
  return map[category] ?? map.Other;
}

// ─── Helper Functions ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function parseMetadata(description: string) {
  const isUrgent = description.includes('[URGENT]');
  const rewardMatch = description.match(/\[REWARD:\s*([^\]]+)\]/);
  const custodyMatch = description.match(/\[CUSTODY:\s*([^\]]+)\]/);
  const questionMatch = description.match(/\[QUESTION:\s*([^\]]+)\]/);
  const cleanDescription = description
    .replace(/\[URGENT\]/g, '')
    .replace(/\[REWARD:\s*[^\]]+\]/g, '')
    .replace(/\[CUSTODY:\s*[^\]]+\]/g, '')
    .replace(/\[QUESTION:\s*[^\]]+\]/g, '')
    .trim();
  return {
    isUrgent,
    reward: rewardMatch ? rewardMatch[1].trim() : null,
    custody: custodyMatch ? custodyMatch[1].trim() : null,
    secretQuestion: questionMatch ? questionMatch[1].trim() : null,
    cleanDescription,
  };
}

function getInitial(name?: string | null): string {
  return ((name?.trim()[0]) ?? 'U').toUpperCase();
}

function getAvatarColor(id?: string | null): string {
  const PALETTE = ['#383838', '#48484A', '#3A3A3C', '#2C2C2E', '#505050'];
  if (!id) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

async function shareLostFoundItem(item: LostItem): Promise<void> {
  const isFound = item.status === 'found';
  const { cleanDescription } = parseMetadata(item.description);
  const locationInfo = item.building
    ? `Location: ${item.building}${item.location_found ? ` · ${item.location_found}` : ''}\n`
    : item.location_found ? `Location: ${item.location_found}\n` : '';
  const shareTitle = `[${isFound ? 'FOUND' : 'LOST'} on Campus] ${item.title}`;
  const shareMessage = `${shareTitle}\n${locationInfo}${cleanDescription}\n\nPosted on Oryn Campus Lost & Found by ${item.poster_name || 'student'}`;

  if (item.image_url) {
    try {
      let localUri: string | null = null;
      const safeId = String(item.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cacheDir = FileSystem.cacheDirectory || '';
      if (item.image_url.startsWith('file://')) {
        localUri = item.image_url;
      } else if (item.image_url.startsWith('data:')) {
        const match = item.image_url.match(/^data:([^;]+);base64,(.+)$/);
        const mime = match ? match[1] : 'image/jpeg';
        const b64 = match ? match[2] : item.image_url.split(',')[1] ?? item.image_url;
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const uri = `${cacheDir}share_${safeId}.${ext}`;
        await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
        localUri = uri;
      } else if (item.image_url.startsWith('http')) {
        const rawExt = item.image_url.split('?')[0].split('.').pop()?.toLowerCase();
        const ext = rawExt && ['jpg','jpeg','png','webp'].includes(rawExt) ? rawExt : 'jpg';
        const uri = `${cacheDir}share_${safeId}.${ext}`;
        const dl = await FileSystem.downloadAsync(item.image_url, uri);
        localUri = dl.uri;
      }
      if (localUri) {
        const mime = localUri.endsWith('.png') ? 'image/png' : localUri.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        await Sharing.shareAsync(localUri, {
          mimeType: mime,
          dialogTitle: shareTitle,
          UTI: mime,
        });
        return;
      }
    } catch {
      // fallback to plain text sharing
    }
  }

  // Fallback: share plain text via expo-sharing
  try {
    const textFileUri = `${FileSystem.cacheDirectory || ''}lost_found_${item.id || 'post'}.txt`;
    await FileSystem.writeAsStringAsync(textFileUri, shareMessage, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(textFileUri, {
      mimeType: 'text/plain',
      dialogTitle: shareTitle,
      UTI: 'public.plain-text',
    });
  } catch {
    // Sharing cancelled or not available
  }
}

// ─── Category Pill ────────────────────────────────────────────────

function CategoryPill({ category, isActive, onPress }: { category: LostFoundCategory; isActive: boolean; onPress: () => void }) {
  const themeMode = usePreferencesStore(s => s.themeMode);
  const meta = getCategoryMeta(category, themeMode);
  return (
    <TouchableOpacity
      activeOpacity={Opacity.pressed}
      onPress={onPress}
      style={[styles.catPill, isActive && styles.catPillActive]}
    >
      <Ionicons name={meta.icon as any} size={12} color={isActive ? '#121212' : Colors.textMuted} />
      <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
        {category}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Item Card ────────────────────────────────────────────────────

function ItemCard({
  item,
  currentUserId,
  onPress,
  onMarkFound,
  onEdit,
  onDelete,
  index,
}: {
  item: LostItem;
  currentUserId: string | null;
  onPress: () => void;
  onMarkFound: (id: string) => void;
  onEdit: (item: LostItem) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const themeMode = usePreferencesStore(s => s.themeMode);
  const meta = getCategoryMeta(item.category, themeMode);
  const isOwner = !!(currentUserId && item.poster_id === currentUserId);
  const isFound = item.status === 'found';
  const { isUrgent, reward, cleanDescription } = parseMetadata(item.description);

  const scale = useRef(new Animated.Value(1)).current;
  const [isSharing, setIsSharing] = useState(false);

  const pressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, damping: 30, stiffness: 500, mass: 0.5 }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200, mass: 0.8 }).start();
  }, [scale]);

  const handleShare = async (e: any) => {
    e.stopPropagation();
    if (isSharing) return;
    setIsSharing(true);
    hapticLight();
    try { await shareLostFoundItem(item); } catch {} finally { setIsSharing(false); }
  };

  const handleContact = (e: any) => {
    e.stopPropagation();
    hapticLight();
    const email = item.poster_email || 'support@oryn.app';
    const sub = encodeURIComponent(`Regarding [${item.status.toUpperCase()}] ${item.title}`);
    const body = encodeURIComponent(`Hi ${item.poster_name || 'there'},\n\nI saw your post on Oryn Lost & Found about "${item.title}".\n\n`);
    Linking.openURL(`mailto:${email}?subject=${sub}&body=${body}`);
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: Math.min(index * 55, 480) }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={styles.card}
        >
          {/* ── Hero Image (if present) ── */}
          {item.image_url ? (
            <View style={styles.cardHero}>
              <Image source={{ uri: item.image_url }} style={styles.cardHeroImg} resizeMode="cover" />
              {/* Status pill */}
              <View style={[styles.statusOverlay, isFound ? styles.statusOverlayFound : styles.statusOverlayLost]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusOverlayTxt}>
                  {isFound ? 'FOUND' : 'LOST'}
                </Text>
              </View>
              {/* Category badge */}
              <View style={[styles.catOverlay, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              </View>
            </View>
          ) : (
            /* No-image: compact icon strip, not full placeholder */
            <View style={styles.cardNoImageRow}>
              <View style={[styles.cardNoImageIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={18} color={meta.color} />
              </View>
              <View style={[styles.statusPill, isFound ? styles.statusPillFound : styles.statusPillLost]}>
                <View style={[styles.statusPillDot, isFound ? styles.statusPillDotFound : styles.statusPillDotLost]} />
                <Text style={[styles.statusPillTxt, isFound ? styles.statusPillTxtFound : styles.statusPillTxtLost]}>
                  {isFound ? 'FOUND' : 'LOST'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Card Body ── */}
          <View style={styles.cardBody}>
            {/* Top row: poster + time + tags */}
            <View style={styles.posterRow}>
              {item.poster_avatar ? (
                <Image source={{ uri: item.poster_avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: getAvatarColor(item.poster_name) }]}>
                  <Text style={styles.avatarInitial}>{getInitial(item.poster_name)}</Text>
                </View>
              )}
              <View style={styles.posterMeta}>
                <View style={styles.posterNameRow}>
                  <Text style={styles.posterName} numberOfLines={1}>{item.poster_name || 'Campus Student'}</Text>
                  {isOwner && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
                  {isUrgent && (
                    <View style={styles.urgentTag}>
                      <Ionicons name="flash" size={9} color={Colors.systemRed} />
                      <Text style={styles.urgentTagText}>URGENT</Text>
                    </View>
                  )}
                  {reward && (
                    <View style={styles.rewardTag}>
                      <Ionicons name="gift-outline" size={9} color={Colors.systemYellow} />
                      <Text style={styles.rewardTagText}>+ Reward</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.posterTime}>
                  {timeAgo(item.created_at)}{item.building ? ` · ${item.building}` : ''}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

            {/* Description */}
            {cleanDescription ? (
              <Text style={styles.cardDesc} numberOfLines={2}>{cleanDescription}</Text>
            ) : null}

            {/* Location chip */}
            {(item.location_found || item.building) && (
              <View style={styles.locationChip}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.locationChipText} numberOfLines={1}>
                  {[item.building, item.location_found].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}

            {/* Footer actions */}
            <View style={styles.cardFooter}>
              {/* Left side: Contact (non-owner) or owner controls */}
              {!isOwner ? (
                <TouchableOpacity onPress={handleContact} activeOpacity={0.8} style={styles.contactBtn}>
                  <Ionicons name="mail" size={13} color={Colors.text} />
                  <Text style={styles.contactBtnText}>Contact Poster</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.ownerBtnRow}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onEdit(item); }}
                    style={styles.ownerEditBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={12} color={Colors.text} />
                    <Text style={styles.ownerEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onMarkFound(item.id); }}
                    style={styles.ownerResolveBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle" size={13} color="#121212" />
                    <Text style={styles.ownerResolveText}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Right side: Share + (owner) Delete */}
              <View style={styles.cardRightActions}>
                {isOwner && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    style={styles.deleteIconBtn}
                    hitSlop={8}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.systemRed} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.shareIconBtn}
                  hitSlop={8}
                  disabled={isSharing}
                  activeOpacity={0.7}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color={Colors.textMuted} />
                  ) : (
                    <Ionicons name="share-outline" size={17} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </MotiView>
  );
}

// ─── Item Detail Modal ────────────────────────────────────────────

function ItemDetailModal({
  visible,
  item,
  currentUserId,
  onClose,
  onMarkFound,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  item: LostItem | null;
  currentUserId: string | null;
  onClose: () => void;
  onMarkFound: (id: string) => void;
  onEdit: (item: LostItem) => void;
  onDelete: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [mapViewerOpen, setMapViewerOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const building = item?.building;
  // Fallback building coordinate resolution from campus landmarks
  const matchedBuilding = useMemo(() => {
    if (!building) return null;
    const lower = building.toLowerCase();
    return (
      CAMPUS_BUILDINGS.find(
        (b) =>
          b.name.toLowerCase() === lower ||
          b.shortName.toLowerCase() === lower ||
          lower.includes(b.shortName.toLowerCase()) ||
          b.name.toLowerCase().includes(lower),
      ) ?? null
    );
  }, [building]);

  if (!item) return null;

  const themeMode = usePreferencesStore(s => s.themeMode);
  const meta = getCategoryMeta(item.category, themeMode);
  const isOwner = !!(currentUserId && item.poster_id === currentUserId);
  const isFound = item.status === 'found';
  const { isUrgent, reward, custody, secretQuestion, cleanDescription } = parseMetadata(item.description);
  const phoneMatch = item.contact_info?.match(/(\+?\d[\d\s-]{8,})/);
  const phoneNumber = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : null;
  const contactEmail = item.poster_email || (item.contact_info?.includes('@') ? item.contact_info : null);

  const handleCall = () => {
    if (!phoneNumber) { Alert.alert('No Phone', 'Poster did not specify a phone number.'); return; }
    Linking.openURL(`tel:${phoneNumber}`);
  };
  const handleWhatsApp = () => {
    if (!phoneNumber) { Alert.alert('No Phone', 'Poster did not specify a WhatsApp number.'); return; }
    const msg = encodeURIComponent(`Hi! I saw your post on Oryn Lost & Found: "${item.title}".`);
    Linking.openURL(`https://wa.me/${phoneNumber}?text=${msg}`);
  };
  const handleEmail = () => {
    const email = contactEmail || 'support@oryn.app';
    const sub = encodeURIComponent(`Re: ${item.title}`);
    const body = encodeURIComponent(`Hi ${item.poster_name || ''},\n\nI saw your Lost & Found post about "${item.title}".\n\n`);
    Linking.openURL(`mailto:${email}?subject=${sub}&body=${body}`);
  };
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    hapticLight();
    try { await shareLostFoundItem(item); } catch {} finally { setIsSharing(false); }
  };

  // Coerce to Number — API sometimes returns lat/lng as strings
  const pinLat = item.latitude != null ? Number(item.latitude) : NaN;
  const pinLng = item.longitude != null ? Number(item.longitude) : NaN;
  const hasPin = !isNaN(pinLat) && !isNaN(pinLng);

  const effectiveLat = hasPin ? pinLat : matchedBuilding?.latitude ?? null;
  const effectiveLng = hasPin ? pinLng : matchedBuilding?.longitude ?? null;
  const canOpenMap = effectiveLat != null && effectiveLng != null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={onClose} />
          <View style={[styles.detailSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.grabHandle} />

            {/* Sheet header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Text style={styles.detailHeaderClose}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Item Details</Text>
              <TouchableOpacity onPress={handleShare} disabled={isSharing} hitSlop={12} style={styles.detailShareBtn}>
                {isSharing
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Ionicons name="share-outline" size={20} color={Colors.text} />
                }
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Hero image (tappable → full-screen viewer) */}
              {item.image_url ? (
                <Pressable onPress={() => setImageViewerOpen(true)} style={styles.detailHeroWrap}>
                  <Image source={{ uri: item.image_url }} style={styles.detailHero} resizeMode="cover" />
                  <View style={styles.detailHeroTapHint}>
                    <Ionicons name="expand-outline" size={13} color={Colors.white} />
                    <Text style={styles.detailHeroTapHintText}>Tap to expand</Text>
                  </View>
                  <View style={[styles.statusOverlay, isFound ? styles.statusOverlayFound : styles.statusOverlayLost]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusOverlayTxt}>
                      {isFound ? 'FOUND' : 'LOST'}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View style={[styles.detailHeroPlaceholder, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon as any} size={52} color={meta.color} />
                  <View style={[styles.statusOverlay, isFound ? styles.statusOverlayFound : styles.statusOverlayLost]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusOverlayTxt}>
                      {isFound ? 'FOUND' : 'LOST'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Badges row */}
              <View style={styles.detailBadgesRow}>
                <View style={[styles.catBadge, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
                  <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                  <Text style={[styles.catBadgeText, { color: meta.color }]}>{item.category}</Text>
                </View>
                {isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Ionicons name="flash" size={10} color={Colors.systemRed} />
                    <Text style={styles.urgentBadgeText}>URGENT</Text>
                  </View>
                )}
                {reward && (
                  <View style={styles.rewardBadge}>
                    <Ionicons name="gift-outline" size={10} color={Colors.systemYellow} />
                    <Text style={styles.rewardBadgeText}>Reward: {reward}</Text>
                  </View>
                )}
              </View>

              {/* Title + time */}
              <Text style={styles.detailTitle}>{item.title}</Text>
              <Text style={styles.detailTime}>Posted {timeAgo(item.created_at)}</Text>

              {/* Description */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                <Text style={styles.detailDesc}>{cleanDescription || 'No description provided.'}</Text>
              </View>

              {/* Pinned location mini-map (if coordinates stored) */}
              {hasPin && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>PINNED LOCATION</Text>
                  <CampusMapPicker
                    readOnly
                    readOnlyLat={pinLat}
                    readOnlyLng={pinLng}
                    readOnlyLabel={item.building || 'Campus Location'}
                    isViewerVisible={mapViewerOpen}
                    onCloseViewer={() => setMapViewerOpen(false)}
                    onPressPreview={() => setMapViewerOpen(true)}
                  />
                  {(item.building || item.location_found) && (
                    <TouchableOpacity
                      style={styles.locationRow}
                      activeOpacity={0.7}
                      onPress={() => setMapViewerOpen(true)}
                    >
                      <Ionicons name="business-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.locationRowText}>
                        {[item.building, item.location_found].filter(Boolean).join(' · ')}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Location (text only, when no pin) */}
              {!hasPin && (item.building || item.location_found || custody) && (
                <View style={styles.locationBox}>
                  {item.building && (
                    <TouchableOpacity
                      style={styles.locationRow}
                      activeOpacity={canOpenMap ? 0.7 : 1}
                      onPress={() => {
                        if (canOpenMap) setMapViewerOpen(true);
                      }}
                    >
                      <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.locationRowText}>{item.building}</Text>
                      {canOpenMap && (
                        <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  )}
                  {item.location_found && (
                    <View style={styles.locationRow}>
                      <Ionicons name="pin-outline" size={14} color={Colors.systemOrange} />
                      <Text style={styles.locationRowText}>{item.location_found}</Text>
                    </View>
                  )}
                  {custody && (
                    <View style={styles.locationRow}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={Colors.systemGreen} />
                      <Text style={styles.locationRowText}>Held at: {custody}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Location viewer for detected building when item has no manual coordinates */}
              {!hasPin && canOpenMap && (
                <CampusMapPicker
                  readOnly
                  readOnlyLat={effectiveLat}
                  readOnlyLng={effectiveLng}
                  readOnlyLabel={item.building || matchedBuilding?.name || 'Campus Location'}
                  isViewerVisible={mapViewerOpen}
                  onCloseViewer={() => setMapViewerOpen(false)}
                />
              )}

              {/* Secret question (anti-fraud) */}
              {secretQuestion && (
                <View style={styles.verificationBox}>
                  <View style={styles.verificationHeader}>
                    <Ionicons name="lock-closed" size={14} color={Colors.systemYellow} />
                    <Text style={styles.verificationTitle}>Ownership Verification</Text>
                  </View>
                  <Text style={styles.verificationSub}>To claim this item, answer the finder's question:</Text>
                  <Text style={styles.verificationQ}>"{secretQuestion}"</Text>
                </View>
              )}

              {/* Poster card */}
              <View style={styles.posterCard}>
                <View style={[styles.posterCardAvatar, { backgroundColor: getAvatarColor(item.poster_name) }]}>
                  <Text style={styles.posterCardAvatarText}>{getInitial(item.poster_name)}</Text>
                </View>
                <View style={styles.posterCardMeta}>
                  <Text style={styles.posterCardName}>{item.poster_name || 'Campus Student'}</Text>
                  <Text style={styles.posterCardSub}>Verified Campus Member</Text>
                  {item.poster_email && (
                    <View style={styles.posterEmailRow}>
                      <Ionicons name="school-outline" size={11} color={Colors.textSecondary} />
                      <Text style={styles.posterEmailText}>{item.poster_email}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Non-owner: Contact section */}
              {!isOwner && (
                <View style={styles.contactSection}>
                  <Text style={styles.sectionLabel}>CONTACT / CLAIM</Text>
                  <View style={styles.contactBtnRow}>
                    {phoneNumber && (
                      <TouchableOpacity onPress={handleCall} style={[styles.contactActionBtn, { backgroundColor: Colors.systemGreen }]}>
                        <Ionicons name="call" size={16} color={Colors.white} />
                        <Text style={[styles.contactActionText, { color: Colors.white }]}>Call</Text>
                      </TouchableOpacity>
                    )}
                    {phoneNumber && (
                      <TouchableOpacity onPress={handleWhatsApp} style={[styles.contactActionBtn, { backgroundColor: '#25D366' }]}>
                        <Ionicons name="logo-whatsapp" size={16} color={Colors.white} />
                        <Text style={styles.contactActionText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleEmail} style={[styles.contactActionBtn, { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border }]}>
                      <Ionicons name="mail" size={16} color={Colors.text} />
                      <Text style={[styles.contactActionText, { color: Colors.text }]}>Email</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.safeHandoverNote}>
                    <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.safeHandoverText}>
                      Always meet at public campus spots — Library reception or Hostel warden office.
                    </Text>
                  </View>
                </View>
              )}

              {/* Owner: management section */}
              {isOwner && (
                <View style={styles.ownerSection}>
                  <Text style={styles.sectionLabel}>POST MANAGEMENT</Text>
                  <TouchableOpacity
                    onPress={() => { onClose(); onMarkFound(item.id); }}
                    style={styles.ownerActionRow}
                    activeOpacity={0.75}
                  >
                    <View style={styles.ownerActionIcon}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.systemGreen} />
                    </View>
                    <View style={styles.ownerActionText}>
                      <Text style={styles.ownerActionTitle}>Mark as Resolved</Text>
                      <Text style={styles.ownerActionSub}>Item has been found or returned</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { onClose(); onEdit(item); }}
                    style={[styles.ownerActionRow, styles.ownerActionRowMid]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.ownerActionIcon, { backgroundColor: Colors.surfaceElevated }]}>
                      <Ionicons name="pencil" size={16} color={Colors.text} />
                    </View>
                    <View style={styles.ownerActionText}>
                      <Text style={styles.ownerActionTitle}>Edit Post</Text>
                      <Text style={styles.ownerActionSub}>Update details, location, or description</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { onClose(); onDelete(item.id); }}
                    style={[styles.ownerActionRow, styles.ownerActionRowBottom]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.ownerActionIcon, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
                      <Ionicons name="trash-outline" size={16} color={Colors.systemRed} />
                    </View>
                    <View style={styles.ownerActionText}>
                      <Text style={[styles.ownerActionTitle, { color: Colors.systemRed }]}>Delete Post</Text>
                      <Text style={styles.ownerActionSub}>Permanently remove this post</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full-screen image viewer */}
      {item.image_url && (
        <FullScreenImageViewer
          visible={imageViewerOpen}
          imageUri={item.image_url}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </>
  );
}

// ─── Post / Report Modal ──────────────────────────────────────────

function PostModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLostItemPayload) => Promise<void>;
  isSubmitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LostFoundCategory>('Electronics');
  const [building, setBuilding] = useState('Academic Block 1');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(CAMPUS_CENTER.latitude);
  const [longitude, setLongitude] = useState<number | null>(CAMPUS_CENTER.longitude);
  const [isMapOutOfBounds, setIsMapOutOfBounds] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [hasReward, setHasReward] = useState(false);
  const [rewardText, setRewardText] = useState('');
  const [custody, setCustody] = useState('With Me');
  const [secretQuestion, setSecretQuestion] = useState('');

  const reset = () => {
    setTitle(''); setDescription(''); setCategory('Electronics');
    setBuilding('Academic Block 1'); setLocation(''); setContact('');
    setImageUri(null); setLatitude(CAMPUS_CENTER.latitude); setLongitude(CAMPUS_CENTER.longitude);
    setIsMapOutOfBounds(false); setIsUrgent(false); setHasReward(false);
    setRewardText(''); setCustody('With Me'); setSecretQuestion('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please provide a title and description.');
      return;
    }
    if (isMapOutOfBounds) {
      Alert.alert('Out of Campus Area', 'The pinned location is outside the 1km college perimeter. Please adjust the pin.');
      return;
    }
    let fullDesc = description.trim();
    if (isUrgent) fullDesc += ' [URGENT]';
    if (hasReward && rewardText.trim()) fullDesc += ` [REWARD: ${rewardText.trim()}]`;
    if (type === 'found' && custody.trim()) fullDesc += ` [CUSTODY: ${custody.trim()}]`;
    if (type === 'found' && secretQuestion.trim()) fullDesc += ` [QUESTION: ${secretQuestion.trim()}]`;
    await onSubmit({
      title: title.trim(), description: fullDesc, category,
      building: building.trim() || undefined,
      location_found: location.trim() || undefined,
      contact_info: contact.trim() || undefined,
      image_url: imageUri || undefined,
      status: type,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    });
    reset();
  };

  const postCategories = CATEGORIES.filter((c) => c !== 'All');
  const canPost = title.trim().length > 0 && description.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.grabHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.modalHeaderBtn}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{type === 'lost' ? 'Report Lost Item' : 'Report Found Item'}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !canPost}
              hitSlop={12}
              style={[styles.modalHeaderBtn, styles.modalPostBtn, !canPost && styles.modalPostBtnDisabled]}
            >
              {isSubmitting
                ? <ActivityIndicator size="small" color="#121212" />
                : <Text style={styles.modalPostBtnText}>Post</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled">
            {/* Type switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setType('lost'); }}
                style={[styles.typeBtn, type === 'lost' && styles.typeBtnLostActive]}
              >
                <Ionicons name="help-circle" size={15} color={type === 'lost' ? '#121212' : Colors.textMuted} />
                <Text style={[styles.typeBtnText, type === 'lost' && styles.typeBtnTextActive]}>I Lost Something</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { hapticLight(); setType('found'); }}
                style={[styles.typeBtn, type === 'found' && styles.typeBtnFoundActive]}
              >
                <Ionicons name="checkmark-circle" size={15} color={type === 'found' ? '#121212' : Colors.textMuted} />
                <Text style={[styles.typeBtnText, type === 'found' && styles.typeBtnTextActive]}>I Found Something</Text>
              </TouchableOpacity>
            </View>

            {/* Photo */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Photo (Recommended)</Text>
              <ChatGPTAttachmentPicker imageUri={imageUri} onImageSelected={setImageUri} />
            </View>

            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Item Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder={type === 'lost' ? 'e.g. Blue Dell laptop charger' : 'e.g. Set of 3 keys with black lanyard'}
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={type === 'lost'
                  ? 'Describe colour, brand, stickers, distinguishing features...'
                  : 'Describe where you found it, condition, any notes...'}
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={600}
              />
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {postCategories.map((cat) => {
                  const m = getCategoryMeta(cat);
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[styles.modalCategoryChip, active && { backgroundColor: m.bg, borderColor: m.color }]}
                    >
                      <Ionicons name={m.icon as any} size={13} color={active ? m.color : Colors.textMuted} />
                      <Text style={[styles.modalCategoryChipText, active && { color: m.color }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Map location picker */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{type === 'lost' ? 'Where was it lost?' : 'Location Found'}</Text>
                <View style={styles.mapBadge}>
                  <Ionicons name="map-outline" size={10} color={Colors.textSecondary} />
                  <Text style={styles.mapBadgeText}>OSM · 1km guardrail</Text>
                </View>
              </View>
              <CampusMapPicker
                initialLat={latitude}
                initialLng={longitude}
                initialBuilding={building}
                onLocationSelect={(data) => {
                  setLatitude(data.latitude);
                  setLongitude(data.longitude);
                  setIsMapOutOfBounds(data.isOutOfBounds);
                  if (data.building) setBuilding(data.building);
                  if (data.address) setLocation(data.address);
                }}
              />
            </View>

            {/* Room / floor details */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Room / Floor Details (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 2nd floor LH-201, near water cooler"
                placeholderTextColor={Colors.textMuted}
                value={location}
                onChangeText={setLocation}
                maxLength={120}
              />
            </View>

            {/* Found: Custody */}
            {type === 'found' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Where is the item right now?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CUSTODY_LOCATIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCustody(c)}
                      style={[styles.modalCategoryChip, custody === c && { backgroundColor: Colors.surfaceElevated, borderColor: Colors.text }]}
                    >
                      <Text style={[styles.modalCategoryChipText, custody === c && { color: Colors.text }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Found: Secret question */}
            {type === 'found' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ownership Verification Question (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. What colour is the laptop case inside?"
                  placeholderTextColor={Colors.textMuted}
                  value={secretQuestion}
                  onChangeText={setSecretQuestion}
                  maxLength={150}
                />
                <Text style={styles.fieldHint}>Claimants must answer this to retrieve high-value items.</Text>
              </View>
            )}

            {/* Lost: Urgent + Reward */}
            {type === 'lost' && (
              <>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextWrap}>
                    <Text style={styles.toggleLabel}>Mark as Urgent</Text>
                    <Text style={styles.toggleSub}>For IDs, hall tickets, keys, or wallets</Text>
                  </View>
                  <Switch value={isUrgent} onValueChange={setIsUrgent} trackColor={{ false: Colors.border, true: Colors.systemRed }} />
                </View>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextWrap}>
                    <Text style={styles.toggleLabel}>Offer Reward</Text>
                    <Text style={styles.toggleSub}>Specify a reward for the finder</Text>
                  </View>
                  <Switch value={hasReward} onValueChange={setHasReward} trackColor={{ false: Colors.border, true: Colors.systemYellow }} />
                </View>
                {hasReward && (
                  <View style={styles.fieldGroup}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. ₹500 or Treat at Cafeteria"
                      placeholderTextColor={Colors.textMuted}
                      value={rewardText}
                      onChangeText={setRewardText}
                      maxLength={60}
                    />
                  </View>
                )}
              </>
            )}

            {/* Contact info */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Contact Details (Phone / WhatsApp)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                value={contact}
                onChangeText={setContact}
                maxLength={100}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────

function EditModal({
  visible,
  item,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  item: LostItem | null;
  onClose: () => void;
  onSubmit: (id: string, payload: UpdateLostItemPayload) => Promise<void>;
  isSubmitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [building, setBuilding] = useState(item?.building || '');
  const [location, setLocation] = useState(item?.location_found || '');
  const [contact, setContact] = useState(item?.contact_info || '');
  const [latitude, setLatitude] = useState<number | null>(item?.latitude ?? CAMPUS_CENTER.latitude);
  const [longitude, setLongitude] = useState<number | null>(item?.longitude ?? CAMPUS_CENTER.longitude);
  const [isMapOutOfBounds, setIsMapOutOfBounds] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title); setDescription(item.description);
      setBuilding(item.building || ''); setLocation(item.location_found || '');
      setContact(item.contact_info || '');
      setLatitude(item.latitude ?? CAMPUS_CENTER.latitude);
      setLongitude(item.longitude ?? CAMPUS_CENTER.longitude);
      setIsMapOutOfBounds(false);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) return;
    if (isMapOutOfBounds) {
      Alert.alert('Out of Campus Area', 'Please move the pin within the 1km college perimeter before saving.');
      return;
    }
    await onSubmit(item.id, {
      title: title.trim(), description: description.trim(),
      building: building.trim() || undefined,
      location_found: location.trim() || undefined,
      contact_info: contact.trim() || undefined,
      latitude: latitude ?? undefined, longitude: longitude ?? undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.grabHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.modalHeaderBtn}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Post</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting || !title.trim() || !description.trim()}
              hitSlop={12}
              style={[styles.modalHeaderBtn, styles.modalPostBtn, (!title.trim() || !description.trim()) && styles.modalPostBtnDisabled]}
            >
              {isSubmitting
                ? <ActivityIndicator size="small" color="#121212" />
                : <Text style={styles.modalPostBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput style={styles.textInput} value={title} onChangeText={setTitle} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Campus Location</Text>
                <View style={styles.mapBadge}>
                  <Ionicons name="map-outline" size={10} color={Colors.textSecondary} />
                  <Text style={styles.mapBadgeText}>OSM · 1km guardrail</Text>
                </View>
              </View>
              <CampusMapPicker
                initialLat={latitude}
                initialLng={longitude}
                initialBuilding={building}
                onLocationSelect={(data) => {
                  setLatitude(data.latitude); setLongitude(data.longitude);
                  setIsMapOutOfBounds(data.isOutOfBounds);
                  if (data.building) setBuilding(data.building);
                  if (data.address) setLocation(data.address);
                }}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Room / Spot Details</Text>
              <TextInput style={styles.textInput} value={location} onChangeText={setLocation} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Contact Info</Text>
              <TextInput style={styles.textInput} value={contact} onChangeText={setContact} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────

export default function LostFoundScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s: AuthStore) => s.user);

  const {
    items, isLoading, isSubmitting, error,
    selectedCategory, activeTab, searchQuery,
    loadItems, refresh, postItem, editItem, markFound, removeItem,
    setCategory, setActiveTab, setSearchQuery, clearError,
  } = useLostFoundStore();

  const [isPostModalVisible, setPostModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<LostItem | null>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { loadItems(); }, []);
  useEffect(() => {
    if (error) Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
  }, [error]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadItems(), 350);
  }, [setSearchQuery, loadItems]);

  const handlePostSubmit = async (payload: CreateLostItemPayload) => {
    try { await postItem(payload); hapticSuccess(); setPostModalVisible(false); } catch {}
  };
  const handleEditSubmit = async (id: string, payload: UpdateLostItemPayload) => {
    try { await editItem(id, payload); hapticSuccess(); setEditModalVisible(false); } catch {}
  };
  const handleMarkFound = (id: string) => {
    Alert.alert('Mark as Resolved?', 'This will remove the item from the board.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: async () => {
        try { hapticSuccess(); await markFound(id); if (selectedItem?.id === id) setSelectedItem(null); } catch {}
      }},
    ]);
  };
  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { hapticMedium(); await removeItem(id); if (selectedItem?.id === id) setSelectedItem(null); } catch {}
      }},
    ]);
  };

  const currentUserId = user?.id ?? null;

  const filteredItems = useMemo(() => items.filter((item) => {
    if (activeTab === 'lost') return item.status !== 'found';
    if (activeTab === 'found') return item.status === 'found';
    if (activeTab === 'my_posts') return currentUserId && item.poster_id === currentUserId;
    return true;
  }), [items, activeTab, currentUserId]);

  const lostCount   = useMemo(() => items.filter((i) => i.status !== 'found').length, [items]);
  const foundCount  = useMemo(() => items.filter((i) => i.status === 'found').length, [items]);
  const myCount     = useMemo(() => (currentUserId ? items.filter((i) => i.poster_id === currentUserId).length : 0), [items, currentUserId]);

  const potentialMatches = useMemo(() => {
    let n = 0;
    const lost = items.filter((i) => i.status !== 'found');
    const found = items.filter((i) => i.status === 'found');
    for (const l of lost) {
      for (const f of found) {
        if (l.category === f.category && (l.building && f.building ? l.building === f.building : true)) { n++; break; }
      }
    }
    return n;
  }, [items]);

  const renderItem = useCallback(
    ({ item, index }: { item: LostItem; index: number }) => (
      <ItemCard
        item={item}
        currentUserId={currentUserId}
        onPress={() => setSelectedItem(item)}
        onMarkFound={handleMarkFound}
        onEdit={(it) => { setItemToEdit(it); setEditModalVisible(true); }}
        onDelete={handleDeleteItem}
        index={index}
      />
    ),
    [currentUserId],
  );

  const TABS: { key: LostFoundTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',   count: items.length },
    { key: 'lost',     label: 'Lost',  count: lostCount },
    { key: 'found',    label: 'Found', count: foundCount },
    { key: 'my_posts', label: 'Mine',  count: myCount },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Lost & Found</Text>
            <Text style={styles.headerSubtitle}>{items.length} active item{items.length !== 1 ? 's' : ''} on campus</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Search Icon */}
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setSearchModalVisible(true);
              }}
              style={styles.headerActionBtn}
              accessibilityLabel="Search"
            >
              <Ionicons name="search-outline" size={19} color={Colors.text} />
            </TouchableOpacity>

            {/* Filter Icon */}
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setFilterModalVisible(true);
              }}
              style={[
                styles.headerActionBtn,
                (selectedCategory !== 'All' || activeTab !== 'all') && styles.headerActionBtnActive,
              ]}
              accessibilityLabel="Filter"
            >
              <Ionicons
                name={(selectedCategory !== 'All' || activeTab !== 'all') ? 'options' : 'options-outline'}
                size={19}
                color={(selectedCategory !== 'All' || activeTab !== 'all') ? Colors.text : Colors.textSecondary}
              />
              {(selectedCategory !== 'All' || activeTab !== 'all') && <View style={styles.activeFilterDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab segment */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { hapticLight(); setActiveTab(tab.key); }}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {tab.label}{tab.count > 0 ? ` ${tab.count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Active Filter Pill (if any category is active) */}
        {selectedCategory !== 'All' && (
          <View style={styles.activeFilterBar}>
            <View style={styles.activeFilterChip}>
              <Ionicons name="options" size={11} color={Colors.text} />
              <Text style={styles.activeFilterChipText}>{selectedCategory}</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setCategory('All');
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Potential matches banner */}
        {potentialMatches > 0 && activeTab === 'all' && (
          <MotiView
            from={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={styles.matchBanner}
          >
            <Ionicons name="git-compare-outline" size={13} color={Colors.text} />
            <Text style={styles.matchBannerText}>
              {potentialMatches} potential match{potentialMatches > 1 ? 'es' : ''} between lost & found items!
            </Text>
          </MotiView>
        )}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={Colors.textMuted} colors={[Colors.text]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={activeTab === 'lost' ? 'help-buoy-outline' : activeTab === 'found' ? 'checkmark-circle-outline' : activeTab === 'my_posts' ? 'folder-open-outline' : 'search-outline'}
                size={44}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'lost' ? 'No lost items'
                  : activeTab === 'found' ? 'No found items yet'
                  : activeTab === 'my_posts' ? "You haven't posted anything"
                  : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'my_posts'
                  ? 'Tap the + button below to report a lost or found item.'
                  : 'Found or lost something? Tap + to help the community.'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => { hapticLight(); setPostModalVisible(true); }}
        activeOpacity={Opacity.pressed}
        style={[styles.fab, { bottom: 16 }]}
      >
        <Ionicons name="add" size={22} color="#121212" />
        <Text style={styles.fabText}>Post Item</Text>
      </TouchableOpacity>

      {/* ── Modals ── */}
      <PostModal
        visible={isPostModalVisible}
        onClose={() => setPostModalVisible(false)}
        onSubmit={handlePostSubmit}
        isSubmitting={isSubmitting}
      />
      {isEditModalVisible && itemToEdit && (
        <EditModal
          visible={isEditModalVisible}
          item={itemToEdit}
          onClose={() => { setEditModalVisible(false); setItemToEdit(null); }}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      {selectedItem && (
        <ItemDetailModal
          visible={selectedItem !== null}
          item={selectedItem}
          currentUserId={currentUserId}
          onClose={() => setSelectedItem(null)}
          onMarkFound={handleMarkFound}
          onEdit={(it) => { setSelectedItem(null); setItemToEdit(it); setEditModalVisible(true); }}
          onDelete={handleDeleteItem}
        />
      )}

      <LostFoundFilterModal
        visible={isFilterModalVisible}
        activeTab={activeTab}
        activeCategory={selectedCategory}
        onClose={() => setFilterModalVisible(false)}
        onApply={(tab, cat) => {
          setActiveTab(tab);
          setCategory(cat);
        }}
      />

      <LostFoundSearchModal
        visible={isSearchModalVisible}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        items={items}
        onSelectItem={(item) => setSelectedItem(item)}
        onClose={() => setSearchModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──
  header: {
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  headerSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: Spacing[2] },
  headerActionBtn: {
    width: 36, height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    position: 'relative',
  },
  headerActionBtnActive: {
    borderColor: Colors.textSecondary,
  },
  activeFilterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text,
  },
  activeFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[2],
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterChipText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },

  // Search bar
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[3],
    height: 36,
    gap: Spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: Typography.size.sm, paddingVertical: 0 },

  // Tab segment
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 3,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: Radius.md },
  tabBtnActive: { backgroundColor: Colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.borderMuted },
  tabBtnText: { fontSize: 12, color: Colors.textMuted, fontWeight: Typography.weight.medium },
  tabBtnTextActive: { color: Colors.text, fontWeight: Typography.weight.bold },

  // Category row
  categoryRow: { paddingHorizontal: Spacing[4], gap: Spacing[1.5], paddingBottom: Spacing[1] },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillText: { fontSize: 12, color: Colors.textMuted },
  catPillActive: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  catPillTextActive: {
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },

  // Match banner
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: Radius.md,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.28)',
  },
  matchBannerText: { fontSize: 12, color: '#FFD700', fontWeight: Typography.weight.medium, flex: 1 },

  // ── Item Card ──
  listContent: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3], gap: Spacing[3] },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[3],
    ...Shadows.sm,
  },
  cardHero: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  cardHeroImg: { width: '100%', height: '100%' },
  /* Compact header strip for no-image cards */
  cardNoImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
  },
  cardNoImageIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPillFound: {
    backgroundColor: 'rgba(52, 199, 89, 0.16)',
    borderColor: 'rgba(52, 199, 89, 0.32)',
  },
  statusPillLost: {
    backgroundColor: 'rgba(255, 149, 0, 0.16)',
    borderColor: 'rgba(255, 149, 0, 0.32)',
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillDotFound: {
    backgroundColor: Colors.systemGreen,
  },
  statusPillDotLost: {
    backgroundColor: Colors.systemOrange,
  },
  statusPillTxt: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
  },
  statusPillTxtFound: {
    color: Colors.systemGreen,
  },
  statusPillTxtLost: {
    color: Colors.systemOrange,
  },
  cardHeroPlaceholder: {
    width: '100%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Status pill (on image overlay)
  statusOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusOverlayLost: {
    backgroundColor: 'rgba(255, 149, 0, 0.92)',
    borderColor: 'rgba(255, 149, 0, 1)',
  },
  statusOverlayFound: {
    backgroundColor: 'rgba(52, 199, 89, 0.92)',
    borderColor: 'rgba(52, 199, 89, 1)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  statusOverlayTxt: { fontSize: 10, fontWeight: Typography.weight.bold, letterSpacing: 0.4, color: Colors.white },
  catOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // Card body
  cardBody: { padding: 12, gap: Spacing[1] },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 13, fontWeight: Typography.weight.bold, color: Colors.white },
  posterMeta: { flex: 1, gap: 2 },
  posterNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1 },
  posterName: { fontSize: 12, fontWeight: Typography.weight.semibold, color: Colors.text },
  youBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
  },
  youBadgeText: { fontSize: 9, fontWeight: Typography.weight.bold, color: Colors.textSecondary },
  posterTime: { fontSize: 11, color: Colors.textMuted },

  cardTitle: { fontSize: 15, fontWeight: Typography.weight.bold, color: Colors.text, letterSpacing: -0.2, marginTop: 2 },
  urgentTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: Radius.full,
  },
  urgentTagText: { fontSize: 9, fontWeight: Typography.weight.bold, color: Colors.systemRed },
  rewardTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.35)',
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: Radius.full,
  },
  rewardTagText: { fontSize: 9, fontWeight: Typography.weight.bold, color: Colors.systemYellow },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 1 },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationChipText: { fontSize: 11, color: Colors.textMuted },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactBtnText: { fontSize: 12, fontWeight: Typography.weight.semibold, color: Colors.text },
  ownerBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ownerEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  ownerEditText: { fontSize: 12, color: Colors.text, fontWeight: Typography.weight.semibold },
  ownerResolveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.systemGreen,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
  },
  ownerResolveText: { fontSize: 12, color: Colors.white, fontWeight: Typography.weight.semibold },
  cardRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  shareIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Detail Modal ──
  detailOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  detailSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    minHeight: '55%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  grabHandle: {
    width: 40, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailHeaderClose: { fontSize: Typography.size.sm, color: Colors.textMuted, fontWeight: Typography.weight.medium },
  detailHeaderTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text },
  detailShareBtn: { padding: 4 },

  detailScroll: { flex: 1 },
  detailScrollContent: { paddingBottom: Spacing[10], gap: 0 },

  // Hero image in detail
  detailHeroWrap: {
    width: '100%', height: 240,
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  detailHero: { width: '100%', height: '100%' },
  detailHeroTapHint: {
    position: 'absolute',
    bottom: 12, left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  detailHeroTapHintText: { fontSize: 11, color: Colors.white, fontWeight: Typography.weight.medium },
  detailHeroPlaceholder: {
    width: '100%', height: 140,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },

  // Badges in detail
  detailBadgesRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 8, paddingHorizontal: Spacing[4], paddingTop: Spacing[3],
  },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm,
    borderWidth: 1,
  },
  catBadgeText: { fontSize: 11, fontWeight: Typography.weight.bold },
  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm,
  },
  urgentBadgeText: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.systemRed },
  rewardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.35)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm,
  },
  rewardBadgeText: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.systemYellow },

  // Title & time
  detailTitle: {
    fontSize: 22, fontWeight: Typography.weight.bold,
    color: Colors.text, letterSpacing: -0.3,
    paddingHorizontal: Spacing[4], paddingTop: Spacing[2],
  },
  detailTime: { fontSize: 12, color: Colors.textMuted, paddingHorizontal: Spacing[4], marginTop: 2, marginBottom: Spacing[1] },

  // Section grouping
  detailSection: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3.5], gap: Spacing[2] },
  sectionLabel: {
    fontSize: 11, fontWeight: Typography.weight.bold,
    color: Colors.textMuted, letterSpacing: 0.9,
  },
  detailDesc: { fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 21 },

  // Location box (text-only fallback)
  locationBox: {
    paddingHorizontal: Spacing[4], paddingTop: Spacing[3.5],
    gap: Spacing[2],
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationRowText: { fontSize: Typography.size.sm, color: Colors.textSecondary, flex: 1 },

  // Verification box
  verificationBox: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3.5],
    backgroundColor: 'rgba(255,204,0,0.08)',
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.25)',
    gap: Spacing[2],
  },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  verificationTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.systemYellow },
  verificationSub: { fontSize: 12, color: Colors.textMuted },
  verificationQ: { fontSize: Typography.size.sm, color: Colors.text, fontWeight: Typography.weight.medium, fontStyle: 'italic' },

  // Poster card in detail
  posterCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: Spacing[4], marginTop: Spacing[3.5],
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing[3.5],
    borderWidth: 1, borderColor: Colors.border,
  },
  posterCardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  posterCardAvatarText: { fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.white },
  posterCardMeta: { flex: 1, gap: 2 },
  posterCardName: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text },
  posterCardSub: { fontSize: 12, color: Colors.textMuted },
  posterEmailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  posterEmailText: { fontSize: 12, color: Colors.textSecondary, fontWeight: Typography.weight.medium },

  // Contact section (non-owner)
  contactSection: {
    paddingHorizontal: Spacing[4], paddingTop: Spacing[3.5], gap: Spacing[3],
  },
  contactBtnRow: { flexDirection: 'row', gap: 8 },
  contactActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: Radius.lg,
  },
  contactActionText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.white },
  safeHandoverNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius.md, padding: Spacing[3],
    borderWidth: 1, borderColor: Colors.border,
  },
  safeHandoverText: { fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 17 },

  // Owner management section
  ownerSection: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3.5], gap: Spacing[1.5] },
  ownerActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing[3.5],
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  ownerActionRowMid: {
    borderRadius: 0,
    borderTopWidth: 0,
  },
  ownerActionRowBottom: {
    borderRadius: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  ownerActionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(52,199,89,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  ownerActionText: { flex: 1, gap: 2 },
  ownerActionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text },
  ownerActionSub: { fontSize: 12, color: Colors.textMuted },

  // ── Modals (Post / Edit) ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    height: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  modalHeaderBtn: { paddingVertical: 5, paddingHorizontal: 2, minWidth: 50 },
  modalCancel: { fontSize: Typography.size.sm, color: Colors.textMuted, fontWeight: Typography.weight.medium },
  modalTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text },
  modalPostBtn: {
    backgroundColor: Colors.text,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, alignItems: 'center',
  },
  modalPostBtnDisabled: { backgroundColor: Colors.surfaceElevated },
  modalPostBtnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.background },

  modalBody: { flex: 1 },
  modalBodyContent: { padding: Spacing[4], gap: 0, paddingBottom: Spacing[10] },

  // Type switcher in PostModal
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 3,
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 3,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md,
  },
  typeBtnLostActive: { backgroundColor: Colors.accent },
  typeBtnFoundActive: { backgroundColor: '#D1D1D6' },
  typeBtnText: { fontSize: Typography.size.sm, color: Colors.textMuted, fontWeight: Typography.weight.medium },
  typeBtnTextActive: { color: '#121212', fontWeight: Typography.weight.bold },

  // Form fields
  fieldGroup: { marginBottom: Spacing[4] },
  fieldLabel: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing[2] },
  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  fieldHint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  mapBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,122,255,0.08)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full,
  },
  mapBadgeText: { fontSize: 10, fontWeight: Typography.weight.semibold, color: Colors.textSecondary },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[3],
    color: Colors.text,
    fontSize: Typography.size.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: { minHeight: 90, paddingTop: Spacing[3] },
  modalCategoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    marginRight: 8,
  },
  modalCategoryChipText: { fontSize: 13, color: Colors.textMuted },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    marginBottom: Spacing[1],
  },
  toggleTextWrap: { flex: 1, paddingRight: Spacing[4] },
  toggleLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text },
  toggleSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 64, paddingHorizontal: 32, gap: Spacing[2],
  },
  emptyTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: Radius.full,
    ...Shadows.md,
  },
  fabText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: '#121212' },
});
