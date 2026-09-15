/**
 * Club Studio Modal — Creation & Analytics center for verified Club Leads.
 * Enables publishing events, live polls, and viewing attendee demographics
 * (branch distribution %, semester breakdown, and student rosters).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import type { DistrictEvent } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { EventScannerModal } from './EventScannerModal';
import { EventAttendeesModal } from './EventAttendeesModal';
import { EventBroadcastModal } from './EventBroadcastModal';

interface ClubStudioModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ClubStudioModal({ visible, onClose }: ClubStudioModalProps) {
  const insets = useSafeAreaInsets();
  const userClubRoles = useEventsStore((s) => s.userClubRoles);
  const events = useEventsStore((s) => s.events);
  const isSuperAdmin = useEventsStore((s) => s.isSuperAdmin);
  const isSubmitting = useEventsStore((s) => s.isSubmitting);
  const publishEvent = useEventsStore((s) => s.publishEvent);
  const publishPoll = useEventsStore((s) => s.publishPoll);
  const demographicsData = useEventsStore((s) => s.demographicsData);
  const isDemographicsLoading = useEventsStore((s) => s.isDemographicsLoading);
  const loadDemographics = useEventsStore((s) => s.loadDemographics);

  const [activeTab, setActiveTab] = useState<'ops' | 'event' | 'poll' | 'demographics'>('ops');

  // Filter club's active events for operations
  const myClubEvents = events.filter(
    (e) => isSuperAdmin || userClubRoles.some((r) => r.organization_id === e.organization_id)
  );

  // Operations Modals State
  const [selectedOpsEvent, setSelectedOpsEvent] = useState<DistrictEvent | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Multi-session schedule builder
  const [sessions, setSessions] = useState([
    { id: '1', title: 'Check-In & Inauguration', time: '10:00 AM' },
    { id: '2', title: 'Main Phase & Mentorship', time: '01:00 PM' },
    { id: '3', title: 'Final Pitch & Awards', time: '05:00 PM' },
  ]);

  const addSession = () => {
    if (sessions.length < 6) {
      setSessions([
        ...sessions,
        { id: String(Date.now()), title: `Session ${sessions.length + 1}`, time: 'TBA' },
      ]);
    }
  };

  const removeSession = (id: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter((s) => s.id !== id));
    }
  };

  const updateSession = (id: string, field: 'title' | 'time', val: string) => {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  // Select target club (default to first club lead has role in)
  const defaultOrgId = userClubRoles[0]?.organization_id || '';
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);

  // Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventSummary, setEventSummary] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventPoster, setEventPoster] = useState('');
  const [isPickingPoster, setIsPickingPoster] = useState(false);
  const [showPosterUrlInput, setShowPosterUrlInput] = useState(false);
  const [eventLocation, setEventLocation] = useState('');
  const [eventBuilding, setEventBuilding] = useState('');
  const [eventRoom, setEventRoom] = useState('');
  const [eventTags, setEventTags] = useState('');

  // Poll Form State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Demographics Selected Event
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Poster Handlers
  const handlePickPosterGallery = async () => {
    hapticLight();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to select an event poster.');
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
        const finalUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEventPoster(finalUri);
        hapticSuccess();
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Failed to select image.');
    } finally {
      setIsPickingPoster(false);
    }
  };

  const handlePickPosterCamera = async () => {
    hapticLight();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
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
        const finalUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEventPoster(finalUri);
        hapticSuccess();
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Failed to capture photo.');
    } finally {
      setIsPickingPoster(false);
    }
  };

  const handleRemovePoster = () => {
    hapticLight();
    setEventPoster('');
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventDesc.trim()) {
      Alert.alert('Missing Info', 'Event title and description are required.');
      return;
    }

    try {
      const parsedTags = eventTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      const validSessions = sessions.filter((s) => s.title.trim());
      const scheduleBlock = validSessions.length > 0
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
        event_time: in2Days.toISOString(),
        tags: parsedTags,
        priority: 'Community',
        is_featured: false,
      });

      Alert.alert('Success!', 'Event created and published to Campus Events.');
      setEventTitle('');
      setEventSummary('');
      setEventDesc('');
      setEventPoster('');
      setEventLocation('');
      setEventBuilding('');
      setEventRoom('');
      setEventTags('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish event.');
    }
  };

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || validOptions.length < 2) {
      Alert.alert('Missing Info', 'Please provide a question and at least 2 options.');
      return;
    }

    try {
      await publishPoll({
        organization_id: selectedOrgId || defaultOrgId,
        question: pollQuestion.trim(),
        options: validOptions,
      });

      Alert.alert('Success!', 'Poll is now live for students to vote on.');
      setPollQuestion('');
      setPollOptions(['', '']);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish poll.');
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (text: string, index: number) => {
    const next = [...pollOptions];
    next[index] = text;
    setPollOptions(next);
  };

  const handleSelectDemographicsEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    loadDemographics(eventId);
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.studioBadge}>
                <Ionicons name="briefcase-outline" size={13} color={Colors.text} />
                <Text style={styles.studioBadgeText}>CLUB STUDIO</Text>
              </View>
              <Text style={styles.title}>Creator Workspace</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </Pressable>
          </View>

        {/* Tab Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          <Pressable
            style={[styles.tab, activeTab === 'ops' && styles.tabActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('ops');
            }}
          >
            <Ionicons
              name="scan"
              size={14}
              color={activeTab === 'ops' ? '#FFFFFF' : Colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'ops' && styles.tabTextActive]}>
              Gate & Ops
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'event' && styles.tabActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('event');
            }}
          >
            <Ionicons
              name="calendar"
              size={14}
              color={activeTab === 'event' ? '#FFFFFF' : Colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'event' && styles.tabTextActive]}>
              New Event
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'poll' && styles.tabActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('poll');
            }}
          >
            <Ionicons
              name="stats-chart"
              size={14}
              color={activeTab === 'poll' ? '#FFFFFF' : Colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'poll' && styles.tabTextActive]}>
              New Poll
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'demographics' && styles.tabActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('demographics');
              if (!selectedEventId && events.length > 0) {
                handleSelectDemographicsEvent(events[0].id);
              }
            }}
          >
            <Ionicons
              name="pie-chart"
              size={14}
              color={activeTab === 'demographics' ? '#FFFFFF' : Colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'demographics' && styles.tabTextActive]}>
              Demographics
            </Text>
          </Pressable>
        </ScrollView>

        {/* Body Content */}
        <ScrollView contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {activeTab === 'ops' && (
            <View style={styles.opsContainer}>
              <View style={styles.opsIntroCard}>
                <Ionicons name="shield-checkmark" size={20} color={DISTRICT_THEME.accentOrange} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.opsIntroTitle}>Gate & Attendee Management</Text>
                  <Text style={styles.opsIntroDesc}>
                    Live attendee check-in scanner, printable roll-call CSV exports, and urgent broadcasts.
                  </Text>
                </View>
              </View>

              <Text style={styles.opsSectionTitle}>Active Events ({myClubEvents.length})</Text>

              {myClubEvents.length === 0 ? (
                <View style={styles.opsEmptyCard}>
                  <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={styles.opsEmptyTitle}>No Club Events Published</Text>
                  <Text style={styles.opsEmptySub}>
                    Create your club's campus event to unlock gate verification, ticket scans, and attendee exports.
                  </Text>
                  <Pressable
                    style={styles.opsCreateEventBtn}
                    onPress={() => {
                      hapticLight();
                      setActiveTab('event');
                    }}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.opsCreateEventBtnText}>Create Event</Text>
                  </Pressable>
                </View>
              ) : (
                myClubEvents.map((ev) => (
                  <View key={ev.id} style={styles.opsEventCard}>
                    <View style={styles.opsEventTopRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.opsEventCardTitle} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        <Text style={styles.opsEventCardMeta}>
                          {ev.location || 'Campus'} • {Number(ev.going_count || 0)} attending
                        </Text>
                      </View>
                      <View style={styles.opsBadgePriority}>
                        <Text style={styles.opsBadgePriorityText}>{ev.priority || 'Normal'}</Text>
                      </View>
                    </View>

                    <View style={styles.opsActionGrid}>
                      <Pressable
                        style={styles.opsActionBtn}
                        onPress={() => {
                          hapticLight();
                          setSelectedOpsEvent(ev);
                          setShowScannerModal(true);
                        }}
                      >
                        <Ionicons name="scan" size={14} color={DISTRICT_THEME.accentOrange} />
                        <Text style={styles.opsActionBtnText}>Gate Scanner</Text>
                      </Pressable>

                      <Pressable
                        style={styles.opsActionBtn}
                        onPress={() => {
                          hapticLight();
                          setSelectedOpsEvent(ev);
                          setShowAttendeesModal(true);
                        }}
                      >
                        <Ionicons name="people" size={14} color="#60A5FA" />
                        <Text style={styles.opsActionBtnText}>Attendees & CSV</Text>
                      </Pressable>

                      <Pressable
                        style={styles.opsActionBtn}
                        onPress={() => {
                          hapticLight();
                          setSelectedOpsEvent(ev);
                          setShowBroadcastModal(true);
                        }}
                      >
                        <Ionicons name="megaphone" size={14} color="#F59E0B" />
                        <Text style={styles.opsActionBtnText}>Broadcast</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
          {activeTab === 'event' && (
            <View style={styles.formWrap}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Event Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. AI Hackathon 2026, Open Mic Night"
                  placeholderTextColor={Colors.textMuted}
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Short Catchphrase / Summary</Text>
                <TextInput
                  style={styles.input}
                  placeholder="One sentence hook for the feed card"
                  placeholderTextColor={Colors.textMuted}
                  value={eventSummary}
                  onChangeText={setEventSummary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Event Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Schedule, prizes, prerequisites, contact info..."
                  placeholderTextColor={Colors.textMuted}
                  value={eventDesc}
                  onChangeText={setEventDesc}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Poster Dropzone / Preview */}
              <View style={styles.formGroup}>
                <View style={styles.posterHeaderRow}>
                  <Text style={styles.label}>Event Poster</Text>
                  {Boolean(eventPoster) && (
                    <Pressable style={styles.removePosterLink} onPress={handleRemovePoster}>
                      <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.removePosterText}>Remove</Text>
                    </Pressable>
                  )}
                </View>

                {eventPoster ? (
                  <View style={styles.posterPreviewCard}>
                    <Image source={{ uri: eventPoster }} style={styles.posterPreviewImage} resizeMode="cover" />
                    <View style={styles.posterPreviewOverlay}>
                      <View style={styles.posterBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.posterBadgeText}>Attached</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable style={styles.posterChangeBtn} onPress={handlePickPosterGallery}>
                          <Text style={styles.posterChangeBtnText}>Change</Text>
                        </Pressable>
                        <Pressable style={styles.posterCameraIconBtn} onPress={handlePickPosterCamera}>
                          <Ionicons name="camera-outline" size={15} color={Colors.text} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.posterPickerDropzone}>
                    {isPickingPoster ? (
                      <ActivityIndicator size="small" color={Colors.text} />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={26} color={Colors.textMuted} style={{ marginBottom: 6 }} />
                        <Text style={styles.posterDropzoneTitle}>Upload Poster</Text>
                        <Text style={styles.posterDropzoneSubtitle}>Select from your photo gallery</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <Pressable style={styles.posterGalleryBtn} onPress={handlePickPosterGallery}>
                            <Ionicons name="images-outline" size={14} color="#000000" style={{ marginRight: 6 }} />
                            <Text style={styles.posterGalleryBtnText}>From Gallery</Text>
                          </Pressable>
                          <Pressable style={styles.posterCameraBtn} onPress={handlePickPosterCamera}>
                            <Ionicons name="camera-outline" size={14} color={Colors.text} style={{ marginRight: 6 }} />
                            <Text style={styles.posterCameraBtnText}>Camera</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.rowTwo}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Venue / Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. DIC Hub"
                    placeholderTextColor={Colors.textMuted}
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Room / Hall</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. CC-102"
                    placeholderTextColor={Colors.textMuted}
                    value={eventRoom}
                    onChangeText={setEventRoom}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. AI, Hackathon, Coding, Food"
                  placeholderTextColor={Colors.textMuted}
                  value={eventTags}
                  onChangeText={setEventTags}
                />
              </View>

              {/* Event Schedule & Sessions Timeline Builder */}
              <View style={styles.formGroup}>
                <View style={styles.scheduleBuilderHeader}>
                  <Text style={styles.label}>Schedule & Sessions Timeline</Text>
                  {sessions.length < 6 && (
                    <Pressable style={styles.addSessionBtn} onPress={addSession}>
                      <Ionicons name="add-circle" size={14} color={DISTRICT_THEME.accentOrange} style={{ marginRight: 4 }} />
                      <Text style={styles.addSessionBtnText}>Add Session</Text>
                    </Pressable>
                  )}
                </View>

                {sessions.map((sess, idx) => (
                  <View key={sess.id} style={styles.sessionItemRow}>
                    <View style={styles.sessionIdxCircle}>
                      <Text style={styles.sessionIdxText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <TextInput
                        style={styles.sessionInputTitle}
                        placeholder="Session Name (e.g. Keynote, Sprint, Awards)"
                        placeholderTextColor={Colors.textMuted}
                        value={sess.title}
                        onChangeText={(t) => updateSession(sess.id, 'title', t)}
                      />
                      <TextInput
                        style={styles.sessionInputTime}
                        placeholder="Time (e.g. 10:00 AM - 11:30 AM)"
                        placeholderTextColor={Colors.textMuted}
                        value={sess.time}
                        onChangeText={(t) => updateSession(sess.id, 'time', t)}
                      />
                    </View>
                    {sessions.length > 1 && (
                      <Pressable
                        style={styles.removeSessionBtn}
                        onPress={() => removeSession(sess.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={14} color={Colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleCreateEvent}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Publish Event</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {activeTab === 'poll' && (
            <View style={styles.formWrap}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Poll Question *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What would you like to ask the campus?"
                  placeholderTextColor={Colors.textMuted}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Options</Text>
                {pollOptions.map((opt, idx) => (
                  <TextInput
                    key={idx}
                    style={[styles.input, { marginBottom: 8 }]}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={Colors.textMuted}
                    value={opt}
                    onChangeText={(t) => updatePollOption(t, idx)}
                  />
                ))}

                {pollOptions.length < 5 && (
                  <Pressable style={styles.addOptionBtn} onPress={addPollOption}>
                    <Ionicons name="add-circle" size={16} color="#A78BFA" />
                    <Text style={styles.addOptionBtnText}>Add Option</Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleCreatePoll}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="stats-chart" size={16} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Launch Live Poll</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {activeTab === 'demographics' && (
            <View style={styles.demographicsWrap}>
              {/* Event Picker Rail */}
              <Text style={styles.label}>Select Event to View Demographics:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {events.map((ev) => {
                  const isSelected = selectedEventId === ev.id;
                  return (
                    <Pressable
                      key={ev.id}
                      style={[
                        styles.eventChip,
                        isSelected && styles.eventChipActive,
                      ]}
                      onPress={() => handleSelectDemographicsEvent(ev.id)}
                    >
                      <Text
                        style={[
                          styles.eventChipText,
                          isSelected && styles.eventChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {ev.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {isDemographicsLoading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.mutedText}>Computing attendee demographics...</Text>
                </View>
              ) : demographicsData ? (
                <View style={styles.demographicsDataBox}>
                  {/* Summary Metric Cards */}
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>
                        {demographicsData.summary.total_rsvps || 0}
                      </Text>
                      <Text style={styles.statLabel}>Total RSVPs</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={[styles.statNumber, { color: '#10B981' }]}>
                        {demographicsData.summary.going_count || 0}
                      </Text>
                      <Text style={styles.statLabel}>Going</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                        {demographicsData.summary.interested_count || 0}
                      </Text>
                      <Text style={styles.statLabel}>Interested</Text>
                    </View>
                  </View>

                  {/* Branch / Department Breakdown */}
                  <View style={styles.chartSection}>
                    <View style={styles.chartTitleRow}>
                      <Ionicons name="school-outline" size={15} color={Colors.accent} />
                      <Text style={styles.chartTitle}>Attendees by Branch / Department</Text>
                    </View>
                    {demographicsData.by_department.length === 0 ? (
                      <Text style={styles.mutedText}>No branch data yet.</Text>
                    ) : (
                      demographicsData.by_department.map((item, idx) => {
                        const count = Number(item.count);
                        const total = Math.max(1, Number(demographicsData.summary.total_rsvps || 1));
                        const pct = Math.round((count / total) * 100);

                        return (
                          <View key={idx} style={styles.barItem}>
                            <View style={styles.barLabelRow}>
                              <Text style={styles.barLabel}>{item.label}</Text>
                              <Text style={styles.barCount}>
                                {count} ({pct}%)
                              </Text>
                            </View>
                            <View style={styles.barTrack}>
                              <View style={[styles.barProgress, { width: `${Math.max(6, pct)}%` }]} />
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Semester Breakdown */}
                  <View style={styles.chartSection}>
                    <View style={styles.chartTitleRow}>
                      <Ionicons name="calendar-outline" size={15} color={Colors.accent} />
                      <Text style={styles.chartTitle}>Attendees by Semester</Text>
                    </View>
                    {demographicsData.by_semester.length === 0 ? (
                      <Text style={styles.mutedText}>No semester data yet.</Text>
                    ) : (
                      demographicsData.by_semester.map((item, idx) => {
                        const count = Number(item.count);
                        const total = Math.max(1, Number(demographicsData.summary.total_rsvps || 1));
                        const pct = Math.round((count / total) * 100);

                        return (
                          <View key={idx} style={styles.barItem}>
                            <View style={styles.barLabelRow}>
                              <Text style={styles.barLabel}>{item.label}</Text>
                              <Text style={styles.barCount}>
                                {count} ({pct}%)
                              </Text>
                            </View>
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barProgress,
                                  { width: `${Math.max(6, pct)}%`, backgroundColor: Colors.accent },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Recent Attendees Roster */}
                  {demographicsData.recent_attendees.length > 0 && (
                    <View style={styles.chartSection}>
                      <View style={styles.chartTitleRow}>
                        <Ionicons name="people-outline" size={15} color={Colors.accent} />
                        <Text style={styles.chartTitle}>Attendee Roster (Recent)</Text>
                      </View>
                      {demographicsData.recent_attendees.slice(0, 10).map((att) => (
                        <View key={att.id} style={styles.rosterRow}>
                          <View>
                            <Text style={styles.rosterName}>{att.user_name || att.user_email}</Text>
                            <Text style={styles.rosterMeta}>
                              {att.department || att.program || 'Student'} • {att.semester || ''}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.rosterStatusBadge,
                              att.status === 'going' ? styles.rosterGoing : styles.rosterInterested,
                            ]}
                          >
                            <Text style={styles.rosterStatusText}>{att.status}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.centerBox}>
                  <Text style={styles.mutedText}>Select an event above to view attendee statistics.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
        </View>
      </View>

      {/* ── Club Lead Operations Modals ── */}
      <EventScannerModal
        visible={showScannerModal}
        event={selectedOpsEvent}
        onClose={() => {
          setShowScannerModal(false);
          setSelectedOpsEvent(null);
        }}
      />
      <EventAttendeesModal
        visible={showAttendeesModal}
        event={selectedOpsEvent}
        onClose={() => {
          setShowAttendeesModal(false);
          setSelectedOpsEvent(null);
        }}
      />
      <EventBroadcastModal
        visible={showBroadcastModal}
        event={selectedOpsEvent}
        onClose={() => {
          setShowBroadcastModal(false);
          setSelectedOpsEvent(null);
        }}
      />
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
    backgroundColor: Colors.background,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  studioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentFaded,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.accentFadedBorder,
  },
  studioBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: '#181926',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.lg,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1E2032',
  },
  tabText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.weight.semibold,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  bodyContent: {
    padding: Spacing[4],
    paddingBottom: 60,
  },
  formWrap: {
    gap: Spacing[3],
  },
  formGroup: {
    marginBottom: Spacing[2],
  },
  rowTwo: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  label: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#181926',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#26283C',
  },
  textArea: {
    minHeight: 80,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  addOptionBtnText: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: Typography.weight.bold,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    height: 48,
    borderRadius: Radius.xl,
    gap: 8,
    marginTop: Spacing[2],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  demographicsWrap: {
    gap: Spacing[4],
  },
  eventChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#181926',
    borderWidth: 1,
    borderColor: '#26283C',
    marginRight: 8,
    maxWidth: 160,
  },
  eventChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  eventChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  eventChipTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  centerBox: {
    padding: Spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
  },
  demographicsDataBox: {
    gap: Spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  chartSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  barItem: {
    marginBottom: 10,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  barCount: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F2133',
    overflow: 'hidden',
  },
  barProgress: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2133',
  },
  rosterName: {
    fontSize: 13,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  rosterMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rosterStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  rosterGoing: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  rosterInterested: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  rosterStatusText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  opsContainer: {
    gap: Spacing[3.5],
  },
  opsIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E140F',
    padding: Spacing[3.5],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 30, 0.3)',
  },
  opsIntroTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  opsIntroDesc: {
    fontSize: 11,
    color: DISTRICT_THEME.textSecondary,
    lineHeight: 15,
  },
  opsSectionTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginTop: 4,
  },
  opsEmptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16171B',
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 1,
    borderColor: '#22242B',
  },
  opsEmptyTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  opsEmptySub: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    textAlign: 'center',
    marginBottom: Spacing[4],
    lineHeight: 17,
  },
  opsCreateEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.accentOrange,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  opsCreateEventBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  opsEventCard: {
    backgroundColor: '#16171B',
    borderRadius: Radius.xl,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: '#22242B',
  },
  opsEventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  opsEventCardTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  opsEventCardMeta: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  opsBadgePriority: {
    backgroundColor: 'rgba(255, 94, 30, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  opsBadgePriorityText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
    letterSpacing: 0.5,
  },
  opsActionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  opsActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22242B',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#2D3039',
    gap: 4,
  },
  opsActionBtnText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  scheduleBuilderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSessionBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  sessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16171B',
    borderRadius: Radius.lg,
    padding: Spacing[2.5],
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#22242B',
    gap: 8,
  },
  sessionIdxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 94, 30, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionIdxText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  sessionInputTitle: {
    backgroundColor: '#0C0D0E',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#22242B',
  },
  sessionInputTime: {
    backgroundColor: '#0C0D0E',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    borderWidth: 1,
    borderColor: '#22242B',
  },
  removeSessionBtn: {
    padding: 6,
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
    height: 180,
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
    padding: Spacing[2.5],
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
  },
  posterBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
  },
  posterChangeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  posterChangeBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  posterCameraIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
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
  posterDropzoneTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  posterDropzoneSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  posterGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  posterGalleryBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  posterCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterCameraBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
});
