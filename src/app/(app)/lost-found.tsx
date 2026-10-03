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
import { useResponsive } from '@/hooks/useResponsive';
import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useLostFoundStore,
  CATEGORIES,
  type LostFoundCategory,
  type LostFoundTab,
} from '@/store/lostFoundStore';
import {
  fetchLostItemById,
  syncAdminTokenToServer,
  type LostItem,
  type CreateLostItemPayload,
  type UpdateLostItemPayload,
} from '@/services/lostFoundApi';
import { hapticLight, hapticSuccess, hapticMedium } from '@/utils/haptics';
import { CampusMapPicker, CAMPUS_CENTER, CAMPUS_BUILDINGS } from '@/components/lostfound/CampusMapPicker';
import { ChatGPTAttachmentPicker } from '@/components/lostfound/ChatGPTAttachmentPicker';
import { FullScreenImageViewer } from '@/components/lostfound/FullScreenImageViewer';
import { LostFoundFilterModal } from '@/components/lostfound/LostFoundFilterModal';
import { LostFoundSearchModal } from '@/components/lostfound/LostFoundSearchModal';
import { EditModal } from '@/components/lostfound/EditModal';
import {
  getCategoryMeta,
  parseMetadata,
  cleanItemDescription,
  parsePosterDetails,
  timeAgo,
  formatDateTime,
  getHumanizedSubtitle,
  CUSTODY_LOCATIONS,
} from '@/utils/lostFoundHelpers';
import { MarketplaceView } from '@/components/marketplace';

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
  onImagePress,
  onMarkFound,
  onEdit,
  onDelete,
  index,
}: {
  item: LostItem;
  currentUserId: string | null;
  onPress: () => void;
  onImagePress?: (uri: string) => void;
  onMarkFound: (id: string) => void;
  onEdit: (item: LostItem) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const themeMode = usePreferencesStore(s => s.themeMode);
  const meta = getCategoryMeta(item.category, themeMode);
  const isOwner = !!(currentUserId && item.poster_id === currentUserId);
  const isFound = item.status === 'found';
  const { isUrgent, reward, custody, cleanDescription } = parseMetadata(item.description);
  const poster = parsePosterDetails(item);
  const subtitle = getHumanizedSubtitle(item);

  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, damping: 20, stiffness: 350, mass: 0.6 }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200, mass: 0.8 }).start();
  }, [scale]);

  // ── Status color
  const statusColor = isFound ? '#10B981' : '#F97316';
  const statusLabel = isFound ? 'FOUND' : 'LOST';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 260, delay: Math.min(index * 40, 320) }}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={styles.card}
        >
          {/* ── Main Row: Thumbnail + Content ── */}
          <View style={styles.cardMainRow}>
            {/* Thumbnail */}
            {item.image_url ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  if (onImagePress) onImagePress(item.image_url!);
                  else onPress();
                }}
                style={styles.cardThumbWrap}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.cardThumbImg}
                  resizeMode="cover"
                />
              </Pressable>
            ) : (
              <View style={[styles.cardThumbPlaceholder, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={26} color={meta.color} style={{ opacity: 0.7 }} />
              </View>
            )}

            {/* Text Content */}
            <View style={styles.cardTextCol}>
              {/* Status + Category inline */}
              <View style={styles.cardMetaRow}>
                <View style={styles.cardStatusLabel}>
                  <View style={[styles.cardStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.cardStatusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                <Text style={styles.cardCategoryLabel}>{item.category || 'Other'}</Text>
              </View>

              {/* Title */}
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>

              {/* Subtitle: location + time */}
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>

              {/* Description */}
              {cleanDescription ? (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {cleanDescription}
                </Text>
              ) : null}

              {/* Inline Badges (Urgent / Reward) */}
              {(isUrgent || reward) && (
                <View style={styles.cardInlineBadges}>
                  {isUrgent && (
                    <View style={styles.cardUrgentChip}>
                      <Ionicons name="flash" size={9} color="#FF3B30" />
                      <Text style={styles.cardUrgentChipText}>Urgent</Text>
                    </View>
                  )}
                  {reward && (
                    <View style={styles.cardRewardChip}>
                      <Ionicons name="gift-outline" size={9} color="#F59E0B" />
                      <Text style={styles.cardRewardChipText}>Reward</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.cardFooter}>
            {/* Poster */}
            <View style={styles.cardFooterLeft}>
              {item.poster_avatar ? (
                <Image source={{ uri: item.poster_avatar }} style={styles.cardFooterAvatar} />
              ) : (
                <View style={[styles.cardFooterAvatarFallback, { backgroundColor: poster.avatarColor }]}>
                  <Text style={styles.cardFooterAvatarText}>{poster.initials}</Text>
                </View>
              )}
              <Text style={styles.cardFooterName} numberOfLines={1}>{poster.displayName}</Text>
              {isOwner && (
                <View style={styles.cardYouChip}>
                  <Text style={styles.cardYouChipText}>You</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.cardFooterRight}>
              {isOwner ? (
                <>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onEdit(item); }}
                    hitSlop={6}
                    activeOpacity={0.6}
                    style={styles.cardFooterIconBtn}
                  >
                    <Ionicons name="create-outline" size={15} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onMarkFound(item.id); }}
                    hitSlop={6}
                    activeOpacity={0.6}
                    style={styles.cardFooterIconBtn}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color={Colors.systemGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    hitSlop={6}
                    activeOpacity={0.6}
                    style={styles.cardFooterIconBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color={Colors.systemRed} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.cardViewRow}>
                  <Text style={styles.cardViewText}>View</Text>
                  <Ionicons name="arrow-forward" size={13} color={Colors.textMuted} />
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </MotiView>
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
  const { modalSheetStyles } = useResponsive();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, modalSheetStyles.overlay]}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalSheet, modalSheetStyles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
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

// ─── Main Screen ──────────────────────────────────────────────────

export default function LostFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s: AuthStore) => s.user);
  const { isTablet, width: screenWidth, maxContentWidth } = useResponsive();
  const params = useLocalSearchParams<{ itemId?: string }>();

  const {
    items, isLoading, isSubmitting, error,
    selectedCategory, activeTab, searchQuery,
    loadItems, refresh, postItem, editItem, markFound, removeItem,
    setCategory, setActiveTab, setSearchQuery, clearError,
    syncFromEmail, isEmailSyncing, lastEmailSyncResult, clearEmailSyncResult,
  } = useLostFoundStore();

  const [hubMode, setHubMode] = useState<'lost_found' | 'marketplace'>('lost_found');
  const [isPostModalVisible, setPostModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<LostItem | null>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);
  const [emailImportBanner, setEmailImportBanner] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadItems();
    // Silently sync Lost & Found emails from local cache and Gmail
    syncFromEmail();
  }, []);

  // Sync Google access token to backend for server-side background sync
  useEffect(() => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      syncAdminTokenToServer(tokens.accessToken, null, tokens.expiresAt);
    }
  }, [user]);

  // Handle deep-link opening of specific item detail (e.g. from match notification)
  useEffect(() => {
    if (!params.itemId) return;
    router.push(`/(app)/lost-found-detail?id=${params.itemId}&from=lost-found` as any);
  }, [params.itemId]);

  useEffect(() => {
    if (error) Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
  }, [error]);

  // Show import banner when emails are imported
  useEffect(() => {
    if (lastEmailSyncResult && lastEmailSyncResult.imported > 0) {
      const count = lastEmailSyncResult.imported;
      setEmailImportBanner(`📧 Imported ${count} item${count !== 1 ? 's' : ''} from email`);
      clearEmailSyncResult();
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setEmailImportBanner(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastEmailSyncResult]);

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
        try { hapticSuccess(); await markFound(id); } catch {}
      }},
    ]);
  };
  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { hapticMedium(); await removeItem(id); } catch {}
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
        onPress={() => router.push(`/(app)/lost-found-detail?id=${item.id}&from=lost-found` as any)}
        onImagePress={(uri) => setFullscreenImageUri(uri)}
        onMarkFound={handleMarkFound}
        onEdit={(it) => { setItemToEdit(it); setEditModalVisible(true); }}
        onDelete={handleDeleteItem}
        index={index}
      />
    ),
    [currentUserId, router],
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
      <ResponsiveContainer maxWidth={840}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>
                {hubMode === 'lost_found' ? 'Lost & Found' : 'Campus Marketplace'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {hubMode === 'lost_found'
                  ? `${items.length} active item${items.length !== 1 ? 's' : ''} on campus`
                  : 'Peer-to-peer buy & sell • Verified students'}
              </Text>
            </View>

            {hubMode === 'lost_found' && (
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
            )}
          </View>

          {/* Hub Mode Segmenter (Lost & Found vs Campus Marketplace) */}
          <View style={styles.hubSegmentContainer}>
            <Pressable
              style={[styles.hubSegmentBtn, hubMode === 'lost_found' && styles.hubSegmentBtnActive]}
              onPress={() => {
                hapticLight();
                setHubMode('lost_found');
              }}
            >
              <Ionicons
                name={hubMode === 'lost_found' ? 'search' : 'search-outline'}
                size={13}
                color={hubMode === 'lost_found' ? '#000000' : Colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.hubSegmentText, hubMode === 'lost_found' && styles.hubSegmentTextActive]}>
                Lost & Found
              </Text>
            </Pressable>

            <Pressable
              style={[styles.hubSegmentBtn, hubMode === 'marketplace' && styles.hubSegmentBtnActive]}
              onPress={() => {
                hapticLight();
                setHubMode('marketplace');
              }}
            >
              <Ionicons
                name={hubMode === 'marketplace' ? 'bag-handle' : 'bag-handle-outline'}
                size={13}
                color={hubMode === 'marketplace' ? '#000000' : Colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.hubSegmentText, hubMode === 'marketplace' && styles.hubSegmentTextActive]}>
                Marketplace
              </Text>
              <View style={styles.hubMarketplaceBadge}>
                <Text style={styles.hubMarketplaceBadgeText}>CAMPUS</Text>
              </View>
            </Pressable>
          </View>

          {hubMode === 'lost_found' && (
            <>
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

              {/* Email import banner */}
              {emailImportBanner && (
                <MotiView
                  from={{ opacity: 0, translateY: -10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -10 }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={styles.emailImportBanner}
                >
                  <Text style={styles.emailImportBannerText}>{emailImportBanner}</Text>
                  <TouchableOpacity onPress={() => setEmailImportBanner(null)} hitSlop={8}>
                    <Ionicons name="close" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                </MotiView>
              )}

              {/* Email syncing indicator */}
              {isEmailSyncing && (
                <View style={styles.emailSyncIndicator}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                  <Text style={styles.emailSyncText}>Syncing emails...</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ResponsiveContainer>

      {/* ── Main Feed Body ── */}
      {hubMode === 'marketplace' ? (
        <MarketplaceView />
      ) : (
        <>
          {/* ── List ── */}
          <FlatList
            key={isTablet ? 'tablet-grid-2' : 'phone-list-1'}
            numColumns={isTablet ? 2 : 1}
            columnWrapperStyle={isTablet ? { gap: Spacing[3], paddingHorizontal: Spacing[4] } : undefined}
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: isTablet ? 120 : 80,
                maxWidth: 840,
                width: '100%',
                alignSelf: 'center',
              },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => { refresh(); syncFromEmail(); }} tintColor={Colors.textMuted} colors={[Colors.text]} />
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
            style={[
              styles.fab,
              isTablet
                ? {
                    bottom: Math.max(insets.bottom, 16) + 72,
                    right: Math.max(24, (screenWidth - 840) / 2 + 24),
                  }
                : { bottom: 16 },
            ]}
          >
            <Ionicons name="add" size={22} color="#121212" />
            <Text style={styles.fabText}>Post Item</Text>
          </TouchableOpacity>
        </>
      )}

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
        onSelectItem={(item) => {
          setSearchModalVisible(false);
          router.push(`/(app)/lost-found-detail?id=${item.id}&from=lost-found` as any);
        }}
        onClose={() => setSearchModalVisible(false)}
      />

      <FullScreenImageViewer
        visible={!!fullscreenImageUri}
        imageUri={fullscreenImageUri || ''}
        onClose={() => setFullscreenImageUri(null)}
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
  hubSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 3,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[1],
    marginBottom: Spacing[2.5],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hubSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  hubSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  hubSegmentText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  hubSegmentTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  hubMarketplaceBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    marginLeft: 6,
  },
  hubMarketplaceBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
    letterSpacing: 0.5,
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

  // Email import banner
  emailImportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: Radius.md,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  emailImportBannerText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: Typography.weight.medium,
    flex: 1,
    marginRight: 8,
  },
  emailSyncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    marginHorizontal: Spacing[4],
  },
  emailSyncText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },

  // ── Item Card (Compact Horizontal Layout) ──
  listContent: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3], gap: 0 },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },

  // ── Main row: thumbnail + text side-by-side ──
  cardMainRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },

  // ── Thumbnail ──
  cardThumbWrap: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  cardThumbImg: {
    width: 76,
    height: 76,
  },
  cardThumbShield: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Text column ──
  cardTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  cardStatusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardStatusText: {
    fontSize: 10.5,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  cardCategoryLabel: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  cardDesc: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 1,
  },
  cardInlineBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  cardUrgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  cardUrgentChipText: {
    fontSize: 9.5,
    fontWeight: Typography.weight.bold,
    color: '#FF3B30',
  },
  cardRewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  cardRewardChipText: {
    fontSize: 9.5,
    fontWeight: Typography.weight.bold,
    color: '#F59E0B',
  },

  // ── Footer ──
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    marginRight: 8,
  },
  cardFooterAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardFooterAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterAvatarText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  cardFooterName: {
    fontSize: 11.5,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  cardYouChip: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardYouChipText: {
    fontSize: 8.5,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooterIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardViewText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  ownerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownerEditText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  ownerResolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.systemGreen,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: Radius.full,
  },
  ownerResolveText: {
    fontSize: 11,
    color: '#121212',
    fontWeight: Typography.weight.bold,
  },
  deleteIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Detail Modal status overlay
  statusOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
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
