/**
 * Category metadata: display names, group mapping, icon characters,
 * and colour overrides. Used across classifier, UI badges, and filters.
 */

import { Category, CategoryGroup } from '@/types/email';

export interface CategoryMeta {
  label: string;
  group: CategoryGroup;
  emoji: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  // Academics
  academic_office: { label: 'Academic Office', group: 'academics', emoji: '📚' },
  lecture:         { label: 'Lecture',         group: 'academics', emoji: '📖' },
  lab:             { label: 'Lab',             group: 'academics', emoji: '🔬' },
  assignment:      { label: 'Assignment',      group: 'academics', emoji: '📝' },
  quiz:            { label: 'Quiz',            group: 'academics', emoji: '✏️' },
  exam:            { label: 'Exam',            group: 'academics', emoji: '📋' },
  midsem:          { label: 'Midsem',          group: 'academics', emoji: '🗓️' },
  endsem:          { label: 'Endsem',          group: 'academics', emoji: '🗓️' },
  attendance:      { label: 'Attendance',      group: 'academics', emoji: '✅' },
  marks:           { label: 'Marks',           group: 'academics', emoji: '📊' },

  // Placement
  placement_office:{ label: 'Placement Office',group: 'placement', emoji: '💼' },
  internship:      { label: 'Internship',      group: 'placement', emoji: '💼' },
  full_time:       { label: 'Full Time',       group: 'placement', emoji: '🏢' },
  ppo:             { label: 'PPO',             group: 'placement', emoji: '🌟' },
  coding_test:     { label: 'Coding Test',     group: 'placement', emoji: '💻' },
  interview:       { label: 'Interview',       group: 'placement', emoji: '🤝' },

  // Mess Affairs
  mess_affairs:    { label: 'Mess Affairs',    group: 'mess',      emoji: '🍽️' },
  mess_menu:       { label: 'Mess Menu',       group: 'mess',      emoji: '🍲' },
  canteen:         { label: 'Canteen',         group: 'mess',      emoji: '☕' },

  // Hostel Affairs
  hostel_affairs:  { label: 'Hostel Affairs',  group: 'hostel',    emoji: '🏠' },
  warden:          { label: 'Warden Notice',   group: 'hostel',    emoji: '🔑' },
  maintenance:     { label: 'Maintenance',     group: 'hostel',    emoji: '🔧' },
  water_power:     { label: 'Water & Power',   group: 'hostel',    emoji: '⚡' },

  // Technical Affairs
  technical_affairs:{ label: 'Tech Affairs',   group: 'technical', emoji: '⚡' },
  hackathon:       { label: 'Hackathon',       group: 'technical', emoji: '💻' },
  tech_club:       { label: 'Tech Club',       group: 'technical', emoji: '🚀' },
  workshop:        { label: 'Workshop',        group: 'technical', emoji: '🛠️' },

  // GCR & Courses
  classroom:       { label: 'Google Classroom',group: 'GCR',       emoji: '🏫' },
  nptel:           { label: 'NPTEL Course',    group: 'GCR',       emoji: '📖' },
  gcr_notice:      { label: 'GCR Notice',      group: 'GCR',       emoji: '📢' },

  // Admin Office
  admin_office:    { label: 'Admin Office',    group: 'admin',     emoji: '🏛️' },
  director_office: { label: 'Director Office', group: 'admin',     emoji: '👑' },
  registrar:       { label: 'Registrar',       group: 'admin',     emoji: '📜' },
  circular:        { label: 'Circular',        group: 'admin',     emoji: '📢' },
  fees:            { label: 'Fees Office',     group: 'admin',     emoji: '💰' },

  // Events & Sports Affairs
  cultural_affairs:{ label: 'Cultural Affairs',group: 'events',    emoji: '🎭' },
  sports_affairs:  { label: 'Sports Affairs',  group: 'events',    emoji: '⚽' },
  fest:            { label: 'Annual Fest',     group: 'events',    emoji: '🎉' },
  club_event:      { label: 'Club Event',      group: 'events',    emoji: '🎯' },

  // Important
  otp:             { label: 'OTP',             group: 'important', emoji: '🔑' },
  security_alert:  { label: 'Security Alert',  group: 'important', emoji: '🚨' },
  bank:            { label: 'Bank',            group: 'important', emoji: '🏦' },
  payments:        { label: 'Payments',        group: 'important', emoji: '💳' },

  // Fallback & Legacy Aliases
  general:         { label: 'General',         group: 'general',   emoji: '📧' },
  mess:            { label: 'Mess',            group: 'mess',      emoji: '🍽️' },
  hostel:          { label: 'Hostel',          group: 'hostel',    emoji: '🏠' },
  academic:        { label: 'Academics',       group: 'academics', emoji: '📚' },
  faculty_notice:  { label: 'Faculty Notice',  group: 'academics', emoji: '👩‍🏫' },
  institute:       { label: 'Admin Office',    group: 'admin',     emoji: '🏛️' },
  student_life:    { label: 'Events & Sports', group: 'events',    emoji: '🎉' },
  logistics:       { label: 'General',         group: 'general',   emoji: '🗂️' },
  promotional:     { label: 'General',         group: 'general',   emoji: '📣' },
  social:          { label: 'General',         group: 'general',   emoji: '💬' },
} as Record<string, CategoryMeta>;

export const GROUP_META: Record<CategoryGroup, { label: string; emoji: string }> = {
  academics: { label: 'Academics',    emoji: '📚' },
  placement: { label: 'Placement',    emoji: '💼' },
  mess:      { label: 'Mess',         emoji: '🍽️' },
  hostel:    { label: 'Hostel',       emoji: '🏠' },
  technical: { label: 'Technical',    emoji: '⚡' },
  GCR:       { label: 'GCR & NPTEL',  emoji: '🏫' },
  admin:     { label: 'Admin Office', emoji: '🏛️' },
  events:    { label: 'Events & Sports', emoji: '🎉' },
  important: { label: 'Important',    emoji: '🚨' },
  general:   { label: 'General',      emoji: '📧' },
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
