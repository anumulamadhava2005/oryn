/**
 * Keyword dictionaries and sender patterns for the campus-focused classification engine.
 * Priority matching inspects sender display names and emails (Mess Affairs, Hostel Affairs,
 * Placement Office, Academic Office, Technical Affairs, Google Classroom, NPTEL, Admin, etc.)
 */

import type { Category } from '@/types/email';

export type KeywordSet = {
  subject: string[];
  body: string[];
  sender: string[];
};

/** High precision sender rules mapped directly to categories */
export const SENDER_CATEGORY_RULES: Array<{
  pattern: RegExp;
  category: Category;
  score: number;
}> = [
  // Mess Affairs
  { pattern: /mess|mess affairs|canteen|dining|catering|mess warden|mess committee/i, category: 'mess_affairs', score: 100 },

  // Hostel Affairs
  { pattern: /hostel|hostel affairs|warden|hall manager|hall of residence|maintenance|estate/i, category: 'hostel_affairs', score: 100 },

  // Placement Office
  { pattern: /placement|tpo|cdc|career|placement office|placement cell|recruitment/i, category: 'placement_office', score: 100 },

  // Academic Office & Faculty
  { pattern: /academic|academic office|dean academic|dean office|faculty|professor|dept|department|course coordinator/i, category: 'academic_office', score: 100 },

  // Technical Affairs
  { pattern: /technical|technical affairs|tech club|techfest|hackathon|coding club|robotics/i, category: 'technical_affairs', score: 100 },

  // GCR & Classroom / NPTEL
  { pattern: /nptel|swayam/i, category: 'nptel', score: 100 },
  { pattern: /google classroom|classroom|gcr|moodle|canvas|lms/i, category: 'classroom', score: 100 },

  // Admin & Directorate
  { pattern: /admin|administration|director|registrar|institute office|director office/i, category: 'admin_office', score: 100 },

  // Events & Sports Affairs
  { pattern: /cultural|sports|sac|student affairs|fest|annual fest|event committee/i, category: 'cultural_affairs', score: 100 },

  // Important Security & Financial
  { pattern: /bank|hdfc|icici|sbi|axis|razorpay|paytm|otp|security/i, category: 'bank', score: 90 },
];

