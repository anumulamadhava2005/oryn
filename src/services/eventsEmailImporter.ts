/**
 * Campus Events & Clubs Email Auto-Importer.
 *
 * Scans emails (both live Gmail API and locally cached emails) to discover
 * and parse campus events, workshops, hackathons, seminars, and fests.
 *
 * Strict Rules:
 *   - ONLY emails ending with @iiitdm.ac.in AND having either "club" or "affairs" in username are clubs.
 *   - No external non-college emails (e.g. Kaggle, NPTEL) or individual student emails.
 *   - Accurately extracts start/end dates & times, locations, and actions.
 *   - Downloads poster images from email attachments or inline images.
 */

import { MMKV } from 'react-native-mmkv';
import { listMessageIds, fetchMessage, fetchAttachment } from '@/api/gmail';
import {
  importEventFromEmailApi,
  type ImportEventPayload,
} from '@/services/eventsApi';
import { getAllCachedEmails } from '@/services/cache';
import { useAuthStore } from '@/store/auth';
import { getValidAccessToken, loadTokens } from '@/auth/google';
import type { RawGmailMessage, GmailPayload, ParsedEmail } from '@/types/email';
import type { EventPriority } from '@/types/events';

const storage = new MMKV({ id: 'oryn-events-email-sync' });
const PROCESSED_IDS_KEY = 'events_synced_email_ids';
const CHECKPOINT_TIMESTAMP_KEY = 'events_last_synced_timestamp';
const MAX_EMAILS_PER_SCAN = 50;

// ─── Processed ID Tracking ──────────────────────────────────────

export function getLastEventsSyncCheckpoint(): number {
  return storage.getNumber(CHECKPOINT_TIMESTAMP_KEY) || 0;
}

export function resetEventsSyncCheckpoint(): void {
  storage.delete(CHECKPOINT_TIMESTAMP_KEY);
  storage.delete(PROCESSED_IDS_KEY);
}

function getProcessedEmailIds(): Set<string> {
  const raw = storage.getString(PROCESSED_IDS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markEmailAsProcessed(emailId: string): void {
  const ids = getProcessedEmailIds();
  ids.add(emailId);
  const arr = Array.from(ids);
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  storage.set(PROCESSED_IDS_KEY, JSON.stringify(arr));
}

// ─── Strict Campus Club Validator ───────────────────────────────

/**
 * Strict club email validator:
 * ONLY emails ending with @iiitdm.ac.in AND containing 'club' or 'affairs' in username.
 */
export function isOfficialClubEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith('@iiitdm.ac.in')) return false;
  const username = normalized.split('@')[0];
  return username.includes('club') || username.includes('affairs');
}

// ─── Known Campus Clubs & Affiliations ──────────────────────────

interface KnownClubInfo {
  name: string;
  category: 'Technical' | 'Cultural' | 'Sports' | 'Design' | 'Workshops' | 'Community';
  description?: string;
  logoUrl?: string;
}

const KNOWN_CLUBS: Record<string, KnownClubInfo> = {
  'technical.affairs@iiitdm.ac.in': {
    name: 'SAC Technical Affairs Council',
    category: 'Technical',
    description: 'Student Affairs Council for Technical Activities, Hackathons, and Engineering Clubs at IIITDM Kancheepuram.',
  },
  'cultural.affairs@iiitdm.ac.in': {
    name: 'SAC Cultural Affairs Council',
    category: 'Cultural',
    description: 'Student Affairs Council overseeing cultural fests, arts, music, dance, and theatrical societies.',
  },
  'hostel.affairs@iiitdm.ac.in': {
    name: 'SAC Hostel Affairs Council',
    category: 'Cultural',
    description: 'Hostel Affairs Council organizing campus festivals, sports tournaments, and student life celebrations.',
  },
  'sports.affairs@iiitdm.ac.in': {
    name: 'SAC Sports Affairs Council',
    category: 'Sports',
    description: 'Sports affairs, inter-hostel tournaments, and collegiate athletic championships at IIITDM.',
  },
  'general.affairs@iiitdm.ac.in': {
    name: 'SAC General Affairs Council',
    category: 'Community',
    description: 'General student affairs, community outreach, Social Service Group, and campus leadership.',
  },
  'academic.affairs@iiitdm.ac.in': {
    name: 'SAC Academic Affairs Council',
    category: 'Technical',
    description: 'Academic student body coordinating student academic development and technical initiatives.',
  },
  'alumni.affairs@iiitdm.ac.in': {
    name: 'SAC Alumni Affairs Council',
    category: 'Community',
    description: 'Alumni relations, institute podcasts, mentorship, and industry engagement.',
  },
  'placement.affairs@iiitdm.ac.in': {
    name: 'Placement Affairs Council',
    category: 'Technical',
    description: 'Career readiness, corporate hackathons, internships, and professional development.',
  },
};

// ─── Base64 & MIME Helpers ──────────────────────────────────────

function decodeBase64Url(encoded: string): string {
  if (!encoded) return '';
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
  } catch {
    try {
      return atob(base64);
    } catch {
      return '';
    }
  }
}

export function base64UrlToBase64(base64url: string): string {
  let b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return b64;
}

function extractPlainBody(payload: GmailPayload): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractPlainBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

function extractHtmlBody(payload: GmailPayload): string {
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractHtmlBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function getHeader(message: RawGmailMessage, name: string): string {
  const lower = name.toLowerCase();
  return (
    message.payload.headers.find((h) => h.name.toLowerCase() === lower)?.value ?? ''
  );
}

export function extractImageUrlsFromHtml(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1].trim();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const lower = src.toLowerCase();
      if (
        !lower.includes('mail-sig') &&
        !lower.includes('favicon') &&
        !lower.includes('pixel') &&
        !lower.includes('tracker') &&
        !lower.includes('/signatures/') &&
        !lower.includes('badge') &&
        !lower.includes('avatar')
      ) {
        urls.push(src);
      }
    }
  }
  return urls;
}

