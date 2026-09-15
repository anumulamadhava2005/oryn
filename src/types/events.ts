/**
 * TypeScript types for District Events, Campus Clubs, Polls, and Demographics.
 */

export type EventPriority = 'Critical' | 'Important' | 'Community' | 'Casual';
export type RSVPStatus = 'going' | 'interested';
export type ClubRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DistrictEvent {
  id: string;
  campus_id?: string;
  organization_id?: string;
  organization_name?: string;
  organization_logo?: string;
  organization_verified?: boolean;
  organization_category?: string;
  title: string;
  summary: string;
  description: string;
  poster_url?: string | null;
  priority: EventPriority;
  location?: string | null;
  building?: string | null;
  room_number?: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  is_featured: boolean;
  tags?: string[] | null;
  going_count: number | string;
  interested_count: number | string;
  user_rsvp_status?: RSVPStatus | null;
  requires_action?: boolean;
  action_label?: string | null;
  action_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Club {
  id: string;
  campus_id?: string;
  name: string;
  category: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  instagram_handle?: string | null;
  website?: string | null;
  contact_email?: string | null;
  lead_name?: string | null;
  lead_email?: string | null;
  followers_count: number;
  verified: boolean;
  events_count?: number | string;
  lead_emails?: string[];
  events?: DistrictEvent[];
  polls?: Poll[];
}

export interface PollOption {
  id: string;
  text: string;
  votes_count: number;
}

export interface Poll {
  id: string;
  campus_id?: string;
  organization_id?: string;
  organization_name?: string;
  organization_logo?: string;
  organization_verified?: boolean;
  event_id?: string | null;
  question: string;
  options: PollOption[];
  total_votes: number;
  expires_at?: string | null;
  is_active: boolean;
  user_voted_option?: string | null;
  created_at?: string;
}

export interface ClubRequest {
  id: string;
  campus_id?: string;
  club_name: string;
  category: string;
  description?: string | null;
  lead_name: string;
  lead_email: string;
  contact_phone?: string | null;
  instagram_handle?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  status: ClubRequestStatus;
  rejection_reason?: string | null;
  reviewed_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemographicsSummary {
  total_rsvps: number | string;
  going_count: number | string;
  interested_count: number | string;
}

export interface DemographicsBucket {
  label: string;
  count: number | string;
}

export interface AttendeeInfo {
  id: string;
  user_name: string;
  user_email: string;
  status: string;
  program: string;
  department: string;
  semester: string;
  created_at: string;
}

export interface DemographicsData {
  summary: DemographicsSummary;
  by_program: DemographicsBucket[];
  by_department: DemographicsBucket[];
  by_semester: DemographicsBucket[];
  recent_attendees: AttendeeInfo[];
}

export interface CreateEventPayload {
  organization_id: string;
  title: string;
  summary?: string;
  description: string;
  poster_url?: string;
  priority?: EventPriority;
  location?: string;
  building?: string;
  room_number?: string;
  event_time?: string;
  event_end_time?: string;
  is_featured?: boolean;
  tags?: string[];
  requires_action?: boolean;
  action_label?: string;
  action_url?: string;
}

export interface CreateClubRequestPayload {
  club_name: string;
  category: string;
  description?: string;
  lead_name: string;
  contact_phone?: string;
  instagram_handle?: string;
  logo_url?: string;
  banner_url?: string;
}

export interface CreatePollPayload {
  organization_id: string;
  event_id?: string;
  question: string;
  options: string[];
  expires_at?: string;
}
