/**
 * Category metadata: display names, group mapping, icon characters,
 * and colour overrides. Used across classifier, UI badges, and filters.
 */

import { Category, CategoryGroup } from '@/types/email';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface CategoryMeta {
  label: string;
  group: CategoryGroup;
  icon: IconName;
  emoji?: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  // Academics
  academic_office: { label: 'Academic Office', group: 'academics', icon: 'school-outline' },
  lecture:         { label: 'Lecture',         group: 'academics', icon: 'book-outline' },
  lab:             { label: 'Lab',             group: 'academics', icon: 'flask-outline' },
  assignment:      { label: 'Assignment',      group: 'academics', icon: 'document-text-outline' },
  quiz:            { label: 'Quiz',            group: 'academics', icon: 'create-outline' },
  exam:            { label: 'Exam',            group: 'academics', icon: 'clipboard-outline' },
  midsem:          { label: 'Midsem',          group: 'academics', icon: 'calendar-outline' },
  endsem:          { label: 'Endsem',          group: 'academics', icon: 'calendar-outline' },
  attendance:      { label: 'Attendance',      group: 'academics', icon: 'checkmark-done-outline' },
  marks:           { label: 'Marks',           group: 'academics', icon: 'bar-chart-outline' },

  // Placement
  placement_office:{ label: 'Placement Office',group: 'placement', icon: 'briefcase-outline' },
  internship:      { label: 'Internship',      group: 'placement', icon: 'briefcase-outline' },
  full_time:       { label: 'Full Time',       group: 'placement', icon: 'business-outline' },
  ppo:             { label: 'PPO',             group: 'placement', icon: 'ribbon-outline' },
  coding_test:     { label: 'Coding Test',     group: 'placement', icon: 'code-slash-outline' },
  interview:       { label: 'Interview',       group: 'placement', icon: 'people-outline' },

  // Mess Affairs
  mess_affairs:    { label: 'Mess Affairs',    group: 'mess',      icon: 'restaurant-outline' },
  mess_menu:       { label: 'Mess Menu',       group: 'mess',      icon: 'nutrition-outline' },
  canteen:         { label: 'Canteen',         group: 'mess',      icon: 'cafe-outline' },

  // Hostel Affairs
  hostel_affairs:  { label: 'Hostel Affairs',  group: 'hostel',    icon: 'home-outline' },
  warden:          { label: 'Warden Notice',   group: 'hostel',    icon: 'key-outline' },
  maintenance:     { label: 'Maintenance',     group: 'hostel',    icon: 'construct-outline' },
  water_power:     { label: 'Water & Power',   group: 'hostel',    icon: 'flash-outline' },

  // Technical Affairs
  technical_affairs:{ label: 'Tech Affairs',   group: 'technical', icon: 'hardware-chip-outline' },
  hackathon:       { label: 'Hackathon',       group: 'technical', icon: 'terminal-outline' },
  tech_club:       { label: 'Tech Club',       group: 'technical', icon: 'rocket-outline' },
  workshop:        { label: 'Workshop',        group: 'technical', icon: 'hammer-outline' },

  // GCR & Courses
  classroom:       { label: 'Google Classroom',group: 'GCR',       icon: 'easel-outline' },
  nptel:           { label: 'NPTEL Course',    group: 'GCR',       icon: 'library-outline' },
  gcr_notice:      { label: 'GCR Notice',      group: 'GCR',       icon: 'megaphone-outline' },

  // Admin Office
  admin_office:    { label: 'Admin Office',    group: 'admin',     icon: 'shield-checkmark-outline' },
  director_office: { label: 'Director Office', group: 'admin',     icon: 'ribbon-outline' },
  registrar:       { label: 'Registrar',       group: 'admin',     icon: 'newspaper-outline' },
  circular:        { label: 'Circular',        group: 'admin',     icon: 'document-outline' },
  fees:            { label: 'Fees Office',     group: 'admin',     icon: 'wallet-outline' },

  // Events & Sports Affairs
  cultural_affairs:{ label: 'Cultural Affairs',group: 'events',    icon: 'musical-notes-outline' },
  sports_affairs:  { label: 'Sports Affairs',  group: 'events',    icon: 'football-outline' },
  fest:            { label: 'Annual Fest',     group: 'events',    icon: 'ticket-outline' },
  club_event:      { label: 'Club Event',      group: 'events',    icon: 'flag-outline' },

  // Important
  otp:             { label: 'OTP',             group: 'important', icon: 'key-outline' },
  security_alert:  { label: 'Security Alert',  group: 'important', icon: 'alert-circle-outline' },
  bank:            { label: 'Bank',            group: 'important', icon: 'card-outline' },
  payments:        { label: 'Payments',        group: 'important', icon: 'card-outline' },

  // Fallback & Legacy Aliases
  general:         { label: 'General',         group: 'general',   icon: 'mail-outline' },
  mess:            { label: 'Mess',            group: 'mess',      icon: 'restaurant-outline' },
  hostel:          { label: 'Hostel',          group: 'hostel',    icon: 'home-outline' },
  academic:        { label: 'Academics',       group: 'academics', icon: 'school-outline' },
  faculty_notice:  { label: 'Faculty Notice',  group: 'academics', icon: 'person-outline' },
  institute:       { label: 'Admin Office',    group: 'admin',     icon: 'shield-checkmark-outline' },
  student_life:    { label: 'Events & Sports', group: 'events',    icon: 'trophy-outline' },
  logistics:       { label: 'General',         group: 'general',   icon: 'folder-outline' },
  promotional:     { label: 'General',         group: 'general',   icon: 'notifications-outline' },
  social:          { label: 'General',         group: 'general',   icon: 'chatbubbles-outline' },
} as Record<string, CategoryMeta>;

export const GROUP_META: Record<CategoryGroup, { label: string; icon: IconName; emoji?: string }> = {
  academics: { label: 'Academics',    icon: 'school-outline' },
  placement: { label: 'Placement',    icon: 'briefcase-outline' },
  mess:      { label: 'Mess',         icon: 'restaurant-outline' },
  hostel:    { label: 'Hostel',       icon: 'home-outline' },
  technical: { label: 'Technical',    icon: 'code-slash-outline' },
  GCR:       { label: 'GCR & NPTEL',  icon: 'easel-outline' },
  admin:     { label: 'Admin Office', icon: 'shield-checkmark-outline' },
  events:    { label: 'Events & Sports', icon: 'calendar-outline' },
  important: { label: 'Important',    icon: 'alert-circle-outline' },
  general:   { label: 'General',      icon: 'mail-outline' },
};

/** All category groups in display order */
export const CATEGORY_GROUP_ORDER: CategoryGroup[] = [
  'academics',
  'placement',
  'mess',
  'hostel',
  'technical',
  'GCR',
  'admin',
  'events',
  'important',
  'general',
];
