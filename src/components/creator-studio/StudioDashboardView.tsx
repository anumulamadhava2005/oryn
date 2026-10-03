import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import type { DistrictEvent, Club } from '@/types/events';
import { formatEventDate, type StudioView } from './types';

interface StudioDashboardViewProps {
  currentClub: Club | undefined;
  metrics: {
    totalRsvps: number;
    totalHype: number;
    activeCount: number;
    checkInRate: number;
    checkedInCount: number;
  };
  clubEvents: DistrictEvent[];
  onSelectEvent: (id: string) => void;
  onNavigateView: (view: StudioView) => void;
  onDeleteEvent: (id: string, title: string) => void;
}

export function StudioDashboardView({
  currentClub,
  metrics,
  clubEvents,
  onSelectEvent,
  onNavigateView,
  onDeleteEvent,
}: StudioDashboardViewProps) {
  return (
    <View style={styles.dashboardWrap}>
      {/* 1. Club Profile Header Banner */}
      <View style={styles.clubProfileCard}>
        <View style={styles.clubProfileAvatar}>
          {currentClub?.logo_url ? (
            <Image source={{ uri: currentClub.logo_url }} style={styles.clubLogoImg} />
          ) : (
            <Text style={styles.clubAvatarLetter}>
              {currentClub?.name ? currentClub.name.charAt(0).toUpperCase() : 'C'}
            </Text>
          )}
        </View>
        <View style={styles.clubProfileInfo}>
          <View style={styles.clubNameRow}>
            <Text style={styles.clubNameText} numberOfLines={1}>
              {currentClub?.name || 'Your Campus Club'}
            </Text>
            <Ionicons name="checkmark-circle" size={15} color="#60A5FA" />
          </View>
          <Text style={styles.clubCategoryText}>
            {currentClub?.category || 'Student Organization'} • {currentClub?.followers_count || 0} Followers
          </Text>
          <View style={styles.clubRoleTag}>
            <Text style={styles.clubRoleTagText}>Club Head / Lead Workspace</Text>
          </View>
        </View>
      </View>

      {/* 2. Executive KPI Metrics Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiIconBox}>
            <Ionicons name="people-outline" size={16} color={Colors.text} />
          </View>
          <Text style={styles.kpiValue}>{metrics.totalRsvps}</Text>
          <Text style={styles.kpiLabel}>TOTAL RSVPS</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiIconBox}>
            <Ionicons name="calendar-outline" size={16} color={Colors.text} />
          </View>
          <Text style={styles.kpiValue}>{metrics.activeCount}</Text>
          <Text style={styles.kpiLabel}>EVENTS</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiIconBox}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
          </View>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>{metrics.checkInRate}%</Text>
          <Text style={styles.kpiLabel}>CHECK-IN RATE</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiIconBox}>
            <Ionicons name="flame-outline" size={16} color={Colors.text} />
          </View>
          <Text style={styles.kpiValue}>{metrics.totalHype}</Text>
          <Text style={styles.kpiLabel}>CAMPUS HYPE</Text>
        </View>
      </View>

      {/* 3. Primary Quick Actions Bar */}
      <View style={styles.quickActionsRow}>
        <Pressable
          style={styles.quickActionPrimary}
          onPress={() => {
            hapticMedium();
            onNavigateView('publish');
          }}
        >
          <Ionicons name="add" size={18} color="#000000" style={{ marginRight: 4 }} />
          <Text style={styles.quickActionPrimaryText}>New Event</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionSecondary}
          onPress={() => {
            hapticLight();
            onNavigateView('polls');
          }}
        >
          <Ionicons name="bar-chart-outline" size={15} color={Colors.text} style={{ marginRight: 6 }} />
          <Text style={styles.quickActionSecondaryText}>Campus Poll</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionSecondary}
          onPress={() => {
            hapticLight();
            if (clubEvents.length > 0) {
              onNavigateView('broadcast');
            } else {
              onNavigateView('publish');
            }
          }}
        >
          <Ionicons name="megaphone-outline" size={15} color={Colors.text} style={{ marginRight: 6 }} />
          <Text style={styles.quickActionSecondaryText}>Broadcast</Text>
        </Pressable>
      </View>

      {/* 4. Active & Upcoming Events Content Deck */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>YOUR EVENTS</Text>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>{clubEvents.length}</Text>
          </View>
        </View>

        {clubEvents.length === 0 ? (
          <View style={styles.emptyEventsDeckCard}>
            <View style={styles.emptyDeckIconBox}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyDeckTitle}>No Events Published Yet</Text>
            <Text style={styles.emptyDeckSubtitle}>
              Schedule your first campus activity to unlock gate check-ins, attendee rosters, and analytics.
            </Text>
            <Pressable
              style={styles.emptyDeckPublishBtn}
              onPress={() => {
                hapticMedium();
                onNavigateView('publish');
              }}
            >
              <Ionicons name="add" size={16} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.emptyDeckPublishBtnText}>Publish Your First Event</Text>
            </Pressable>
          </View>
        ) : (
          clubEvents.map((ev) => {
            const evGoing = Number(ev.going_count || 0);
            const evInterested = Number(ev.interested_count || 0);
            const isToday = Boolean(ev.event_time && new Date(ev.event_time).toDateString() === new Date().toDateString());

            return (
              <View key={ev.id} style={styles.eventDeckCard}>
                {/* Card Top: Poster + Info */}
                <View style={styles.eventDeckTopRow}>
                  {ev.poster_url ? (
                    <Image source={{ uri: ev.poster_url }} style={styles.eventDeckThumb} />
                  ) : (
                    <View style={styles.eventDeckThumbFallback}>
                      <Ionicons name="film-outline" size={20} color={Colors.textMuted} />
                    </View>
                  )}

                  <View style={styles.eventDeckMeta}>
                    <View style={styles.eventDeckStatusRow}>
                      <View style={[styles.statusPill, isToday ? styles.statusPillLive : styles.statusPillUpcoming]}>
                        <View style={[styles.statusDot, isToday ? styles.statusDotLive : styles.statusDotUpcoming]} />
                        <Text style={[styles.statusPillText, isToday && styles.statusPillTextLive]}>
                          {isToday ? 'LIVE TODAY' : 'UPCOMING'}
                        </Text>
                      </View>
                      {ev.priority && (
                        <Text style={styles.eventDeckPriorityText}>{ev.priority}</Text>
                      )}
                    </View>

                    <Text style={styles.eventDeckTitle} numberOfLines={1}>
                      {ev.title}
                    </Text>

                    <Text style={styles.eventDeckDateText}>
                      {formatEventDate(ev.event_time)}
                    </Text>

                    <Text style={styles.eventDeckLocationText} numberOfLines={1}>
                      📍 {ev.building ? `${ev.building}${ev.room_number ? ` • ${ev.room_number}` : ''}` : ev.location || 'Campus'}
                    </Text>
                  </View>
                </View>

                {/* Card Middle: RSVPs & Attendance Progress */}
                <View style={styles.eventDeckProgressBox}>
                  <View style={styles.eventDeckProgressHeader}>
                    <Text style={styles.eventDeckRsvpSummary}>
                      {evGoing} Confirmed RSVPs • {evInterested} Hyped
                    </Text>
                  </View>
                </View>

                {/* Card Bottom: Contextual Direct Actions */}
                <View style={styles.eventDeckActionRow}>
                  <Pressable
                    style={styles.cardActionBtnPrimary}
                    onPress={() => {
                      hapticMedium();
                      onSelectEvent(ev.id);
                      onNavigateView('gate');
                    }}
                  >
                    <Ionicons name="scan-outline" size={13} color="#000000" style={{ marginRight: 4 }} />
                    <Text style={styles.cardActionBtnPrimaryText}>Scan Gate</Text>
                  </Pressable>

                  <Pressable
                    style={styles.cardActionBtnSecondary}
                    onPress={() => {
                      hapticLight();
                      onSelectEvent(ev.id);
                      onNavigateView('attendees');
                    }}
                  >
                    <Ionicons name="people-outline" size={13} color={Colors.text} style={{ marginRight: 4 }} />
                    <Text style={styles.cardActionBtnSecondaryText}>Roster & CSV</Text>
                  </Pressable>

                  <Pressable
                    style={styles.cardActionBtnIconOnly}
                    onPress={() => {
                      hapticLight();
                      onSelectEvent(ev.id);
                      onNavigateView('broadcast');
                    }}
                    accessibilityLabel="Broadcast Alert"
                  >
                    <Ionicons name="megaphone-outline" size={14} color={Colors.text} />
                  </Pressable>

                  <Pressable
                    style={styles.cardActionBtnIconOnly}
                    onPress={() => {
                      hapticLight();
                      onSelectEvent(ev.id);
                      onNavigateView('analytics');
                    }}
                    accessibilityLabel="View Analytics"
                  >
                    <Ionicons name="analytics-outline" size={14} color={Colors.text} />
                  </Pressable>

                  <Pressable
                    style={styles.cardActionBtnDelete}
                    onPress={() => onDeleteEvent(ev.id, ev.title)}
                    accessibilityLabel="Delete Event"
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 5. Creator Tools & Operations List (Instagram Style) */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>OPERATIONS & TOOLS</Text>
        <View style={styles.toolsGroupCard}>
          <Pressable
            style={styles.toolRow}
            onPress={() => {
              hapticLight();
              onNavigateView('attendees');
            }}
          >
            <View style={styles.toolIconWrap}>
              <Ionicons name="people-outline" size={18} color={Colors.text} />
            </View>
            <View style={styles.toolTextWrap}>
              <Text style={styles.toolTitle}>Attendee Directory & Master CSV Export</Text>
              <Text style={styles.toolSubtitle}>Generate and export official attendance reports for faculty & SAC</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.toolDivider} />

          <Pressable
            style={styles.toolRow}
            onPress={() => {
              hapticLight();
              onNavigateView('gate');
            }}
          >
            <View style={styles.toolIconWrap}>
              <Ionicons name="scan-outline" size={18} color={Colors.text} />
            </View>
            <View style={styles.toolTextWrap}>
              <Text style={styles.toolTitle}>Gate Scanner & Ticket Validation</Text>
              <Text style={styles.toolSubtitle}>Passcode keypad and searchable roll-call check-in with offline queue</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.toolDivider} />

          <Pressable
            style={styles.toolRow}
            onPress={() => {
              hapticLight();
              onNavigateView('analytics');
            }}
          >
            <View style={styles.toolIconWrap}>
              <Ionicons name="analytics-outline" size={18} color={Colors.text} />
            </View>
            <View style={styles.toolTextWrap}>
              <Text style={styles.toolTitle}>Audience Demographics & Insights</Text>
              <Text style={styles.toolSubtitle}>Branch distribution % and semester turnout analytics</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.toolDivider} />

          <Pressable
            style={styles.toolRow}
            onPress={() => {
              hapticLight();
              onNavigateView('broadcast');
            }}
          >
            <View style={styles.toolIconWrap}>
              <Ionicons name="megaphone-outline" size={18} color={Colors.text} />
            </View>
            <View style={styles.toolTextWrap}>
              <Text style={styles.toolTitle}>Urgent Campus Broadcasts</Text>
              <Text style={styles.toolSubtitle}>Push priority alerts for venue shifts or schedule delays</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.toolDivider} />

          <Pressable
            style={styles.toolRow}
            onPress={() => {
              hapticLight();
              onNavigateView('polls');
            }}
          >
            <View style={styles.toolIconWrap}>
              <Ionicons name="bar-chart-outline" size={18} color={Colors.text} />
            </View>
            <View style={styles.toolTextWrap}>
              <Text style={styles.toolTitle}>Campus Pulse Polls</Text>
              <Text style={styles.toolSubtitle}>Create interactive voting questions for student feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardWrap: {
    gap: Spacing[4],
  },
  clubProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  clubProfileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clubLogoImg: {
    width: '100%',
    height: '100%',
  },
  clubAvatarLetter: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  clubProfileInfo: {
    flex: 1,
  },
  clubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clubNameText: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  clubCategoryText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  clubRoleTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 5,
  },
  clubRoleTagText: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },

  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[2.5],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  kpiLabel: {
    fontSize: 8,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  /* Quick Actions Row */
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  quickActionPrimaryText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  quickActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionSecondaryText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },

  /* Sections */
  sectionWrap: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2.5],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  sectionCountBadge: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },

  /* Event Deck Card */
  eventDeckCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[3],
  },
  eventDeckTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  eventDeckThumb: {
    width: 68,
    height: 88,
    borderRadius: Radius.md,
  },
  eventDeckThumbFallback: {
    width: 68,
    height: 88,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDeckMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  eventDeckStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusPillLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillUpcoming: {
    backgroundColor: Colors.surfaceHigh,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusDotLive: {
    backgroundColor: '#10B981',
  },
  statusDotUpcoming: {
    backgroundColor: Colors.textMuted,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  statusPillTextLive: {
    color: '#10B981',
  },
  eventDeckPriorityText: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
  eventDeckTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  eventDeckDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  eventDeckLocationText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  eventDeckProgressBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderMuted,
  },
  eventDeckProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDeckRsvpSummary: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  eventDeckActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  cardActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  cardActionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  cardActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardActionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  cardActionBtnIconOnly: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardActionBtnDelete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },

  /* Empty Deck Card */
  emptyEventsDeckCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDeckIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  emptyDeckTitle: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptyDeckSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing[4],
    maxWidth: 280,
  },
  emptyDeckPublishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  emptyDeckPublishBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },

  /* Tools List */
  toolsGroupCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3.5],
    gap: 12,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextWrap: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  toolSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  toolDivider: {
    height: 1,
    backgroundColor: Colors.borderMuted,
    marginLeft: 56,
  },
});
