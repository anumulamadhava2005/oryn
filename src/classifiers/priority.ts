/**
 * Priority scorer.
 * Assigns one of: critical | high | medium | low | ignore
 * based on category, urgency keywords, sender, deadline proximity, and labels.
 */

import type { Category, Priority } from '@/types/email';
import { scoreUrgency } from '@/parsers/deadline';
import { SENDER_REPUTATION } from './keywords';

// --------------------------------------------------------------------------
// Base priority per category
// --------------------------------------------------------------------------

const CATEGORY_BASE_PRIORITY: Partial<Record<Category, number>> = {
  // Critical baseline
  otp:               80,
  security_alert:    80,
  bank:              70,
  payments:          65,

  // High
  interview:         65,
  exam:              60,
  endsem:            60,
  midsem:            58,
  assignment:        55,
  fees:              55,
  coding_test:       55,
  academic_office:   55,
  placement_office:  55,
  admin_office:      50,

  // Medium-High
  full_time:         50,
  internship:        50,
  ppo:               50,
  marks:             48,
  attendance:        48,
  registrar:         48,
  director_office:   50,

  // Medium
  mess_affairs:      45,
  hostel_affairs:    45,
  technical_affairs: 42,
  classroom:         42,
  nptel:             40,
  warden:            40,
  lecture:           40,
  lab:               38,
  quiz:              38,
  water_power:       40,
  maintenance:       35,

  // Low
  cultural_affairs:  30,
  sports_affairs:    30,
  fest:              30,
  club_event:        28,
  canteen:           25,
  mess_menu:         25,
  general:           20,
};

// Urgency keywords that bump priority (applied to subject only)
const CRITICAL_SUBJECT_PATTERNS = [
  /urgent/i, /action\s+required/i, /immediate/i, /important:/i,
  /last\s+chance/i, /final\s+warning/i, /do\s+not\s+ignore/i,
];

const HIGH_SUBJECT_PATTERNS = [
  /reminder/i, /deadline/i, /due\s+(today|tonight|tomorrow)/i,
  /expir(e|ing|ed)/i, /overdue/i,
];

// Institute domains that boost priority
const INSTITUTE_DOMAIN_RE =
  /\.(ac\.in|edu|edu\.in|iit\.|nit\.|iisc\.|bits\.)$/i;

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Compute a numeric priority score (0–100) and return a Priority label.
 */
export function scorePriority(opts: {
  category: Category;
  subject: string;
  body: string;
  senderEmail: string;
  labelIds: string[];
  hasDeadline: boolean;
  emailDate: number;
}): { priority: Priority; score: number } {
  const { category, subject, body, senderEmail, labelIds, hasDeadline, emailDate } = opts;

  let score = CATEGORY_BASE_PRIORITY[category] ?? 30;

  // Gmail IMPORTANT label
  if (labelIds.includes('IMPORTANT')) score += 15;

  // Deadline detection bonus
  if (hasDeadline) score += 15;

  // Recency bonus (email < 24h old gets +5)
  const age = Date.now() - emailDate;
  if (age < 86_400_000) score += 5;

  // Subject-level critical patterns
  for (const re of CRITICAL_SUBJECT_PATTERNS) {
    if (re.test(subject)) { score += 20; break; }
  }

  // Subject-level high patterns
  for (const re of HIGH_SUBJECT_PATTERNS) {
    if (re.test(subject)) { score += 10; break; }
  }

  // Urgency keyword score from body
  const urgency = scoreUrgency(subject, body);
  score += Math.round(urgency * 0.25); // up to +25

  // Institute domain boost
  const domainMatch = senderEmail.match(/@([^@]+)$/);
  if (domainMatch && INSTITUTE_DOMAIN_RE.test(domainMatch[1])) {
    score += 10;
  }

  // Sender reputation boosts
  for (const rep of SENDER_REPUTATION) {
    if (rep.pattern.test(senderEmail)) {
      score += rep.score > 50 ? 15 : 5;
      break;
    }
  }

  score = Math.max(0, Math.min(100, score));

  const priority: Priority =
    score >= 75 ? 'critical' :
    score >= 55 ? 'high' :
    score >= 35 ? 'medium' :
    score >= 15 ? 'low' :
    'ignore';

  return { priority, score };
}
