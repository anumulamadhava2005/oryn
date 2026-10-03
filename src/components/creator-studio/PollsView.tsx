import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import { hapticSuccess } from '@/utils/haptics';
import type { Club } from '@/types/events';

interface PollsViewProps {
  currentClub: Club | undefined;
  defaultOrgId: string;
  selectedOrgId: string;
  onSuccess: () => void;
}

export function PollsView({
  currentClub,
  defaultOrgId,
  selectedOrgId,
  onSuccess,
}: PollsViewProps) {
  const isSubmitting = useEventsStore((s) => s.isSubmitting);
  const publishPoll = useEventsStore((s) => s.publishPoll);

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || validOptions.length < 2) {
      Alert.alert('Missing Info', 'Please provide a poll question and at least 2 options.');
      return;
    }

    try {
      await publishPoll({
        organization_id: selectedOrgId || defaultOrgId,
        question: pollQuestion.trim(),
        options: validOptions,
      });

      hapticSuccess();
      Alert.alert('Poll Live!', 'Student campus pulse poll has been published.');
      setPollQuestion('');
      setPollOptions(['', '']);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish poll.');
    }
  };

  return (
    <View style={styles.drillDownWrap}>
      <View style={styles.formCard}>
        <Text style={styles.cardHeader}>Create Campus Pulse Poll</Text>
        <Text style={styles.inputSub}>
          Published directly to the Pulse voting feed under {currentClub?.name || 'your club'}.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Poll Question *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Which programming language should our next workshop cover?"
            placeholderTextColor={Colors.textMuted}
            value={pollQuestion}
            onChangeText={setPollQuestion}
          />
        </View>

        <Text style={styles.label}>Poll Options (Min 2)</Text>
        {pollOptions.map((opt, idx) => (
          <View key={idx} style={styles.pollOptionRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={`Option ${idx + 1}`}
              placeholderTextColor={Colors.textMuted}
              value={opt}
              onChangeText={(val) => {
                const updated = [...pollOptions];
                updated[idx] = val;
                setPollOptions(updated);
              }}
            />
            {pollOptions.length > 2 && (
              <Pressable
                style={styles.pollOptionDeleteBtn}
                onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}

        {pollOptions.length < 5 && (
          <Pressable
            style={styles.addOptionBtn}
            onPress={() => setPollOptions([...pollOptions, ''])}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.text} style={{ marginRight: 6 }} />
            <Text style={styles.addOptionText}>Add Another Option</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.primaryActionBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleCreatePoll}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <Ionicons name="bar-chart-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionText}>Publish Live Poll</Text>
            </>
          )}
        </Pressable>
      </View>
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
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionDeleteBtn: {
    padding: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  addOptionText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
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
