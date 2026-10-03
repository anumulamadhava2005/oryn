import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import {
  useMarketplaceStore,
  type MarketplaceCategory,
  type ItemCondition,
} from '@/store/marketplaceStore';
import { useAuthStore } from '@/store/auth';

interface PostMarketplaceItemModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: MarketplaceCategory[] = [
  'Cycles',
  'Electronics',
  'Books & Notes',
  'Hostel Essentials',
  'Lab Gear',
  'Other',
];

const CONDITIONS: ItemCondition[] = ['Brand New', 'Like New', 'Good', 'Fair'];

const COMMON_LOCATIONS = [
  'Ashwatha Hostel',
  'Jasmine Hostel',
  'Banyan Hostel',
  'Lotus Hostel',
  'LHC Ground Floor',
  'Dining Hall / Mess',
];

export function PostMarketplaceItemModal({ visible, onClose }: PostMarketplaceItemModalProps) {
  const user = useAuthStore((s) => s.user);
  const addItem = useMarketplaceStore((s) => s.addItem);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Cycles');
  const [condition, setCondition] = useState<ItemCondition>('Like New');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Ashwatha Hostel');
  const [contact, setContact] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handlePickImage = async () => {
    hapticLight();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll access is needed to upload photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.75,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setImageUrl(uri);
        hapticSuccess();
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Details', 'Please enter a title and description.');
      return;
    }

    const numericPrice = price.trim() === '' ? 0 : parseInt(price.replace(/[^0-9]/g, ''), 10) || 0;

    addItem({
      title: title.trim(),
      price: numericPrice,
      category,
      condition,
      description: description.trim(),
      location: location.trim() || 'Campus',
      imageUrl: imageUrl || undefined,
      sellerId: user?.id || 'anonymous-student',
      sellerName: user?.name || 'Campus Student',
      sellerRoll: user?.email ? user.email.split('@')[0].toUpperCase() : 'Student',
      sellerEmail: user?.email || 'student@iiitdm.ac.in',
      sellerContact: contact.trim() || undefined,
    });

    hapticSuccess();
    Alert.alert('Item Listed!', 'Your listing is now visible to all verified students.');

    setTitle('');
    setPrice('');
    setDescription('');
    setImageUrl('');
    setContact('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.modalTitle}>List Item for Sale / Give Away</Text>
          <Pressable onPress={handleSubmit} style={styles.submitHeaderBtn}>
            <Text style={styles.submitHeaderBtnText}>Post</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Photo Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Item Photo</Text>
            {imageUrl ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                <Pressable style={styles.removeImageBtn} onPress={() => setImageUrl('')}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imagePickerDropzone} onPress={handlePickImage}>
                <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.imagePickerText}>Add Photo from Gallery</Text>
              </Pressable>
            )}
          </View>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Item Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hero Sprint 26T Mountain Cycle"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Price */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Price (₹) — Leave blank for Free / Give away</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1500 (or 0 for Free)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const isSel = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, isSel && styles.chipActive]}
                    onPress={() => {
                      hapticLight();
                      setCategory(cat);
                    }}
                  >
                    <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Condition */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((cond) => {
                const isSel = condition === cond;
                return (
                  <Pressable
                    key={cond}
                    style={[styles.chip, isSel && styles.chipActive]}
                    onPress={() => {
                      hapticLight();
                      setCondition(cond);
                    }}
                  >
                    <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{cond}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Campus Pickup / Handoff Point</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {COMMON_LOCATIONS.map((loc) => {
                const isSel = location === loc;
                return (
                  <Pressable
                    key={loc}
                    style={[styles.chip, isSel && styles.chipActive]}
                    onPress={() => {
                      hapticLight();
                      setLocation(loc);
                    }}
                  >
                    <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{loc}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Or specify custom room/hostel wing..."
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide condition details, reason for selling, whether price is negotiable..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Contact Details */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone / WhatsApp Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={contact}
              onChangeText={setContact}
            />
            <Text style={styles.hint}>
              Will only be revealed to verified students tapping 'Contact Seller'.
            </Text>
          </View>

          {/* Post Action Button */}
          <Pressable style={styles.submitBtn} onPress={handleSubmit}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#000000" style={{ marginRight: 6 }} />
            <Text style={styles.submitBtnText}>Publish Listing</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3.5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  submitHeaderBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  submitHeaderBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  scrollContent: {
    padding: Spacing[4],
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  imagePickerDropzone: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePickerText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  imagePreviewWrap: {
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing[2],
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
});
