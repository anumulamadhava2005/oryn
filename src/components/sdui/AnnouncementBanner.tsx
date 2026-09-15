/**
 * AnnouncementBanner — Server-driven dismissible notification banner.
 * Displayed dynamically at the top of the app interface when broadcast from SDUI manifest.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { useActiveAnnouncement, useSDUIStore } from '@/store/sduiStore';
import { hapticLight, hapticSelection } from '@/utils/haptics';

export function AnnouncementBanner() {
  const announcement = useActiveAnnouncement();
  const dismissAnnouncement = useSDUIStore((s) => s.dismissAnnouncement);

  if (!announcement) return null;

  const { id, title, message, type, dismissible, actionUrl, actionLabel } = announcement;

  const colorConfig = {
    info: {
      bg: Colors.systemBlue + '18',
      border: Colors.systemBlue + '40',
      iconColor: Colors.systemBlue,
      iconName: 'information-circle' as const,
    },
    warning: {
      bg: Colors.systemOrange + '18',
      border: Colors.systemOrange + '40',
      iconColor: Colors.systemOrange,
      iconName: 'warning' as const,
    },
    critical: {
      bg: Colors.systemRed + '18',
      border: Colors.systemRed + '40',
      iconColor: Colors.systemRed,
      iconName: 'alert-circle' as const,
    },
  }[type || 'info'];

  const handleAction = async () => {
    if (!actionUrl) return;
    hapticSelection();
    try {
      await Linking.openURL(actionUrl);
    } catch (e) {
      console.warn('[SDUI] Failed to open announcement URL:', actionUrl, e);
    }
  };

  const handleDismiss = () => {
    hapticLight();
    dismissAnnouncement(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colorConfig.bg, borderColor: colorConfig.border }]}>
      <View style={styles.contentRow}>
        <Ionicons name={colorConfig.iconName} size={20} color={colorConfig.iconColor} style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colorConfig.iconColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {actionUrl && actionLabel && (
            <Pressable
              onPress={handleAction}
              style={({ pressed }) => [
                styles.actionBtn,
                { borderColor: colorConfig.iconColor },
                pressed && { opacity: Opacity.pressed },
              ]}
            >
              <Text style={[styles.actionBtnText, { color: colorConfig.iconColor }]}>
                {actionLabel}
              </Text>
              <Ionicons name="arrow-forward" size={12} color={colorConfig.iconColor} />
            </Pressable>
          )}
        </View>

        {dismissible && (
          <Pressable
            onPress={handleDismiss}
            hitSlop={12}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: Opacity.pressed }]}
          >
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2.5],
  },
  icon: {
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: Spacing[1.5],
    paddingHorizontal: Spacing[2.5],
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
  },
  closeBtn: {
    padding: 2,
    marginLeft: Spacing[1],
  },
});
