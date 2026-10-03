import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import type { DistrictEvent } from '@/types/events';
import type { AttendeeRecord } from './types';

interface AttendeeRosterViewProps {
  activeEvent: DistrictEvent | null;
  attendees: AttendeeRecord[];
  onToggleAttendee?: (id: string) => void;
}

export function AttendeeRosterView({
  activeEvent,
  attendees,
  onToggleAttendee,
}: AttendeeRosterViewProps) {
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'checkedIn' | 'pending'>('all');
  const [attendeeSearch, setAttendeeSearch] = useState('');

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;

  const filteredAttendees = useMemo(() => {
    let list = attendees;
    if (attendeeFilter === 'checkedIn') list = list.filter((a) => a.checkedIn);
    if (attendeeFilter === 'pending') list = list.filter((a) => !a.checkedIn);
    if (attendeeSearch.trim()) {
      const q = attendeeSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.rollNumber.toLowerCase().includes(q) ||
          a.passCode.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q)
      );
    }
    return list;
  }, [attendees, attendeeFilter, attendeeSearch]);

  const handleExportCSV = async () => {
    if (!activeEvent || attendees.length === 0) {
      Alert.alert('No Attendees', 'There are no attendee records to export.');
      return;
    }

    hapticSuccess();
    const header = 'Name,Roll Number,Department,Year,Email,RSVP Status,Checked In,Checked In Time\n';
    const rows = attendees
      .map(
        (a) =>
          `"${a.name}","${a.rollNumber}","${a.department}",${a.year},"${a.email}","${a.rsvpStatus || 'going'}","${a.checkedIn ? 'YES' : 'NO'}","${a.checkedInAt || ''}"`
      )
      .join('\n');
    const csvContent = header + rows;

    try {
      await Share.share({
        title: `${activeEvent.title} - Attendance Roster`,
        message: csvContent,
      });
    } catch {}
  };

  return (
    <View style={styles.drillDownWrap}>
      <View style={styles.attendeesHeaderCard}>
        <View style={styles.attendeeHeaderTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.cardHeader}>Confirmed Attendee Roster</Text>
            <Text style={styles.inputSub}>
              Official attendance register for faculty advisor and SAC submission.
            </Text>
          </View>
          <Pressable style={styles.exportBtn} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={14} color="#000000" style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </Pressable>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'checkedIn', 'pending'] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterPill, attendeeFilter === f && styles.filterPillActive]}
              onPress={() => {
                hapticLight();
                setAttendeeFilter(f);
              }}
            >
              <Text style={[styles.filterPillText, attendeeFilter === f && styles.filterPillTextActive]}>
                {f === 'all'
                  ? `All (${attendees.length})`
                  : f === 'checkedIn'
                  ? `Checked In (${checkedInCount})`
                  : `Pending (${attendees.length - checkedInCount})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter by name, department, or roll number..."
            placeholderTextColor={Colors.textMuted}
            value={attendeeSearch}
            onChangeText={setAttendeeSearch}
          />
        </View>
      </View>

      {/* List */}
      <View style={styles.attendeeListCard}>
        {filteredAttendees.length === 0 ? (
          <View style={styles.emptyRoster}>
            <Text style={styles.emptyRosterText}>No attendees matching filter.</Text>
          </View>
        ) : (
          filteredAttendees.map((item) => (
            <Pressable
              key={item.id}
              style={styles.attendeeCard}
              onPress={() => onToggleAttendee && onToggleAttendee(item.id)}
            >
              <View style={styles.attendeeAvatar}>
                <Text style={styles.avatarLetter}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attendeeName}>{item.name}</Text>
                <Text style={styles.attendeeSub}>
                  {item.rollNumber} • {item.department} (Y{item.year})
                </Text>
                <Text style={styles.attendeeEmail}>{item.email}</Text>
              </View>
              <View style={[styles.statusBadge, item.checkedIn ? styles.statusBadgeSuccess : styles.statusBadgePending]}>
                <Text style={styles.statusBadgeText}>{item.checkedIn ? 'Admitted' : 'Pending'}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drillDownWrap: {
    gap: Spacing[4],
  },
  attendeesHeaderCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attendeeHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
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
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: Typography.weight.medium,
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
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
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  attendeeListCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyRoster: {
    paddingVertical: Spacing[6],
    alignItems: 'center',
  },
  emptyRosterText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
    gap: 12,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  attendeeSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  attendeeEmail: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgePending: {
    backgroundColor: Colors.surfaceHigh,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
});
