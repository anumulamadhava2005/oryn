/**
 * Lost & Found Email Auto-Importer.
 *
 * Scans emails (both locally cached emails and live Gmail API) for emails
 * from general.affairs@iiitdm.ac.in (or containing [Lost & Found]).
 * Parses the email body to extract:
 *   - Item title, description, category
 *   - Contact person name, email, phone
 *   - Location where found / lost (if mentioned)
 *   - Date/time from forwarded content
 *   - Image attachments
 *
 * Automatically creates Lost & Found posts attributed to the student who lost/found the item.
 * Runs seamlessly in the background and on pull-to-refresh for all authenticated students.
 */

import { MMKV } from 'react-native-mmkv';
import { listMessageIds, fetchMessage, fetchAttachment } from '@/api/gmail';
import {
  createLostItemFromEmail,
  syncAdminTokenToServer,
  type LostItem,
} from '@/services/lostFoundApi';
import { getAllCachedEmails } from '@/services/cache';
import { useAuthStore } from '@/store/auth';
import type { RawGmailMessage, GmailPayload, ParsedEmail } from '@/types/email';

const storage = new MMKV({ id: 'oryn-lf-email-sync' });
const PROCESSED_IDS_KEY = 'lf_synced_email_ids';
const CHECKPOINT_TIMESTAMP_KEY = 'lf_last_synced_timestamp';
const SENDER_EMAIL = 'general.affairs@iiitdm.ac.in';
const MAX_EMAILS_PER_SCAN = 50;

// ─── Processed Email & Checkpoint Tracking ──────────────────────

export function getLastSyncCheckpoint(): number {
  return storage.getNumber(CHECKPOINT_TIMESTAMP_KEY) || 0;
}

export function resetSyncCheckpoint(): void {
  storage.delete(CHECKPOINT_TIMESTAMP_KEY);
  storage.delete(PROCESSED_IDS_KEY);
}

function getProcessedIds(): Set<string> {
  const raw = storage.getString(PROCESSED_IDS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markAsProcessed(emailId: string): void {
  const ids = getProcessedIds();
  ids.add(emailId);
  // Keep at most 1000 IDs to avoid unbounded growth
  const arr = Array.from(ids);
  if (arr.length > 1000) arr.splice(0, arr.length - 1000);
  storage.set(PROCESSED_IDS_KEY, JSON.stringify(arr));
}

// ─── Email Classification ───────────────────────────────────────

/**
 * Checks whether an email is a Lost & Found announcement.
 */
export function isLostFoundEmail(subject: string, body: string, senderEmail: string): boolean {
  const normFrom = (senderEmail || '').toLowerCase();
  const cleanSubj = (subject || '').trim();

  // Primary check: from general.affairs or student.affairs or has [Lost & Found] tag
  const isFromAffairs = normFrom.includes('general.affairs') || normFrom.includes('student.affairs');
  const hasLostFoundTag =
    /\[\s*Lost\s*(&|and)\s*Found\s*\]/i.test(cleanSubj) ||
    /Lost\s*(&|and)\s*Found/i.test(cleanSubj);

  if (!isFromAffairs && !hasLostFoundTag) {
    return false;
  }

  // Exclude non-lost-found announcements from general affairs (SSG, elections, meetings, etc.)
  if (
    /\b(ssg|social\s*service\s*group|scholarship|speaker\s*position|meeting|election|recruitment|selection\s*process|kick\s*start)\b/i.test(
      cleanSubj,
    )
  ) {
    return false;
  }

  if (hasLostFoundTag) return true;
  if (/\b(lost|found|missing|misplaced)\b/i.test(cleanSubj)) return true;

  // Check body keywords if subject is ambiguous
  const cleanBody = (body || '').toLowerCase();
  if (
    /(?:lost|found)\s+(?:item|phone|keys?|earbuds?|watch|bottle|wallet|bag|specs?|glasses|card|document|charger)/i.test(
      cleanBody,
    ) ||
    /if\s+found\s+please\s+(?:contact|return)/i.test(cleanBody) ||
    /(?:i\s+have\s+)?lost\s+my\b/i.test(cleanBody)
  ) {
    return true;
  }

  return false;
}

// ─── Category Classification ────────────────────────────────────

const CATEGORY_PATTERNS: Array<{ category: string; patterns: RegExp }> = [
  {
    category: 'Electronics',
    patterns:
      /\b(phone|mobile|laptop|charger|earbuds?|earbud|headphones?|airpods?|tablet|ipad|watch|smartwatch|power\s*bank|pendrive|pen\s*drive|usb|cable|adapter|mouse|keyboard|speaker|camera|calculator|hard\s*disk)\b/i,
  },
  {
    category: 'Documents',
    patterns:
      /\b(id\s*card|identity\s*card|marksheet|certificate|passport|aadhar|aadhaar|pan\s*card|license|licence|hall\s*ticket|admit\s*card|document|letter|book|notebook|diary|record\s*note)\b/i,
  },
  {
    category: 'Keys',
    patterns: /\b(key|keys|key\s*chain|keychain|lock|padlock|room\s*key|bike\s*key|car\s*key)\b/i,
  },
  {
    category: 'Wallet',
    patterns: /\b(wallet|purse|money\s*bag|card\s*holder|cash)\b/i,
  },
  {
    category: 'Bag',
    patterns: /\b(bag|backpack|rucksack|suitcase|luggage|pouch|tote|handbag|sling\s*bag)\b/i,
  },
  {
    category: 'Bottle',
    patterns: /\b(bottle|water\s*bottle|flask|thermos|sipper)\b/i,
  },
  {
    category: 'Clothing',
    patterns:
      /\b(shirt|t-shirt|tshirt|jacket|hoodie|sweater|trouser|pant|jeans|shorts|cap|hat|shoe|shoes|slipper|sandal|specs|spectacles|glasses|sunglasses|umbrella|raincoat|chain|ring)\b/i,
  },
];

function classifyCategory(text: string): string {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.test(text)) return category;
  }
  return 'Other';
}

