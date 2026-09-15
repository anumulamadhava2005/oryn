import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MotiView } from 'moti';
import { Colors, Radius, Typography, Shadows, Spacing } from '@/constants/theme';
import { hapticLight, hapticMedium, hapticSuccess } from '@/utils/haptics';

interface ChatGPTAttachmentPickerProps {
  imageUri: string | null;
  onImageSelected: (uri: string | null) => void;
}

export function ChatGPTAttachmentPicker({
  imageUri,
  onImageSelected,
}: ChatGPTAttachmentPickerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenMenu = () => {
    hapticLight();
    setIsMenuOpen(true);
  };

  const handleCloseMenu = () => {
    hapticLight();
    setIsMenuOpen(false);
  };

  const processPickedAsset = (res: ImagePicker.ImagePickerResult) => {
    if (!res.canceled && res.assets && res.assets.length > 0) {
      const asset = res.assets[0];
      const finalUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      onImageSelected(finalUri);
      hapticSuccess();
    }
  };

  const handlePickCamera = async () => {
    setIsMenuOpen(false);
    hapticMedium();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is required to take photos of items.');
        return;
      }
      setIsProcessing(true);
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      processPickedAsset(res);
    } catch (e: any) {
      Alert.alert('Camera Error', e.message || 'Could not launch camera');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickPhotos = async () => {
    setIsMenuOpen(false);
    hapticMedium();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photos Permission', 'Photo library access is needed to select an image.');
        return;
      }
      setIsProcessing(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      processPickedAsset(res);
    } catch (e: any) {
      Alert.alert('Gallery Error', e.message || 'Could not select photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFiles = async () => {
    setIsMenuOpen(false);
    hapticMedium();
    try {
      setIsProcessing(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      processPickedAsset(res);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not pick file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    hapticLight();
    onImageSelected(null);
  };

  return (
    <View style={styles.container}>
      {/* ─── If image is attached: ChatGPT-style animated preview ───── */}
      {imageUri ? (
        <MotiView
          from={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          style={styles.previewContainer}
        >
          <Image source={{ uri: imageUri }} style={styles.attachedImage} resizeMode="cover" />

          {/* Remove Button */}
          <TouchableOpacity
            onPress={handleRemoveImage}
            style={styles.removeBtn}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color={Colors.white} />
          </TouchableOpacity>

          {/* Floating Change Photo Bar */}
          <TouchableOpacity
            onPress={handleOpenMenu}
            style={styles.changePhotoBadge}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={14} color={Colors.white} />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </MotiView>
      ) : (
        /* ─── No image: ChatGPT Attachment Trigger Button ──────────── */
        <TouchableOpacity
          onPress={handleOpenMenu}
          style={styles.uploadTriggerBtn}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={Colors.systemBlue} />
          ) : (
            <>
              <View style={styles.triggerIconWrap}>
                <Ionicons name="camera" size={18} color={Colors.white} />
              </View>
              <View style={styles.triggerTextWrap}>
                <Text style={styles.triggerTitle}>Add Item Photo</Text>
                <Text style={styles.triggerSubtitle}>Camera • Photos • Files</Text>
              </View>
              <View style={styles.triggerPlusBadge}>
                <Ionicons name="add" size={16} color={Colors.systemBlue} />
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* ─── ChatGPT Floating Attachment Dropdown Menu ───────────── */}
      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseMenu}>
          <MotiView
            from={{ opacity: 0, scale: 0.85, translateY: 15 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
            style={styles.chatGptMenuCard}
          >
            {/* 1. Camera Option */}
            <TouchableOpacity
              style={styles.chatGptMenuItem}
              onPress={handlePickCamera}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconCircle}>
                <Ionicons name="camera-outline" size={20} color={Colors.white} />
              </View>
              <Text style={styles.menuItemText}>Camera</Text>
            </TouchableOpacity>

            {/* 2. Photos Option */}
            <TouchableOpacity
              style={styles.chatGptMenuItem}
              onPress={handlePickPhotos}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconCircle}>
                <Ionicons name="images-outline" size={20} color={Colors.white} />
              </View>
              <Text style={styles.menuItemText}>Photos</Text>
            </TouchableOpacity>

            {/* 3. Files Option */}
            <TouchableOpacity
              style={[styles.chatGptMenuItem, styles.menuItemLast]}
              onPress={handlePickFiles}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconCircle}>
                <Ionicons name="attach-outline" size={20} color={Colors.white} />
              </View>
              <Text style={styles.menuItemText}>Files</Text>
            </TouchableOpacity>
          </MotiView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },

  // Trigger Button
  uploadTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },
  triggerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTextWrap: {
    flex: 1,
  },
  triggerTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  triggerSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  triggerPlusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Attached Image Preview
  previewContainer: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#1E1E22',
  },
  attachedImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#1C1C1E',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 20, 24, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  changePhotoText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: Typography.weight.medium,
  },

  // ChatGPT Dropdown / Popup Menu
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[4],
  },
  chatGptMenuCard: {
    width: 210,
    backgroundColor: '#232326',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Shadows.lg,
  },
  chatGptMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 14,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Colors.white,
  },
});
