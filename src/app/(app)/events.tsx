/**
 * Campus Events Screen — 100% Zomato District Inspiration.
 * Modeled directly after the user's District screenshots:
 * - Header: 'Events' with 'IIITDM Kancheepuram ▾' location dropdown and user avatar circle.
 * - 'Explore': Side-by-side cards for 'Campus Clubs' and 'Campus Pulse'.
 * - 'In the Spotlight': Full-width banner card with tags, white 'RSVP Now' pill, and flame hype button.
 * - 'Trending on Campus': Horizontal scroll with GIANT ranking numbers (1, 2, 3...) and orange hype text.
 * - 'Upcoming Events': Category filter pills with '☷ Filters ▾' and 2:3 vertical event posters.
 * - ZERO dummy/mock data: Completely database-driven with authentic District empty state.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Pressable,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, DISTRICT_THEME } from '@/constants/theme';
import { useEventsStore, DISTRICT_CATEGORIES, type DistrictCategory } from '@/store/eventsStore';
import { useAuthStore } from '@/store/auth';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

// Components
import { DistrictEventCard } from '@/components/events/DistrictEventCard';
import { DistrictPollCard } from '@/components/events/DistrictPollCard';

// Modals
import { EventDetailModal } from '@/components/events/EventDetailModal';
import { ClubDetailModal } from '@/components/events/ClubDetailModal';
import { ClubRequestModal } from '@/components/events/ClubRequestModal';
import { AdminHubModal } from '@/components/events/AdminHubModal';
import { DistrictSearchModal } from '@/components/events/DistrictSearchModal';
import { EventsFilterModal } from '@/components/events/EventsFilterModal';
import type { DistrictEvent, Club, RSVPStatus } from '@/types/events';

type ScopeTab = 'events' | 'clubs' | 'polls';

const FILTER_PILLS = [
  'All',
  'This Week',
  'This Month',
  'Technical',
  'Cultural',
  'Sports',
  'Gaming',
];

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const events = useEventsStore((s) => s.events);
  const clubs = useEventsStore((s) => s.clubs);
  const polls = useEventsStore((s) => s.polls);
  const selectedCategory = useEventsStore((s) => s.selectedCategory);
  const searchQuery = useEventsStore((s) => s.searchQuery);
  const isLoading = useEventsStore((s) => s.isLoading);
  const isRefreshing = useEventsStore((s) => s.isRefreshing);
  const isSuperAdmin = useEventsStore((s) => s.isSuperAdmin);
  const isClubLead = useEventsStore((s) => s.isClubLead);
  const userClubRoles = useEventsStore((s) => s.userClubRoles);
  const adminClubRequests = useEventsStore((s) => s.adminClubRequests);

  const loadFeed = useEventsStore((s) => s.loadFeed);
  const refreshFeed = useEventsStore((s) => s.refreshFeed);
  const setCategory = useEventsStore((s) => s.setCategory);
  const setSearchQuery = useEventsStore((s) => s.setSearchQuery);
  const toggleRsvp = useEventsStore((s) => s.toggleRsvp);
  const castPollVote = useEventsStore((s) => s.castPollVote);
  const checkPermissions = useEventsStore((s) => s.checkPermissions);
  const loadDemographics = useEventsStore((s) => s.loadDemographics);

  // Active Scope Tab: 'events' | 'clubs' | 'polls'
  const [activeTab, setActiveTab] = useState<ScopeTab>('events');

  // Filter Pill state
  const [activeFilterPill, setActiveFilterPill] = useState<string>('All');

  // Grid dimensions
  const { width: windowWidth } = useWindowDimensions();
  const gridCardWidth = Math.floor((windowWidth - Spacing[4] * 2 - 12) / 2);

  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<DistrictEvent | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showClubRequestModal, setShowClubRequestModal] = useState(false);
  const [showAdminHubModal, setShowAdminHubModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCampusSheet, setShowCampusSheet] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    loadFeed();
    checkPermissions();
  }, [loadFeed, checkPermissions]);

  const pendingRequestsCount = adminClubRequests.filter((r) => r.status === 'pending').length;

  const handleRsvp = useCallback(
    (event: DistrictEvent, status: RSVPStatus) => {
      toggleRsvp(event, status);
    },
    [toggleRsvp]
  );

  const handleOpenDemographics = useCallback(
    (eventId: string) => {
      setSelectedEvent(null);
      loadDemographics(eventId);
      router.push('/(app)/creator-studio' as any);
    },
    [loadDemographics, router]
  );

  // Filter events strictly from the database (ZERO dummy mock data!)
  const displayedEvents = useMemo(() => {
    let list = events;

    if (activeFilterPill !== 'All') {
      const p = activeFilterPill.toLowerCase();
      list = list.filter((e) => {
        if (p === 'this week') {
          if (!e.event_time) return false;
          const diffDays = (new Date(e.event_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return diffDays >= -1 && diffDays <= 7;
        }
        if (p === 'this month') {
          if (!e.event_time) return false;
          const d = new Date(e.event_time);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return (
          (e.organization_category && e.organization_category.toLowerCase() === p) ||
          (Array.isArray(e.tags) && e.tags.some((t) => t.toLowerCase() === p))
        );
      });
    }

    if (selectedCategory !== 'All') {
      list = list.filter(
        (e) =>
          (e.organization_category && e.organization_category.toLowerCase() === selectedCategory.toLowerCase()) ||
          (Array.isArray(e.tags) && e.tags.some((t) => t.toLowerCase() === selectedCategory.toLowerCase()))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.summary && e.summary.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.organization_name && e.organization_name.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          (e.building && e.building.toLowerCase().includes(q))
      );
    }

    return list;
  }, [events, activeFilterPill, selectedCategory, searchQuery]);

  // Spotlight event is first featured or first available event
  const spotlightEvent = useMemo(() => {
    return displayedEvents.find((e) => e.is_featured) || displayedEvents[0] || null;
  }, [displayedEvents]);

  // Filter clubs by search
  const displayedClubs = useMemo(() => {
    if (!searchQuery.trim()) return clubs;
    const q = searchQuery.toLowerCase();
    return clubs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [clubs, searchQuery]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={DISTRICT_THEME.background} />

      {/* ─── Top Header (Matching District Screenshots) ─── */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Ionicons name="film-outline" size={22} color={DISTRICT_THEME.text} style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.headerTitle}>Events</Text>
            <TouchableOpacity
              style={styles.locationDropdown}
              onPress={() => {
                hapticLight();
                setShowCampusSheet(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.locationDropdownText}>IIITDM Kancheepuram</Text>
              <Ionicons name="chevron-down" size={12} color={DISTRICT_THEME.textMuted} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Header Controls */}
        <View style={styles.headerRight}>
          {/* Search Icon */}
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => {
              hapticLight();
              setShowSearchModal(true);
            }}
            accessibilityLabel="Search"
          >
            <Ionicons name="search-outline" size={19} color={DISTRICT_THEME.text} />
          </Pressable>

          {isSuperAdmin && (
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => {
                hapticLight();
                setShowAdminHubModal(true);
              }}
              accessibilityLabel="Super Admin Hub"
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={DISTRICT_THEME.accentOrange} />
              {pendingRequestsCount > 0 && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>{pendingRequestsCount}</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* User Profile Avatar */}
          <Pressable
            style={styles.userAvatarCircle}
            onPress={() => {
              hapticLight();
              setShowProfileModal(true);
            }}
            accessibilityLabel="Profile"
          >
            <Text style={styles.userAvatarInitial}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Scrollable District Feed ─── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.mainScrollContent, { paddingBottom: 72 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFeed}
            tintColor={DISTRICT_THEME.accentOrange}
            colors={[DISTRICT_THEME.accentOrange]}
          />
        }
      >
        {/* ── SECTION 1: EXPLORE CARDS (From Screenshot 3) ── */}
        <View style={styles.exploreSection}>
          <Text style={styles.sectionHeaderTitle}>Explore</Text>
          <View style={styles.exploreRow}>
            {/* Campus Clubs Card */}
            <Pressable
              style={styles.exploreCard}
              onPress={() => {
                hapticLight();
                setActiveTab('clubs');
              }}
            >
              <View style={styles.exploreCardLeft}>
                <Text style={styles.exploreCardTitle}>Campus{'\n'}Clubs</Text>
                <Text style={styles.exploreCardSub}>{clubs.length} registered</Text>
              </View>
              <View style={styles.exploreIconBox}>
                <Ionicons name="people" size={28} color={DISTRICT_THEME.accentOrange} />
              </View>
            </Pressable>

            {/* Campus Pulse Card */}
            <Pressable
              style={styles.exploreCard}
              onPress={() => {
                hapticLight();
                setActiveTab('polls');
              }}
            >
              <View style={styles.exploreCardLeft}>
                <Text style={styles.exploreCardTitle}>Campus{'\n'}Pulse</Text>
                <Text style={styles.exploreCardSub}>{polls.length} active polls</Text>
              </View>
              <View style={styles.exploreIconBox}>
                <Ionicons name="stats-chart" size={26} color="#60A5FA" />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Scope Tabs Toggle Bar */}
        <View style={styles.scopeTabsBar}>
          <Pressable
            style={[styles.scopeTabBtn, activeTab === 'events' && styles.scopeTabBtnActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('events');
            }}
          >
            <Text style={[styles.scopeTabText, activeTab === 'events' && styles.scopeTabTextActive]}>
              All Events ({events.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.scopeTabBtn, activeTab === 'clubs' && styles.scopeTabBtnActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('clubs');
            }}
          >
            <Text style={[styles.scopeTabText, activeTab === 'clubs' && styles.scopeTabTextActive]}>
              Clubs ({clubs.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.scopeTabBtn, activeTab === 'polls' && styles.scopeTabBtnActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('polls');
            }}
          >
            <Text style={[styles.scopeTabText, activeTab === 'polls' && styles.scopeTabTextActive]}>
              Pulse ({polls.length})
            </Text>
          </Pressable>
        </View>

        {/* ── EVENTS TAB VIEW ── */}
        {activeTab === 'events' && (
          <View>
            {/* If events exist, show District sections */}
            {displayedEvents.length > 0 ? (
              <>
                {/* ── SECTION 2: IN THE SPOTLIGHT (From Screenshot 5) ── */}
                {spotlightEvent && (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeaderTitle}>In the Spotlight</Text>
                    <DistrictEventCard
                      event={spotlightEvent}
                      variant="spotlight"
                      onPress={(evt) => setSelectedEvent(evt)}
                      onRsvp={handleRsvp}
                    />
                  </View>
                )}

                {/* ── SECTION 3: TRENDING ON DISTRICT (From Screenshot 3) ── */}
                {displayedEvents.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeaderTitle}>Trending on Campus</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.trendingScrollContent}
                    >
                      {displayedEvents.slice(0, 5).map((evt, idx) => (
                        <DistrictEventCard
                          key={evt.id}
                          event={evt}
                          variant="trending"
                          rankingNumber={idx + 1}
                          onPress={(e) => setSelectedEvent(e)}
                          onRsvp={handleRsvp}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* ── SECTION 4: UPCOMING EVENTS WITH FILTERS (From Screenshot 2 & 4) ── */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeaderTitle}>Upcoming Events</Text>

                  {/* Filter Pills */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersScrollContent}
                  >
                    {/* Filters dropdown button */}
                    <TouchableOpacity
                      style={[styles.filterDropdownBtn, selectedCategory !== 'All' && styles.filterDropdownBtnActive]}
                      onPress={() => {
                        hapticLight();
                        setShowFilterModal(true);
                      }}
                    >
                      <Ionicons
                        name="options-outline"
                        size={13}
                        color={selectedCategory !== 'All' ? DISTRICT_THEME.accentOrange : DISTRICT_THEME.text}
                      />
                      <Text style={[styles.filterDropdownText, selectedCategory !== 'All' && styles.filterDropdownTextActive]}>
                        Filters ▾
                      </Text>
                    </TouchableOpacity>

                    {FILTER_PILLS.map((pill) => {
                      const isActive = activeFilterPill === pill;
                      return (
                        <Pressable
                          key={pill}
                          style={[styles.filterPill, isActive && styles.filterPillActive]}
                          onPress={() => {
                            hapticLight();
                            setActiveFilterPill(pill);
                          }}
                        >
                          <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                            {pill}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Month header matching Screenshot 2 */}
                  <View style={styles.monthHeaderRow}>
                    <Text style={styles.monthHeaderText}>
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <Text style={styles.monthHeaderSubtext}>
                      {displayedEvents.length} {displayedEvents.length === 1 ? 'event' : 'events'}
                    </Text>
                  </View>

                  {/* 2-Column Vertical Poster Grid (Matching Screenshot 2) */}
                  <View style={styles.upcomingGridWrap}>
                    {displayedEvents.map((evt) => (
                      <DistrictEventCard
                        key={evt.id}
                        event={evt}
                        variant="vertical"
                        cardWidth={gridCardWidth}
                        style={{ marginBottom: Spacing[4] }}
                        onPress={(e) => setSelectedEvent(e)}
                        onRsvp={handleRsvp}
                      />
                    ))}
                  </View>
                </View>
              </>
            ) : (
              /* Authentic District Empty State (NO FAKE MOCK DATA!) */
              <View style={styles.emptyDistrictCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="film-outline" size={36} color={DISTRICT_THEME.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Campus Events Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Verified clubs haven't scheduled events this week.{'\n'}Club heads can launch events from the Club Studio.
                </Text>

                <View style={styles.emptyActionRow}>
                  {isSuperAdmin || isClubLead ? (
                    <Pressable
                      style={styles.emptyPrimaryBtn}
                      onPress={() => router.push('/(app)/creator-studio' as any)}
                    >
                      <Text style={styles.emptyPrimaryBtnText}>Create Event</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.emptyPrimaryBtn}
                      onPress={() => setShowClubRequestModal(true)}
                    >
                      <Text style={styles.emptyPrimaryBtnText}>Register a Club</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── CLUBS TAB VIEW ── */}
        {activeTab === 'clubs' && (
          <View style={styles.clubsWrap}>
            {displayedClubs.length === 0 ? (
              <View style={styles.emptyDistrictCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="people-outline" size={36} color={DISTRICT_THEME.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Clubs Registered</Text>
                <Text style={styles.emptySubtitle}>Be the first to register an official college club.</Text>
                <Pressable
                  style={styles.emptyPrimaryBtn}
                  onPress={() => setShowClubRequestModal(true)}
                >
                  <Text style={styles.emptyPrimaryBtnText}>Register Club</Text>
                </Pressable>
              </View>
            ) : (
              displayedClubs.map((club) => (
                <Pressable
                  key={club.id}
                  style={styles.clubCard}
                  onPress={() => {
                    hapticLight();
                    setSelectedClub(club);
                  }}
                >
                  <View style={styles.clubCardHeader}>
                    {club.logo_url ? (
                      <Image source={{ uri: club.logo_url }} style={styles.clubAvatar} />
                    ) : (
                      <View style={styles.clubAvatarPlaceholder}>
                        <Text style={styles.clubAvatarInitial}>{club.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}

                    <View style={styles.clubCardMeta}>
                      <View style={styles.clubCardNameRow}>
                        <Text style={styles.clubCardName} numberOfLines={1}>
                          {club.name}
                        </Text>
                        {club.verified && (
                          <Ionicons name="checkmark-circle" size={14} color="#60A5FA" />
                        )}
                      </View>
                      <Text style={styles.clubCardCategory}>{club.category}</Text>
                    </View>

                    <View style={styles.clubExploreBtn}>
                      <Text style={styles.clubExploreBtnText}>Explore</Text>
                    </View>
                  </View>

                  {club.description ? (
                    <Text style={styles.clubCardDescription} numberOfLines={2}>
                      {club.description}
                    </Text>
                  ) : null}

                  <View style={styles.clubCardFooter}>
                    <Text style={styles.clubCardMembers}>
                      {club.followers_count || 0} members • {club.events_count || 0} events
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* ── PULSE TAB VIEW ── */}
        {activeTab === 'polls' && (
          <View style={styles.pollsWrap}>
            {polls.length === 0 ? (
              <View style={styles.emptyDistrictCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="stats-chart-outline" size={36} color={DISTRICT_THEME.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Active Pulse Polls</Text>
                <Text style={styles.emptySubtitle}>Club heads can launch live polls to gather student input.</Text>
              </View>
            ) : (
              polls.map((poll) => (
                <DistrictPollCard
                  key={poll.id}
                  poll={poll}
                  onVote={(pollId, optionId) => castPollVote(pollId, optionId)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Floating Action Button (Create / Register) ── */}
      <Pressable
        style={styles.fabPill}
        onPress={() => {
          hapticLight();
          if (isSuperAdmin || isClubLead) router.push('/(app)/creator-studio' as any);
          else setShowClubRequestModal(true);
        }}
        accessibilityLabel="Create or Request Club"
      >
        <Ionicons name={isSuperAdmin || isClubLead ? 'briefcase-outline' : 'add'} size={17} color="#000000" />
        <Text style={styles.fabPillText}>
          {isSuperAdmin || isClubLead ? 'Creator Studio' : 'Register Club'}
        </Text>
      </Pressable>

      {/* ── Modals ── */}
      <EventDetailModal
        visible={Boolean(selectedEvent)}
        event={selectedEvent}
        canViewDemographics={isSuperAdmin || isClubLead}
        onClose={() => setSelectedEvent(null)}
        onRsvp={handleRsvp}
        onViewDemographics={handleOpenDemographics}
      />

      <ClubDetailModal
        visible={Boolean(selectedClub)}
        club={selectedClub}
        clubEvents={events.filter((e) => e.organization_id === selectedClub?.id)}
        onClose={() => setSelectedClub(null)}
        onSelectEvent={(evt) => {
          setSelectedClub(null);
          setSelectedEvent(evt);
        }}
      />

      <ClubRequestModal
        visible={showClubRequestModal}
        onClose={() => setShowClubRequestModal(false)}
      />

      <AdminHubModal
        visible={showAdminHubModal}
        onClose={() => setShowAdminHubModal(false)}
      />

      <DistrictSearchModal
        visible={showSearchModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        trendingEvents={events}
        filteredEvents={displayedEvents}
        onSelectEvent={(evt) => {
          setShowSearchModal(false);
          setSelectedEvent(evt);
        }}
        onClose={() => setShowSearchModal(false)}
      />

      <EventsFilterModal
        visible={showFilterModal}
        activeCategory={selectedCategory}
        onClose={() => setShowFilterModal(false)}
        onApplyCategory={(cat) => setCategory(cat)}
      />

      {/* ── Campus Location Sheet ── */}
      <Modal
        visible={showCampusSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCampusSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowCampusSheet(false)} />
          <View style={[styles.bottomSheetCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetGrabHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Campus & District</Text>
              <Pressable
                style={styles.sheetCloseBtn}
                onPress={() => setShowCampusSheet(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={DISTRICT_THEME.text} />
              </Pressable>
            </View>

            {/* Current Campus Item */}
            <View style={styles.campusItemActive}>
              <View style={styles.campusIconBox}>
                <Ionicons name="business" size={20} color={DISTRICT_THEME.accentOrange} />
              </View>
              <View style={styles.campusInfo}>
                <View style={styles.campusNameRow}>
                  <Text style={styles.campusName}>IIITDM Kancheepuram</Text>
                  <View style={styles.campusPrimaryBadge}>
                    <Text style={styles.campusPrimaryBadgeText}>Primary</Text>
                  </View>
                </View>
                <Text style={styles.campusSub}>Vandalur-Kelambakkam Road, Chennai</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={DISTRICT_THEME.accentOrange} />
            </View>

            {/* Network Info */}
            <View style={styles.campusNetworkBox}>
              <Ionicons name="git-network-outline" size={16} color={DISTRICT_THEME.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.campusNetworkText}>
                Inter-campus federation active. Cross-college events and hackathons from partner institutes appear in your feed.
              </Text>
            </View>

            <Pressable
              style={styles.sheetDoneBtn}
              onPress={() => setShowCampusSheet(false)}
            >
              <Text style={styles.sheetDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── User Account & Profile Sheet ── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowProfileModal(false)} />
          <View style={[styles.bottomSheetCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetGrabHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Account & Profile</Text>
              <Pressable
                style={styles.sheetCloseBtn}
                onPress={() => setShowProfileModal(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={DISTRICT_THEME.text} />
              </Pressable>
            </View>

            {/* User Profile Card */}
            <View style={styles.profileUserHeader}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarTextLarge}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
                </Text>
              </View>
              <View style={styles.profileUserMeta}>
                <Text style={styles.profileUserName}>{user?.name || 'IIITDM Student'}</Text>
                <Text style={styles.profileUserEmail}>{user?.email || 'student@iiitdm.ac.in'}</Text>
                <View style={styles.rolesRow}>
                  {isSuperAdmin && (
                    <View style={styles.roleBadgeAdmin}>
                      <Text style={styles.roleBadgeAdminText}>Super Admin</Text>
                    </View>
                  )}
                  {isClubLead && (
                    <View style={styles.roleBadgeLead}>
                      <Text style={styles.roleBadgeLeadText}>
                        {userClubRoles.length > 0 ? `${userClubRoles[0].club_name} Lead` : 'Club Lead'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.roleBadgeStudent}>
                    <Text style={styles.roleBadgeStudentText}>Verified Student</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.profileStatsRow}>
              <View style={styles.profileStatBox}>
                <Text style={styles.profileStatNum}>
                  {events.filter((e) => e.user_rsvp_status === 'going').length}
                </Text>
                <Text style={styles.profileStatLabel}>Attending</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStatBox}>
                <Text style={styles.profileStatNum}>
                  {events.filter((e) => e.user_rsvp_status === 'interested').length}
                </Text>
                <Text style={styles.profileStatLabel}>Hyped</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStatBox}>
                <Text style={styles.profileStatNum}>{clubs.length}</Text>
                <Text style={styles.profileStatLabel}>Clubs</Text>
              </View>
            </View>

            {/* Quick action buttons */}
            <View style={styles.profileActionButtons}>
              {isSuperAdmin && (
                <Pressable
                  style={styles.profileActionBtn}
                  onPress={() => {
                    setShowProfileModal(false);
                    setShowAdminHubModal(true);
                  }}
                >
                  <Ionicons name="shield-checkmark" size={16} color={DISTRICT_THEME.accentOrange} style={{ marginRight: 8 }} />
                  <Text style={styles.profileActionBtnText}>Open Super Admin Hub</Text>
                </Pressable>
              )}
              {isClubLead && (
                <Pressable
                  style={styles.profileActionBtn}
                  onPress={() => {
                    setShowProfileModal(false);
                    router.push('/(app)/creator-studio' as any);
                  }}
                >
                  <Ionicons name="briefcase-outline" size={16} color={DISTRICT_THEME.text} style={{ marginRight: 8 }} />
                  <Text style={styles.profileActionBtnText}>Open Creator Studio</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              style={styles.sheetDoneBtn}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.sheetDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DISTRICT_THEME.background,
  },

  // ── Top Header ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2.5],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    lineHeight: 22,
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  locationDropdownText: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DISTRICT_THEME.card,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DISTRICT_THEME.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    borderWidth: 1.5,
    borderColor: DISTRICT_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },

  // ── Main Content Scroll ──
  mainScrollContent: {
    paddingTop: Spacing[2],
  },

  // ── Explore Section (Screenshot 3) ──
  exploreSection: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  exploreRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  exploreCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: 16,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  exploreCardLeft: {
    justifyContent: 'center',
  },
  exploreCardTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    lineHeight: 20,
    marginBottom: 2,
  },
  exploreCardSub: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },
  exploreIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: DISTRICT_THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },

  // ── Scope Tabs ──
  scopeTabsBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  scopeTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  scopeTabBtnActive: {
    backgroundColor: DISTRICT_THEME.cardElevated,
  },
  scopeTabText: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: DISTRICT_THEME.textMuted,
  },
  scopeTabTextActive: {
    color: DISTRICT_THEME.text,
    fontWeight: Typography.weight.bold,
  },

  // ── Section Block ──
  sectionBlock: {
    marginBottom: Spacing[5],
  },

  // ── Trending Horizontal Scroll ──
  trendingScrollContent: {
    paddingLeft: Spacing[4],
    paddingRight: Spacing[2],
  },

  // ── Filter Pills Row ──
  filtersScrollContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DISTRICT_THEME.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  filterDropdownBtnActive: {
    borderColor: DISTRICT_THEME.accentOrange,
  },
  filterDropdownText: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: DISTRICT_THEME.text,
  },
  filterDropdownTextActive: {
    color: DISTRICT_THEME.accentOrange,
  },
  filterPill: {
    backgroundColor: DISTRICT_THEME.card,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  filterPillActive: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    borderColor: '#FFFFFF',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: DISTRICT_THEME.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },

  // ── Posters Scroll ──
  postersScrollContent: {
    paddingLeft: Spacing[4],
    paddingRight: Spacing[2],
  },

  // ── Authentic Empty District Card ──
  emptyDistrictCard: {
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: 20,
    marginHorizontal: Spacing[4],
    padding: Spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    marginVertical: Spacing[4],
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DISTRICT_THEME.surface,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: DISTRICT_THEME.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing[4],
  },
  emptyActionRow: {
    flexDirection: 'row',
  },
  emptyPrimaryBtn: {
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  emptyPrimaryBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },

  // ── Clubs Directory ──
  clubsWrap: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  clubCard: {
    backgroundColor: DISTRICT_THEME.card,
    borderRadius: 16,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  clubCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  clubAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing[3],
  },
  clubAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  clubAvatarInitial: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: '#94A3B8',
  },
  clubCardMeta: {
    flex: 1,
  },
  clubCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  clubCardName: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  clubCardCategory: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  clubExploreBtn: {
    backgroundColor: DISTRICT_THEME.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  clubExploreBtnText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  clubCardDescription: {
    fontSize: 13,
    color: DISTRICT_THEME.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing[2],
  },
  clubCardFooter: {
    paddingTop: Spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DISTRICT_THEME.border,
  },
  clubCardMembers: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },

  // ── Polls ──
  pollsWrap: {
    paddingHorizontal: Spacing[4],
  },

  // ── Floating Action Button ──
  fabPill: {
    position: 'absolute',
    bottom: Spacing[6],
    right: Spacing[4],
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 20 },
    }),
  },
  fabPillText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },

  // ── Month Header & 2-Column Grid (Screenshot 2) ──
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[2],
    marginBottom: Spacing[2.5],
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  monthHeaderSubtext: {
    fontSize: 12,
    color: DISTRICT_THEME.textMuted,
  },
  upcomingGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
  },

  // ── Bottom Sheets Shared Styles ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  bottomSheetCard: {
    backgroundColor: DISTRICT_THEME.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  sheetGrabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#383B44',
    alignSelf: 'center',
    marginBottom: Spacing[3],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DISTRICT_THEME.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneBtn: {
    backgroundColor: DISTRICT_THEME.buttonWhite,
    paddingVertical: 12,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing[3],
  },
  sheetDoneBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.buttonWhiteText,
  },

  // ── Campus Location Styles ──
  campusItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.surface,
    padding: Spacing[3.5],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 30, 0.4)',
    marginBottom: Spacing[3],
  },
  campusIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 94, 30, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  campusInfo: {
    flex: 1,
  },
  campusNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  campusName: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
  campusPrimaryBadge: {
    backgroundColor: DISTRICT_THEME.accentOrange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  campusPrimaryBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  campusSub: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },
  campusNetworkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  campusNetworkText: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    lineHeight: 16,
    flex: 1,
  },

  // ── Profile Modal Styles ──
  profileUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.surface,
    padding: Spacing[3.5],
    borderRadius: Radius.lg,
    marginBottom: Spacing[3.5],
  },
  profileAvatarLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: DISTRICT_THEME.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarTextLarge: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  profileUserMeta: {
    flex: 1,
  },
  profileUserName: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  profileUserEmail: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
    marginBottom: 6,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  roleBadgeAdminText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#EF4444',
  },
  roleBadgeLead: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  roleBadgeLeadText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#60A5FA',
  },
  roleBadgeStudent: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  roleBadgeStudentText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DISTRICT_THEME.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    marginBottom: Spacing[3.5],
  },
  profileStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatNum: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
    marginBottom: 2,
  },
  profileStatLabel: {
    fontSize: 11,
    color: DISTRICT_THEME.textMuted,
  },
  profileStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: DISTRICT_THEME.border,
  },
  profileActionButtons: {
    gap: 8,
    marginBottom: Spacing[2],
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DISTRICT_THEME.cardElevated,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DISTRICT_THEME.border,
  },
  profileActionBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: DISTRICT_THEME.text,
  },
});
