import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import type { DistrictEvent } from '@/types/events';
import { BROADCAST_CHIPS, type BroadcastItem, type StudioView } from './types';

interface BroadcastViewProps {
  activeEvent: DistrictEvent | null;
  broadcasts: BroadcastItem[];
  userName: string;
  onSaveBroadcasts: (updated: BroadcastItem[]) => void;
  onNavigateView: (view: StudioView) => void;
}

export function BroadcastView({
  activeEvent,
  broadcasts,
  userName,
  onSaveBroadcasts,
  onNavigateView,
}: BroadcastViewProps) {
  const [broadcastType, setBroadcastType] = useState<'venue' | 'schedule' | 'prep' | 'general'>('venue');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) {
      Alert.alert('Missing Details', 'Please provide a title and body for the announcement.');
      return;
    }

    hapticSuccess();
    const newBroadcast: BroadcastItem = {
      id: String(Date.now()),
      type: broadcastType,
      title: broadcastTitle.trim(),
      message: broadcastMsg.trim(),
      createdAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      senderName: userName || 'Club Lead',
    };

    const updated = [newBroadcast, ...broadcasts];
    onSaveBroadcasts(updated);

    setBroadcastTitle('');
    setBroadcastMsg('');
    Alert.alert('Broadcast Sent', 'Announcement has been pushed to registered attendees.');
  };

  const handleDeleteBroadcast = (id: string) => {
    hapticLight();
    const updated = broadcasts.filter((b) => b.id !== id);
    onSaveBroadcasts(updated);
  };

  if (!activeEvent) {
    return (
      <View style={styles.drillDownWrap}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Event Selected</Text>
          <Text style={styles.emptySubtitle}>Select or publish an event to broadcast an announcement.</Text>
          <Pressable style={styles.emptyActionBtn} onPress={() => onNavigateView('publish')}>
            <Text style={styles.emptyActionBtnText}>+ Publish Event</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.drillDownWrap}>
      <View style={styles.formCard}>
        <Text style={styles.cardHeader}>Broadcast Urgent Announcement</Text>
        <Text style={styles.inputSub}>
          Sends a priority alert to all confirmed attendees and pins an announcement banner to {activeEvent.title}.
        </Text>

        <Text style={styles.label}>Announcement Category</Text>
        <View style={styles.broadcastChipsRow}>
          {BROADCAST_CHIPS.map((chip) => {
            const isSel = broadcastType === chip.key;
            return (
              <Pressable
                key={chip.key}
                style={[styles.bChip, isSel && styles.bChipActive]}
                onPress={() => {
                  hapticLight();
                  setBroadcastType(chip.key);
                }}
              >
                <Ionicons
                  name={chip.icon as any}
                  size={13}
                  color={isSel ? '#000000' : Colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.bChipText, isSel && styles.bChipTextActive]}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Alert Headline</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Venue Moved to Auditorium 1"
            placeholderTextColor={Colors.textMuted}
            value={broadcastTitle}
            onChangeText={setBroadcastTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Message Body</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Explain the update, time adjustments, or what students need to bring..."
            placeholderTextColor={Colors.textMuted}
            value={broadcastMsg}
            onChangeText={setBroadcastMsg}
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable style={styles.primaryActionBtn} onPress={handleSendBroadcast}>
          <Ionicons name="megaphone-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.primaryActionText}>Push Urgent Broadcast</Text>
        </Pressable>
      </View>

      {/* Broadcast History */}
      <View style={styles.historyCard}>
        <Text style={styles.cardHeader}>Active Announcements ({broadcasts.length})</Text>
        {broadcasts.length === 0 ? (
          <Text style={styles.emptySubtitle}>No active announcements for this event.</Text>
        ) : (
          broadcasts.map((b) => (
            <View key={b.id} style={styles.broadcastHistoryRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.broadcastHistoryMeta}>
                  <View style={styles.bTypeTag}>
                    <Text style={styles.bTypeTagText}>{b.type.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.bTimeText}>{b.createdAt}</Text>
                </View>
                <Text style={styles.broadcastHistoryTitle}>{b.title}</Text>
                <Text style={styles.broadcastHistoryMsg}>{b.message}</Text>
              </View>
              <Pressable style={styles.deleteBroadcastBtn} onPress={() => handleDeleteBroadcast(b.id)}>
                <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drillDownWrap: {
    gap: Spacing[4],
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
  emptyActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
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
  label: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  broadcastChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing[3],
  },
  bChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  bChipText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  bChipTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  formGroup: {
    marginBottom: Spacing[3],
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
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing[1],
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  broadcastHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
    gap: 8,
  },
  broadcastHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bTypeTag: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  bTypeTagText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
  },
  bTimeText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  deleteBroadcastBtn: {
    padding: 4,
  },
  broadcastHistoryTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  broadcastHistoryMsg: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
