/**
 * Core domain types for email processing pipeline.
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'ignore';

export type Category =
  // Academic Office & Faculty
  | 'academic_office' | 'lecture' | 'lab' | 'assignment' | 'quiz' | 'exam'
  | 'midsem' | 'endsem' | 'attendance' | 'marks'
  // Placement Office & TPO
  | 'placement_office' | 'internship' | 'full_time' | 'ppo' | 'coding_test' | 'interview'
  // Mess Affairs & Dining
  | 'mess_affairs' | 'mess_menu' | 'canteen'
  // Hostel Affairs & Warden
  | 'hostel_affairs' | 'warden' | 'maintenance' | 'water_power'
  // Technical Affairs & Tech Clubs
  | 'technical_affairs' | 'hackathon' | 'tech_club' | 'workshop'
  // Google Classroom & NPTEL
  | 'classroom' | 'nptel' | 'gcr_notice'
  // Institute Admin & Offices
  | 'admin_office' | 'director_office' | 'registrar' | 'circular' | 'fees'
  // Events, Sports & Cultural Affairs
  | 'cultural_affairs' | 'sports_affairs' | 'fest' | 'club_event'
  // Important System Alerts
  | 'otp' | 'security_alert' | 'bank' | 'payments'
  // Fallback
  | 'general';

export type CategoryGroup =
  | 'academics'
  | 'placement'
  | 'mess'
  | 'hostel'
  | 'technical'
  | 'GCR'
  | 'admin'
  | 'events'
  | 'important'
  | 'general';

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface ExtractedEntities {
  courseCodes: string[];
  facultyNames: string[];
  companyNames: string[];
  buildingNames: string[];
  roomNumbers: string[];
  dates: string[];
  times: string[];
  phoneNumbers: string[];
  emails: string[];
  urls: string[];
  eventNames: string[];
  venueNames: string[];
}

export interface ParsedEmail {
  /** Gmail message ID */
  id: string;
  threadId: string;

  /** Sender display name */
  sender: string;
  /** Sender email address */
  senderEmail: string;
  /** Recipient email(s) */
  recipients: string[];
  /** CC email(s) */
  cc: string[];

  subject: string;
  snippet: string;

  /** Sanitised plain-text body */
  body: string;
  /** Original HTML body (may be empty for plain-text emails) */
  htmlBody: string;

  /** Parsed from the Date header */
  date: number; // Unix ms timestamp

  /** Gmail label IDs */
  labels: string[];
  /** Human-readable label names */
  labelNames: string[];

  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;

  attachments: Attachment[];
  extractedLinks: string[];

  /** Primary category */
  category: Category;
  /** All matching categories (can be multiple) */
  categories: Category[];
  /** Broad group for the primary category */
  categoryGroup: CategoryGroup;

  priority: Priority;

  /** ISO 8601 string if a deadline was detected, otherwise null */
  deadline: string | null;
  /** Human-readable deadline description e.g. "Tomorrow 5 PM" */
  deadlineLabel: string | null;

  /** Urgency score 0–100 */
  urgencyScore: number;

  extractedEntities: ExtractedEntities;
  actionItems: string[];
  tags: string[];

  /** Unix ms — when this record was last parsed/cached */
  cachedAt: number;
  /** MD5-like fingerprint of the raw message used for cache invalidation */
  cacheHash: string;
}

/** Raw Gmail API message (partial — only what we need) */
export interface RawGmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailPayload;
  sizeEstimate: number;
}

export interface GmailPayload {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body: GmailBody;
  parts?: GmailPayload[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailBody {
  attachmentId?: string;
  size: number;
  data?: string; // base64url encoded
}

export interface CachedEmail {
  raw: RawGmailMessage;
  parsed: ParsedEmail;
  syncedAt: number;
}
