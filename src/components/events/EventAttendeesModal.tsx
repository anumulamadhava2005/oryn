/**
 * Attendee Directory & CSV Export Modal — Club Lead & Admin Tooling.
 * Inspects all registered students for an event and exports official
 * attendance reports to CSV for faculty advisor & SAC compliance.
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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import type { DistrictEvent } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

const checkInStorage = new MMKV({ id: 'oryn-gate-checkins' });

interface AttendeeRow {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  email: string;
  rsvpStatus: 'going' | 'interested';
  checkedIn: boolean;
  checkedInAt?: string;
}

interface EventAttendeesModalProps {
  visible: boolean;
  event: DistrictEvent | null;
  onClose: () => void;
}

export function EventAttendeesModal({ visible, event, onClose }: EventAttendeesModalProps) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);

  useEffect(() => {
    if (!event) return;
    setSearchQuery('');

    const storageKey = `checkins_${event.id}`;
    const cached = checkInStorage.getString(storageKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const rows: AttendeeRow[] = parsed.map((item: any) => ({
          id: item.id,
          name: item.name,
          rollNumber: item.rollNumber,
          department: item.department,
          year: item.year || 2,
          email: item.email || `${item.rollNumber.toLowerCase()}@iiitdm.ac.in`,
          rsvpStatus: 'going',
          checkedIn: Boolean(item.checkedIn),
          checkedInAt: item.checkedInAt,
        }));
        setAttendees(rows);
        return;
      } catch {}
    }

    // Default sample roster if not populated yet
    const sampleRows: AttendeeRow[] = [
      {
        id: '1',
        name: 'Madhava Anumula',
        rollNumber: 'CS23B1008',
        department: 'Computer Science & Engineering',
        year: 2,
        email: 'cs23b1008@iiitdm.ac.in',
        rsvpStatus: 'going',
        checkedIn: true,
        checkedInAt: '10:45 AM',
      },
      {
        id: '2',
        name: 'Rahul Sharma',
        rollNumber: 'EC23B1042',
        department: 'Electronics & Communication',
        year: 2,
        email: 'ec23b1042@iiitdm.ac.in',
        rsvpStatus: 'going',
        checkedIn: false,
      },
      {
        id: '3',
        name: 'Sneha Patel',
        rollNumber: 'ME22B1015',
        department: 'Mechanical Engineering',
        year: 3,
        email: 'me22b1015@iiitdm.ac.in',
        rsvpStatus: 'going',
        checkedIn: true,
        checkedInAt: '11:02 AM',
      },
      {
        id: '4',
        name: 'Karthik Raja',
        rollNumber: 'CS24B1033',
        department: 'Computer Science & Engineering',
        year: 1,
        email: 'cs24b1033@iiitdm.ac.in',
        rsvpStatus: 'interested',
        checkedIn: false,
      },
      {
        id: '5',
        name: 'Ananya Deshmukh',
        rollNumber: 'DS23B1012',
        department: 'Design (Smart Manufacturing)',
        year: 2,
        email: 'ds23b1012@iiitdm.ac.in',
        rsvpStatus: 'going',
        checkedIn: false,
      },
    ];

    setAttendees(sampleRows);
  }, [event?.id]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      if (filter === 'checkedIn' && !a.checkedIn) return false;
      if (filter === 'notCheckedIn' && a.checkedIn) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.rollNumber.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attendees, filter, searchQuery]);

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const totalCount = attendees.length;

  const handleExportCsv = async () => {
    if (!event) return;
    hapticSuccess();

    try {
      // Build CSV content
      const headers = ['Name', 'Roll Number', 'Email', 'Department', 'Year', 'RSVP Status', 'Checked In', 'Check-In Timestamp'];
      const rows = attendees.map((a) => [
        `"${a.name}"`,
        `"${a.rollNumber}"`,
        `"${a.email}"`,
        `"${a.department}"`,
        `"${a.year}"`,
        `"${a.rsvpStatus}"`,
        `"${a.checkedIn ? 'Yes' : 'No'}"`,
        `"${a.checkedInAt || 'N/A'}"`,
      ]);

      const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      // Native share dialog
      await Share.share({
        title: `${event.title} - Attendance Roster.csv`,
        message: csvString,
      });
    } catch (err: any) {
      Alert.alert('Export Notice', err.message || 'Could not export roster file.');
    }
  };

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
              <View style={styles.rosterBadge}>
                <Ionicons name="people" size={13} color="#60A5FA" />
                <Text style={styles.rosterBadgeText}>ATTENDEE ROSTER</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={DISTRICT_THEME.text} />
            </Pressable>
          </View>

          {/* Summary Row + Export Button */}
          <View style={styles.summaryBar}>
            <View style={styles.statsWrap}>
              <Text style={styles.summaryNumbers}>
                {checkedInCount} / {totalCount} Checked In
              </Text>
              <Text style={styles.summarySub}>Total registrations on Oryn</Text>
            </View>

            <Pressable style={styles.exportBtn} onPress={handleExportCsv}>
              <Ionicons name="download-outline" size={15} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color={DISTRICT_THEME.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by student name, roll, or branch..."
              placeholderTextColor={DISTRICT_THEME.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            <Pressable
              style={[styles.pill, filter === 'all' && styles.pillActive]}
              onPress={() => {
                hapticLight();
                setFilter('all');
              }}
            >
              <Text style={[styles.pillText, filter === 'all' && styles.pillTextActive]}>
                All ({attendees.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.pill, filter === 'checkedIn' && styles.pillActive]}
              onPress={() => {
                hapticLight();
                setFilter('checkedIn');
              }}
            >
              <Text style={[styles.pillText, filter === 'checkedIn' && styles.pillTextActive]}>
                Checked In ({checkedInCount})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.pill, filter === 'notCheckedIn' && styles.pillActive]}
              onPress={() => {
                hapticLight();
                setFilter('notCheckedIn');
              }}
            >
              <Text style={[styles.pillText, filter === 'notCheckedIn' && styles.pillTextActive]}>
                Pending ({totalCount - checkedInCount})
              </Text>
            </Pressable>
          </View>

          {/* Attendee List */}
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {filteredAttendees.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="person-outline" size={32} color={DISTRICT_THEME.textMuted} />
                <Text style={styles.emptyTitle}>No matching attendees</Text>
                <Text style={styles.emptySub}>Adjust your search query or filter pills above.</Text>
              </View>
            ) : (
              filteredAttendees.map((att) => (
                <View key={att.id} style={styles.attendeeCard}>
                  <View style={styles.attendeeHeader}>
                    <View style={styles.attendeeAvatar}>
                      <Text style={styles.attendeeAvatarText}>
                        {att.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.attendeeMeta}>
                      <Text style={styles.attendeeName}>{att.name}</Text>
                      <Text style={styles.attendeeSub}>
                        {att.rollNumber} • {att.email}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        att.checkedIn ? styles.statusBadgeChecked : styles.statusBadgePending,
                      ]}
                    >
                      <Ionicons
                        name={att.checkedIn ? 'checkmark-circle' : 'time-outline'}
                        size={12}
                        color={att.checkedIn ? '#10B981' : DISTRICT_THEME.textMuted}
                        style={{ marginRight: 3 }}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          att.checkedIn ? styles.statusBadgeTextChecked : styles.statusBadgeTextPending,
                        ]}
                      >
                        {att.checkedIn ? 'Checked In' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.attendeeFooter}>
                    <Text style={styles.deptText} numberOfLines={1}>{att.department}</Text>
                    {att.checkedInAt && (
                      <Text style={styles.timeText}>Scanned: {att.checkedInAt}</Text>
                    )}
                  </View>
                </View>
              ))
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
  rosterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  rosterBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
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
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DISTRICT_THEME.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    padding: Spacing[3.5],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  statsWrap: {
    flex: 1,
  },
  summaryNumbers: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  summarySub: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginTop: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: DISTRICT_THEME.text,
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[2.5],
    gap: 8,
  },
  pill: {
    backgroundColor: DISTRICT_THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  pillActive: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    borderColor: '#FFFFFF',
  },
  pillText: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    fontWeight: Typography.weight.medium,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[6],
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing[6],
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
    marginTop: 2,
  },
  attendeeCard: {
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    marginBottom: Spacing[2.5],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  attendeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attendeeAvatarText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  attendeeMeta: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  attendeeSub: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeChecked: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgePending: {
    backgroundColor: DISTRICT_THEME.cardElevated,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
  },
  statusBadgeTextChecked: {
    color: '#10B981',
  },
  statusBadgeTextPending: {
    color: DISTRICT_THEME.textMuted,
  },
  attendeeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[2],
    paddingTop: Spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DISTRICT_THEME.border,
  },
  deptText: {
    fontSize: 11,
    color: DISTRICT_THEME.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: Typography.weight.bold,
  },
});
