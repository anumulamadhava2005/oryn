/**
 * Deadline extractor.
 * Uses pattern matching to find absolute and relative time references
 * in email subject/body and converts them to ISO 8601 timestamps.
 */

import {
  addDays,
  addHours,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  setHours,
  setMinutes,
  startOfDay,
  parseISO,
  isValid,
} from 'date-fns';

export interface DetectedDeadline {
  /** ISO 8601 string */
  iso: string;
  /** Human-readable label */
  label: string;
  /** Confidence 0–1 */
  confidence: number;
}

// Academic/Campus deadline context check — prevents false alarm deadlines from marketing/general copy
const ACADEMIC_CONTEXT_RE =
  /\b(?:submit|submission|deadline|due|exam|midsem|endsem|test|quiz|assignment|project|presentation|lab|lecture|form|register|registration|apply|last\s+date|clos(?:e|ing)|fee|fees|payment|viva|review|schedule|calendar)\b/i;

// --------------------------------------------------------------------------
// Time-of-day parser
// --------------------------------------------------------------------------

/** Parse "5 PM", "17:00", "5:30pm" → { hours, minutes } or null */
function parseTime(str: string): { hours: number; minutes: number } | null {
  const match12 = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  const match24 = str.match(/(\d{1,2}):(\d{2})(?!\s*(am|pm))/i);
  if (match24) {
    return { hours: parseInt(match24[1], 10), minutes: parseInt(match24[2], 10) };
  }

  const matchSimple = str.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (matchSimple) {
    let h = parseInt(matchSimple[1], 10);
    const ampm = matchSimple[2].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { hours: h, minutes: 0 };
  }

  return null;
}

function applyTime(date: Date, timeStr: string): Date {
  const t = parseTime(timeStr);
  if (t) {
    return setMinutes(setHours(date, t.hours), t.minutes);
  }
  return setMinutes(setHours(date, 23), 59);
}

// --------------------------------------------------------------------------
// Month name → 0-based index
// --------------------------------------------------------------------------

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// --------------------------------------------------------------------------
// Pattern definitions
// --------------------------------------------------------------------------

interface DeadlinePattern {
  re: RegExp;
  resolve: (match: RegExpMatchArray, now: Date) => Date | null;
  labelTemplate: (match: RegExpMatchArray) => string;
  confidence: number;
}

