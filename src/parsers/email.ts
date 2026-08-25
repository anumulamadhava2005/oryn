/**
 * Core email parser.
 * Transforms a raw RawGmailMessage into a ParsedEmail by:
 *   - extracting headers (From, To, CC, Subject, Date)
 *   - decoding base64url-encoded MIME parts
 *   - building plain text and HTML body
 *   - extracting links and attachment metadata
 *   - computing a cache fingerprint
 */

import { htmlToText, extractLinks } from './html';
import type { Attachment, GmailBody, GmailHeader, GmailPayload, RawGmailMessage } from '@/types/email';

// --------------------------------------------------------------------------
// Base64url decoding
// --------------------------------------------------------------------------

/** Decode a base64url-encoded string to a UTF-8 string */
function decodeBase64Url(encoded: string): string {
  if (!encoded) return '';
  // Convert base64url → base64
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
  } catch {
    // Fallback for malformed data
    return atob(base64);
  }
}

// --------------------------------------------------------------------------
// Header helpers
// --------------------------------------------------------------------------

function getHeader(headers: GmailHeader[], name: string): string {
  const lower = name.toLowerCase();
  return headers.find(h => h.name.toLowerCase() === lower)?.value ?? '';
}

/** Parse "Display Name <email@example.com>" → { name, email } */
function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim() };
  }
  // Plain email only
  if (raw.includes('@')) return { name: raw.trim(), email: raw.trim() };
  return { name: raw.trim(), email: '' };
}

/** Parse comma-separated address list */
function parseAddressList(raw: string): string[] {
  if (!raw) return [];
  // Split by comma but not commas inside angle brackets
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of raw) {
    if (ch === '<') { depth++; current += ch; }
    else if (ch === '>') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.map(p => parseAddress(p).email).filter(Boolean);
}

// --------------------------------------------------------------------------
// MIME part walking
// --------------------------------------------------------------------------

interface ExtractedParts {
  plainText: string;
  htmlText: string;
  attachments: Attachment[];
}

function walkParts(payload: GmailPayload): ExtractedParts {
  const result: ExtractedParts = { plainText: '', htmlText: '', attachments: [] };

  function walk(part: GmailPayload): void {
    const mime = part.mimeType.toLowerCase();

    if (mime === 'text/plain' && !result.plainText) {
      result.plainText = decodeBody(part.body);
    } else if (mime === 'text/html' && !result.htmlText) {
      result.htmlText = decodeBody(part.body);
    } else if (
      mime.startsWith('multipart/') &&
      Array.isArray(part.parts)
    ) {
      for (const child of part.parts) walk(child);
    } else if (
      part.body.attachmentId ||
      (part.filename && part.filename.length > 0)
    ) {
      result.attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId ?? '',
      });
    }
  }

  walk(payload);
  return result;
}

function decodeBody(body: GmailBody): string {
  if (!body.data) return '';
  return decodeBase64Url(body.data);
}

// --------------------------------------------------------------------------
// Date parsing
// --------------------------------------------------------------------------

/** Parse the email Date header to a Unix ms timestamp */
function parseDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  const ts = Date.parse(dateStr);
  return isNaN(ts) ? Date.now() : ts;
}

// --------------------------------------------------------------------------
// Cache fingerprint
// --------------------------------------------------------------------------

/** Simple djb2 hash → hex string for change detection */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0; // int32
  }
  return (hash >>> 0).toString(16);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export interface ParsedHeaders {
  sender: string;
  senderEmail: string;
  recipients: string[];
  cc: string[];
  subject: string;
  date: number;
}

export function parseHeaders(raw: RawGmailMessage): ParsedHeaders {
  const headers = raw.payload?.headers ?? [];
  const from = getHeader(headers, 'From');
  const { name: sender, email: senderEmail } = parseAddress(from);

  return {
    sender: sender || senderEmail,
    senderEmail,
    recipients: parseAddressList(getHeader(headers, 'To')),
    cc: parseAddressList(getHeader(headers, 'Cc')),
    subject: getHeader(headers, 'Subject') || '(no subject)',
    date: parseDate(getHeader(headers, 'Date')) ||
      parseInt(raw.internalDate, 10),
  };
}

/**
 * Parse a raw Gmail message into its body, links, and attachments.
 * Classification happens separately in the classifiers module.
 */
export function parseEmailBody(raw: RawGmailMessage): {
  body: string;
  htmlBody: string;
  extractedLinks: string[];
  attachments: Attachment[];
} {
  const { plainText, htmlText, attachments } = walkParts(raw.payload);

  const body = plainText || htmlToText(htmlText);
  const links = extractLinks(htmlText);

  return { body, htmlBody: htmlText, extractedLinks: links, attachments };
}

/** Produce a deterministic fingerprint for cache invalidation */
export function computeCacheHash(raw: RawGmailMessage): string {
  const data = `${raw.id}:${raw.historyId}:${raw.internalDate}`;
  return hashString(data);
}