export const CATEGORY_KEYWORDS: Partial<Record<Category, KeywordSet>> = {
  // ── Academics ──────────────────────────────────────────────────────────
  academic_office: {
    subject: ['academic', 'dean academic', 'course registration', 'curriculum', 'timetable'],
    body:    ['academic office', 'dean of academic', 'academic notice'],
    sender:  ['academic', 'dean_acad', 'academics'],
  },
  lecture: {
    subject: ['lecture', 'class cancelled', 'class schedule', 'extra class', 'rescheduled class'],
    body:    ['lecture', 'class will be held', 'attend lecture'],
    sender:  [],
  },
  assignment: {
    subject: ['assignment', 'submission', 'homework', 'problem set', 'submit'],
    body:    ['submit your assignment', 'assignment due', 'submission deadline'],
    sender:  [],
  },
  exam: {
    subject: ['exam', 'examination', 'test schedule', 'seating arrangement', 'admit card'],
    body:    ['exam schedule', 'examination timetable', 'seating arrangement'],
    sender:  [],
  },
  quiz: {
    subject: ['quiz', 'mcq', 'online test', 'minor test'],
    body:    ['quiz will be held', 'quiz on', 'online quiz'],
    sender:  [],
  },
  midsem: {
    subject: ['midsem', 'mid semester', 'midterm'],
    body:    ['midsem exam', 'mid semester examination'],
    sender:  [],
  },
  endsem: {
    subject: ['endsem', 'end semester', 'final exam'],
    body:    ['end semester exam', 'final examination'],
    sender:  [],
  },
  attendance: {
    subject: ['attendance', 'shortage', 'proxy', 'biometric'],
    body:    ['attendance shortage', 'low attendance', 'attendance warning'],
    sender:  [],
  },
  marks: {
    subject: ['marks', 'grades', 'result', 'gpa', 'cgpa', 'transcript'],
    body:    ['your marks', 'result declared', 'grade report'],
    sender:  [],
  },

  // ── Placement ──────────────────────────────────────────────────────────
  placement_office: {
    subject: ['placement', 'tpo', 'cdc', 'campus placement', 'drive'],
    body:    ['placement office', 'training and placement', 'career development'],
    sender:  ['placement', 'tpo', 'cdc'],
  },
  internship: {
    subject: ['internship', 'intern', 'summer internship', 'winter internship'],
    body:    ['internship opening', 'apply for internship', 'internship drive'],
    sender:  [],
  },
  full_time: {
    subject: ['full time', 'full-time', 'placement drive', 'campus recruitment', 'job offer'],
    body:    ['full time role', 'campus placement', 'job opening', 'hiring for'],
    sender:  [],
  },
  ppo: {
    subject: ['ppo', 'pre placement offer'],
    body:    ['pre placement offer', 'ppo process'],
    sender:  [],
  },
  coding_test: {
    subject: ['coding test', 'online assessment', 'technical test', 'oa'],
    body:    ['coding round', 'online test link', 'assessment link'],
    sender:  ['hackerrank', 'hackerearth', 'codility', 'mettl'],
  },
  interview: {
    subject: ['interview', 'interview schedule', 'shortlisted', 'selected for interview'],
    body:    ['interview scheduled', 'appear for interview', 'interview round'],
    sender:  [],
  },

  // ── Mess Affairs ───────────────────────────────────────────────────────
  mess_affairs: {
    subject: ['mess', 'mess menu', 'mess affairs', 'canteen', 'dining'],
    body:    ['mess menu', 'lunch menu', 'dinner menu', 'mess facility', 'food quality'],
    sender:  ['mess', 'mess_affairs', 'canteen'],
  },
  mess_menu: {
    subject: ['menu', 'breakfast', 'lunch', 'dinner'],
    body:    ['mess menu for the week', 'today\'s menu'],
    sender:  [],
  },

  // ── Hostel Affairs ─────────────────────────────────────────────────────
  hostel_affairs: {
    subject: ['hostel', 'hostel affairs', 'warden', 'room allocation', 'hall'],
    body:    ['hostel office', 'chief warden', 'hostel maintenance'],
    sender:  ['hostel', 'warden', 'hall'],
  },
  maintenance: {
    subject: ['maintenance', 'repair', 'plumbing', 'electrical work'],
    body:    ['maintenance work', 'repair work', 'plumbing issue'],
    sender:  ['maintenance', 'estate'],
  },
  water_power: {
    subject: ['water shutdown', 'power cut', 'electricity shutdown', 'power outage'],
    body:    ['water supply', 'no power', 'electricity maintenance'],
    sender:  [],
  },

  // ── Technical Affairs ──────────────────────────────────────────────────
  technical_affairs: {
    subject: ['technical affairs', 'techfest', 'hackathon', 'coding competition', 'tech club'],
    body:    ['technical council', 'techfest registration', 'hackathon announcement'],
    sender:  ['technical', 'techfest', 'coding_club'],
  },

  // ── GCR & Courses ──────────────────────────────────────────────────────
  classroom: {
    subject: ['classroom', 'new material', 'announcement in', 'assignment assigned'],
    body:    ['google classroom', 'posted a new assignment', 'posted a new material'],
    sender:  ['classroom', 'google classroom'],
  },
  nptel: {
    subject: ['nptel', 'swayam', 'assignment submitted', 'nptel course'],
    body:    ['nptel online course', 'swayam portal'],
    sender:  ['nptel', 'swayam'],
  },

  // ── Admin Office ───────────────────────────────────────────────────────
  admin_office: {
    subject: ['circular', 'notice', 'announcement', 'director', 'registrar'],
    body:    ['from the office of director', 'official circular', 'registrar notice'],
    sender:  ['admin', 'director', 'registrar'],
  },

  // ── Events & Sports ────────────────────────────────────────────────────
  cultural_affairs: {
    subject: ['cultural', 'fest', 'annual fest', 'sports', 'tournament'],
    body:    ['cultural festival', 'sports event', 'annual sports'],
    sender:  ['cultural', 'sports', 'sac'],
  },

  // ── Important ─────────────────────────────────────────────────────────
  otp: {
    subject: ['otp', 'verification code', 'one time password'],
    body:    ['your otp', 'verification code is'],
    sender:  [],
  },
  bank: {
    subject: ['bank', 'account', 'transaction', 'statement', 'credited'],
    body:    ['bank account', 'transaction of', 'credited to'],
    sender:  ['bank', 'hdfc', 'icici', 'sbi'],
  },
};

export const SENDER_REPUTATION = SENDER_CATEGORY_RULES;