// ─── Body Parsing Helpers ───────────────────────────────────────

/** Decode base64url to UTF-8 string */
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

/** Convert base64url to standard base64 */
function base64UrlToBase64(base64url: string): string {
  let b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return b64;
}

/** Extract plain text body from raw Gmail message */
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

/** Extract HTML body from raw Gmail message */
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

/** Get header value from message payload */
function getHeader(message: RawGmailMessage, name: string): string {
  const lower = name.toLowerCase();
  return (
    message.payload.headers.find((h) => h.name.toLowerCase() === lower)?.value ?? ''
  );
}

/** Collect all image attachments recursively from payload */
function collectImageAttachments(
  payload: GmailPayload,
): Array<{ attachmentId: string; mimeType: string; filename: string }> {
  const results: Array<{ attachmentId: string; mimeType: string; filename: string }> = [];

  if (payload.body?.attachmentId && payload.mimeType?.startsWith('image/')) {
    results.push({
      attachmentId: payload.body.attachmentId,
      mimeType: payload.mimeType,
      filename: payload.filename || 'image',
    });
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      results.push(...collectImageAttachments(part));
    }
  }

  return results;
}

// ─── Email Body NLP Extraction ──────────────────────────────────

function cleanPosterName(raw: string): string {
  if (!raw) return '';
  const n = raw.replace(/[<>"']/g, '').trim();
  const rollMatch = n.match(/^([A-Z]{2}\d{2}[A-Z]\d{4})\s+(.+)$/i);
  if (rollMatch) {
    return `${rollMatch[2].trim()} (${rollMatch[1].toUpperCase()})`;
  }
  return n;
}

function extractStatus(subject: string, body: string): 'lost' | 'found' {
  const cleanSubject = subject
    .replace(/\[\s*Lost\s*(&|and)\s*Found\s*\]/gi, '')
    .replace(/Lost\s*(&|and)\s*Found\s*[-:]?/gi, '')
    .replace(/^(Re:\s*|Fwd?:\s*)+/gi, '')
    .trim()
    .toLowerCase();

  if (/\bfound\b/.test(cleanSubject) && !/\blost\b/.test(cleanSubject)) {
    return 'found';
  }
  if (/\blost\b/.test(cleanSubject)) {
    return 'lost';
  }

  // Check body keywords
  if (
    /\bfound\s+(?:at|near|in|outside|a|an|the|my|this|\d)|(?:item|phone|keys?|earbuds?|watch|bottle|wallet|bag)\s+(?:was\s+)?found\b|(?:is\s+)?(?:kept|handed\s+over|available)\s+(?:at|with|in)\s+(?:security|office|guard|mess|gate)/i.test(
      body,
    )
  ) {
    return 'found';
  }

  if (
    /(?:i\s+)?(?:have\s+)?lost\b|\bgot\s+lost\b|\bmissing\s+(?:since|from|in|at)\b|anyone\s+who\s+finds?\b|if\s+found\b|please\s+(?:return|contact)\b/i.test(
      body,
    )
  ) {
    return 'lost';
  }

  return 'lost';
}

export interface ExtractedLostFoundData {
  status: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
  dateFound: string | null;
  createdAt: string | null;
}

export function extractDataFromEmail(
  subject: string,
  body: string,
  emailDate: string,
): ExtractedLostFoundData {
  // ── Status (lost or found) ──
  const status: 'lost' | 'found' = extractStatus(subject, body);

  // ── Title extraction from subject ──
  let title = subject
    .replace(/\[\s*Lost\s*(&|and)\s*Found\s*\]/gi, '')
    .replace(/Lost\s*(&|and)\s*Found\s*[-:]?/gi, '')
    .replace(/^(Re:\s*|Fwd?:\s*)+/gi, '')
    .replace(/^(lost\s*[-–:]\s*|found\s*[-–:]\s*)/i, '')
    .replace(/^(lost\s+item\s*[-–:]\s*|found\s+item\s*[-–:]\s*)/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title is too generic or empty, try to extract from body
  if (!title || title.length < 3) {
    const itemMatch = body.match(/(?:lost|found)\s*[-–:]?\s*(.+?)(?:\.|,|\n|$)/i);
    title = itemMatch
      ? itemMatch[1].trim().slice(0, 80)
      : `${status === 'lost' ? 'Lost' : 'Found'} Item`;
  }

  // Cap title length
  if (title.length > 100) title = title.slice(0, 100).trim();

  // ── Description (clean body) ──
  let description = body
    .replace(/[-]{3,}/g, '')
    .replace(/[=]{3,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (description.length > 1500) description = description.slice(0, 1500) + '...';

  // ── Category ──
  const combinedText = `${title} ${body}`;
  const category = classifyCategory(combinedText);

  // ── Contact Email & Name ──
  let contactName: string | null = null;
  let contactEmail: string | null = null;

  // 1. First priority: Forwarded message header `From: NAME <EMAIL>`
  const fwdFromMatch = body.match(
    /From:\s*([^<\n\r]+?)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i,
  );
  if (fwdFromMatch) {
    const candEmail = fwdFromMatch[2].trim().toLowerCase();
    if (!candEmail.includes('general.affairs')) {
      contactEmail = candEmail;
      contactName = cleanPosterName(fwdFromMatch[1].trim());
    }
  }

  // 2. Fallback: scan body for student emails (excluding general.affairs)
  if (!contactEmail) {
    const emailRegex = /([a-zA-Z0-9._+-]+@iiitdm\.ac\.in)/gi;
    const allEmails = (body.match(emailRegex) || []).filter(
      (e) =>
        e.toLowerCase() !== SENDER_EMAIL &&
        !e.toLowerCase().includes('noreply') &&
        !e.toLowerCase().includes('no-reply'),
    );
    if (allEmails.length > 0) {
      contactEmail = allEmails[0].toLowerCase();
    }
  }

  // 3. Fallback name: signature / name patterns
  if (!contactName) {
    const namePatterns = [
      /(?:name|contact\s*person|reported\s*by|posted\s*by|from)\s*[-:]\s*([^\n,]+)/i,
      /(?:regards|thanks|thank\s*you)[,\s]+([A-Z][a-zA-Z0-9.\s]+?)(?:\n|\r|<|$)/,
    ];
    for (const pat of namePatterns) {
      const m = body.match(pat);
      if (m && m[1]) {
        const name = m[1].trim().replace(/[<>]/g, '');
        if (
          name.length >= 3 &&
          name.length <= 60 &&
          !name.includes('@') &&
          !name.toLowerCase().includes('general affairs') &&
          !name.toLowerCase().includes('student affairs')
        ) {
          contactName = cleanPosterName(name);
          break;
        }
      }
    }
  }

  // 4. Derive from contactEmail roll number if name still missing
  if (!contactName && contactEmail) {
    const roll = contactEmail.split('@')[0].toUpperCase();
    contactName = roll;
  }

  // ── Contact Phone ──
  const phoneRegex = /(?:\+91[\s-]?|91[\s-]?|0)?([6-9]\d{4}[\s-]?\d{5})\b/g;
  const phoneMatches = body.match(phoneRegex);
  const contactPhone = phoneMatches ? phoneMatches[0].replace(/[\s-]/g, '') : null;

  // ── Location ──
  let location: string | null = null;
  const locationPatterns = [
    /(?:found\s+(?:at|near|in|outside)|location|place|spot|area|where)\s*[-:]\s*([^\n,.]+)/i,
    /(?:near|at|in|outside)\s+(AB[1-4]|Academic\s*Block\s*\d|Library|Hostel\s*\w+|Canteen|Mess|Main\s*Gate|Sports\s*Complex|Auditorium|Admin\s*Block|Lab\s*Complex|Parking|Ground|Garden|Workshop|Gym|Shakti\s*Mess|Ashwatha|Jasmine)/i,
  ];
  for (const pat of locationPatterns) {
    const m = body.match(pat);
    if (m && m[1]) {
      location = m[1].trim();
      if (location.length > 80) location = location.slice(0, 80);
      break;
    }
  }

  // ── Date from forwarded content ──
  let dateFound: string | null = null;
  const datePatterns = [
    /(?:date|on|dated)\s*[-:]\s*(\d{1,2}[\s/-]\w{3,9}[\s/-]\d{2,4})/i,
    /(?:date|on|dated)\s*[-:]\s*(\d{1,2}[\s/-]\d{1,2}[\s/-]\d{2,4})/i,
  ];
  for (const pat of datePatterns) {
    const m = body.match(pat);
    if (m && m[1]) {
      dateFound = m[1].trim();
      break;
    }
  }
  if (!dateFound) {
    dateFound = emailDate || null;
  }

  // ── Timestamp (mail date / forwarded date) ──
  let createdAt: string | null = null;
  const fwdDateMatch = body.match(/Date:\s*([^\n\r]+)/i);
  const targetDateStr = (fwdDateMatch && fwdDateMatch[1]) || emailDate;
  if (targetDateStr) {
    const cleanDateStr = targetDateStr.replace(/\s+at\s+/i, ' ').trim();
    const d = new Date(cleanDateStr);
    if (!isNaN(d.getTime())) {
      createdAt = d.toISOString();
    }
  }

  return {
    status,
    title,
    description,
    category,
    contactName,
    contactEmail,
    contactPhone,
    location,
    dateFound,
    createdAt,
  };
}

// ─── Main Import Pipeline ───────────────────────────────────────

export interface EmailImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

/**
 * Synchronize Lost & Found items from both locally cached emails and live Gmail messages.
 * Runs seamlessly for any student user — the backend cleanly deduplicates items.
 */
export async function syncLostFoundFromEmail(
  forceReprocess = false,
  existingItems?: LostItem[],
): Promise<EmailImportResult> {
  const result: EmailImportResult = { imported: 0, skipped: 0, errors: 0 };

  if (forceReprocess) {
    resetSyncCheckpoint();
  }

  const processedIds = getProcessedIds();

  // Sync token to server in the background if active
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.accessToken) {
    syncAdminTokenToServer(tokens.accessToken, null, tokens.expiresAt).catch(() => {});
  }

  // ── 1. Process from locally cached parsed emails (instant, reliable for all users) ──
  const cachedEmails: ParsedEmail[] = getAllCachedEmails();
  console.log(`[LF-EmailImport] Scanning ${cachedEmails.length} cached emails for Lost & Found...`);

  for (const email of cachedEmails) {
    if (processedIds.has(email.id)) {
      result.skipped++;
      continue;
    }

    const bodyText = email.body || stripHtml(email.htmlBody || '');
    if (!isLostFoundEmail(email.subject, bodyText, email.senderEmail)) {
      markAsProcessed(email.id);
      continue;
    }

    try {
      const extracted = extractDataFromEmail(email.subject, bodyText, String(email.date));

      // Skip if item already present in local list
      if (existingItems && existingItems.length > 0) {
        const alreadyExists = existingItems.some((ci) => {
          const sameTitle =
            ci.title.trim().toLowerCase() === extracted.title.trim().toLowerCase();
          const sameEmail =
            !!(
              extracted.contactEmail &&
              ci.poster_email &&
              ci.poster_email.toLowerCase() === extracted.contactEmail.toLowerCase()
            );
          const sameDate =
            !!(
              extracted.createdAt &&
              ci.created_at &&
              ci.created_at.slice(0, 16) === extracted.createdAt.slice(0, 16)
            );
          return sameTitle && (sameEmail || sameDate);
        });
        if (alreadyExists) {
          markAsProcessed(email.id);
          result.skipped++;
          continue;
        }
      }

      // Check if image attachment exists in cached attachments
      let imageDataUri: string | null = null;
      const imgAtt = (email.attachments || []).find((a) => a.mimeType?.startsWith('image/'));
      if (imgAtt && imgAtt.attachmentId && tokens?.accessToken) {
        try {
          const base64UrlData = await fetchAttachment(email.id, imgAtt.attachmentId);
          if (base64UrlData) {
            const base64Data = base64UrlToBase64(base64UrlData);
            imageDataUri = `data:${imgAtt.mimeType};base64,${base64Data}`;
          }
        } catch {
          // Proceed without image if attachment fetch fails
        }
      }

      if (!imageDataUri && email.htmlBody) {
        const match = email.htmlBody.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
        if (match && !match[1].includes('mail-sig') && !match[1].includes('favicon') && !match[1].includes('pixel')) {
          imageDataUri = match[1];
        }
      }

      // Build contact_info string
      const contactParts: string[] = [];
      if (extracted.contactName) contactParts.push(extracted.contactName);
      if (extracted.contactPhone) contactParts.push(extracted.contactPhone);
      if (extracted.contactEmail) contactParts.push(extracted.contactEmail);
      const contactInfo = contactParts.length > 0 ? contactParts.join(' | ') : undefined;

      // Build description with date context
      let fullDescription = extracted.description;
      if (extracted.dateFound && !fullDescription.includes(extracted.dateFound)) {
        fullDescription = `[${extracted.status === 'lost' ? 'Lost' : 'Found'} on: ${extracted.dateFound}]\n\n${fullDescription}`;
      }

      const itemCreatedAt =
        extracted.createdAt ||
        (email.date
          ? new Date(typeof email.date === 'number' ? email.date : email.date).toISOString()
          : undefined);

      await createLostItemFromEmail({
        title: extracted.title,
        description: fullDescription,
        category: extracted.category,
        location_found: extracted.location || undefined,
        contact_info: contactInfo,
        image_url: imageDataUri || undefined,
        status: extracted.status,
        poster_email: extracted.contactEmail || undefined,
        poster_name: extracted.contactName || undefined,
        created_at: itemCreatedAt,
      });

      markAsProcessed(email.id);
      result.imported++;
      console.log(`[LF-EmailImport] ✅ Imported cached: "${extracted.title}" (${extracted.status})`);
    } catch (err: any) {
      console.warn(`[LF-EmailImport] Failed to import cached email ${email.id}:`, err?.message || err);
      result.errors++;
    }
  }

  // ── 2. Live Gmail API search (if access token is available) ──
  try {
    if (tokens?.accessToken) {
      const lastCheckpoint = getLastSyncCheckpoint();
      let gmailQuery =
        '(from:general.affairs@iiitdm.ac.in OR from:student.affairs@iiitdm.ac.in OR subject:"Lost & Found" OR subject:"Lost and Found" OR subject:"[Lost & Found]")';
      if (lastCheckpoint > 0) {
        const afterSec = Math.max(0, Math.floor(lastCheckpoint / 1000) - 86400);
        gmailQuery += ` after:${afterSec}`;
      }

      const { ids } = await listMessageIds({
        maxResults: MAX_EMAILS_PER_SCAN,
        q: gmailQuery,
      });

      const newIds = ids.filter((id) => !processedIds.has(id));
      if (newIds.length > 0) {
        console.log(`[LF-EmailImport] Processing ${newIds.length} live Gmail messages...`);
        let maxMsgInternalDate = lastCheckpoint;

        for (const emailId of newIds) {
          try {
            const rawMessage = await fetchMessage(emailId);
            const msgInternalDate = Number(rawMessage.internalDate || 0);
            if (msgInternalDate > maxMsgInternalDate) {
              maxMsgInternalDate = msgInternalDate;
            }

            const fromHeader = getHeader(rawMessage, 'From').toLowerCase();
            const subject = getHeader(rawMessage, 'Subject');
            const dateHeader = getHeader(rawMessage, 'Date');
            const plainBody = extractPlainBody(rawMessage.payload);
            const htmlBody = extractHtmlBody(rawMessage.payload);
            const body = plainBody || stripHtml(htmlBody);

            if (!isLostFoundEmail(subject, body, fromHeader)) {
              markAsProcessed(emailId);
              result.skipped++;
              continue;
            }

            const extracted = extractDataFromEmail(subject, body, dateHeader);

            let imageDataUri: string | null = null;
            try {
              const imageAttachments = collectImageAttachments(rawMessage.payload);
              if (imageAttachments.length > 0) {
                const firstImage = imageAttachments[0];
                const base64UrlData = await fetchAttachment(emailId, firstImage.attachmentId);
                const base64Data = base64UrlToBase64(base64UrlData);
                imageDataUri = `data:${firstImage.mimeType};base64,${base64Data}`;
              }
            } catch {}

            if (!imageDataUri) {
              const rawHtml = extractHtmlBody(rawMessage.payload);
              if (rawHtml) {
                const match = rawHtml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
                if (match && !match[1].includes('mail-sig') && !match[1].includes('favicon') && !match[1].includes('pixel')) {
                  imageDataUri = match[1];
                }
              }
            }

            const contactParts: string[] = [];
            if (extracted.contactName) contactParts.push(extracted.contactName);
            if (extracted.contactPhone) contactParts.push(extracted.contactPhone);
            if (extracted.contactEmail) contactParts.push(extracted.contactEmail);
            const contactInfo = contactParts.length > 0 ? contactParts.join(' | ') : undefined;

            let fullDescription = extracted.description;
            if (extracted.dateFound && !fullDescription.includes(extracted.dateFound)) {
              fullDescription = `[${extracted.status === 'lost' ? 'Lost' : 'Found'} on: ${extracted.dateFound}]\n\n${fullDescription}`;
            }

            const itemCreatedAt =
              extracted.createdAt ||
              (rawMessage.internalDate
                ? new Date(parseInt(rawMessage.internalDate, 10)).toISOString()
                : undefined);

            await createLostItemFromEmail({
              title: extracted.title,
              description: fullDescription,
              category: extracted.category,
              location_found: extracted.location || undefined,
              contact_info: contactInfo,
              image_url: imageDataUri || undefined,
              status: extracted.status,
              poster_email: extracted.contactEmail || undefined,
              poster_name: extracted.contactName || undefined,
              created_at: itemCreatedAt,
            });

            markAsProcessed(emailId);
            result.imported++;
            console.log(`[LF-EmailImport] ✅ Imported live: "${extracted.title}" (${extracted.status})`);
          } catch (err: any) {
            console.warn(`[LF-EmailImport] Failed to process live email ${emailId}:`, err?.message || err);
            result.errors++;
          }
        }

        if (maxMsgInternalDate > lastCheckpoint) {
          storage.set(CHECKPOINT_TIMESTAMP_KEY, maxMsgInternalDate);
        } else if (lastCheckpoint === 0 && newIds.length > 0) {
          storage.set(CHECKPOINT_TIMESTAMP_KEY, Date.now());
        }
      }
    }
  } catch (liveErr) {
    console.warn('[LF-EmailImport] Live Gmail query skipped or failed:', liveErr);
  }

  return result;
}

/**
 * Backward compatibility alias for importLostFoundFromEmail
 */
export async function importLostFoundFromEmail(
  existingItems?: LostItem[],
): Promise<EmailImportResult | null> {
  return await syncLostFoundFromEmail(false, existingItems);
}

/** Strip HTML tags to plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