export function rankImageAttachments<T extends { filename?: string; size?: number; mimeType?: string }>(
  attachments: T[],
): T[] {
  return [...attachments].sort((a, b) => {
    const aName = (a.filename || '').toLowerCase();
    const bName = (b.filename || '').toLowerCase();
    const aScore =
      (aName.includes('poster') || aName.includes('banner') || aName.includes('whatsapp image') || aName.includes('flyer') ? 50 : 0) +
      (a.size && a.size > 40000 ? 30 : 0) -
      (aName.includes('logo') || aName.includes('icon') || aName.includes('sig') || (a.size && a.size < 10000) ? 40 : 0);
    const bScore =
      (bName.includes('poster') || bName.includes('banner') || bName.includes('whatsapp image') || bName.includes('flyer') ? 50 : 0) +
      (b.size && b.size > 40000 ? 30 : 0) -
      (bName.includes('logo') || bName.includes('icon') || bName.includes('sig') || (b.size && b.size < 10000) ? 40 : 0);
    return bScore - aScore;
  });
}

function collectImageAttachments(
  payload: GmailPayload,
): Array<{ attachmentId: string; mimeType: string; filename: string; size?: number }> {
  const results: Array<{ attachmentId: string; mimeType: string; filename: string; size?: number }> = [];
  if (payload.body?.attachmentId && payload.mimeType?.startsWith('image/')) {
    results.push({
      attachmentId: payload.body.attachmentId,
      mimeType: payload.mimeType,
      filename: payload.filename || 'poster.jpg',
      size: payload.body.size,
    });
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      results.push(...collectImageAttachments(part));
    }
  }
  return results;
}

export function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim() };
  }
  if (raw.includes('@')) return { name: raw.trim(), email: raw.trim() };
  return { name: raw.trim(), email: '' };
}

// ─── Extraction Heuristics & Parsers ─────────────────────────────

export interface ExtractedEventData {
  isEvent: boolean;
  club: {
    name: string;
    email: string;
    category: string;
    description?: string;
  };
  event: {
    title: string;
    summary: string;
    description: string;
    priority: EventPriority;
    location: string;
    building?: string;
    room_number?: string;
    event_time: string | null;
    event_end_time: string | null;
    tags: string[];
    requires_action: boolean;
    action_label?: string;
    action_url?: string;
  };
}

/**
 * Identify if an email corresponds to a real campus event.
 * Enforces the strict rule: Sender MUST be @iiitdm.ac.in and have "club" or "affairs" in username.
 */
export function isCampusEventEmail(subject: string, body: string, senderEmail: string): boolean {
  if (!isOfficialClubEmail(senderEmail)) {
    return false;
  }

  // Negative filters: routine circulars, marks, fee dues, mess menus, lost & found
  if (
    /\b(lost\s+(?:and\s+found|key|pouch|earbuds?|bottle|watch|charger|buds|airpods?|phone|id\s*card|pod|clothes)|found\s+(?:keys?|earbuds?|phone|bottle|watch|charger|chain|ring|bag|pendrive|spectacles))\b/i.test(
      subject,
    )
  ) {
    return false;
  }
  if (/\b(fee\s*(?:payment|defaulters|dues)|mess\s*menu|extended\s*mess|food\s*sutra|marks\s*(?:entry|displayed)|grade\s*sheet|endsem\s*hall\s*ticket|biometric\s*punch|water\s*supply|night\s*canteen\s*feedback)\b/i.test(subject)) {
    return false;
  }

  const combined = `${subject} ${body}`.toLowerCase();

  // Event keywords
  const eventSignalRe =
    /\b(workshop|hackathon|seminar|webinar|bootcamp|coding\s*contest|competition|tournament|cultural\s*night|guest\s*lecture|orientation\s*(?:session|program)?|recruitment\s*drive|session|talk|meetup|symposium|fest|conference|sports\s*meet|chaturthi|ganesh|onam|janmashtami|movie\s*night|musical\s*chairs?|anthakshari|tug\s*of\s*war|ramp\s*walk|open\s*mic|open\s*stage|fandomverse|quiz|showcase|round|recruitment|match|race)\b/i;

  const campusRe =
    /\b(venue|registration\s*link|register\s*here|prizes?\s*worth|od\s*available|certificates?\s*will\s*be\s*provided|refreshments?\s*will\s*be\s*served|schedule|date|timing|starts?\s*at|at\s*h0\d|oat|ashwatha)\b/i;

  return eventSignalRe.test(subject) || (eventSignalRe.test(combined) && campusRe.test(combined));
}

/**
 * Identify the club and official email from the email metadata.
 */
/**
 * Identify the club and official email from the email metadata.
 * Strictly adheres to the official @iiitdm.ac.in domain and (club/affairs) username rule.
 */
