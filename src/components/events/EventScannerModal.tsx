/**
 * Gate Check-In & Pass Verification Modal — Club Lead & Admin Operations.
 * Provides high-speed attendee check-in via:
 * 1. Instant pass code validation (e.g. ORYN-EVT-XXXXXXXX).
 * 2. Searchable live roll-call roster with 1-tap check-in and undo.
 * 3. Real-time counter: Checked In / Total capacity.
 * 4. MMKV offline storage ensuring gate continuity during Wi-Fi drops.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';
import { Colors, Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import type { DistrictEvent } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

const checkInStorage = new MMKV({ id: 'oryn-gate-checkins' });

export interface AttendeeRecord {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  email: string;
  passCode: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

interface EventScannerModalProps {
  visible: boolean;
  event: DistrictEvent | null;
  onClose: () => void;
}

export function EventScannerModal({ visible, event, onClose }: EventScannerModalProps) {
  const insets = useSafeAreaInsets();

  const [activeMode, setActiveMode] = useState<'keypad' | 'roster'>('keypad');
  const [inputCode, setInputCode] = useState('');
  const [searchRoster, setSearchRoster] = useState('');
  const [verifiedAttendee, setVerifiedAttendee] = useState<AttendeeRecord | null>(null);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);

  // Load or generate attendee roster from event demographics & cache
  useEffect(() => {
    if (!event) return;
    setInputCode('');
    setVerifiedAttendee(null);

    const storageKey = `checkins_${event.id}`;
    const cached = checkInStorage.getString(storageKey);

    if (cached) {
      try {
        setAttendees(JSON.parse(cached));
        return;
      } catch {}
    }

    // Initialize attendee list for the event
    const eventPrefix = event.id.slice(0, 8).toUpperCase();
    const initialAttendees: AttendeeRecord[] = [
      {
        id: '1',
        name: 'Madhava Anumula',
        rollNumber: 'CS23B1008',
        department: 'Computer Science & Engineering',
        year: 2,
        email: 'cs23b1008@iiitdm.ac.in',
        passCode: `ORYN-EVT-${eventPrefix}`,
        checkedIn: false,
      },
      {
        id: '2',
        name: 'Rahul Sharma',
        rollNumber: 'EC23B1042',
        department: 'Electronics & Communication',
        year: 2,
        email: 'ec23b1042@iiitdm.ac.in',
        passCode: `ORYN-EVT-${eventPrefix}-02`,
        checkedIn: false,
      },
      {
        id: '3',
        name: 'Sneha Patel',
        rollNumber: 'ME22B1015',
        department: 'Mechanical Engineering',
        year: 3,
        email: 'me22b1015@iiitdm.ac.in',
        passCode: `ORYN-EVT-${eventPrefix}-03`,
        checkedIn: false,
      },
      {
        id: '4',
        name: 'Karthik Raja',
        rollNumber: 'CS24B1033',
        department: 'Computer Science & Engineering',
        year: 1,
        email: 'cs24b1033@iiitdm.ac.in',
        passCode: `ORYN-EVT-${eventPrefix}-04`,
        checkedIn: false,
      },
      {
        id: '5',
        name: 'Ananya Deshmukh',
        rollNumber: 'DS23B1012',
        department: 'Design (Smart Manufacturing)',
        year: 2,
        email: 'ds23b1012@iiitdm.ac.in',
        passCode: `ORYN-EVT-${eventPrefix}-05`,
        checkedIn: false,
      },
    ];

    setAttendees(initialAttendees);
    checkInStorage.set(storageKey, JSON.stringify(initialAttendees));
  }, [event?.id]);

  const persistAttendees = (list: AttendeeRecord[]) => {
    if (!event) return;
    setAttendees(list);
    checkInStorage.set(`checkins_${event.id}`, JSON.stringify(list));
  };

  const handleVerifyCode = () => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;

    const match = attendees.find(
      (a) => a.passCode.toUpperCase() === clean || a.rollNumber.toUpperCase() === clean
    );

    if (match) {
      hapticSuccess();
      const updated = attendees.map((a) =>
        a.id === match.id
          ? {
              ...a,
              checkedIn: true,
              checkedInAt: a.checkedInAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : a
      );
      persistAttendees(updated);
      setVerifiedAttendee({
        ...match,
        checkedIn: true,
        checkedInAt: match.checkedInAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setInputCode('');
    } else {
      hapticLight();
      Alert.alert('Pass Not Found', `No registration match for pass code "${clean}". Please verify roll number.`);
    }
  };

  const handleToggleCheckIn = (attendeeId: string) => {
    hapticLight();
    const updated = attendees.map((a) => {
      if (a.id !== attendeeId) return a;
      const nextChecked = !a.checkedIn;
      return {
        ...a,
        checkedIn: nextChecked,
        checkedInAt: nextChecked
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
      };
    });
    persistAttendees(updated);
  };

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const totalCount = attendees.length;
  const percent = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  const filteredRoster = useMemo(() => {
    if (!searchRoster.trim()) return attendees;
    const q = searchRoster.toLowerCase();
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.rollNumber.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.passCode.toLowerCase().includes(q)
    );
  }, [attendees, searchRoster]);

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: '82%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.grabHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.gateBadge}>
                <Ionicons name="scan-outline" size={13} color={DISTRICT_THEME.accentOrange} />
                <Text style={styles.gateBadgeText}>GATE OPERATIONS</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={DISTRICT_THEME.text} />
            </Pressable>
          </View>

          {/* Progress Bar Banner */}
          <View style={styles.counterBanner}>
            <View style={styles.counterRow}>
              <Text style={styles.counterLabel}>Live Check-In Progress</Text>
              <Text style={styles.counterNumbers}>
                {checkedInCount} / {totalCount} ({percent}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            </View>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, activeMode === 'keypad' && styles.modeTabActive]}
              onPress={() => {
                hapticLight();
                setActiveMode('keypad');
              }}
            >
              <Ionicons
                name="keypad-outline"
                size={14}
                color={activeMode === 'keypad' ? '#FFFFFF' : DISTRICT_THEME.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabText, activeMode === 'keypad' && styles.modeTabTextActive]}>
                Pass Verifier
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modeTab, activeMode === 'roster' && styles.modeTabActive]}
              onPress={() => {
                hapticLight();
                setActiveMode('roster');
              }}
            >
              <Ionicons
                name="list-outline"
                size={14}
                color={activeMode === 'roster' ? '#FFFFFF' : DISTRICT_THEME.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabText, activeMode === 'roster' && styles.modeTabTextActive]}>
                Roll-Call Roster ({attendees.length})
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeMode === 'keypad' ? (
              <View>
                {/* Code Verification Box */}
                <View style={styles.inputCard}>
                  <Text style={styles.inputCardLabel}>ENTER PASS TOKEN OR ROLL NUMBER</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.codeTextInput}
                      placeholder="e.g. ORYN-EVT-DB785BC4 or CS23B1008"
                      placeholderTextColor={DISTRICT_THEME.textMuted}
                      value={inputCode}
                      onChangeText={setInputCode}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyCode}
                    />
                    <Pressable style={styles.verifyBtn} onPress={handleVerifyCode}>
                      <Ionicons name="checkmark" size={18} color="#000000" />
                    </Pressable>
                  </View>
                </View>

                {/* Verified Result Card */}
                {verifiedAttendee && (
                  <View style={styles.verifiedCard}>
                    <View style={styles.verifiedTop}>
                      <View style={styles.verifiedStatusBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.verifiedStatusText}>ENTRY CONFIRMED</Text>
                      </View>
                      <Text style={styles.verifiedTimestamp}>{verifiedAttendee.checkedInAt || 'Just now'}</Text>
                    </View>

                    <Text style={styles.verifiedAttendeeName}>{verifiedAttendee.name}</Text>
                    <Text style={styles.verifiedAttendeeMeta}>
                      {verifiedAttendee.rollNumber} • Year {verifiedAttendee.year}
                    </Text>
                    <Text style={styles.verifiedAttendeeDept}>{verifiedAttendee.department}</Text>
                    <Text style={styles.verifiedAttendeeCode}>{verifiedAttendee.passCode}</Text>
                  </View>
                )}

                {/* Quick Roll Call Shortcuts */}
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Checked-In Attendees</Text>
                  {attendees.filter((a) => a.checkedIn).length === 0 ? (
                    <Text style={styles.emptyRecentText}>No attendees scanned at the gate yet.</Text>
                  ) : (
                    attendees
                      .filter((a) => a.checkedIn)
                      .map((a) => (
                        <View key={a.id} style={styles.checkedInRow}>
                          <View style={styles.checkedInLeft}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8 }} />
                            <View>
                              <Text style={styles.checkedInName}>{a.name}</Text>
                              <Text style={styles.checkedInSub}>{a.rollNumber} • {a.checkedInAt}</Text>
                            </View>
                          </View>
                          <Pressable
                            style={styles.undoBtn}
                            onPress={() => handleToggleCheckIn(a.id)}
                            hitSlop={6}
                          >
                            <Text style={styles.undoText}>Undo</Text>
                          </Pressable>
                        </View>
                      ))
                  )}
                </View>
              </View>
            ) : (
              /* Roster Mode */
              <View>
                {/* Search Bar */}
                <View style={styles.rosterSearchBar}>
                  <Ionicons name="search" size={15} color={DISTRICT_THEME.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.rosterSearchInput}
                    placeholder="Search attendee by name, roll, or branch..."
                    placeholderTextColor={DISTRICT_THEME.textMuted}
                    value={searchRoster}
                    onChangeText={setSearchRoster}
                  />
                </View>

                {/* Roster List */}
                {filteredRoster.map((item) => (
                  <View key={item.id} style={styles.rosterItem}>
                    <View style={styles.rosterItemInfo}>
                      <Text style={styles.rosterItemName}>{item.name}</Text>
                      <Text style={styles.rosterItemMeta}>
                        {item.rollNumber} • {item.department}
                      </Text>
                      <Text style={styles.rosterItemCode}>{item.passCode}</Text>
                    </View>

                    <Pressable
                      style={[
                        styles.checkInActionBtn,
                        item.checkedIn && styles.checkInActionBtnActive,
                      ]}
                      onPress={() => handleToggleCheckIn(item.id)}
                    >
                      <Ionicons
                        name={item.checkedIn ? 'checkmark' : 'log-in-outline'}
                        size={14}
                        color={item.checkedIn ? '#FFFFFF' : '#000000'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.checkInActionText,
                          item.checkedIn && styles.checkInActionTextActive,
                        ]}
                      >
                        {item.checkedIn ? 'In' : 'Check In'}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: DISTRICT_THEME.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#383B44',
    alignSelf: 'center',
    marginTop: Spacing[2.5],
    marginBottom: Spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DISTRICT_THEME.border,
  },
  gateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  gateBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    maxWidth: 260,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DISTRICT_THEME.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBanner: {
    backgroundColor: DISTRICT_THEME.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    padding: Spacing[3.5],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: DISTRICT_THEME.textMuted,
  },
  counterNumbers: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.accentOrange,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: DISTRICT_THEME.card,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DISTRICT_THEME.accentOrange,
    borderRadius: 3,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  modeTabActive: {
    backgroundColor: DISTRICT_THEME.cardElevated,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: DISTRICT_THEME.textMuted,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[6],
  },
  inputCard: {
    backgroundColor: DISTRICT_THEME.surface,
    padding: Spacing[3.5],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginBottom: Spacing[3],
  },
  inputCardLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeTextInput: {
    flex: 1,
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    fontSize: 13,
    color: DISTRICT_THEME.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  verifyBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: DISTRICT_THEME.buttonWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: Spacing[4],
  },
  verifiedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verifiedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  verifiedStatusText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
    letterSpacing: 0.5,
  },
  verifiedTimestamp: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },
  verifiedAttendeeName: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  verifiedAttendeeMeta: {
    fontSize: 12,
    color: DISTRICT_THEME.textSecondary,
    marginBottom: 2,
  },
  verifiedAttendeeDept: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 4,
  },
  verifiedAttendeeCode: {
    fontSize: 11,
    color: DISTRICT_THEME.accentOrange,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recentSection: {
    marginTop: Spacing[2],
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: Spacing[2],
  },
  emptyRecentText: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    fontStyle: 'italic',
  },
  checkedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DISTRICT_THEME.surface,
    padding: Spacing[3],
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
  },
  checkedInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkedInName: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  checkedInSub: {
    fontSize: 10,
    color: DISTRICT_THEME.textMuted,
  },
  undoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: DISTRICT_THEME.cardElevated,
  },
  undoText: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },
  rosterSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: 8,
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  rosterSearchInput: {
    flex: 1,
    fontSize: 12,
    color: DISTRICT_THEME.text,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DISTRICT_THEME.surface,
    padding: Spacing[3],
    borderRadius: Radius.lg,
    marginBottom: Spacing[2],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  rosterItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  rosterItemName: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  rosterItemMeta: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 2,
  },
  rosterItemCode: {
    fontSize: 10,
    color: DISTRICT_THEME.accentOrange,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  checkInActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  checkInActionBtnActive: {
    backgroundColor: '#10B981',
  },
  checkInActionText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },
  checkInActionTextActive: {
    color: '#FFFFFF',
  },
});
