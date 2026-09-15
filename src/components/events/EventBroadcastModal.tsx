/**
 * Attendee Broadcast & Urgent Announcement Modal — Club Lead & Admin Tooling.
 * Enables publishing urgent notifications to registered attendees
 * (e.g. venue shifts, schedule changes, prerequisites).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';
import { Colors, Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import type { DistrictEvent } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

const broadcastStorage = new MMKV({ id: 'oryn-event-broadcasts' });

export interface EventBroadcast {
  id: string;
  type: 'venue' | 'schedule' | 'prep' | 'general';
  title: string;
  message: string;
  createdAt: string;
  senderName: string;
}

interface EventBroadcastModalProps {
  visible: boolean;
  event: DistrictEvent | null;
  onClose: () => void;
  onBroadcastPublished?: () => void;
}

const BROADCAST_TYPES = [
  { key: 'venue', label: 'Venue Shift', icon: 'location' },
  { key: 'schedule', label: 'Schedule Delay', icon: 'time' },
  { key: 'prep', label: 'Prerequisites', icon: 'laptop' },
  { key: 'general', label: 'General Alert', icon: 'megaphone' },
] as const;

export function EventBroadcastModal({
  visible,
  event,
  onClose,
  onBroadcastPublished,
}: EventBroadcastModalProps) {
  const insets = useSafeAreaInsets();

  const [broadcastType, setBroadcastType] = useState<'venue' | 'schedule' | 'prep' | 'general'>('venue');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [broadcasts, setBroadcasts] = useState<EventBroadcast[]>([]);

  useEffect(() => {
    if (!event) return;
    setTitle('');
    setMessage('');

    const storageKey = `broadcasts_${event.id}`;
    const cached = broadcastStorage.getString(storageKey);
    if (cached) {
      try {
        setBroadcasts(JSON.parse(cached));
      } catch {
        setBroadcasts([]);
      }
    } else {
      setBroadcasts([]);
    }
  }, [event?.id]);

  const handleSendBroadcast = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Incomplete Notice', 'Please enter both an announcement title and description.');
      return;
    }

    if (!event) return;
    hapticSuccess();

    const newBroadcast: EventBroadcast = {
      id: String(Date.now()),
      type: broadcastType,
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: event.organization_name || 'Club Lead',
    };

    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    broadcastStorage.set(`broadcasts_${event.id}`, JSON.stringify(updated));

    Alert.alert('Broadcast Sent', 'Your announcement is now active on the event page for all attendees.');
    setTitle('');
    setMessage('');
    onBroadcastPublished?.();
  };

  const handleDeleteBroadcast = (id: string) => {
    if (!event) return;
    hapticLight();
    const updated = broadcasts.filter((b) => b.id !== id);
    setBroadcasts(updated);
    broadcastStorage.set(`broadcasts_${event.id}`, JSON.stringify(updated));
    onBroadcastPublished?.();
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: '82%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.grabHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeWrap}>
                <Ionicons name="megaphone" size={13} color={DISTRICT_THEME.accentOrange} />
                <Text style={styles.badgeText}>ATTENDEE BROADCASTS</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={DISTRICT_THEME.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <Text style={styles.inputLabel}>ANNOUNCEMENT TYPE</Text>
            <View style={styles.typesGrid}>
              {BROADCAST_TYPES.map((t) => {
                const isActive = broadcastType === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[styles.typeChip, isActive && styles.typeChipActive]}
                    onPress={() => {
                      hapticLight();
                      setBroadcastType(t.key);
                    }}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={14}
                      color={isActive ? '#FFFFFF' : DISTRICT_THEME.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Title Field */}
            <Text style={styles.inputLabel}>ANNOUNCEMENT HEADLINE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Venue moved to Seminar Hall 2"
              placeholderTextColor={DISTRICT_THEME.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Message Field */}
            <Text style={styles.inputLabel}>DETAILS FOR ATTENDEES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide exact instructions, required equipment, or modified timings..."
              placeholderTextColor={DISTRICT_THEME.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />

            {/* Send Button */}
            <Pressable style={styles.publishBtn} onPress={handleSendBroadcast}>
              <Ionicons name="send" size={15} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.publishBtnText}>Send to Attendees</Text>
            </Pressable>

            {/* Active Broadcasts History */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Active Broadcasts ({broadcasts.length})</Text>
              {broadcasts.length === 0 ? (
                <Text style={styles.emptyHistoryText}>No active announcements posted for this event.</Text>
              ) : (
                broadcasts.map((b) => (
                  <View key={b.id} style={styles.broadcastCard}>
                    <View style={styles.broadcastCardHeader}>
                      <View style={styles.broadcastTypeBadge}>
                        <Text style={styles.broadcastTypeBadgeText}>{b.type.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.broadcastTime}>{b.createdAt}</Text>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteBroadcast(b.id)}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </Pressable>
                    </View>

                    <Text style={styles.broadcastTitle}>{b.title}</Text>
                    <Text style={styles.broadcastMsg}>{b.message}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: DISTRICT_THEME.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#383B44',
    alignSelf: 'center',
    marginTop: Spacing[2.5],
    marginBottom: Spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DISTRICT_THEME.border,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    maxWidth: 260,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DISTRICT_THEME.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[6],
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 8,
    marginTop: Spacing[2],
    letterSpacing: 0.5,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing[2],
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  typeChipActive: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    borderColor: DISTRICT_THEME.accentOrange,
  },
  typeChipText: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    fontWeight: Typography.weight.medium,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  input: {
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: 10,
    fontSize: 13,
    color: DISTRICT_THEME.text,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: Spacing[2],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing[3],
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },
  historySection: {
    marginTop: Spacing[5],
    paddingTop: Spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DISTRICT_THEME.border,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: Spacing[2.5],
  },
  emptyHistoryText: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    fontStyle: 'italic',
  },
  broadcastCard: {
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    marginBottom: Spacing[2.5],
    borderLeftWidth: 3,
    borderLeftColor: DISTRICT_THEME.accentOrange,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  broadcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  broadcastTypeBadge: {
    backgroundColor: 'rgba(255, 94, 30, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: 8,
  },
  broadcastTypeBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  broadcastTime: {
    fontSize: 10,
    color: DISTRICT_THEME.textMuted,
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  broadcastTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 4,
  },
  broadcastMsg: {
    fontSize: 12,
    color: DISTRICT_THEME.textSecondary,
    lineHeight: 17,
  },
});
