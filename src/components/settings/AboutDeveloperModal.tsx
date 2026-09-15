/**
 * AboutDeveloperModal — Apple HIG modal presenting Developer Details & Motivation.
 * 
 * Features:
 * - Developer profile & credentials (IIITDM Kancheepuram)
 * - The core story & motivation behind building Oryn
 * - Architectural pillars (Local-First, Zero-Latency, Privacy, Timetable Engine)
 * - Tech stack badges & open source credits
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { OrynLogo } from '@/components/common/OrynLogo';
import { hapticLight } from '@/utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AboutDeveloperModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.grabHandle} />
          {/* Header */}
          <View style={styles.header}>
          <Text style={styles.headerTitle}>About Oryn & Developer</Text>
          <Pressable
            onPress={() => {
              hapticLight();
              onClose();
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: Opacity.pressed }]}
          >
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Branding */}
          <View style={styles.heroCard}>
            <View style={styles.logoWrap}>
              <OrynLogo size={56} borderRadius={Radius.xl} />
            </View>
            <Text style={styles.heroTitle}>Oryn</Text>
            <Text style={styles.heroTagline}>Intelligent Campus Operating System</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v1.1.0 · Local-First & Privacy-Focused</Text>
            </View>
          </View>

          {/* Developer Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DEVELOPER</Text>
            <View style={styles.card}>
              <View style={styles.developerRow}>
                <View style={styles.devAvatar}>
                  <Text style={styles.devAvatarText}>M</Text>
                </View>
                <View style={styles.devInfo}>
                  <Text style={styles.devName}>Maddy</Text>
                  <Text style={styles.devInstitution}>
                    IIITDM Kancheepuram
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.devBio}>
                Computer Science & Engineering student at the Indian Institute of Information Technology,
                Design and Manufacturing (IIITDM) Kancheepuram.
              </Text>

              <View style={styles.badgeRow}>
                <View style={[styles.pillBadge, { backgroundColor: Colors.systemBlue + '20', borderColor: Colors.systemBlue + '40' }]}>
                  <Ionicons name="mail-outline" size={12} color={Colors.systemBlue} />
                  <Text style={[styles.pillText, { color: Colors.systemBlue }]}>maddy@cruxel.xyz</Text>
                </View>
              </View>
            </View>
          </View>

          {/* What is Oryn Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WHAT IS ORYN</Text>
            <View style={styles.card}>
              <View style={styles.storyHeader}>
                <View style={[styles.storyIconBox, { backgroundColor: Colors.systemOrange + '20' }]}>
                  <Ionicons name="bulb-outline" size={20} color={Colors.systemOrange} />
                </View>
                <Text style={styles.storyTitle}>Your Campus, Distilled</Text>
              </View>

              <Text style={styles.storyParagraph}>
                Oryn is an intelligent campus operating system that transforms the chaos of college email inboxes
                into calm, actionable daily clarity. It is designed specifically for students at IIITDM Kancheepuram
                and organizes everything you need — academics, placements, mess menus, hostel circulars, events —
                into a single, beautifully designed interface.
              </Text>

              <View style={styles.quoteBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.systemBlue} />
                <Text style={styles.quoteText}>
                  "No more buried deadlines. No more wrong classrooms. No more walking to the mess hall only to discover a menu change."
                </Text>
              </View>

              <Text style={styles.storyParagraph}>
                Oryn gives you:
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="flash" size={16} color={Colors.systemYellow} style={styles.featureIcon} />
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Instant Email Intelligence</Text>
                    <Text style={styles.featureDesc}>
                      Every campus email is automatically categorized into Academics, Placements, Mess, Hostel, Events and more — instantly, privately, on your device.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="calendar" size={16} color={Colors.systemBlue} style={styles.featureIcon} />
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Live Timetable & Slot Intelligence</Text>
                    <Text style={styles.featureDesc}>
                      Your exact weekly schedule mapped from the institute's complex slot matrix — always current, always on your home screen.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="restaurant" size={16} color={Colors.systemOrange} style={styles.featureIcon} />
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Mess Menu & Meal Tracking</Text>
                    <Text style={styles.featureDesc}>
                      Odd/even week menus with live meal countdowns so you always know what's being served before heading out.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="search" size={16} color={Colors.systemTeal} style={styles.featureIcon} />
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Campus Lost & Found</Text>
                    <Text style={styles.featureDesc}>
                      Integrated lost item postings with campus map pins, image attachments, and direct contact — helping items find their way home.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.systemGreen} style={styles.featureIcon} />
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Privacy-First & Local</Text>
                    <Text style={styles.featureDesc}>
                      Your data stays on your device. No cloud processing, no tracking, no third-party analytics. Your campus, your control.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Crafted with pride at IIITDM Kancheepuram</Text>
            <Text style={styles.footerSub}>© 2026 Oryn · All rights reserved</Text>
          </View>
        </ScrollView>
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
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  closeBtn: {
    padding: Spacing[1],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[12],
    gap: Spacing[5],
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[2],
  },
  logoWrap: {
    marginBottom: Spacing[1],
  },
  heroTitle: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  versionBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    marginTop: Spacing[1],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderMuted,
  },
  versionText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },

  /* Sections */
  section: {
    gap: Spacing[2],
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.widest,
    paddingLeft: Spacing[2],
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },

  /* Developer Profile */
  developerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  devAvatar: {
    width: 50,
    height: 50,
    borderRadius: Radius.full,
    backgroundColor: Colors.systemBlue + '25',
    borderWidth: 1.5,
    borderColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAvatarText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  devInfo: {
    flex: 1,
    gap: 2,
  },
  devName: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  devInstitution: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing[1],
  },
  devBio: {
    fontSize: Typography.size.sm,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2.5],
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
  },

  /* Story / What is Oryn */
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2.5],
    marginBottom: Spacing[1],
  },
  storyIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  storyParagraph: {
    fontSize: Typography.size.sm,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  quoteBox: {
    flexDirection: 'row',
    gap: Spacing[2.5],
    backgroundColor: Colors.surface,
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.systemBlue,
    marginVertical: Spacing[1],
  },
  quoteText: {
    flex: 1,
    fontSize: Typography.size.xs,
    fontStyle: 'italic',
    color: Colors.text,
    lineHeight: 18,
  },
  featureList: {
    gap: Spacing[3],
    marginTop: Spacing[1],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  featureIcon: {
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  featureDesc: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing[4],
  },
  footerText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  footerSub: {
    fontSize: 11,
    color: Colors.textDisabled,
  },
});
