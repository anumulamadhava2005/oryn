/**
 * Onboarding screen — 3-slide story-driven intro with Moti animations.
 * Shown once on first launch before Google login.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { OrynLogo } from '@/components/common/OrynLogo';

interface Slide {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  features: Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string }>;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'sparkles',
    iconColor: Colors.systemBlue,
    iconBg: Colors.systemBlue + '20',
    title: 'Your Emails,\nIntelligently Organized',
    subtitle: 'Oryn automatically sorts your campus emails into smart categories',
    features: [
      { icon: 'restaurant-outline', label: 'Mess Affairs', color: Colors.systemOrange },
      { icon: 'briefcase-outline', label: 'Placement', color: Colors.systemPurple },
      { icon: 'book-outline', label: 'Academics', color: Colors.systemBlue },
      { icon: 'home-outline', label: 'Hostel', color: Colors.systemPink },
    ],
  },
  {
    id: '2',
    icon: 'alarm',
    iconColor: Colors.systemOrange,
    iconBg: Colors.systemOrange + '20',
    title: 'Never Miss\na Deadline',
    subtitle: "AI extracts dates, assignments, and exams — reminds you before they're due",
    features: [
      { icon: 'calendar-outline', label: 'Auto-detects deadlines', color: Colors.systemOrange },
      { icon: 'notifications-outline', label: 'Smart reminders', color: Colors.systemRed },
      { icon: 'checkmark-circle-outline', label: 'Action item checklists', color: Colors.systemGreen },
    ],
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    iconColor: Colors.systemGreen,
    iconBg: Colors.systemGreen + '20',
    title: '100% Private,\nOn-Device',
    subtitle: 'All email analysis runs locally on your phone. Nothing leaves your device.',
    features: [
      { icon: 'lock-closed-outline', label: 'No server processing', color: Colors.systemGreen },
      { icon: 'eye-off-outline', label: 'No data collection', color: Colors.systemTeal },
      { icon: 'flash-outline', label: 'Instant & offline', color: Colors.systemYellow },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const authStatus = useAuthStore((s) => s.status);
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const navigateToSlide = useCallback((targetIndex: number) => {
    setActiveIndex(targetIndex);
    try {
      flatListRef.current?.scrollToOffset({
        offset: targetIndex * screenWidth,
        animated: true,
      });
    } catch {
      // Ignore scroll errors
    }
  }, [screenWidth]);

  const handleFinish = useCallback(() => {
    hapticSuccess();
    completeOnboarding();
    if (authStatus === 'authenticated') {
      router.replace('/(app)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [authStatus, completeOnboarding, router]);

  const handleNext = useCallback(() => {
    hapticLight();
    if (activeIndex < SLIDES.length - 1) {
      navigateToSlide(activeIndex + 1);
    } else {
      handleFinish();
    }
  }, [activeIndex, navigateToSlide, handleFinish]);

  const handleSkip = useCallback(() => {
    hapticLight();
    handleFinish();
  }, [handleFinish]);

  const renderSlide = useCallback(({ item, index }: { item: Slide; index: number }) => (
    <View style={[styles.slide, { width: screenWidth }]}>
      {/* Hero Icon / Logo */}
      <MotiView
        from={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, delay: 100 }}
        key={`icon-${item.id}`}
      >
        {index === 0 ? (
          <OrynLogo size={96} borderRadius={Radius.xl} />
        ) : (
          <View style={[styles.heroIcon, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon} size={44} color={item.iconColor} />
          </View>
        )}
      </MotiView>

      {/* Title & Subtitle */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
      >
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </MotiView>

      {/* Feature Pills */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 400 }}
        style={styles.featuresList}
      >
        {item.features.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: feat.color + '18' }]}>
              <Ionicons name={feat.icon} size={18} color={feat.color} />
            </View>
            <Text style={styles.featureLabel}>{feat.label}</Text>
          </View>
        ))}
      </MotiView>
    </View>
  ), [screenWidth]);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        {activeIndex > 0 ? (
          <Pressable
            onPress={() => {
              hapticLight();
              navigateToSlide(activeIndex - 1);
            }}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
            <Text style={styles.skipText}>Back</Text>
          </Pressable>
        ) : <View />}

        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                hapticLight();
                navigateToSlide(i);
              }}
              hitSlop={8}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex && styles.dotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* CTA Button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
        >
          <Text style={styles.ctaText}>
            {isLastSlide ? 'Get Started' : 'Continue'}
          </Text>
          <Ionicons
            name={isLastSlide ? 'arrow-forward' : 'chevron-forward'}
            size={18}
            color="#FFF"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  skipText: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing[8],
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[5],
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.accent,
  },
  slideTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: Typography.tracking.tight,
    lineHeight: Typography.size['2xl'] * 1.2,
  },
  slideSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing[2],
    lineHeight: Typography.size.base * 1.5,
    maxWidth: 300,
  },
  featuresList: {
    gap: Spacing[3],
    width: '100%',
    paddingTop: Spacing[2],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: Typography.size.base,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
  bottomControls: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[4],
    gap: Spacing[5],
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceHigh,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.systemBlue,
    borderRadius: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.systemBlue,
    borderRadius: Radius.lg,
    height: 52,
    width: '100%',
    ...Shadows.accent,
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: '#FFFFFF',
  },
});
