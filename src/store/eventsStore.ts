/**
 * District Events & Campus Clubs Zustand store.
 * Manages feed loading, category filtering, search,
 * live poll voting, optimistic RSVPs with demographics,
 * Super Admin hub for cs23b1008@iiitdm.ac.in, and Club Studio for heads.
 */

import { create } from 'zustand';
import {
  fetchDistrictEvents,
  fetchClubs,
  fetchPolls,
  votePoll as apiVotePoll,
  rsvpEvent as apiRsvpEvent,
  cancelRsvp as apiCancelRsvp,
  fetchEventDemographics as apiFetchDemographics,
  fetchMyClubRoles as apiFetchMyRoles,
  fetchAdminClubRequests as apiFetchAdminRequests,
  approveClubRequest as apiApproveClub,
  rejectClubRequest as apiRejectClub,
  createClubEvent as apiCreateEvent,
  deleteClubEvent as apiDeleteEvent,
  createPoll as apiCreatePoll,
  submitClubRequest as apiSubmitClubRequest,
  invalidateDistrictCache,
} from '@/services/eventsApi';
import { useAuthStore } from '@/store/auth';
import { useAcademicStore } from '@/store/academicStore';
import type {
  DistrictEvent,
  Club,
  Poll,
  ClubRequest,
  DemographicsData,
  CreateEventPayload,
  CreateClubRequestPayload,
  CreatePollPayload,
  RSVPStatus,
} from '@/types/events';

export const DISTRICT_CATEGORIES = [
  'All',
  'Technical',
  'Cultural',
  'Design',
  'Hardware',
  'Gaming',
  'Workshops',
  'Sports',
] as const;

export type DistrictCategory = (typeof DISTRICT_CATEGORIES)[number];

const SUPER_ADMIN_EMAIL = 'cs23b1008@iiitdm.ac.in';

interface EventsState {
  events: DistrictEvent[];
  clubs: Club[];
  polls: Poll[];
  selectedCategory: DistrictCategory;
  searchQuery: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Roles & Permissions
  isSuperAdmin: boolean;
  isClubLead: boolean;
  userClubRoles: { role: string; organization_id: string; club_name: string; club_logo: string; verified: boolean }[];
  adminClubRequests: ClubRequest[];
  isAdminLoading: boolean;

  // Demographics
  activeDemographicsEventId: string | null;
  demographicsData: DemographicsData | null;
  isDemographicsLoading: boolean;

  // Actions
  loadFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  setCategory: (cat: DistrictCategory) => void;
  setSearchQuery: (query: string) => void;
  toggleRsvp: (event: DistrictEvent, newStatus: RSVPStatus) => Promise<void>;
  castPollVote: (pollId: string, optionId: string) => Promise<void>;

  // Roles & Admin
  checkPermissions: () => Promise<void>;
  loadAdminRequests: () => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string, reason?: string) => Promise<void>;

  // Club Head Actions
  publishEvent: (payload: CreateEventPayload) => Promise<DistrictEvent>;
  deleteEvent: (eventId: string) => Promise<void>;
  publishPoll: (payload: CreatePollPayload) => Promise<Poll>;
  requestNewClub: (payload: CreateClubRequestPayload) => Promise<ClubRequest>;
  loadDemographics: (eventId: string) => Promise<void>;
  clearDemographics: () => void;
  clearError: () => void;
}

