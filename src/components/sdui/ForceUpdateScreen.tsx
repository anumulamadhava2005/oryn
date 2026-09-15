/**
 * ForceUpdateScreen — Full-screen gate displayed when the installed app version
 * is below the minimum required version specified in the remote SDUI manifest.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { OrynLogo } from '@/components/common/OrynLogo';
import { getAppVersion } from '@/services/sduiService';
import { hapticMedium } from '@/utils/haptics';

interface ForceUpdateScreenProps {
  minAppVersion: string;
}

export function ForceUpdateScreen({ minAppVersion }: ForceUpdateScreenProps) {
  const currentVersion = getAppVersion();

  const handleUpdatePress = async () => {
    hapticMedium();
    // In production, opens App Store / Play Store or institution release portal
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com'
        : 'https://play.google.com/store';

    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('[SDUI] Failed to open update URL:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.logoWrap}>
            <OrynLogo size={72} borderRadius={Radius.xl} />
            <View style={styles.updateBadge}>
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            A mandatory update is required to continue using Oryn. This release contains critical campus
            database upgrades, schema security updates, and performance enhancements.
          </Text>

          <View style={styles.versionBox}>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Installed Version:</Text>
              <Text style={styles.versionValue}>v{currentVersion}</Text>
            </View>
            <View style={styles.versionDivider} />
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Required Minimum:</Text>
              <Text style={[styles.versionValue, { color: Colors.systemGreen }]}>v{minAppVersion}</Text>
            </View>
          </View>

          <Pressable
            onPress={handleUpdatePress}
            style={({ pressed }) => [styles.updateBtn, pressed && { opacity: Opacity.pressed }]}
          >
            <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>IIITDM Kancheepuram · Oryn Operating System</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
  },
  centerContent: {
    alignItems: 'center',
    maxWidth: 340,
    gap: Spacing[3],
    marginTop: Spacing[10],
  },
  logoWrap: {
    position: 'relative',
    marginBottom: Spacing[3],
  },
  updateBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.systemGreen,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  versionBox: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    width: '100%',
    marginVertical: Spacing[2],
    gap: Spacing[2],
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  versionValue: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  versionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.systemBlue,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3.5],
    borderRadius: Radius.lg,
    marginTop: Spacing[2],
    width: '100%',
  },
  updateBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  footerText: {
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
  },
});
