/**
 * widgets.tsx — Home Screen Widgets Gallery, Preview, and Customizer Hub.
 * Allows users to configure and preview Academic Calendar, Mess Menu, and Category Mails widgets.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { hapticLight, hapticSuccess, hapticHeavy } from '@/utils/haptics';
import {
  WidgetPreview,
  WidgetType,
  WidgetSize,
} from '@/components/widget/WidgetPreview';
import {
  EMAIL_CATEGORIES,
  syncWidgetData,
} from '@/services/widgetDataService';

export default function WidgetsScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<WidgetType>('academic');
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('medium');
  const [selectedMailCategory, setSelectedMailCategory] = useState<string>('Placements');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Initial sync
    syncWidgetData(selectedMailCategory);
  }, [selectedMailCategory]);

  const handleSyncData = async () => {
    hapticHeavy();
    setIsSyncing(true);
    await syncWidgetData(selectedMailCategory);
    setTimeout(() => {
      setIsSyncing(false);
      hapticSuccess();
      Alert.alert(
        'Widgets Synchronized',
        'Live data for Timetable, Mess Menu, and Category Emails updated for your home screen widgets.'
      );
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Navigation */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => {
            hapticLight();
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Home Screen Widgets</Text>
        <Pressable onPress={handleSyncData} style={styles.syncButton}>
          <Ionicons name="refresh" size={20} color={Colors.systemBlue} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Intro Subtitle Banner */}
        <View style={styles.introCard}>
          <View style={styles.introIconCol}>
            <Ionicons name="layers-outline" size={22} color={Colors.systemBlue} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.introHeading}>ORYN CAMPUS WIDGETS</Text>
            <Text style={styles.introDesc}>
              Keep your live class schedule, daily mess menu, and urgent placement/academic mails directly on your home screen.
            </Text>
          </View>
        </View>

        {/* 1. Widget Type Selector */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>CHOOSE WIDGET TYPE</Text>
          <View style={styles.typeGrid}>
            <Pressable
              onPress={() => {
                hapticLight();
                setSelectedType('academic');
              }}
              style={[
                styles.typeCard,
                selectedType === 'academic' && styles.typeCardActive,
              ]}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={selectedType === 'academic' ? Colors.systemBlue : Colors.textMuted}
              />
              <Text
                style={[
                  styles.typeText,
                  selectedType === 'academic' && styles.typeTextActive,
                ]}
              >
                Timetable
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                setSelectedType('mess');
              }}
              style={[
                styles.typeCard,
                selectedType === 'mess' && styles.typeCardActive,
              ]}
            >
              <Ionicons
                name="restaurant"
                size={20}
                color={selectedType === 'mess' ? Colors.systemOrange : Colors.textMuted}
              />
              <Text
                style={[
                  styles.typeText,
                  selectedType === 'mess' && styles.typeTextActive,
                ]}
              >
                Mess Menu
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                setSelectedType('emails');
              }}
              style={[
                styles.typeCard,
                selectedType === 'emails' && styles.typeCardActive,
              ]}
            >
              <Ionicons
                name="mail"
                size={20}
                color={
                  selectedType === 'emails'
                    ? Colors.systemPurple || '#AF52DE'
                    : Colors.textMuted
                }
              />
              <Text
                style={[
                  styles.typeText,
                  selectedType === 'emails' && styles.typeTextActive,
                ]}
              >
                Category Mails
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Category Selector (if Emails is selected) */}
        {selectedType === 'emails' && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>SELECT EMAIL CATEGORY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {EMAIL_CATEGORIES.map((cat) => {
                const isSel = cat === selectedMailCategory;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      hapticLight();
                      setSelectedMailCategory(cat);
                    }}
                    style={[styles.catFilterChip, isSel && styles.catFilterChipActive]}
                  >
                    <Ionicons
                      name={
                        cat === 'Placements'
                          ? 'briefcase-outline'
                          : cat === 'Academics'
                          ? 'book-outline'
                          : cat === 'Events'
                          ? 'trophy-outline'
                          : 'folder-outline'
                      }
                      size={14}
                      color={isSel ? Colors.white : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.catFilterText,
                        isSel && styles.catFilterTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 3. Size Selector */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>CHOOSE WIDGET SIZE</Text>
          <View style={styles.sizeRow}>
            {(['small', 'medium', 'large'] as WidgetSize[]).map((sz) => {
              const isSel = sz === selectedSize;
              return (
                <Pressable
                  key={sz}
                  onPress={() => {
                    hapticLight();
                    setSelectedSize(sz);
                  }}
                  style={[styles.sizeBtn, isSel && styles.sizeBtnActive]}
                >
                  <Text style={[styles.sizeBtnText, isSel && styles.sizeBtnTextActive]}>
                    {sz.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 4. Live Simulated Preview Box */}
        <View style={styles.previewAreaWrap}>
          <View style={styles.previewHeaderRow}>
            <Text style={styles.previewAreaLabel}>HOME SCREEN PREVIEW</Text>
            <View style={styles.osBadge}>
              <Ionicons name="hardware-chip-outline" size={12} color={Colors.systemBlue} />
              <Text style={styles.osBadgeText}>iOS 18 & Android 15</Text>
            </View>
          </View>

          <View style={styles.previewFrameCenter}>
            <WidgetPreview
              type={selectedType}
              size={selectedSize}
              selectedCategory={selectedMailCategory}
              onCategoryChange={(c) => setSelectedMailCategory(c)}
            />
          </View>
        </View>

        {/* 5. Sync & How-to Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleSyncData}
            style={[styles.primaryActionBtn, isSyncing && { opacity: 0.7 }]}
          >
            <Ionicons name="flash-outline" size={18} color={Colors.white} />
            <Text style={styles.primaryActionText}>
              {isSyncing ? 'Syncing to OS Widget...' : 'Force Sync Live Data'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              hapticLight();
              setShowGuide(!showGuide);
            }}
            style={styles.secondaryActionBtn}
          >
            <Ionicons
              name={showGuide ? 'chevron-up-outline' : 'help-circle-outline'}
              size={18}
              color={Colors.systemBlue}
            />
            <Text style={styles.secondaryActionText}>
              {showGuide ? 'Hide Installation Guide' : 'How to Add to Home Screen'}
            </Text>
          </Pressable>
        </View>

        {/* 6. Installation Guide Card */}
        {showGuide && (
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>How to Add Widgets to Phone</Text>

            <View style={styles.guideStepBox}>
              <Text style={styles.guideOsHeader}>iOS (iPhone & iPad)</Text>
              <Text style={styles.guideStepText}>1. Touch and hold any app on your Home Screen until apps jiggle.</Text>
              <Text style={styles.guideStepText}>2. Tap the <Text style={{ color: Colors.systemBlue }}>+ Add Widget</Text> button in top left.</Text>
              <Text style={styles.guideStepText}>3. Search for <Text style={{ fontWeight: '700', color: Colors.text }}>Oryn</Text> in widget gallery.</Text>
              <Text style={styles.guideStepText}>4. Choose Timetable, Mess Menu, or Category Mails & tap <Text style={{ color: Colors.systemBlue }}>Add Widget</Text>.</Text>
            </View>

            <View style={styles.guideStepBox}>
              <Text style={styles.guideOsHeader}>Android (Phones & Tablets)</Text>
              <Text style={styles.guideStepText}>1. Long press on any empty space on your Android home screen.</Text>
              <Text style={styles.guideStepText}>2. Tap <Text style={{ color: Colors.systemOrange }}>Widgets</Text> icon.</Text>
              <Text style={styles.guideStepText}>3. Scroll down and expand the <Text style={{ fontWeight: '700', color: Colors.text }}>Oryn</Text> app drawer.</Text>
              <Text style={styles.guideStepText}>4. Drag your chosen widget onto your home screen grid.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[10],
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  introIconCol: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introHeading: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
    letterSpacing: 1,
  },
  introDesc: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  sectionWrap: {
    gap: Spacing[2],
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeCardActive: {
    backgroundColor: Colors.surfaceHigh,
    borderColor: Colors.systemBlue,
    ...Shadows.sm,
  },
  typeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  typeTextActive: {
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  catFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catFilterChipActive: {
    backgroundColor: Colors.systemPurple || '#AF52DE',
    borderColor: Colors.systemPurple || '#AF52DE',
  },
  catFilterText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  catFilterTextActive: {
    color: Colors.white,
    fontWeight: Typography.weight.bold,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  sizeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2.5],
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sizeBtnActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  sizeBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  sizeBtnTextActive: {
    color: Colors.white,
  },
  previewAreaWrap: {
    gap: Spacing[2],
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  previewAreaLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  osBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  osBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  previewFrameCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    gap: Spacing[2.5],
    marginTop: Spacing[2],
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.systemBlue,
    paddingVertical: Spacing[3.5],
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  primaryActionText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryActionText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
  guideCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guideTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  guideStepBox: {
    gap: 4,
    backgroundColor: Colors.surface,
    padding: Spacing[3],
    borderRadius: Radius.md,
  },
  guideOsHeader: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  guideStepText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
