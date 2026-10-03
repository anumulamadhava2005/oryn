/**
 * Creator Studio Types and Utilities
 */

import type { DistrictEvent } from '@/types/events';

export type StudioView = 'dashboard' | 'gate' | 'attendees' | 'publish' | 'broadcast' | 'analytics' | 'polls';

export interface AttendeeRecord {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  email: string;
  passCode: string;
  checkedIn: boolean;
  checkedInAt?: string;
  rsvpStatus?: 'going' | 'interested';
}

export interface EventSessionItem {
  id: string;
  title: string;
  time: string;
}

export interface BroadcastItem {
  id: string;
  type: 'venue' | 'schedule' | 'prep' | 'general';
  title: string;
  message: string;
  createdAt: string;
  senderName: string;
}

export const BROADCAST_CHIPS = [
  { key: 'venue', label: 'Venue Shift', icon: 'location-outline' },
  { key: 'schedule', label: 'Schedule Delay', icon: 'time-outline' },
  { key: 'prep', label: 'Prerequisites', icon: 'laptop-outline' },
  { key: 'general', label: 'General Alert', icon: 'megaphone-outline' },
] as const;

export function formatEventDate(dateStr?: string | null): string {
  if (!dateStr) return 'Date TBA';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Date TBA';
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} ${month} • ${time}`;
}

export function getRelativeDayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
