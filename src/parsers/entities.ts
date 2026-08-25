/**
 * Lightweight NER-style entity extractor.
 * Uses regex patterns to pull structured entities from email text.
 */

import type { ExtractedEntities } from '@/types/email';

// --------------------------------------------------------------------------
// Patterns
// --------------------------------------------------------------------------

const PATTERNS = {
  // CS101, ECE201, MA302
  courseCodes: /\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/g,

  // Phone: +91-XXXXXXXXXX, (XXX) XXX-XXXX, +1-800-555-1234
  phoneNumbers:
    /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,

  // Email addresses
  emails: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,

  // URLs (http/https/www)
  urls: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,

  // Room numbers: "Room 204", "Hall 3B", "Block B Room 12"
  roomNumbers:
    /\b(?:room|hall|block|lab|cabin|office)\s+[A-Z0-9]{1,6}\b/gi,

  // Building names: typical campus naming e.g. "LT-1", "SB-301", "Academic Block"
  buildingNames:
    /\b(?:academic|admin(?:istration)?|library|hostel|lecture|seminar|conference)\s+(?:block|hall|building|complex|room|theatre)?\b/gi,

  // Time: 5 PM, 17:00, 9:30 AM
  times:
    /\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\b|\b\d{2}:\d{2}\b/g,

  // Dates: August 12, 12 Aug, 2024-08-12
  dates:
    /\b(?:\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}|\d{4}-\d{2}-\d{2})\b/gi,
};

// Heuristic: faculty names often follow honorifics
const FACULTY_RE =
  /\b(?:Prof(?:essor)?|Dr|Assistant\s+Prof|Associate\s+Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;

// Company names in placement contexts (well-known + followed by typical keywords)
const COMPANY_SIGNALS = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Adobe',
  'Salesforce', 'Oracle', 'IBM', 'Accenture', 'Infosys', 'Wipro', 'TCS',
  'HCL', 'Cognizant', 'Capgemini', 'Deloitte', 'McKinsey', 'Goldman',
  'Morgan', 'JPMorgan', 'Flipkart', 'Uber', 'Swiggy', 'Zomato',
  'Paytm', 'BYJU', 'Razorpay', 'Zerodha', 'Freshworks', 'Zoho',
];

const COMPANY_RE = new RegExp(
  `\\b(${COMPANY_SIGNALS.join('|')})\\b`,
  'gi',
);

// Event names: "Annual Tech Fest", "Hackathon 2024", "Cultural Night"
const EVENT_RE =
  /\b(?:[A-Z][a-z]+\s+){1,3}(?:Fest|Hackathon|Conclave|Summit|Workshop|Symposium|Day|Night|Week|Event|Competition|Contest)\b/g;

// Venue names: Auditorium, Seminar Hall, etc.
const VENUE_RE =
  /\b(?:Main\s+)?(?:Auditorium|Seminar\s+Hall|Conference\s+Room|Lecture\s+Theatre|Sports\s+Ground|Cricket\s+Ground|Basketball\s+Court|Gym|Cafeteria|Canteen|Mess)\b/gi;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function extractAll(re: RegExp, text: string): string[] {
  const cloned = new RegExp(re.source, re.flags);
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = cloned.exec(text)) !== null) {
    results.push((match[1] ?? match[0]).trim());
  }
  return [...new Set(results)].slice(0, 20);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export function extractEntities(
  subject: string,
  body: string,
): ExtractedEntities {
  const combined = `${subject}\n${body}`;

  return {
    courseCodes: extractAll(PATTERNS.courseCodes, combined),
    facultyNames: extractAll(FACULTY_RE, combined),
    companyNames: extractAll(COMPANY_RE, combined),
    buildingNames: extractAll(PATTERNS.buildingNames, combined),
    roomNumbers: extractAll(PATTERNS.roomNumbers, combined),
    dates: extractAll(PATTERNS.dates, combined),
    times: extractAll(PATTERNS.times, combined),
    phoneNumbers: extractAll(PATTERNS.phoneNumbers, combined),
    emails: extractAll(PATTERNS.emails, combined),
    urls: extractAll(PATTERNS.urls, combined),
    eventNames: extractAll(EVENT_RE, combined),
    venueNames: extractAll(VENUE_RE, combined),
  };
}

/** Generate human-readable tags from extracted entities for search/display */
export function buildTags(entities: ExtractedEntities): string[] {
  const tags: string[] = [];
  tags.push(...entities.courseCodes);
  tags.push(...entities.companyNames);
  tags.push(...entities.eventNames);
  tags.push(...entities.facultyNames.map(n => `Prof. ${n}`));
  return [...new Set(tags)].slice(0, 10);
}

/** Extract action items: sentences containing academic action verbs & excluding marketing noise */
export function extractActionItems(body: string): string[] {
  const sentences = body
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200);

  const ACADEMIC_ACTION_RE =
    /\b(?:please\s+submit|kindly\s+submit|submit\s+by|attend|register\s+for|apply\s+before|fill\s+the\s+form|upload|report\s+to|pay\s+(?:the\s+)?fee|complete\s+(?:the\s+)?assignment|viva|exam)\b/i;

  const JUNK_MARKETING_RE =
    /\b(?:click\s+here|visit\s+our|unsubscribe|view\s+in\s+browser|buy\s+now|check\s+out|privacy\s+policy|terms\s+and\s+conditions)\b/i;

  return sentences
    .filter(s => ACADEMIC_ACTION_RE.test(s) && !JUNK_MARKETING_RE.test(s))
    .slice(0, 5);
}
