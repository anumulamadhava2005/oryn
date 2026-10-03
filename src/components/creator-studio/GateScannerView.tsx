import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticMedium, hapticSuccess } from '@/utils/haptics';
import type { DistrictEvent } from '@/types/events';
import type { AttendeeRecord, StudioView } from './types';

interface GateScannerViewProps {
  activeEvent: DistrictEvent | null;
  attendees: AttendeeRecord[];
  onSaveAttendees: (newAttendees: AttendeeRecord[]) => void;
  onNavigateView: (view: StudioView) => void;
}

export function GateScannerView({
  activeEvent,
  attendees,
  onSaveAttendees,
  onNavigateView,
}: GateScannerViewProps) {
  const [gateMode, setGateMode] = useState<'keypad' | 'roster'>('keypad');
  const [inputCode, setInputCode] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [verifiedAttendee, setVerifiedAttendee] = useState<AttendeeRecord | null>(null);

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const totalAttendeeCount = attendees.length;
  const gatePercent = totalAttendeeCount > 0 ? Math.round((checkedInCount / totalAttendeeCount) * 100) : 0;

  // Filtered Roster for search
  const filteredAttendees = useMemo(() => {
    if (!rosterSearch.trim()) return attendees;
    const q = rosterSearch.toLowerCase();
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.rollNumber.toLowerCase().includes(q) ||
        a.passCode.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q)
    );
  }, [attendees, rosterSearch]);

  const handleVerifyCode = () => {
    if (!inputCode.trim()) return;
    hapticMedium();
    const clean = inputCode.trim().toUpperCase();

    const match = attendees.find(
      (a) => a.passCode.toUpperCase() === clean || a.rollNumber.toUpperCase() === clean
    );

    if (match) {
      if (match.checkedIn) {
        setVerifiedAttendee(match);
        Alert.alert('Already Checked In', `${match.name} (${match.rollNumber}) was checked in at ${match.checkedInAt || 'Gate'}.`);
        return;
      }

      const nowStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const updated = attendees.map((a) =>
        a.id === match.id ? { ...a, checkedIn: true, checkedInAt: nowStr } : a
      );
      onSaveAttendees(updated);
      setVerifiedAttendee({ ...match, checkedIn: true, checkedInAt: nowStr });
      setInputCode('');
      hapticSuccess();
    } else {
      hapticLight();
      Alert.alert('Pass Not Found', `No registered attendee matched code: "${clean}".`);
    }
  };

  const handleToggleAttendee = (id: string) => {
    hapticLight();
    const target = attendees.find((a) => a.id === id);
    if (!target) return;
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const nextStatus = !target.checkedIn;
    const updated = attendees.map((a) =>
      a.id === id ? { ...a, checkedIn: nextStatus, checkedInAt: nextStatus ? nowStr : undefined } : a
    );
    onSaveAttendees(updated);
  };

  if (!activeEvent) {
    return (
      <View style={styles.drillDownWrap}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Event Selected</Text>
          <Text style={styles.emptySubtitle}>Please publish an event first to start checking in attendees.</Text>
          <Pressable style={styles.emptyActionBtn} onPress={() => onNavigateView('publish')}>
            <Text style={styles.emptyActionBtnText}>+ Publish Event</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.drillDownWrap}>
      {/* Gate Progress Meter */}
      <View style={styles.gateProgressCard}>
        <View style={styles.gateProgressHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="scan-outline" size={16} color={Colors.text} />
            <Text style={styles.gateProgressTitle}>Gate Admission Roster</Text>
          </View>
          <Text style={styles.gateProgressPercent}>{gatePercent}% Admitted</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${gatePercent}%` }]} />
        </View>
        <Text style={styles.progressSubtext}>
          {checkedInCount} of {totalAttendeeCount} attendees checked in
        </Text>
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeSwitcherWrap}>
        <Pressable
          style={[styles.modeBtn, gateMode === 'keypad' && styles.modeBtnActive]}
          onPress={() => {
            hapticLight();
            setGateMode('keypad');
          }}
        >
          <Ionicons name="keypad-outline" size={14} color={gateMode === 'keypad' ? '#1A1A1A' : Colors.textMuted} />
          <Text style={[styles.modeBtnText, gateMode === 'keypad' && styles.modeBtnTextActive]}>
            Pass Code Keypad
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, gateMode === 'roster' && styles.modeBtnActive]}
          onPress={() => {
            hapticLight();
            setGateMode('roster');
          }}
        >
          <Ionicons name="list-outline" size={14} color={gateMode === 'roster' ? '#1A1A1A' : Colors.textMuted} />
          <Text style={[styles.modeBtnText, gateMode === 'roster' && styles.modeBtnTextActive]}>
            Live Roster Check-In
          </Text>
        </Pressable>
      </View>

      {/* Keypad Mode */}
      {gateMode === 'keypad' && (
        <View style={styles.keypadCard}>
          <Text style={styles.cardHeader}>Verify Student Pass</Text>
          <Text style={styles.inputSub}>
            Enter the 8-character event pass code or student roll number from their ticket.
          </Text>

          <View style={styles.codeInputRow}>
            <TextInput
              style={styles.codeTextInput}
              placeholder="e.g. ORYN-EVT-XXXX or CS23B1042"
              placeholderTextColor={Colors.textMuted}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable style={styles.verifyBtn} onPress={handleVerifyCode}>
              <Text style={styles.verifyBtnText}>Verify</Text>
            </Pressable>
          </View>

          {verifiedAttendee && (
            <View style={styles.verifiedResultBox}>
              <View style={styles.verifiedHeaderRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.verifiedName}>{verifiedAttendee.name}</Text>
              </View>
              <Text style={styles.verifiedMeta}>
                {verifiedAttendee.rollNumber} • {verifiedAttendee.department} (Y{verifiedAttendee.year})
              </Text>
              <Text style={styles.verifiedTime}>
                Checked in at {verifiedAttendee.checkedInAt || 'Gate'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Roster Search Mode */}
      {gateMode === 'roster' && (
        <View style={styles.rosterCard}>
          <View style={styles.searchBarWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search student name, roll number, or pass code..."
              placeholderTextColor={Colors.textMuted}
              value={rosterSearch}
              onChangeText={setRosterSearch}
            />
          </View>

          {filteredAttendees.length === 0 ? (
            <View style={styles.emptyRoster}>
              <Text style={styles.emptyRosterText}>No attendees matching query.</Text>
            </View>
          ) : (
            filteredAttendees.map((item) => (
              <View key={item.id} style={styles.rosterRow}>
                <View style={styles.rosterInfo}>
                  <Text style={styles.rosterName}>{item.name}</Text>
                  <Text style={styles.rosterSub}>
                    {item.rollNumber} • {item.department} (Y{item.year})
                  </Text>
                  {item.checkedIn && (
                    <Text style={styles.checkedInTime}>Verified at {item.checkedInAt || 'Gate'}</Text>
                  )}
                </View>

                <Pressable
                  style={[styles.rosterActionBtn, item.checkedIn && styles.rosterActionBtnActive]}
                  onPress={() => handleToggleAttendee(item.id)}
                >
                  <Ionicons
                    name={item.checkedIn ? 'checkmark-circle' : 'radio-button-off'}
                    size={14}
                    color={item.checkedIn ? '#10B981' : Colors.textMuted}
                  />
                  <Text style={[styles.rosterActionText, item.checkedIn && styles.rosterActionTextActive]}>
                    {item.checkedIn ? 'Checked In' : 'Check In'}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  drillDownWrap: {
    gap: Spacing[4],
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
  emptyActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  gateProgressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gateProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gateProgressTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  gateProgressPercent: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeSwitcherWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 3,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  modeBtnTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  keypadCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  inputSub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: Spacing[3.5],
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeTextInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  verifyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  verifiedResultBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    marginTop: Spacing[3.5],
  },
  verifiedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  verifiedName: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  verifiedMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  verifiedTime: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: Typography.weight.medium,
  },
  rosterCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[3],
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  emptyRoster: {
    paddingVertical: Spacing[6],
    alignItems: 'center',
  },
  emptyRosterText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  rosterInfo: {
    flex: 1,
    marginRight: 10,
  },
  rosterName: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  rosterSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  checkedInTime: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },
  rosterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rosterActionBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rosterActionText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  rosterActionTextActive: {
    color: '#10B981',
    fontWeight: Typography.weight.bold,
  },
});
