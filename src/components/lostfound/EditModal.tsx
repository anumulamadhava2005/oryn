/**
 * EditModal — modal sheet for editing existing Lost & Found posts.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { CampusMapPicker, CAMPUS_CENTER } from '@/components/lostfound/CampusMapPicker';
import type { LostItem, UpdateLostItemPayload } from '@/services/lostFoundApi';

export interface EditModalProps {
  visible: boolean;
  item: LostItem | null;
  onClose: () => void;
  onSubmit: (id: string, payload: UpdateLostItemPayload) => Promise<void>;
  isSubmitting: boolean;
}

export function EditModal({
  visible,
  item,
  onClose,
  onSubmit,
  isSubmitting,
}: EditModalProps) {
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
      setTitle(item.title);
      setDescription(item.description);
      setBuilding(item.building || '');
      setLocation(item.location_found || '');
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
      title: title.trim(),
      description: description.trim(),
      building: building.trim() || undefined,
      location_found: location.trim() || undefined,
      contact_info: contact.trim() || undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    });
    onClose();
  };

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
            <Text style={styles.modalTitle}>Edit Post</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting || !title.trim() || !description.trim()}
              hitSlop={12}
              style={[styles.modalHeaderBtn, styles.modalPostBtn, (!title.trim() || !description.trim()) && styles.modalPostBtnDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#121212" />
              ) : (
                <Text style={styles.modalPostBtnText}>Save</Text>
              )}
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
                  setLatitude(data.latitude);
                  setLongitude(data.longitude);
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '90%',
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalHeaderBtn: {
    minWidth: 60,
  },
  modalCancel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  modalPostBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  modalPostBtnDisabled: {
    opacity: 0.35,
  },
  modalPostBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#121212',
  },
  modalBody: {
    flexGrow: 0,
  },
  modalBodyContent: {
    padding: Spacing[4],
    gap: Spacing[4],
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  mapBadgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing[2],
  },
});