const PATTERNS: DeadlinePattern[] = [
  {
    re: /\btoday\b(?:\s+(?:at|by))?\s*([\d:apm ]+)/i,
    resolve: (m, now) => applyTime(startOfDay(now), m[1]),
    labelTemplate: m => `Today ${m[1]}`,
    confidence: 0.95,
  },
  {
    re: /\btonight\b/i,
    resolve: (_m, now) => setMinutes(setHours(startOfDay(now), 22), 0),
    labelTemplate: () => 'Tonight',
    confidence: 0.9,
  },
  {
    re: /\btomorrow\b(?:\s+(?:at|by))?\s*([\d:apm ]*)/i,
    resolve: (m, now) => applyTime(startOfDay(addDays(now, 1)), m[1] || ''),
    labelTemplate: m => m[1] ? `Tomorrow ${m[1].trim()}` : 'Tomorrow',
    confidence: 0.9,
  },
  {
    re: /\bwithin\s+(\d+)\s+hours?\b/i,
    resolve: (m, now) => addHours(now, parseInt(m[1], 10)),
    labelTemplate: m => `Within ${m[1]} hours`,
    confidence: 0.85,
  },
  {
    re: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?:\s+(?:at|by))?\s*([\d:apm ]*)/i,
    resolve: (m, now) => {
      const day = m[1].toLowerCase();
      const nextFns: Record<string, (d: Date) => Date> = {
        monday: nextMonday,
        tuesday: nextTuesday,
        wednesday: nextWednesday,
        thursday: nextThursday,
        friday: nextFriday,
        saturday: nextSaturday,
        sunday: nextSunday,
      };
      const fn = nextFns[day];
      return fn ? applyTime(startOfDay(fn(now)), m[2] || '') : null;
    },
    labelTemplate: m => `Next ${m[1].charAt(0).toUpperCase() + m[1].slice(1)}${m[2] ? ' ' + m[2].trim() : ''}`,
    confidence: 0.85,
  },
  {
    re: /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s*(\d{4}))?\b(?:\s+(?:at|by))?\s*([\d:apm ]*)/i,
    resolve: (m, now) => {
      const month = MONTH_MAP[m[1].toLowerCase()];
      const day = parseInt(m[2], 10);
      const year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      if (month === undefined || day < 1 || day > 31) return null;
      const d = new Date(year, month, day);
      if (!isValid(d)) return null;
      return applyTime(d, m[4] || '');
    },
    labelTemplate: m => `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} ${m[2]}${m[3] ? ' ' + m[3] : ''}${m[4] ? ' ' + m[4].trim() : ''}`,
    confidence: 0.88,
  },
  {
    re: /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b(?:,?\s*(\d{4}))?\b(?:\s+(?:at|by))?\s*([\d:apm ]*)/i,
    resolve: (m, now) => {
      const day = parseInt(m[1], 10);
      const month = MONTH_MAP[m[2].toLowerCase()];
      const year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      if (month === undefined || day < 1 || day > 31) return null;
      const d = new Date(year, month, day);
      if (!isValid(d)) return null;
      return applyTime(d, m[4] || '');
    },
    labelTemplate: m => `${m[1]} ${m[2].charAt(0).toUpperCase() + m[2].slice(1)}${m[3] ? ' ' + m[3] : ''}`,
    confidence: 0.88,
  },
  {
    re: /\b(\d{4}-\d{2}-\d{2})\b(?:\s+(?:at|by))?\s*([\d:apm ]*)/i,
    resolve: (m, _now) => {
      const d = parseISO(m[1]);
      return isValid(d) ? applyTime(d, m[2] || '') : null;
    },
    labelTemplate: m => m[1],
    confidence: 0.92,
  },
  {
    re: /(?:deadline|submit\s+(?:before|by)|due\s+(?:by|on|before))[:.]?\s*([^\n.]{3,60})/i,
    resolve: (m, now) => {
      const inner = detectDeadline(m[1], now);
      return inner ? new Date(inner.iso) : null;
    },
    labelTemplate: m => m[1].trim().slice(0, 40),
    confidence: 0.8,
  },
];

export const URGENCY_PATTERNS: RegExp[] = [
  /\burgent\b/i,
  /\bimmediately\b/i,
  /\bASAP\b/,
  /\baction\s+required\b/i,
  /\blast\s+(?:chance|day|call)\b/i,
  /\btime\s+sensitive\b/i,
  /\bexpires?\s+(?:soon|today|tonight|tomorrow)\b/i,
  /\bresponse\s+required\b/i,
  /\bdo\s+not\s+(?:miss|ignore)\b/i,
];

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Attempt to extract the most confident deadline from `text`.
 * Requires academic/campus context keywords to avoid false positive triggers.
 */
export function detectDeadline(
  text: string,
  now: Date = new Date(),
): DetectedDeadline | null {
  if (!text) return null;

  // Strict rule: text MUST contain academic or deadline context
  if (!ACADEMIC_CONTEXT_RE.test(text)) {
    return null;
  }

  let best: DetectedDeadline | null = null;

  for (const pattern of PATTERNS) {
    const match = text.match(pattern.re);
    if (!match) continue;

    const resolved = pattern.resolve(match, now);
    if (!resolved || !isValid(resolved)) continue;

    const sevenDaysAgo = addDays(now, -7);
    if (resolved < sevenDaysAgo) continue;

    if (!best || pattern.confidence > best.confidence) {
      best = {
        iso: resolved.toISOString(),
        label: pattern.labelTemplate(match),
        confidence: pattern.confidence,
      };
    }
  }

  return best;
}

export function scoreUrgency(subject: string, body: string): number {
  const combined = `${subject} ${body.slice(0, 500)}`;
  let score = 0;
  for (const re of URGENCY_PATTERNS) {
    if (re.test(combined)) score += 20;
  }
  return Math.min(score, 100);
}
