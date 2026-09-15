/**
 * Club Request Modal — Form for students and organizers
 * to request a new club page, sent to Super Admin cs23b1008@iiitdm.ac.in.
 * Styled with Apple HIG form inputs, calm dark palette, and clear verification feedback.
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useEventsStore } from '@/store/eventsStore';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface ClubRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Technical',
  'Cultural',
  'Design',
  'Hardware',
  'Gaming',
  'Workshops',
  'Sports',
  'Social',
];

export function ClubRequestModal({ visible, onClose }: ClubRequestModalProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const requestNewClub = useEventsStore((s) => s.requestNewClub);
  const isSubmitting = useEventsStore((s) => s.isSubmitting);

  const [clubName, setClubName] = useState('');
  const [category, setCategory] = useState('Technical');
  const [leadName, setLeadName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!clubName.trim()) {
      Alert.alert('Missing Information', 'Please enter your club name.');
      return;
    }
    if (!leadName.trim()) {
      Alert.alert('Missing Information', 'Please enter your name as the club lead.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe the vision and goals of your club.');
      return;
    }

    try {
      hapticSuccess();
      await requestNewClub({
        club_name: clubName.trim(),
        category,
        lead_name: leadName.trim(),
        contact_phone: contactPhone.trim() || undefined,
        instagram_handle: instagramHandle.trim() || undefined,
        description: description.trim(),
      });
      setIsSuccess(true);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Could not send request.');
    }
  };

  const handleResetAndClose = () => {
    setClubName('');
    setDescription('');
    setContactPhone('');
    setInstagramHandle('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleResetAndClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleResetAndClose} />
        <View style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Register a Club</Text>
            <Text style={styles.subtitle}>Sent to cs23b1008@iiitdm.ac.in for verification</Text>
          </View>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              hapticLight();
              handleResetAndClose();
            }}
            hitSlop={8}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {isSuccess ? (
          /* Success Screen */
          <View style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={60} color={Colors.accent} />
            </View>
            <Text style={styles.successTitle}>Request Submitted</Text>
            <Text style={styles.successBody}>
              Your club application for "{clubName}" has been routed to the Super Admin. You'll receive Club Lead access once approved.
            </Text>
            <Pressable
              style={styles.doneBtn}
              onPress={() => {
                hapticLight();
                handleResetAndClose();
              }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          /* Form Inputs */
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            {/* Club Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Club Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Robotics & Automation Society"
                placeholderTextColor={Colors.textMuted}
                value={clubName}
                onChangeText={setClubName}
              />
            </View>

            {/* Category Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoriesRail}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryChoice,
                        isSelected && styles.categoryChoiceActive,
                      ]}
                      onPress={() => {
                        hapticLight();
                        setCategory(cat);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryChoiceText,
                          isSelected && styles.categoryChoiceTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Lead Name & Phone */}
            <View style={styles.twoColumn}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Lead Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.textMuted}
                  value={leadName}
                  onChangeText={setLeadName}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 9876543210"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                />
              </View>
            </View>

            {/* Instagram Handle */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Instagram Handle (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="@club_iiitdm"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                value={instagramHandle}
                onChangeText={setInstagramHandle}
              />
            </View>

            {/* Description & Goals */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description & Mission *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What does your club do? Who can join? What events do you plan to organize?"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={17} color={Colors.white} />
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )}
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formContent: {
    padding: Spacing[4],
    paddingBottom: 60,
  },
  formGroup: {
    marginBottom: Spacing[4],
  },
  twoColumn: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.text,
    fontSize: Typography.size.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
  },
  categoriesRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChoice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChoiceActive: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.accentFadedBorder,
  },
  categoryChoiceText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryChoiceTextActive: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    height: 46,
    borderRadius: Radius.lg,
    gap: 8,
    marginTop: Spacing[2],
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
    color: Colors.white,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  successIconWrap: {
    marginBottom: Spacing[3],
  },
  successTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  successBody: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing[5],
  },
  doneBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
});
