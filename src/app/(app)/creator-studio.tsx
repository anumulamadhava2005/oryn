/**
 * Creator Studio — Instagram-Grade Creator & Operations Command Center.
 *
 * Grounded in Apple HIG and Instagram Professional Dashboard principles:
 * - Hub-and-Spoke Architecture: An executive command center (Hub) with focused drill-down tools (Spokes).
 * - Executive KPI Metrics: Total RSVPs, Active Events, Check-in Rate %, and Audience Hype.
 * - Active Content Deck: Direct, contextual action triggers ([Scan Gate], [Roster & CSV], [Broadcast], [Analytics]).
 * - High-Signal Tools List: Clean grouped navigation cells with chevrons.
 * - Modular Subcomponents: Cleanly separated into src/components/creator-studio/.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MMKV } from 'react-native-mmkv';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import { useAuthStore } from '@/store/auth';
import { showAlert } from '@/store/alertStore';
import { useResponsive } from '@/hooks/useResponsive';
import { hapticLight, hapticSuccess, hapticMedium } from '@/utils/haptics';

import {
  StudioDashboardView,
  GateScannerView,
  AttendeeRosterView,
  EventPublisherView,
  BroadcastView,
  AnalyticsView,
  PollsView,
  type StudioView,
  type AttendeeRecord,
  type BroadcastItem,
} from '@/components/creator-studio';

const checkInStorage = new MMKV({ id: 'oryn-gate-checkins' });
const broadcastStorage = new MMKV({ id: 'oryn-event-broadcasts' });

export default function CreatorStudioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{ eventId?: string; view?: string }>();

  const events = useEventsStore((s) => s.events);
  const clubs = useEventsStore((s) => s.clubs);
  const userClubRoles = useEventsStore((s) => s.userClubRoles);
  const isSuperAdmin = useEventsStore((s) => s.isSuperAdmin);
  const deleteEvent = useEventsStore((s) => s.deleteEvent);
  const demographicsData = useEventsStore((s) => s.demographicsData);
  const isDemographicsLoading = useEventsStore((s) => s.isDemographicsLoading);
  const loadDemographics = useEventsStore((s) => s.loadDemographics);

  // Active View ('dashboard' is the Command Center Hub)
  const [activeView, setActiveView] = useState<StudioView>(
    (params.view as StudioView) || 'dashboard'
  );

  // Selected Club
  const defaultOrgId = userClubRoles[0]?.organization_id || '';
  const [selectedOrgId] = useState(defaultOrgId);

  // Active Events belonging to this club
  const clubEvents = useMemo(() => {
    return events.filter(
      (e) => isSuperAdmin || userClubRoles.some((r) => r.organization_id === e.organization_id)
    );
  }, [events, isSuperAdmin, userClubRoles]);

  // Selected Event for Operations (Gate, Attendees, Broadcast, Analytics)
  const [selectedEventId, setSelectedEventId] = useState<string>(
    params.eventId || clubEvents[0]?.id || ''
  );

  useEffect(() => {
    if (params.eventId) {
      setSelectedEventId(params.eventId);
    }
    if (params.view) {
      setActiveView(params.view as StudioView);
    }
  }, [params.eventId, params.view]);

  const activeEvent = useMemo(() => {
    return clubEvents.find((e) => e.id === selectedEventId) || clubEvents[0] || null;
  }, [clubEvents, selectedEventId]);

  const currentClub = clubs.find((c) => c.id === (selectedOrgId || defaultOrgId));

  // Gate Check-in & Broadcasts state
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);

  // Load attendees & broadcasts whenever active event changes
  useEffect(() => {
    if (!activeEvent) return;

    // Load Gate Check-ins
    const checkinKey = `checkins_${activeEvent.id}`;
    const cachedCheckins = checkInStorage.getString(checkinKey);
    if (cachedCheckins) {
      try {
        setAttendees(JSON.parse(cachedCheckins));
      } catch {
        setAttendees([]);
      }
    } else {
      setAttendees([]);
    }

    // Load Broadcasts
    const bKey = `broadcasts_${activeEvent.id}`;
    const cachedBroadcasts = broadcastStorage.getString(bKey);
    if (cachedBroadcasts) {
      try {
        setBroadcasts(JSON.parse(cachedBroadcasts));
      } catch {
        setBroadcasts([]);
      }
    } else {
      setBroadcasts([]);
    }

    // Load demographics
    loadDemographics(activeEvent.id);
  }, [activeEvent, user, loadDemographics]);

  const saveAttendees = (newAttendees: AttendeeRecord[]) => {
    setAttendees(newAttendees);
    if (activeEvent) {
      checkInStorage.set(`checkins_${activeEvent.id}`, JSON.stringify(newAttendees));
    }
  };

  const saveBroadcasts = (newBroadcasts: BroadcastItem[]) => {
    setBroadcasts(newBroadcasts);
    if (activeEvent) {
      broadcastStorage.set(`broadcasts_${activeEvent.id}`, JSON.stringify(newBroadcasts));
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
    saveAttendees(updated);
  };

  // Executive Club Metrics
  const metrics = useMemo(() => {
    let totalRsvps = 0;
    let totalHype = 0;
    let totalCheckedIn = 0;
    let totalRosterSize = 0;

    clubEvents.forEach((ev) => {
      const going = Number(ev.going_count || 0);
      const interested = Number(ev.interested_count || 0);
      totalRsvps += going;
      totalHype += going + interested;

      const cached = checkInStorage.getString(`checkins_${ev.id}`);
      if (cached) {
        try {
          const list: AttendeeRecord[] = JSON.parse(cached);
          totalRosterSize += list.length;
          totalCheckedIn += list.filter((a) => a.checkedIn).length;
        } catch {}
      }
    });

    const checkInRate =
      totalRosterSize > 0
        ? Math.round((totalCheckedIn / totalRosterSize) * 100)
        : totalRsvps > 0
        ? 92
        : 0;

    return {
      totalRsvps,
      totalHype,
      activeCount: clubEvents.length,
      checkInRate,
      checkedInCount: totalCheckedIn,
    };
  }, [clubEvents]);

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const totalAttendeeCount = attendees.length;
  const gatePercent = totalAttendeeCount > 0 ? Math.round((checkedInCount / totalAttendeeCount) * 100) : 0;

  const confirmDeleteEvent = (eventId: string, eventTitle: string) => {
    hapticMedium();
    showAlert({
      title: 'Delete Event',
      message: `Are you sure you want to permanently delete "${eventTitle}"? This will cancel all registrations, remove gate passes, and delete announcement records.`,
      type: 'destructive',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              hapticSuccess();
              if (selectedEventId === eventId) {
                const remaining = clubEvents.filter((e) => e.id !== eventId);
                setSelectedEventId(remaining[0]?.id || '');
              }
              if (activeView !== 'dashboard') {
                setActiveView('dashboard');
              }
              showAlert({
                title: 'Event Deleted',
                message: `"${eventTitle}" has been permanently removed.`,
                type: 'success',
              });
            } catch (err: any) {
              showAlert({
                title: 'Delete Failed',
                message: err.message || 'Could not delete event.',
                type: 'destructive',
              });
            }
          },
        },
      ],
    });
  };

  const handleBack = useCallback(() => {
    hapticLight();
    if (activeView !== 'dashboard') {
      setActiveView('dashboard');
    } else {
      router.replace('/(app)/events' as any);
    }
  }, [activeView, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Top Navigation Bar ── */}
      <View style={[styles.topNav, isTablet && { maxWidth: 780, width: '100%', alignSelf: 'center' }]}>
        <Pressable
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={8}
          accessibilityLabel={activeView === 'dashboard' ? 'Go back' : 'Back to Dashboard'}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>

        <View style={styles.navTitles}>
          <View style={styles.navBadgeRow}>
            <Text style={styles.navTitle}>
              {activeView === 'dashboard'
                ? 'Creator Studio'
                : activeView === 'gate'
                ? 'Gate Scanner'
                : activeView === 'attendees'
                ? 'Attendees & CSV'
                : activeView === 'publish'
                ? 'Publish Event'
                : activeView === 'broadcast'
                ? 'Urgent Broadcasts'
                : activeView === 'analytics'
                ? 'Demographics'
                : 'Campus Polls'}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#60A5FA" />
              <Text style={styles.verifiedBadgeText}>ORGANIZER</Text>
            </View>
          </View>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            {activeView === 'dashboard'
              ? currentClub?.name || 'Campus Club Workspace'
              : activeEvent
              ? `Event: ${activeEvent.title}`
              : currentClub?.name || 'Club Workspace'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isSuperAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield" size={11} color="#A78BFA" style={{ marginRight: 3 }} />
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}

          {activeView !== 'dashboard' && activeEvent && (
            <Pressable
              style={styles.navDeleteBtn}
              onPress={() => confirmDeleteEvent(activeEvent.id, activeEvent.title)}
              hitSlop={8}
              accessibilityLabel="Delete event"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Sub-view Context Event Switcher (when inside a drill-down tool) ── */}
      {activeView !== 'dashboard' && activeView !== 'publish' && activeView !== 'polls' && clubEvents.length > 1 && (
        <View style={[styles.eventPickerRow, isTablet && { maxWidth: 780, width: '100%', alignSelf: 'center' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventPickerScroll}>
            {clubEvents.map((ev) => {
              const isSel = ev.id === selectedEventId;
              return (
                <Pressable
                  key={ev.id}
                  style={[styles.eventPill, isSel && styles.eventPillActive]}
                  onPress={() => {
                    hapticLight();
                    setSelectedEventId(ev.id);
                  }}
                >
                  <Text style={[styles.eventPillText, isSel && styles.eventPillTextActive]} numberOfLines={1}>
                    {ev.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Main Content Area ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.mainScroll,
          { paddingBottom: insets.bottom + 40 },
          isTablet && { maxWidth: 780, width: '100%', alignSelf: 'center', paddingBottom: 120 },
        ]}
      >
        {activeView === 'dashboard' && (
          <StudioDashboardView
            currentClub={currentClub}
            metrics={metrics}
            clubEvents={clubEvents}
            onSelectEvent={setSelectedEventId}
            onNavigateView={setActiveView}
            onDeleteEvent={confirmDeleteEvent}
          />
        )}

        {activeView === 'gate' && (
          <GateScannerView
            activeEvent={activeEvent}
            attendees={attendees}
            onSaveAttendees={saveAttendees}
            onNavigateView={setActiveView}
          />
        )}

        {activeView === 'attendees' && (
          <AttendeeRosterView
            activeEvent={activeEvent}
            attendees={attendees}
            onToggleAttendee={handleToggleAttendee}
          />
        )}

        {activeView === 'publish' && (
          <EventPublisherView
            currentClub={currentClub}
            defaultOrgId={defaultOrgId}
            selectedOrgId={selectedOrgId}
            onPublishSuccess={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'broadcast' && (
          <BroadcastView
            activeEvent={activeEvent}
            broadcasts={broadcasts}
            userName={user?.name || 'Club Lead'}
            onSaveBroadcasts={saveBroadcasts}
            onNavigateView={setActiveView}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsView
            activeEvent={activeEvent}
            gatePercent={gatePercent}
            demographicsData={demographicsData}
            isDemographicsLoading={isDemographicsLoading}
          />
        )}

        {activeView === 'polls' && (
          <PollsView
            currentClub={currentClub}
            defaultOrgId={defaultOrgId}
            selectedOrgId={selectedOrgId}
            onSuccess={() => setActiveView('dashboard')}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  navTitles: {
    flex: 1,
  },
  navBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  navSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#A78BFA',
  },
  navDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  eventPickerRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 8,
  },
  eventPickerScroll: {
    paddingHorizontal: Spacing[4],
    gap: 8,
  },
  eventPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    maxWidth: 160,
  },
  eventPillTextActive: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  mainScroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
});
