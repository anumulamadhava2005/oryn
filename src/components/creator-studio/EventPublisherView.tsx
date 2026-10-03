import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import { showAlert } from '@/store/alertStore';
import { DateTimePickerModal } from '@/components/common/DateTimePickerModal';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import type { Club } from '@/types/events';
import { getRelativeDayLabel, type EventSessionItem } from './types';

interface EventPublisherViewProps {
  currentClub: Club | undefined;
  defaultOrgId: string;
  selectedOrgId: string;
  onPublishSuccess: () => void;
}

export function EventPublisherView({
  currentClub,
  defaultOrgId,
  selectedOrgId,
  onPublishSuccess,
}: EventPublisherViewProps) {
  const isSubmitting = useEventsStore((s) => s.isSubmitting);
  const publishEvent = useEventsStore((s) => s.publishEvent);

  const [eventTitle, setEventTitle] = useState('');
  const [eventSummary, setEventSummary] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState<Date>(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [eventEndDate, setEventEndDate] = useState<Date | null>(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setHours(13, 0, 0, 0);
    return d;
  });
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [eventPoster, setEventPoster] = useState('');
  const [isPickingPoster, setIsPickingPoster] = useState(false);
  const [showPosterUrlInput, setShowPosterUrlInput] = useState(false);
  const [eventLocation, setEventLocation] = useState('');
  const [eventBuilding, setEventBuilding] = useState('');
  const [eventRoom, setEventRoom] = useState('');
  const [eventTags, setEventTags] = useState('');
  const [sessions, setSessions] = useState<EventSessionItem[]>([
    { id: '1', title: 'Check-In & Inauguration', time: '10:00 AM' },
    { id: '2', title: 'Main Phase & Mentorship', time: '01:00 PM' },
    { id: '3', title: 'Final Pitch & Awards', time: '05:00 PM' },
  ]);

  const addSession = () => {
    hapticLight();
    setSessions([
      ...sessions,
      { id: String(Date.now()), title: `Session ${sessions.length + 1}`, time: 'TBA' },
    ]);
  };

  const removeSession = (id: string) => {
    if (sessions.length > 1) {
      hapticLight();
      setSessions(sessions.filter((s) => s.id !== id));
    }
  };

  const updateSession = (id: string, field: 'title' | 'time', val: string) => {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  const handlePickPosterGallery = async () => {
    hapticLight();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Access Required',
          'Please grant access to your photo library to select an event poster.'
        );
        return;
      }

      setIsPickingPoster(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.75,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const finalUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setEventPoster(finalUri);
        hapticSuccess();
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not pick image from gallery.');
    } finally {
      setIsPickingPoster(false);
    }
  };

  const handlePickPosterCamera = async () => {
    hapticLight();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Access Required',
          'Please grant camera access to take a photo for the event poster.'
        );
        return;
      }

      setIsPickingPoster(true);
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.75,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const finalUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setEventPoster(finalUri);
        hapticSuccess();
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not capture photo.');
    } finally {
      setIsPickingPoster(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventDesc.trim()) {
      showAlert({
        title: 'Missing Info',
        message: 'Event title and description are required.',
        type: 'warning',
      });
      return;
    }

    try {
      const parsedTags = eventTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const validSessions = sessions.filter((s) => s.title.trim());
      const scheduleBlock =
        validSessions.length > 0
          ? `\n\n### Schedule\n${validSessions.map((s) => `• ${s.time}: ${s.title}`).join('\n')}`
          : '';

      await publishEvent({
        organization_id: selectedOrgId || defaultOrgId,
        title: eventTitle.trim(),
        summary: eventSummary.trim() || eventTitle.trim(),
        description: `${eventDesc.trim()}${scheduleBlock}`,
        poster_url: eventPoster.trim() || undefined,
        location: eventLocation.trim(),
        building: eventBuilding.trim(),
        room_number: eventRoom.trim(),
        event_time: eventDate.toISOString(),
        event_end_time: eventEndDate ? eventEndDate.toISOString() : undefined,
        tags: parsedTags,
        priority: 'Community',
        is_featured: false,
      });

      hapticSuccess();
      showAlert({
        title: 'Event Published!',
        message: 'Your event is now live on Campus Events.',
        type: 'success',
      });
      setEventTitle('');
      setEventSummary('');
      setEventDesc('');
      setEventPoster('');
      setEventLocation('');
      setEventBuilding('');
      setEventRoom('');
      setEventTags('');
      onPublishSuccess();
    } catch (err: any) {
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to publish event.',
        type: 'destructive',
      });
    }
  };

  return (
    <View style={styles.drillDownWrap}>
      <View style={styles.formCard}>
        <Text style={styles.cardHeader}>Publish Campus Activity</Text>
        <Text style={styles.inputSub}>
          Published directly to the campus Events feed under {currentClub?.name || 'your club'}.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. AI Hackathon 2026"
            placeholderTextColor={Colors.textMuted}
            value={eventTitle}
            onChangeText={setEventTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Brief Tagline / Summary</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 24-hour campus hackathon with cash prizes"
            placeholderTextColor={Colors.textMuted}
            value={eventSummary}
            onChangeText={setEventSummary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide complete event details, prerequisites, and registration instructions..."
            placeholderTextColor={Colors.textMuted}
            value={eventDesc}
            onChangeText={setEventDesc}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Event Date & Time Selector */}
        <View style={styles.formGroup}>
          <View style={styles.dateHeaderRow}>
            <Text style={styles.label}>Event Date & Time *</Text>
            <Pressable
              style={styles.changeDateLink}
              onPress={() => {
                hapticLight();
                setShowDatePickerModal(true);
              }}
              hitSlop={8}
            >
              <Ionicons name="calendar-outline" size={13} color={Colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.changeDateLinkText}>Open Calendar Picker</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.dateSelectorCard}
            onPress={() => {
              hapticLight();
              setShowDatePickerModal(true);
            }}
          >
            <View style={styles.dateSelectorLeft}>
              <View style={styles.dateCalendarIconBox}>
                <Ionicons name="calendar" size={20} color="#000000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateFormattedPrimary}>
                  {format(eventDate, 'EEEE, d MMMM yyyy')}
                </Text>
                <View style={styles.dateTimeBadgeRow}>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={12} color={Colors.accent} style={{ marginRight: 4 }} />
                    <Text style={styles.timeBadgeText}>
                      {format(eventDate, 'hh:mm a')}
                      {eventEndDate ? ` – ${format(eventEndDate, 'hh:mm a')}` : ''}
                    </Text>
                  </View>
                  <View style={styles.relativeDayBadge}>
                    <Text style={styles.relativeDayBadgeText}>
                      {getRelativeDayLabel(eventDate)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.dateEditChevron}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          </Pressable>

          {/* Quick Presets */}
          <View style={styles.quickDateChipsRow}>
            <Pressable
              style={styles.quickDateChip}
              onPress={() => {
                hapticLight();
                const d = new Date();
                d.setHours(17, 0, 0, 0);
                setEventDate(d);
                const end = new Date(d);
                end.setHours(20, 0, 0, 0);
                setEventEndDate(end);
              }}
            >
              <Text style={styles.quickDateChipText}>Today 5 PM</Text>
            </Pressable>

            <Pressable
              style={styles.quickDateChip}
              onPress={() => {
                hapticLight();
                const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                d.setHours(10, 0, 0, 0);
                setEventDate(d);
                const end = new Date(d);
                end.setHours(13, 0, 0, 0);
                setEventEndDate(end);
              }}
            >
              <Text style={styles.quickDateChipText}>Tomorrow 10 AM</Text>
            </Pressable>

            <Pressable
              style={styles.quickDateChip}
              onPress={() => {
                hapticLight();
                const d = new Date();
                const dayOfWeek = d.getDay();
                const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
                d.setDate(d.getDate() + daysUntilSaturday);
                d.setHours(18, 0, 0, 0);
                setEventDate(d);
                const end = new Date(d);
                end.setHours(21, 0, 0, 0);
                setEventEndDate(end);
              }}
            >
              <Text style={styles.quickDateChipText}>Saturday 6 PM</Text>
            </Pressable>
          </View>
        </View>

        {/* Poster Image */}
        <View style={styles.formGroup}>
          <View style={styles.posterHeaderRow}>
            <Text style={styles.label}>Event Poster Image</Text>
            {eventPoster ? (
              <Pressable
                style={styles.removePosterLink}
                onPress={() => {
                  hapticLight();
                  setEventPoster('');
                }}
              >
                <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 3 }} />
                <Text style={styles.removePosterText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          {eventPoster ? (
            <View style={styles.posterPreviewCard}>
              <Image source={{ uri: eventPoster }} style={styles.posterPreviewImage} resizeMode="cover" />
              <View style={styles.posterPreviewOverlay}>
                <View style={styles.posterBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.posterBadgeText}>Poster Attached</Text>
                </View>
                <View style={styles.posterPreviewActions}>
                  <Pressable style={styles.posterChangeBtn} onPress={handlePickPosterGallery}>
                    <Ionicons name="images-outline" size={14} color="#000000" style={{ marginRight: 4 }} />
                    <Text style={styles.posterChangeBtnText}>Change</Text>
                  </Pressable>
                  <Pressable style={styles.posterCameraIconBtn} onPress={handlePickPosterCamera}>
                    <Ionicons name="camera-outline" size={14} color={Colors.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.posterPickerDropzone}>
              {isPickingPoster ? (
                <View style={styles.posterLoadingBox}>
                  <ActivityIndicator color={Colors.text} size="small" />
                  <Text style={styles.posterLoadingText}>Loading image...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.posterIconCircle}>
                    <Ionicons name="image-outline" size={24} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.posterDropzoneTitle}>Add an Event Poster</Text>
                  <Text style={styles.posterDropzoneSub}>
                    High-res posters increase registration rates by up to 3x.
                  </Text>

                  <View style={styles.posterActionsRow}>
                    <Pressable style={styles.posterUploadBtnPrimary} onPress={handlePickPosterGallery}>
                      <Ionicons name="images-outline" size={14} color="#000000" style={{ marginRight: 4 }} />
                      <Text style={styles.posterUploadBtnPrimaryText}>Upload Gallery</Text>
                    </Pressable>
                    <Pressable style={styles.posterUploadBtnSecondary} onPress={handlePickPosterCamera}>
                      <Ionicons name="camera-outline" size={14} color={Colors.text} style={{ marginRight: 4 }} />
                      <Text style={styles.posterUploadBtnSecondaryText}>Take Photo</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.urlToggleLink}
                    onPress={() => setShowPosterUrlInput(!showPosterUrlInput)}
                  >
                    <Text style={styles.urlToggleLinkText}>
                      {showPosterUrlInput ? 'Hide URL input' : 'Or enter image web URL'}
                    </Text>
                  </Pressable>

                  {showPosterUrlInput && (
                    <TextInput
                      style={[styles.input, { width: '100%', marginTop: 8 }]}
                      placeholder="https://example.com/poster.jpg"
                      placeholderTextColor={Colors.textMuted}
                      value={eventPoster}
                      onChangeText={setEventPoster}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Location & Room */}
        <View style={styles.twoCol}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Building / Complex</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lecture Hall Complex"
              placeholderTextColor={Colors.textMuted}
              value={eventBuilding}
              onChangeText={setEventBuilding}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Room / Hall</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. H25 / Lab 509"
              placeholderTextColor={Colors.textMuted}
              value={eventRoom}
              onChangeText={setEventRoom}
            />
          </View>
        </View>

        {/* Schedule / Timeline Sessions */}
        <View style={styles.formGroup}>
          <View style={styles.scheduleHeaderRow}>
            <Text style={styles.label}>Program Schedule / Agenda</Text>
            <Pressable style={styles.addSessionBtn} onPress={addSession}>
              <Ionicons name="add-circle-outline" size={15} color={Colors.text} style={{ marginRight: 4 }} />
              <Text style={styles.addSessionText}>Add Slot</Text>
            </Pressable>
          </View>

          {sessions.map((session, index) => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionIndex}>
                <Text style={styles.sessionIndexText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.sessionTitleInput}
                  placeholder="Session title..."
                  placeholderTextColor={Colors.textMuted}
                  value={session.title}
                  onChangeText={(val) => updateSession(session.id, 'title', val)}
                />
                <TextInput
                  style={styles.sessionTimeInput}
                  placeholder="e.g. 10:00 AM"
                  placeholderTextColor={Colors.textMuted}
                  value={session.time}
                  onChangeText={(val) => updateSession(session.id, 'time', val)}
                />
              </View>
              {sessions.length > 1 && (
                <Pressable style={styles.sessionDeleteBtn} onPress={() => removeSession(session.id)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags (Comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Workshop, Hackathon, Coding, AI"
            placeholderTextColor={Colors.textMuted}
            value={eventTags}
            onChangeText={setEventTags}
          />
        </View>

        <Pressable
          style={[styles.primaryActionBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleCreateEvent}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionText}>Publish Campus Activity</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Date & Time Picker Modal */}
      <DateTimePickerModal
        visible={showDatePickerModal}
        initialDate={eventDate}
        initialEndDate={eventEndDate}
        onClose={() => setShowDatePickerModal(false)}
        onConfirm={(start, end) => {
          setEventDate(start);
          setEventEndDate(end || null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  drillDownWrap: {
    gap: Spacing[4],
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  inputSub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: Spacing[3.5],
  },
  formGroup: {
    marginBottom: Spacing[3],
  },
  label: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2.5],
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  changeDateLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeDateLinkText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
  },
  dateSelectorCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing[3],
  },
  dateCalendarIconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFormattedPrimary: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dateTimeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  relativeDayBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  relativeDayBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
  },
  dateEditChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  quickDateChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  quickDateChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickDateChipText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  posterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  removePosterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  removePosterText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: '#EF4444',
  },
  posterPreviewCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    position: 'relative',
    height: 200,
  },
  posterPreviewImage: {
    width: '100%',
    height: '100%',
  },
  posterPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing[3],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  posterBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
  },
  posterPreviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  posterChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  posterChangeBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  posterCameraIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterPickerDropzone: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterLoadingBox: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
  },
  posterLoadingText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  posterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  posterDropzoneTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  posterDropzoneSub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  posterActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  posterUploadBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  posterUploadBtnPrimaryText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  posterUploadBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterUploadBtnSecondaryText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  urlToggleLink: {
    marginTop: 8,
    paddingVertical: 4,
  },
  urlToggleLinkText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: Typography.weight.medium,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSessionText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[2.5],
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  sessionIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionIndexText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  sessionTitleInput: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    paddingVertical: 2,
  },
  sessionTimeInput: {
    fontSize: 11,
    color: Colors.textMuted,
    paddingVertical: 2,
  },
  sessionDeleteBtn: {
    padding: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing[2],
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
