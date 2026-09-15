/**
 * Notification Preferences Modal
 * Apple HIG Grouped Inset layout for configuring campus notifications,
 * daily briefing cadence, quiet hours, and testing live alerts.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useNotificationPreferencesStore } from '@/store/notificationPreferences';
import {
  sendTestNotification,
  scheduleMorningBriefing,
  scheduleNightlyRadar,
} from '@/services/notifications';
import { hapticLight, hapticSuccess, hapticError } from '@/utils/haptics';

interface NotificationPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({
  visible,
  onClose,
}: NotificationPreferencesModalProps) {
  const insets = useSafeAreaInsets();
  const {
    enabled,
    placements,
    deadlines,
    deadline24h,
    deadline3h,
    deadline1h,
    classCancellations,
    morningBriefing,
    nightlyRadar,
    messAlerts,
    quietHoursEnabled,
    allowCriticalInQuietHours,
    setEnabled,
    setPlacements,
    setDeadlines,
    setDeadline24h,
    setDeadline3h,
    setDeadline1h,
    setClassCancellations,
    setMorningBriefing,
    setNightlyRadar,
    setMessAlerts,
    setQuietHoursEnabled,
    setAllowCriticalInQuietHours,
  } = useNotificationPreferencesStore();

  const [testingType, setTestingType] = useState<string | null>(null);

  const handleTestNotification = async (
    type: 'placement' | 'deadline' | 'cancellation' | 'morning_briefing'
  ) => {
    hapticLight();
    setTestingType(type);
    try {
      await sendTestNotification(type);
      hapticSuccess();
      Alert.alert(
        'Test Notification Sent',
        'Check your notification shade or lock screen to test interactive actions like "Mark as Read" or "Snooze".'
      );
    } catch (err: any) {
      hapticError();
      Alert.alert('Notification Error', err?.message || 'Failed to send test notification');
    } finally {
      setTestingType(null);
    }
  };

  const handleToggleMorning = (val: boolean) => {
    hapticLight();
    setMorningBriefing(val);
    setTimeout(() => {
      scheduleMorningBriefing().catch(() => {});
    }, 100);
  };

  const handleToggleNightly = (val: boolean) => {
    hapticLight();
    setNightlyRadar(val);
    setTimeout(() => {
      scheduleNightlyRadar().catch(() => {});
    }, 100);
  };

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
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications & Alerts</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Customize how Oryn alerts you to critical academic deadlines, placement test links, and your daily schedule.
          </Text>

          {/* Master Toggle */}
          <View style={styles.section}>
            <View style={styles.cardGroup}>
              <View style={[styles.rowItem, styles.noBorder]}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBox, { backgroundColor: Colors.systemPurple }]}>
                    <Ionicons name="notifications" size={16} color={Colors.white} />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={styles.rowTitle}>Allow Notifications</Text>
                    <Text style={styles.rowDescription}>
                      Enable campus alerts and smart reminders
                    </Text>
                  </View>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(val) => {
                    hapticLight();
                    setEnabled(val);
                  }}
                  trackColor={{ false: Colors.surfaceElevated, true: Colors.systemPurple }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>
          </View>

          {enabled && (
            <>
              {/* Section 1: High-Stakes Career & Academics */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>HIGH-STAKES ALERTS</Text>
                <View style={styles.cardGroup}>
                  {/* Placement Siren */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemRed }]}>
                        <Ionicons name="briefcase" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Placements & Career Drives</Text>
                        <Text style={styles.rowDescription}>
                          High-priority siren for coding test links, shortlists & deadlines
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={placements}
                      onValueChange={(v) => {
                        hapticLight();
                        setPlacements(v);
                      }}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemRed }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {/* Class Cancellations */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemOrange }]}>
                        <Ionicons name="megaphone" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Class Cancellations & Reschedules</Text>
                        <Text style={styles.rowDescription}>
                          Instant heads-up when faculty cancels or changes rooms
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={classCancellations}
                      onValueChange={(v) => {
                        hapticLight();
                        setClassCancellations(v);
                      }}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemOrange }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {/* Deadline Master */}
                  <View style={[styles.rowItem, !deadlines && styles.noBorder]}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemOrange }]}>
                        <Ionicons name="time" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Deadline Countdowns</Text>
                        <Text style={styles.rowDescription}>
                          Multi-stage warnings before portal closures
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={deadlines}
                      onValueChange={(v) => {
                        hapticLight();
                        setDeadlines(v);
                      }}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemOrange }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {/* Deadline Sub-Stages */}
                  {deadlines && (
                    <View style={styles.subStageContainer}>
                      <View style={styles.subStageRow}>
                        <Text style={styles.subStageLabel}>⏳ 24 Hours Before</Text>
                        <Switch
                          value={deadline24h}
                          onValueChange={(v) => {
                            hapticLight();
                            setDeadline24h(v);
                          }}
                          trackColor={{ false: Colors.surfaceElevated, true: Colors.systemOrange }}
                          thumbColor={Colors.white}
                        />
                      </View>

                      <View style={styles.subStageRow}>
                        <Text style={styles.subStageLabel}>⚠️ 3 Hours Before</Text>
                        <Switch
                          value={deadline3h}
                          onValueChange={(v) => {
                            hapticLight();
                            setDeadline3h(v);
                          }}
                          trackColor={{ false: Colors.surfaceElevated, true: Colors.systemOrange }}
                          thumbColor={Colors.white}
                        />
                      </View>

                      <View style={[styles.subStageRow, styles.noBorder]}>
                        <Text style={styles.subStageLabel}>🚨 1 Hour Before</Text>
                        <Switch
                          value={deadline1h}
                          onValueChange={(v) => {
                            hapticLight();
                            setDeadline1h(v);
                          }}
                          trackColor={{ false: Colors.surfaceElevated, true: Colors.systemOrange }}
                          thumbColor={Colors.white}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Section 2: Daily Briefings & Habit Loops */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>DAILY SCHEDULE & ROUTINE</Text>
                <View style={styles.cardGroup}>
                  {/* Morning Briefing */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemBlue }]}>
                        <Ionicons name="sunny" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Morning Briefing (8:00 AM)</Text>
                        <Text style={styles.rowDescription}>
                          Summary of today's lectures, labs & upcoming deadlines
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={morningBriefing}
                      onValueChange={handleToggleMorning}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemBlue }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {/* Nightly Radar */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemIndigo }]}>
                        <Ionicons name="moon" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Nightly Radar (9:30 PM)</Text>
                        <Text style={styles.rowDescription}>
                          Preview of tomorrow's schedule and pending tasks
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={nightlyRadar}
                      onValueChange={handleToggleNightly}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemIndigo }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {/* Mess Alerts */}
                  <View style={[styles.rowItem, styles.noBorder]}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemGreen }]}>
                        <Ionicons name="restaurant" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Mess & Dining Alerts</Text>
                        <Text style={styles.rowDescription}>
                          Menu updates and special feast announcements
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={messAlerts}
                      onValueChange={(v) => {
                        hapticLight();
                        setMessAlerts(v);
                      }}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemGreen }}
                      thumbColor={Colors.white}
                    />
                  </View>
                </View>
              </View>

              {/* Section 3: Quiet Hours (DND) */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>QUIET HOURS (DO NOT DISTURB)</Text>
                <View style={styles.cardGroup}>
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: Colors.systemGray }]}>
                        <Ionicons name="bed" size={16} color={Colors.white} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.rowTitle}>Night Silence (11 PM – 7 AM)</Text>
                        <Text style={styles.rowDescription}>
                          Mute routine emails while sleeping
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={quietHoursEnabled}
                      onValueChange={(v) => {
                        hapticLight();
                        setQuietHoursEnabled(v);
                      }}
                      trackColor={{ false: Colors.surfaceElevated, true: Colors.systemPurple }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {quietHoursEnabled && (
                    <View style={[styles.rowItem, styles.noBorder]}>
                      <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: Colors.systemRed }]}>
                          <Ionicons name="shield-checkmark" size={16} color={Colors.white} />
                        </View>
                        <View style={styles.textWrap}>
                          <Text style={styles.rowTitle}>Allow Placement & Critical</Text>
                          <Text style={styles.rowDescription}>
                            Let urgent test links and placement notices bypass silence
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={allowCriticalInQuietHours}
                        onValueChange={(v) => {
                          hapticLight();
                          setAllowCriticalInQuietHours(v);
                        }}
                        trackColor={{ false: Colors.surfaceElevated, true: Colors.systemRed }}
                        thumbColor={Colors.white}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Section 4: Live Test Simulator */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>LIVE NOTIFICATION SIMULATOR</Text>
                <Text style={styles.simulatorHint}>
                  Tap below to simulate how alerts appear with custom vibrations, priority sounds, and lock screen actions.
                </Text>
                <View style={styles.cardGroup}>
                  <Pressable
                    onPress={() => handleTestNotification('placement')}
                    disabled={!!testingType}
                    style={({ pressed }) => [styles.testBtnRow, pressed && styles.btnPressed]}
                  >
                    <View style={styles.testBtnLeft}>
                      <Ionicons name="briefcase-outline" size={16} color={Colors.systemRed} />
                      <Text style={styles.testBtnText}>Test Placement Siren (Urgent)</Text>
                    </View>
                    {testingType === 'placement' ? (
                      <ActivityIndicator size="small" color={Colors.systemRed} />
                    ) : (
                      <Ionicons name="paper-plane-outline" size={16} color={Colors.textMuted} />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleTestNotification('deadline')}
                    disabled={!!testingType}
                    style={({ pressed }) => [styles.testBtnRow, pressed && styles.btnPressed]}
                  >
                    <View style={styles.testBtnLeft}>
                      <Ionicons name="time-outline" size={16} color={Colors.systemOrange} />
                      <Text style={styles.testBtnText}>Test 3-Hour Deadline Alert</Text>
                    </View>
                    {testingType === 'deadline' ? (
                      <ActivityIndicator size="small" color={Colors.systemOrange} />
                    ) : (
                      <Ionicons name="paper-plane-outline" size={16} color={Colors.textMuted} />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleTestNotification('cancellation')}
                    disabled={!!testingType}
                    style={({ pressed }) => [styles.testBtnRow, pressed && styles.btnPressed]}
                  >
                    <View style={styles.testBtnLeft}>
                      <Ionicons name="megaphone-outline" size={16} color={Colors.systemOrange} />
                      <Text style={styles.testBtnText}>Test Class Cancellation</Text>
                    </View>
                    {testingType === 'cancellation' ? (
                      <ActivityIndicator size="small" color={Colors.systemOrange} />
                    ) : (
                      <Ionicons name="paper-plane-outline" size={16} color={Colors.textMuted} />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleTestNotification('morning_briefing')}
                    disabled={!!testingType}
                    style={({ pressed }) => [styles.testBtnRow, styles.noBorder, pressed && styles.btnPressed]}
                  >
                    <View style={styles.testBtnLeft}>
                      <Ionicons name="sunny-outline" size={16} color={Colors.systemBlue} />
                      <Text style={styles.testBtnText}>Test Morning Schedule Briefing</Text>
                    </View>
                    {testingType === 'morning_briefing' ? (
                      <ActivityIndicator size="small" color={Colors.systemBlue} />
                    ) : (
                      <Ionicons name="paper-plane-outline" size={16} color={Colors.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}

          <View style={{ height: Spacing[8] }} />
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
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  closeBtn: {
    padding: Spacing[1],
  },
  doneBtn: {
    padding: Spacing[1],
  },
  doneText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemPurple,
  },
  content: {
    padding: Spacing[4],
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing[4],
    lineHeight: 18,
  },
  section: {
    marginBottom: Spacing[5],
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing[1],
    marginLeft: Spacing[1],
  },
  cardGroup: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing[3],
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  textWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  rowDescription: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  subStageContainer: {
    backgroundColor: 'rgba(255, 149, 0, 0.05)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingLeft: Spacing[6],
  },
  subStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  subStageLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
  simulatorHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: Spacing[1],
    marginLeft: Spacing[1],
  },
  testBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  testBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  testBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text,
  },
  btnPressed: {
    backgroundColor: Colors.cardHover,
  },
});