export const useEventsStore = create<EventsState>()((set, get) => ({
  events: [],
  clubs: [],
  polls: [],
  selectedCategory: 'All',
  searchQuery: '',
  isLoading: false,
  isRefreshing: false,
  isSubmitting: false,
  error: null,

  isSuperAdmin: false,
  isClubLead: false,
  userClubRoles: [],
  adminClubRequests: [],
  isAdminLoading: false,

  activeDemographicsEventId: null,
  demographicsData: null,
  isDemographicsLoading: false,

  loadFeed: async () => {
    const { selectedCategory, searchQuery } = get();
    set({ isLoading: true, error: null });
    invalidateDistrictCache();

    try {
      const [eventsData, clubsData, pollsData] = await Promise.all([
        fetchDistrictEvents({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          search: searchQuery.trim() || undefined,
        }),
        fetchClubs(),
        fetchPolls(),
      ]);

      set({
        events: eventsData,
        clubs: clubsData,
        polls: pollsData,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load events', isLoading: false });
    }
  },

  refreshFeed: async () => {
    set({ isRefreshing: true, error: null });
    invalidateDistrictCache();
    try {
      const { selectedCategory, searchQuery } = get();
      const [eventsData, clubsData, pollsData] = await Promise.all([
        fetchDistrictEvents({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          search: searchQuery.trim() || undefined,
        }),
        fetchClubs(),
        fetchPolls(),
      ]);

      set({
        events: eventsData,
        clubs: clubsData,
        polls: pollsData,
        isRefreshing: false,
      });
      // Also check permissions in the background
      get().checkPermissions().catch(() => {});
    } catch (err: any) {
      set({ error: err.message || 'Failed to refresh events', isRefreshing: false });
    }
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
    get().loadFeed();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().loadFeed();
  },

  toggleRsvp: async (event, targetStatus) => {
    const isCurrentlyRsvpd = event.user_rsvp_status === targetStatus;
    const previousStatus = event.user_rsvp_status;
    const prevGoing = Number(event.going_count || 0);
    const prevInterested = Number(event.interested_count || 0);

    // Optimistic UI state calculation
    let newStatus: RSVPStatus | null = isCurrentlyRsvpd ? null : targetStatus;
    let newGoing = prevGoing;
    let newInterested = prevInterested;

    if (isCurrentlyRsvpd) {
      if (targetStatus === 'going') newGoing = Math.max(0, newGoing - 1);
      if (targetStatus === 'interested') newInterested = Math.max(0, newInterested - 1);
    } else {
      if (previousStatus === 'going') newGoing = Math.max(0, newGoing - 1);
      if (previousStatus === 'interested') newInterested = Math.max(0, newInterested - 1);

      if (targetStatus === 'going') newGoing += 1;
      if (targetStatus === 'interested') newInterested += 1;
    }

    set((state) => ({
      events: state.events.map((e) =>
        e.id === event.id
          ? {
              ...e,
              user_rsvp_status: newStatus,
              going_count: newGoing,
              interested_count: newInterested,
            }
          : e
      ),
    }));

    try {
      if (isCurrentlyRsvpd) {
        await apiCancelRsvp(event.id);
      } else {
        const academicState = useAcademicStore.getState();
        const user = useAuthStore.getState().user;

        await apiRsvpEvent(event.id, {
          status: targetStatus,
          program: academicState.program,
          department: academicState.program.replace('B.Tech ', '').replace('M.Tech ', ''),
          semester: academicState.semester,
          user_name: user?.name,
        });
      }
    } catch (err: any) {
      // Rollback on failure
      set((state) => ({
        events: state.events.map((e) =>
          e.id === event.id
            ? {
                ...e,
                user_rsvp_status: previousStatus,
                going_count: prevGoing,
                interested_count: prevInterested,
              }
            : e
        ),
        error: err.message || 'Could not update RSVP',
      }));
    }
  },

  castPollVote: async (pollId, optionId) => {
    // Optimistic update
    set((state) => ({
      polls: state.polls.map((p) => {
        if (p.id !== pollId) return p;
        if (p.user_voted_option) return p; // Already voted

        return {
          ...p,
          total_votes: p.total_votes + 1,
          user_voted_option: optionId,
          options: p.options.map((opt) =>
            opt.id === optionId ? { ...opt, votes_count: opt.votes_count + 1 } : opt
          ),
        };
      }),
    }));

    try {
      const updated = await apiVotePoll(pollId, optionId);
      set((state) => ({
        polls: state.polls.map((p) => (p.id === pollId ? updated : p)),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit vote' });
      // Reload polls to get ground truth
      fetchPolls().then((polls) => set({ polls })).catch(() => {});
    }
  },

  checkPermissions: async () => {
    const user = useAuthStore.getState().user;
    const isEmailAdmin = (user?.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    try {
      const data = await apiFetchMyRoles();
      set({
        isSuperAdmin: isEmailAdmin || data.is_super_admin,
        isClubLead: data.is_club_lead || isEmailAdmin,
        userClubRoles: data.roles || [],
      });
    } catch {
      set({
        isSuperAdmin: isEmailAdmin,
        isClubLead: isEmailAdmin,
        userClubRoles: [],
      });
    }
  },

  loadAdminRequests: async () => {
    set({ isAdminLoading: true });
    try {
      const requests = await apiFetchAdminRequests();
      set({ adminClubRequests: requests, isAdminLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch admin requests', isAdminLoading: false });
    }
  },

  approveRequest: async (requestId) => {
    set({ isSubmitting: true });
    try {
      await apiApproveClub(requestId);
      set((state) => ({
        adminClubRequests: state.adminClubRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'approved' } : r
        ),
        isSubmitting: false,
      }));
      get().refreshFeed();
    } catch (err: any) {
      set({ error: err.message || 'Approval failed', isSubmitting: false });
    }
  },

  rejectRequest: async (requestId, reason) => {
    set({ isSubmitting: true });
    try {
      await apiRejectClub(requestId, reason);
      set((state) => ({
        adminClubRequests: state.adminClubRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'rejected', rejection_reason: reason } : r
        ),
        isSubmitting: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Rejection failed', isSubmitting: false });
    }
  },

  publishEvent: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const newEvent = await apiCreateEvent(payload);
      set((state) => ({
        events: [newEvent, ...state.events],
        isSubmitting: false,
      }));
      return newEvent;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Failed to publish event' });
      throw err;
    }
  },

  deleteEvent: async (eventId: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiDeleteEvent(eventId);
      invalidateDistrictCache();
      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        isSubmitting: false,
      }));
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Failed to delete event' });
      throw err;
    }
  },

  publishPoll: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const newPoll = await apiCreatePoll(payload);
      set((state) => ({
        polls: [newPoll, ...state.polls],
        isSubmitting: false,
      }));
      return newPoll;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Failed to publish poll' });
      throw err;
    }
  },

  requestNewClub: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const req = await apiSubmitClubRequest(payload);
      set({ isSubmitting: false });
      return req;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Failed to submit club request' });
      throw err;
    }
  },

  loadDemographics: async (eventId) => {
    set({ isDemographicsLoading: true, activeDemographicsEventId: eventId, demographicsData: null });
    try {
      const data = await apiFetchDemographics(eventId);
      set({ demographicsData: data, isDemographicsLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load event demographics',
        isDemographicsLoading: false,
      });
    }
  },

  clearDemographics: () => {
    set({ activeDemographicsEventId: null, demographicsData: null, isDemographicsLoading: false });
  },

  clearError: () => set({ error: null }),
}));
