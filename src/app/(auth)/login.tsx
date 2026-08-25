/**
 * Login screen — Apple Onboarding aesthetic with react-native-safe-area-context and Ionicons.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { OrynLogo } from '@/components/common/OrynLogo';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        {/* Logo / branding */}
        <MotiView
          from={{ opacity: 0, translateY: -24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.hero}
        >
          <OrynLogo size={76} borderRadius={Radius.xl} style={styles.logoRing} />
          <Text style={styles.appName}>Oryn</Text>
          <Text style={styles.tagline}>Your Intelligent Academic Inbox</Text>
        </MotiView>

        {/* Feature bullets */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={styles.features}
        >
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIconBox, { backgroundColor: f.color + '18' }]}>
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </MotiView>

        {/* CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
          style={styles.cta}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={login}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.signInBtn,
              pressed && styles.signInBtnPressed,
              isLoading && styles.signInBtnDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={Colors.white} />
                <Text style={styles.signInLabel}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Oryn processes your emails locally on-device.{'\n'}No personal data ever leaves your phone.
          </Text>
        </MotiView>
      </View>
    </SafeAreaView>
  );
}

const FEATURES: Array<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
  color: string;
}> = [
  {
    icon: 'cube-outline',
    title: 'Smart Classification',
    desc: 'Categorizes academic, hostel, & placement notices',
    color: Colors.systemBlue,
  },
  {
    icon: 'alarm-outline',
    title: 'Deadline Tracking',
    desc: 'Extracts dates, assignments, & exam schedules',
    color: Colors.systemOrange,
  },
  {
    icon: 'shield-checkmark-outline',
    title: '100% On-Device & Private',
    desc: 'Zero server tracking or background data sales',
    color: Colors.systemGreen,
  },
];

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    justifyContent: 'space-between',
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
    ...Shadows.accent,
  },
  appName: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  tagline: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  features: {
    gap: Spacing[3],
    paddingVertical: Spacing[2],
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing[4],
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  featureDesc: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  cta: {
    gap: Spacing[4],
  },
  errorBox: {
    backgroundColor: Colors.errorFaded,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    padding: Spacing[3],
  },
  errorText: {
    fontSize: Typography.size.xs,
    color: Colors.systemRed,
    textAlign: 'center',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.systemBlue,
    borderRadius: Radius.lg,
    height: 52,
    ...Shadows.accent,
  },
  signInBtnPressed: {
    opacity: 0.85,
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.white,
    letterSpacing: Typography.tracking.tight,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