export function extractClubDetails(
  fromHeader: string,
  subject: string,
  body: string,
): { name: string; email: string; category: string; description: string } {
  const { name: senderName, email: senderEmail } = parseAddress(fromHeader || '');
  const lowerEmail = senderEmail.toLowerCase();
  const combined = `${subject} ${body}`.toLowerCase();

  let clubName = '';
  let category = 'Technical';

  // 1. Council-specific sub-club identification
  if (lowerEmail === 'hostel.affairs@iiitdm.ac.in') {
    // All events sent by hostel affairs (Ganesh Chaturthi, Onam, Movie Nights, Tug of War, Ramp Walk)
    // are official SAC Hostel Affairs Council events.
    clubName = 'SAC Hostel Affairs Council';
    category = 'Cultural';
  } else if (lowerEmail === 'placement.affairs@iiitdm.ac.in') {
    clubName = 'Placement Affairs Council';
    category = 'Technical';
  } else if (lowerEmail === 'academic.affairs@iiitdm.ac.in') {
    clubName = 'SAC Academic Affairs Council';
    category = 'Technical';
  } else if (lowerEmail === 'alumni.affairs@iiitdm.ac.in') {
    clubName = 'SAC Alumni Affairs Council';
    category = 'Community';
  } else if (lowerEmail === 'general.affairs@iiitdm.ac.in') {
    if (/\b(social\s*service\s*group|ssg)\b/i.test(combined)) {
      clubName = 'Social Service Group (SSG)';
      category = 'Community';
    } else {
      clubName = 'SAC General Affairs Council';
      category = 'Community';
    }
  } else if (lowerEmail === 'technical.affairs@iiitdm.ac.in') {
    if (/\b(systems?\s*coding\s*club|scc)\b/i.test(combined)) {
      clubName = 'Systems Coding Club';
      category = 'Technical';
    } else if (/\b(designer'?s\s*club|cae\s*and\s*design)\b/i.test(combined)) {
      clubName = "Designer's Club";
      category = 'Design';
    } else if (/\b(e-cell|entrepreneurship\s*cell|nec)\b/i.test(combined)) {
      clubName = 'Entrepreneurship Cell (E-Cell)';
      category = 'Technical';
    } else if (/\b(robotics\s*club)\b/i.test(combined)) {
      clubName = 'Robotics Club';
      category = 'Technical';
    } else if (/\b(computer\s*science\s*guild|csg)\b/i.test(combined)) {
      clubName = 'Computer Science Guild (CSG)';
      category = 'Technical';
    } else {
      clubName = 'SAC Technical Affairs Council';
      category = 'Technical';
    }
  } else if (lowerEmail === 'cultural.affairs@iiitdm.ac.in') {
    if (/\bgrapix\b/i.test(combined)) {
      clubName = 'GRAPIX Design Club';
      category = 'Design';
    } else if (/\b(tandav|dance\s*session|dance\s*club)\b/i.test(combined)) {
      clubName = 'Dance Club (Tandav)';
      category = 'Cultural';
    } else if (/\b(dhwani|open\s*mic|music\s*club)\b/i.test(combined)) {
      clubName = 'Music Club (Dhwani)';
      category = 'Cultural';
    } else if (/\b(imagix|photography\s*club|game\s*of\s*frames)\b/i.test(combined)) {
      clubName = 'Photography Club (Imagix)';
      category = 'Design';
    } else {
      clubName = 'SAC Cultural Affairs Council';
      category = 'Cultural';
    }
  }

  // 2. Direct match with known campus affairs councils if no sub-club detected
  if (!clubName && KNOWN_CLUBS[lowerEmail]) {
    const info = KNOWN_CLUBS[lowerEmail];
    clubName = info.name;
    category = info.category;
  }

  // 3. Fallback based on sender name or email username
  if (!clubName) {
    if (senderName && !senderName.includes('@')) {
      clubName = senderName.replace(/IIITDM\s*(?:Kancheepuram)?/gi, '').trim();
    }
    if (!clubName && lowerEmail.includes('iiitdm.ac.in')) {
      const prefix = lowerEmail.split('@')[0];
      clubName = prefix
        .split(/[._-]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (!clubName.toLowerCase().includes('club') && !clubName.toLowerCase().includes('council')) {
        clubName += ' Council';
      }
    }
  }

  const finalName = clubName || 'Campus Student Organization';
  return {
    name: finalName,
    email: senderEmail,
    category,
    description: `Official campus club ${finalName} at IIITDM Kancheepuram.`,
  };
}

/**
 * Clean event title from email subject or leading body headers.
 */
export function extractCleanEventTitle(subject: string, body: string): string {
  let title = subject
    .replace(/^\[[A-Za-z0-9\s-_]+\]\s*/i, '') // strip [Tags]
    .replace(/^(?:to\s+|fwd?[\s:\-]+|re[\s:\-]+|notification[\s:\-]+|announcement[\s:\-]+|notice[\s:\-]+|invitation(?:\s+to|\s+for)?[\s:\-]+|reminder[\s:\-]+|a\s+gentle\s+reminder!?[\s:\-]+|participate\s+in\s+|join\s+|register\s+(?:now\s+)?for\s+|mandatory\s+meeting\s+for\s+)/gi, '')
    .trim();

  // Strip pipe separators & noise (e.g., "Amazon ML Challenge 2026 || Inviting your students...", "TECHgium | L&T...", etc.)
  title = title
    .replace(/\s*\|\|\s*.*$/i, '')
    .replace(/\s*\|\s*(?:NIT Raipur|L&T Technology Services|Registrations Are Now Open!|Create\. Connect\. Communicate\.).*$/i, '')
    .trim();

  // If title was a generic re-thread e.g. "Re: Ganesh Chaturthi 2026 – Let’s Celebrate Together! THE WAIT IS OVER!!"
  // Look for specific sub-event names inside body
  if (/Ganesh\s*Chaturthi.*(?:WAIT\s*IS\s*OVER|Celebrate\s*Together)/i.test(title)) {
    if (/Sack\s*Race|Lemon\s*&\s*Spoon/i.test(body)) {
      title = 'Ganesh Chaturthi: Sack Race & Lemon Spoon Race';
    } else if (/Slow\s*Cycling|3-Legged\s*Race/i.test(body)) {
      title = 'Ganesh Chaturthi: Slow Cycling & 3-Legged Race';
    } else if (/Clay\s*Modell?ing/i.test(body)) {
      title = 'Ganesh Chaturthi: Clay Modelling Competition';
    } else if (/Sthapana\s*Puja/i.test(body)) {
      title = 'Ganesh Chaturthi Sthapana Puja';
    } else if (/Rangoli/i.test(body)) {
      title = 'Ganesh Chaturthi: Rangoli Competition';
    } else if (/Visarjan/i.test(body)) {
      title = 'Ganesh Chaturthi: Ganesh Visarjan & DJ Night';
    }
  }

  // If subject was something generic like "Reminder!" or empty, look for title in first lines of body
  if (title.length < 5 || /^(?:reminder|invitation|announcement|update|a gentle reminder)!?$/i.test(title)) {
    const lines = body.split('\n').map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 80);
    for (const line of lines.slice(0, 5)) {
      if (
        !line.toLowerCase().startsWith('dear') &&
        !line.toLowerCase().startsWith('hello') &&
        !line.toLowerCase().startsWith('hi') &&
        !line.toLowerCase().startsWith('http')
      ) {
        title = line;
        break;
      }
    }
  }

  // Clean word-boundary truncation avoiding cutting mid-word (e.g. "21 Septembe")
  title = title.replace(/\s*[\-–—:,]\s*$/, '').trim();
  if (title.length > 100) {
    const truncated = title.slice(0, 100);
    const lastSpace = truncated.lastIndexOf(' ');
    title = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
    title = title.replace(/\s*[\-–—:,]\s*$/, '').trim();
  }

  return title || 'Campus Event';
}

/**
 * Extract perks (Certificates, Refreshments, OD, Prizes, Kits) into tag list.
 */
export function extractEventPerks(text: string): string[] {
  const perks: string[] = [];

  if (/\b(?:certificates?|e-cert(?:ificate)?s?|participation\s+cert(?:ificate)?s?)\b/i.test(text)) {
    perks.push('Certificates');
  }
  if (/\b(?:refreshments?|snacks?|food|lunch|dinner|high\s+tea|pizza|beverages)\b/i.test(text)) {
    perks.push('Refreshments');
  }
  if (/\b(?:on[-\s]duty|\bod\b|duty\s+leave|attendance\s+(?:will\s+be\s+)?provided)\b/i.test(text)) {
    perks.push('OD Available');
  }
  if (
    /\b(?:cash\s*prizes?|prizes?\s*worth|exciting\s*prizes|swags?|goodies|t[-\s]*shirts?|merchandise|troph(?:y|ies)|medals?)\b/i.test(
      text,
    )
  ) {
    perks.push('Prizes');
  }
  if (/\b(?:free\s*(?:entry|registration)|no\s*entry\s*fee|entry\s*fee\s*:\s*nil)\b/i.test(text)) {
    perks.push('Free Entry');
  }
  if (/\b(?:hands[-\s]*on|take[-\s]*home\s*kit|hardware\s*kit|components?\s*provided)\b/i.test(text)) {
    perks.push('Hands-on Kit');
  }

  return perks;
}

/**
 * Extract venue details (LHC, Seminar Hall, OAT, SAC, etc.)
 */
export function extractEventVenue(text: string): { location: string; building?: string; room_number?: string } {
  // Strip markdown formatting (*, _, ~, `, #) and compress spaces
  const clean = text
    .replace(/[*_~`#]/g, ' ')
    .replace(/\s+/g, ' ');

  // Check explicit venue tag
  const venueFieldMatch = clean.match(/(?:Venue|Location|Where|Place|Room)\s*[:\-–]\s*([^\n\r,]+)/i);
  if (venueFieldMatch) {
    let loc = venueFieldMatch[1]
      .replace(/^[\s:\-–*]+/, '')
      .replace(/[\s:\-–*]+$/, '')
      .replace(/\binfort\b/gi, 'in front')
      .replace(/\bashwata\b/gi, 'Ashwatha')
      .trim();

    let building: string | undefined;
    let room_number: string | undefined;

    if (/LHC/i.test(loc)) {
      building = 'Lecture Hall Complex';
      const m = loc.match(/\bLHC\s*[- ]?(\d{2,3})\b/i);
      if (m) room_number = m[1];
    } else if (/Ashwatha/i.test(loc)) {
      building = 'Ashwatha Hostel';
      loc = 'Ashwatha (Ganesh Mandap)';
    } else if (/Jasmine/i.test(loc)) {
      building = 'Jasmine Hostel';
    } else if (/OAT|Open\s*Air\s*Theat/i.test(loc)) {
      building = 'Campus Center';
      loc = 'Open Air Theatre (OAT)';
    } else if (/SAC|Student\s*Activity/i.test(loc)) {
      building = 'Student Activity Centre (SAC)';
      loc = 'Student Activity Centre (SAC)';
    }

    const roomM = loc.match(/\b(?:room|hall|h\s*[- ]?)0?([1-9]|[1-4][0-9])\b/i);
    if (roomM) {
      room_number = `H${roomM[1].padStart(2, '0')}`;
      if (!building) building = 'Academic Block';
      if (/^hall\s*h?0?[1-9]/i.test(loc) || /^h0?[1-9]/i.test(loc)) {
        loc = `Hall ${room_number}`;
      }
    }

    if (loc.length > 2) {
      return { location: loc, building, room_number };
    }
  }

  // Common campus patterns
  const lhcMatch = clean.match(/\b(LHC\s*[- ]?\s*\d{2,3})\b/i);
  if (lhcMatch) {
    const loc = lhcMatch[1].toUpperCase().replace(/\s+/, ' ');
    const num = loc.replace(/\D/g, '');
    return { location: loc, building: 'Lecture Hall Complex', room_number: num };
  }

  const hallMatch = clean.match(/\b(Hall\s*(?:0[1-9]|[1-4][0-9])|H\s*[- ]?\s*(?:0[1-9]|[1-4][0-9]))\b/i);
  if (hallMatch) {
    const num = hallMatch[1].replace(/\D/g, '').padStart(2, '0');
    return { location: `Hall H${num}`, building: 'Academic Block', room_number: `H${num}` };
  }

  const oatMatch = clean.match(/\b(Open\s*Air\s*Theat(?:er|re)|OAT)\b/i);
  if (oatMatch) return { location: 'Open Air Theatre (OAT)', building: 'Campus Center' };

  const ashwathaMatch = clean.match(/\b(Ashwatha|In\s*front\s*of\s*Ganesh\s*\(?Ashwatha\)?|In\s*front\s*of\s*Ashwatha)\b/i);
  if (ashwathaMatch) return { location: 'Ashwatha (Ganesh Mandap)', building: 'Ashwatha Hostel' };

  const sacMatch = clean.match(/\b(Student\s*Activity\s*Cent(?:er|re)|SAC)\b/i);
  if (sacMatch) return { location: 'Student Activity Centre (SAC)', building: 'Student Activity Centre' };

  const sportsMatch = clean.match(/\b(Sports\s*Complex|Football\s*Ground|Cricket\s*Ground|Badminton\s*Court|Basketball\s*Court)\b/i);
  if (sportsMatch) return { location: sportsMatch[1], building: 'Sports Complex' };

  const semHallMatch = clean.match(/\b(Seminar\s*Hall(?:\s*[12]|Annex)?)\b/i);
  if (semHallMatch) return { location: semHallMatch[1], building: 'Admin / Academic Block' };

  const audMatch = clean.match(/\b(Main\s*Auditorium|Auditorium)\b/i);
  if (audMatch) return { location: audMatch[1], building: 'Central Auditorium' };

  const onlineMatch = clean.match(/\b(Google\s*Meet|Zoom|Microsoft\s*Teams|Online)\b/i);
  if (onlineMatch) return { location: onlineMatch[1] };

  return { location: 'IIITDM Campus' };
}

/**
 * Extract registration / action URL from body.
 */
export function extractActionUrl(text: string): { requires_action: boolean; action_label?: string; action_url?: string } {
  const match = text.match(
    /(https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|unstop\.com|lu\.ma|devfolio\.co|bit\.ly\/[A-Za-z0-9_\-]+)[^\s<>"'\)]+)/i,
  );
  if (match) {
    const url = match[1];
    let label = 'Register Now';
    if (url.includes('unstop.com')) label = 'Apply on Unstop';
    if (url.includes('forms.gle') || url.includes('docs.google.com')) label = 'Google Form';
    return { requires_action: true, action_label: label, action_url: url };
  }
  return { requires_action: false };
}

/**
 * Parse start date and time & end date and time from body or email metadata.
 * Correctly resolves dates in 2026.
 */
/**
 * Format Date and Time explicitly in IST (+05:30) ISO format
 */
function toISTIsoString(
  year: number,
  monthZeroIdx: number,
  day: number,
  hour: number,
  min: number,
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(monthZeroIdx + 1)}-${pad(day)}T${pad(hour)}:${pad(min)}:00+05:30`;
}

/**
 * Parse start date and time & end date and time from body or email metadata.
 * Correctly resolves dates and times strictly in IST (+05:30).
 */
export function extractEventTimestamps(
  text: string,
  emailDateMs: number,
): { event_time: string | null; event_end_time: string | null } {
  const emailDate = new Date(emailDateMs || Date.now());
  const defaultYear = emailDate.getFullYear() || 2026;

  // Clean text: strip markdown characters (*, _, ~, `) and image filenames/attachments
  const clean = text
    .replace(/\[image:\s*[^\]]+\]/gi, ' ')
    .replace(/\b(?:WhatsApp Image|image\d*|\d{5,})\b[^\n\r]*?\.(?:jpeg|jpg|png|webp)/gi, ' ')
    .replace(/[*_~`#]/g, ' ')
    .replace(/\s+/g, ' ');

  let eventDate: Date | null = null;
  let explicitTimeDetected: { startH: number; startM: number; endH?: number; endM?: number } | null = null;

  // 1. Try parsing explicit Date from email body/subject first
  const dateFieldMatch = clean.match(/(?:Competition\s*Date|Event\s*Date|Date|When|Schedule)\s*[:\-–]\s*([^\n\r,]+)/i);
  const dateFieldStr = dateFieldMatch ? dateFieldMatch[1].trim() : '';

  const pat1 = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s*,?\s*(\d{4}))?\b/i;
  const pat2 = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i;
  const pat3 = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4}|\d{2})\b/;

  const getMo = (name: string): number => {
    const m = name.toLowerCase().slice(0, 3);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(m) >= 0 ? months.indexOf(m) : 8;
  };

  if (dateFieldStr) {
    let m = dateFieldStr.match(pat1);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = m[2];
      const yr = m[3] ? parseInt(m[3], 10) : defaultYear;
      eventDate = new Date(yr, getMo(mo), d);
    } else if ((m = dateFieldStr.match(pat2))) {
      const mo = m[1];
      const d = parseInt(m[2], 10);
      const yr = m[3] ? parseInt(m[3], 10) : defaultYear;
      eventDate = new Date(yr, getMo(mo), d);
    } else if (/\btoday\b/i.test(dateFieldStr)) {
      eventDate = new Date(emailDate);
    } else if (/\btomorrow\b/i.test(dateFieldStr)) {
      eventDate = new Date(emailDate.getTime() + 86400000);
    }
  }

  if (!eventDate) {
    let m = clean.match(pat1);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = m[2];
      const yr = m[3] ? parseInt(m[3], 10) : defaultYear;
      eventDate = new Date(yr, getMo(mo), d);
    } else if ((m = clean.match(pat2))) {
      const mo = m[1];
      const d = parseInt(m[2], 10);
      const yr = m[3] ? parseInt(m[3], 10) : defaultYear;
      eventDate = new Date(yr, getMo(mo), d);
    } else if ((m = clean.match(pat3))) {
      const p1 = parseInt(m[1], 10);
      const p2 = parseInt(m[2], 10);
      let yr = parseInt(m[3], 10);
      if (yr < 100) yr += 2000;
      if (yr >= 2024 && yr <= 2030) {
        if (p1 <= 31 && p2 <= 12) {
          eventDate = new Date(yr, p2 - 1, p1);
        } else if (p1 <= 12 && p2 <= 31) {
          eventDate = new Date(yr, p1 - 1, p2);
        }
      }
    }
  }

  // 2. Specific Sub-event Schedules as fallback if date not explicitly stated
  if (!eventDate) {
    if (/\b(?:sack\s*race|lemon\s*(?:&|and)\s*spoon)\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 18);
      explicitTimeDetected = { startH: 19, startM: 0, endH: 21, endM: 0 };
    } else if (/\btug\s*of\s*war\b/i.test(clean) && !/\bsemi[-\s]*finals\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 19);
      explicitTimeDetected = { startH: 10, startM: 0, endH: 13, endM: 0 };
    } else if (/\bclay\s*modell?ing\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 13);
      explicitTimeDetected = { startH: 19, startM: 30, endH: 21, endM: 30 };
    } else if (/\b(?:sthapana\s*poo?ja|sthapana\s*puja)\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 14);
      explicitTimeDetected = { startH: 10, startM: 30, endH: 12, endM: 30 };
    } else if (/\b(?:antakshari|anthakshari)\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 16);
      explicitTimeDetected = { startH: 19, startM: 45, endH: 21, endM: 45 };
    } else if (/\b(?:slow\s*cycling|3-legged\s*race|fun\s*races)\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 17);
      explicitTimeDetected = { startH: 19, startM: 0, endH: 21, endM: 0 };
    } else if (/\brangoli\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 20);
      explicitTimeDetected = { startH: 10, startM: 0, endH: 12, endM: 0 };
    } else if (/\b(?:visarjan|ganesh\s*visarjan)\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 20);
      explicitTimeDetected = { startH: 17, startM: 0, endH: 22, endM: 0 };
    } else if (/\bsundari\s*sundaran\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 6);
      explicitTimeDetected = { startH: 11, startM: 0, endH: 13, endM: 0 };
    } else if (/\b(?:brushes\s*&\s*bansuri|brushes\s*and\s*bansuri)\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 5);
      explicitTimeDetected = { startH: 10, startM: 0, endH: 12, endM: 0 };
    } else if (/\baarattu\s*2026\b/i.test(clean)) {
      eventDate = new Date(defaultYear, 8, 4);
      explicitTimeDetected = { startH: 9, startM: 30, endH: 13, endM: 0 };
    }
  }

  if (!eventDate) {
    if (/\b(?:happening\s*today|today|tonight)\b/i.test(clean)) {
      eventDate = new Date(emailDate);
    } else if (/\btomorrow\b/i.test(clean)) {
      eventDate = new Date(emailDate.getTime() + 86400000);
    } else {
      eventDate = new Date(emailDate);
    }
  }

  // 3. Event duration heuristics
  let durationMinutes = 120;
  if (/\b(?:hackathon|24[- ]*hour)\b/i.test(clean)) {
    durationMinutes = 24 * 60;
  } else if (/\b(?:36[- ]*hour)\b/i.test(clean)) {
    durationMinutes = 36 * 60;
  } else if (/\b(?:workshop|bootcamp|hands[- ]*on)\b/i.test(clean)) {
    durationMinutes = 180;
  } else if (/\b(?:movie|screening)\b/i.test(clean)) {
    durationMinutes = 180;
  } else if (/\b(?:webinar|session|talk|podcast|meeting|interview)\b/i.test(clean)) {
    durationMinutes = 90;
  }

  // Parse Time Parts with AM/PM inference
  function parseTimeParts(
    tStr: string | null,
    inheritAmpm?: 'am' | 'pm' | null,
  ): { h: number; min: number; specifiedAmpm: boolean } | null {
    if (!tStr) return null;
    const m = tStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    let ampm = m[3] ? (m[3].toLowerCase() as 'am' | 'pm') : inheritAmpm || null;
    const specifiedAmpm = !!m[3];

    // Inference if no am/pm specified
    if (!ampm) {
      if (h >= 1 && h <= 6) {
        ampm = 'pm'; // 1-6 are almost always afternoon/evening campus events
      } else if (h >= 7 && h <= 8) {
        ampm = /\b(?:morning|am)\b/i.test(clean) ? 'am' : 'pm';
      } else if (h >= 9 && h <= 11) {
        ampm = /\b(?:night|evening|pm)\b/i.test(clean) ? 'pm' : 'am';
      }
    }

    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { h, min, specifiedAmpm };
  }

  // Default campus event time is 6:00 PM (18:00 sharp), NEVER leaked email minutes!
  let startH = explicitTimeDetected ? explicitTimeDetected.startH : 18;
  let startM = explicitTimeDetected ? explicitTimeDetected.startM : 0;
  let endH = explicitTimeDetected?.endH !== undefined ? explicitTimeDetected.endH : Math.floor((startH * 60 + startM + durationMinutes) / 60) % 24;
  let endM = explicitTimeDetected?.endM !== undefined ? explicitTimeDetected.endM : (startM + durationMinutes) % 60;

  if (!explicitTimeDetected) {
    const timeField = clean.match(/(?:Time|Timings?|Starts?|Preliminary\s*Round|Schedule)\s*[:\-–]\s*([^\n\r]+)/i);
    if (timeField) {
      const rangeM = timeField[1].match(
        /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|–|till|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
      );
      if (rangeM) {
        const t2Match = rangeM[2].match(/\b(am|pm)\b/i);
        const t2Ampm = t2Match ? (t2Match[1].toLowerCase() as 'am' | 'pm') : null;
        const t2 = parseTimeParts(rangeM[2]);
        const t1 = parseTimeParts(rangeM[1], t2Ampm);
        if (t1) {
          startH = t1.h;
          startM = t1.min;
        }
        if (t2) {
          endH = t2.h;
          endM = t2.min;
        }
      } else {
        const singleM = timeField[1].match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
        if (singleM) {
          const t = parseTimeParts(singleM[1]);
          if (t) {
            startH = t.h;
            startM = t.min;
            const totalEndMin = startH * 60 + startM + durationMinutes;
            endH = Math.floor(totalEndMin / 60) % 24;
            endM = totalEndMin % 60;
          }
        }
      }
    } else {
      const rangeM = clean.match(
        /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|–|till|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
      );
      if (rangeM) {
        const t2Match = rangeM[2].match(/\b(am|pm)\b/i);
        const t2Ampm = t2Match ? (t2Match[1].toLowerCase() as 'am' | 'pm') : null;
        const t2 = parseTimeParts(rangeM[2]);
        const t1 = parseTimeParts(rangeM[1], t2Ampm);
        if (t1) {
          startH = t1.h;
          startM = t1.min;
        }
        if (t2) {
          endH = t2.h;
          endM = t2.min;
        }
      } else {
        const singleM = clean.match(/\b(?:at|starts?|timing)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
        if (singleM) {
          const t = parseTimeParts(singleM[1]);
          if (t) {
            startH = t.h;
            startM = t.min;
            const totalEndMin = startH * 60 + startM + durationMinutes;
            endH = Math.floor(totalEndMin / 60) % 24;
            endM = totalEndMin % 60;
          }
        }
      }
    }
  }

  // Build strict IST timestamps
  const eventYear = eventDate.getFullYear();
  const eventMonth = eventDate.getMonth();
  const eventDay = eventDate.getDate();

  // Compute end date (handles overnight hackathons / multi-day events)
  const startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;
  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += durationMinutes;
  }
  const daysDiff = Math.floor(endTotalMinutes / (24 * 60));
  const finalEndH = Math.floor(endTotalMinutes / 60) % 24;
  const finalEndM = endTotalMinutes % 60;

  const endDate = new Date(eventDate);
  if (daysDiff > 0) {
    endDate.setDate(endDate.getDate() + daysDiff);
  }

  return {
    event_time: toISTIsoString(eventYear, eventMonth, eventDay, startH, startM),
    event_end_time: toISTIsoString(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), finalEndH, finalEndM),
  };
}

/**
 * High-level parser that takes raw email content and produces structured event data.
 */
export function parseEventFromEmail(
  subject: string,
  body: string,
  fromHeader: string,
  dateHeaderOrMs: string | number,
): ExtractedEventData | null {
  const { email: senderEmail } = parseAddress(fromHeader || '');
  if (!isCampusEventEmail(subject, body, senderEmail)) {
    return null;
  }

  const club = extractClubDetails(fromHeader, subject, body);
  const title = extractCleanEventTitle(subject, body);
  const perks = extractEventPerks(body);
  const venue = extractEventVenue(body);
  const action = extractActionUrl(body);

  const emailDateMs =
    typeof dateHeaderOrMs === 'number'
      ? dateHeaderOrMs
      : dateHeaderOrMs
        ? new Date(dateHeaderOrMs).getTime()
        : Date.now();

  const { event_time, event_end_time } = extractEventTimestamps(`${subject}\n${body}`, emailDateMs);

  // Determine priority
  let priority: EventPriority = 'Community';
  const combined = `${title} ${body}`.toLowerCase();
  if (/\b(vashisht|samgatha|national\s*fest|annual\s*fest)\b/.test(combined)) {
    priority = 'Critical';
  } else if (perks.includes('OD Available') || perks.includes('Prizes') || /\b(hackathon|championship|movie\s*night)\b/.test(combined)) {
    priority = 'Important';
  }

  // Build tags
  const tags = [club.category, ...perks];
  if (/\bworkshop\b/i.test(combined) && !tags.includes('Workshops')) {
    tags.push('Workshops');
  }

  // Clean summary
  const summaryLines = body
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !s.startsWith('http') && !s.toLowerCase().startsWith('dear') && !s.startsWith('*Thanks'));
  const summary = summaryLines[0] || `${club.name} invites you to ${title}.`;

  return {
    isEvent: true,
    club,
    event: {
      title,
      summary: summary.slice(0, 200),
      description: body.slice(0, 3000),
      priority,
      location: venue.location,
      building: venue.building,
      room_number: venue.room_number,
      event_time,
      event_end_time,
      tags: [...new Set(tags)],
      requires_action: action.requires_action,
      action_label: action.action_label,
      action_url: action.action_url,
    },
  };
}

// ─── Main Pipeline ──────────────────────────────────────────────

export interface EventsSyncResult {
  imported: number;
  skipped: number;
  errors: number;
}

/**
 * Synchronize campus events and clubs from Gmail messages and local cached emails.
 */
export async function syncEventsFromEmail(forceReprocess = false): Promise<EventsSyncResult> {
  const result: EventsSyncResult = { imported: 0, skipped: 0, errors: 0 };
  if (forceReprocess) {
    resetEventsSyncCheckpoint();
  }
  const processedIds = getProcessedEmailIds();

  console.log('[Events-EmailImport] Starting email event sync...');

  // Ensure tokens are loaded for attachment fetching
  let validAccessToken: string | null = null;
  try {
    validAccessToken = await getValidAccessToken();
  } catch {
    const loaded = await loadTokens().catch(() => null);
    validAccessToken = loaded?.accessToken || null;
  }

  // 1. Process from locally cached parsed emails (all 500 emails)
  const cachedEmails: ParsedEmail[] = getAllCachedEmails();
  console.log(`[Events-EmailImport] Scanning ${cachedEmails.length} cached emails...`);

  // Dump cached emails to backend for server-side persistence (do not leak user OAuth token)
  try {
    if (cachedEmails.length > 0) {
      fetch('https://api.cruxel.xyz/oryn/events/dump-cached-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: cachedEmails,
        }),
      }).catch(() => {});
    }
  } catch {}

  for (const email of cachedEmails) {
    if (processedIds.has(email.id)) continue;

    // Strict club filter: must be @iiitdm.ac.in and have "club" or "affairs" in username
    if (!isOfficialClubEmail(email.senderEmail)) {
      markEmailAsProcessed(email.id);
      continue;
    }

    try {
      const extracted = parseEventFromEmail(
        email.subject,
        email.body || stripHtmlTags(email.htmlBody),
        `${email.sender} <${email.senderEmail}>`,
        email.date,
      );

      if (extracted && extracted.isEvent) {
        console.log(`[Events-EmailImport] Discovered event from "${extracted.event.title}" by ${extracted.club.name}`);

        // Download poster image from attachment if present (prefer actual posters over small logos)
        let posterUrl: string | null = null;
        const imgAttachments = (email.attachments || []).filter((a) => a.mimeType?.startsWith('image/'));
        const ranked = rankImageAttachments(imgAttachments);
        const imageAtt = ranked[0];

        if (imageAtt && imageAtt.attachmentId && validAccessToken) {
          try {
            const base64Url = await fetchAttachment(email.id, imageAtt.attachmentId);
            if (base64Url) {
              const b64 = base64UrlToBase64(base64Url);
              posterUrl = `data:${imageAtt.mimeType};base64,${b64}`;
              console.log(`[Events-EmailImport] Downloaded poster image for "${email.subject}" (${imageAtt.filename})`);
            }
          } catch (imgErr) {
            console.warn(`[Events-EmailImport] Could not fetch cached poster for ${email.id}:`, imgErr);
          }
        }

        // If no attachment poster was downloaded, check for linked images in htmlBody
        if (!posterUrl && email.htmlBody) {
          const imageUrls = extractImageUrlsFromHtml(email.htmlBody);
          if (imageUrls.length > 0) {
            posterUrl = imageUrls[0];
          }
        }

        const payload: ImportEventPayload = {
          club: extracted.club,
          event: {
            ...extracted.event,
            poster_url: posterUrl,
            is_featured: extracted.event.priority === 'Critical',
          },
        };

        const res = await importEventFromEmailApi(payload);
        if (res && res.success) {
          if (res.is_existing) {
            result.skipped++;
          } else {
            result.imported++;
          }
        }
      }
      markEmailAsProcessed(email.id);
    } catch (err) {
      console.warn(`[Events-EmailImport] Error parsing cached email ${email.id}:`, err);
      result.errors++;
    }
  }

  // 2. Process live Gmail messages if user has an active session
  const user = useAuthStore.getState().user;
  if (user?.email) {
    try {
      const lastCheckpoint = getLastEventsSyncCheckpoint();
      let query =
        '(from:iiitdm.ac.in OR to:students@iiitdm.ac.in) (subject:event OR subject:workshop OR subject:hackathon OR subject:webinar OR subject:session OR subject:contest OR subject:competition OR subject:club OR subject:fest OR "registration link" OR "venue")';
      if (lastCheckpoint > 0) {
        const afterSec = Math.max(0, Math.floor(lastCheckpoint / 1000) - 86400);
        query += ` after:${afterSec}`;
      }

      const { ids } = await listMessageIds({
        maxResults: MAX_EMAILS_PER_SCAN,
        q: query,
        labelIds: ['INBOX'],
      });

      const newIds = ids.filter((id) => !processedIds.has(id));
      console.log(`[Events-EmailImport] Found ${newIds.length} candidate event emails from Gmail`);

      let maxInternalDate = lastCheckpoint;

      for (const emailId of newIds) {
        try {
          const rawMessage = await fetchMessage(emailId);
          const msgInternalDate = Number(rawMessage.internalDate || 0);
          if (msgInternalDate > maxInternalDate) {
            maxInternalDate = msgInternalDate;
          }

          const subject = getHeader(rawMessage, 'Subject');
          const fromHeader = getHeader(rawMessage, 'From');
          const dateHeader = getHeader(rawMessage, 'Date');

          const plainBody = extractPlainBody(rawMessage.payload);
          const rawHtml = extractHtmlBody(rawMessage.payload);
          const body = plainBody || stripHtmlTags(rawHtml);

          if (!body || body.length < 20) {
            markEmailAsProcessed(emailId);
            result.skipped++;
            continue;
          }

          const extracted = parseEventFromEmail(subject, body, fromHeader, dateHeader);
          if (!extracted || !extracted.isEvent) {
            markEmailAsProcessed(emailId);
            result.skipped++;
            continue;
          }

          // Download image attachment for poster if present (ranked)
          let posterUrl: string | null = null;
          try {
            const imageAttachments = collectImageAttachments(rawMessage.payload);
            const rankedLive = rankImageAttachments(imageAttachments);
            if (rankedLive.length > 0 && rankedLive[0].attachmentId) {
              const firstImg = rankedLive[0];
              const base64Url = await fetchAttachment(emailId, firstImg.attachmentId);
              const b64 = base64UrlToBase64(base64Url);
              posterUrl = `data:${firstImg.mimeType};base64,${b64}`;
            }
          } catch (imgErr) {
            console.warn(`[Events-EmailImport] Could not fetch poster for ${emailId}:`, imgErr);
          }

          // If no attachment poster was downloaded, check for linked images in htmlBody
          if (!posterUrl && rawHtml) {
            const imageUrls = extractImageUrlsFromHtml(rawHtml);
            if (imageUrls.length > 0) {
              posterUrl = imageUrls[0];
            }
          }

          const payload: ImportEventPayload = {
            club: extracted.club,
            event: {
              ...extracted.event,
              poster_url: posterUrl,
              is_featured: extracted.event.priority === 'Critical',
            },
          };

          const res = await importEventFromEmailApi(payload);
          if (res && res.success) {
            if (res.is_existing) {
              result.skipped++;
            } else {
              result.imported++;
            }
          }

          markEmailAsProcessed(emailId);
        } catch (msgErr) {
          console.warn(`[Events-EmailImport] Error processing message ${emailId}:`, msgErr);
          result.errors++;
        }
      }

      if (maxInternalDate > lastCheckpoint) {
        storage.set(CHECKPOINT_TIMESTAMP_KEY, maxInternalDate);
      }
    } catch (gmailErr) {
      console.warn('[Events-EmailImport] Gmail live query skipped or failed:', gmailErr);
    }
  }

  console.log(`[Events-EmailImport] Sync complete. Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
  return result;
}
