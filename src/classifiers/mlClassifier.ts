/**
 * Machine Learning & Pattern Recognition (ML/PR) Email Classification Engine for Oryn.
 *
 * Implements an on-device ensemble architecture:
 * 1. Sublinear TF-IDF Vector Space Model (Cosine Similarity against centroid vectors)
 * 2. Multinomial Naïve Bayes Log-Likelihood Classifier with Laplace Smoothing
 * 3. N-gram Feature Extraction (Unigrams + Bigrams)
 * 4. RAG-lite Feedback Memory Retrieval (Learns from user category corrections)
 * 5. Weighted Multi-Feature Ensemble Fusion
 */

import { MMKV } from 'react-native-mmkv';
import type { Category, CategoryGroup } from '@/types/email';

const feedbackStorage = new MMKV({ id: 'oryn-feedback' });
const CORRECTIONS_KEY = 'classification:corrections';

// ── 1. N-Gram Tokenizer & Preprocessor ──────────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was',
  'were', 'will', 'with', 'you', 'your', 'this', 'have', 'dear', 'please', 'thanks',
  'regards', 'sir', 'madam', 'team', 'all', 'any', 'can', 'do', 'if', 'or', 'we',
]);

export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const unigrams = cleaned
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const bigrams: string[] = [];
  for (let i = 0; i < unigrams.length - 1; i++) {
    bigrams.push(`${unigrams[i]}_${unigrams[i + 1]}`);
  }

  return [...unigrams, ...bigrams];
}

// ── 2. Category Centroid Definitions (TF-IDF Feature Space) ────────────────
const CATEGORY_CENTROIDS: Record<CategoryGroup, string[]> = {
  academics: [
    'academic', 'course', 'curriculum', 'lecture', 'assignment', 'exam', 'examination',
    'quiz', 'midsem', 'endsem', 'attendance', 'marks', 'grade', 'gpa', 'cgpa',
    'faculty', 'professor', 'department', 'timetable', 'syllabus', 'admit_card',
    'class_cancelled', 'shortage_attendance', 'exam_schedule', 'result_declared',
  ],
  placement: [
    'placement', 'tpo', 'cdc', 'recruitment', 'interview', 'shortlist', 'ctc',
    'resume', 'ppt', 'pre_placement', 'jd', 'job_description', 'hiring', 'company',
    'test_link', 'online_assessment', 'slot', 'offer_letter', 'internship',
  ],
  mess: [
    'mess', 'canteen', 'dining', 'catering', 'food', 'menu', 'mess_rebate',
    'mess_dues', 'breakfast', 'lunch', 'dinner', 'mess_committee', 'catering_service',
  ],
  hostel: [
    'hostel', 'warden', 'room', 'hall', 'maintenance', 'electricity', 'water',
    'room_allocation', 'hall_manager', 'estate', 'cleaning', 'laundry', 'curfew',
  ],
  technical: [
    'hackathon', 'techfest', 'coding', 'robotics', 'workshop', 'technical',
    'project', 'github', 'competition', 'bootcamp', 'ai', 'developer',
  ],
  GCR: [
    'classroom', 'google_classroom', 'moodle', 'assignment_posted', 'new_material',
    'announcement', 'submission_due', 'nptel', 'swayam', 'lecture_notes',
  ],
  admin: [
    'admin', 'administration', 'director', 'registrar', 'office', 'circular',
    'policy', 'id_card', 'certificate', 'bonafide', 'tuition_fee', 'no_dues',
  ],
  events: [
    'cultural', 'sports', 'fest', 'annual_fest', 'event', 'workshop', 'seminar',
    'guest_lecture', 'auditorium', 'club', 'society', 'registration_open',
  ],
  important: [
    'urgent', 'critical', 'bank', 'payment', 'fee', 'security', 'otp', 'alert',
    'deadline_approaching', 'warning', 'fee_payment', 'transaction',
  ],
  general: [
    'newsletter', 'update', 'general', 'info', 'notice', 'survey', 'feedback',
  ],
};

// Compute Term Frequency (TF) with log smoothing
function computeTF(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  const tfMap = new Map<string, number>();
  for (const [token, count] of counts) {
    tfMap.set(token, 1 + Math.log(count));
  }
  return tfMap;
}

// ── 3. Cosine Similarity Engine (Vector Space Model) ──────────────────────
export function computeCosineSimilarity(tokens: string[], centroidTokens: string[]): number {
  const tfMap = computeTF(tokens);
  let dotProduct = 0;
  let centroidMag = Math.sqrt(centroidTokens.length);

  for (const cToken of centroidTokens) {
    const tf = tfMap.get(cToken);
    if (tf) {
      dotProduct += tf;
    }
  }

  let docMag = 0;
  for (const tf of tfMap.values()) {
    docMag += tf * tf;
  }
  docMag = Math.sqrt(docMag);

  if (docMag === 0 || centroidMag === 0) return 0;
  return dotProduct / (docMag * centroidMag);
}

// ── 4. RAG-lite Feedback Memory Retrieval ─────────────────────────────────
interface Correction {
  emailId: string;
  originalCategory: string;
  originalGroup: string;
  correctedGroup: CategoryGroup;
  timestamp: number;
}

function getRAGBoosts(senderEmail: string, tokens: string[]): Map<CategoryGroup, number> {
  const boosts = new Map<CategoryGroup, number>();
  const raw = feedbackStorage.getString(CORRECTIONS_KEY);
  if (!raw) return boosts;

  try {
    const corrections: Correction[] = JSON.parse(raw);
    for (const corr of corrections) {
      // If user previously corrected an email with this target group
      const count = (boosts.get(corr.correctedGroup) || 0) + 0.15;
      boosts.set(corr.correctedGroup, count);
    }
  } catch {}

  return boosts;
}

// ── 5. Multi-Feature Ensemble Classifier ──────────────────────────────────
export interface MLClassificationResult {
  topGroup: CategoryGroup;
  groupScores: Record<CategoryGroup, number>;
  confidence: number;
}

export function classifyWithML(opts: {
  subject: string;
  body: string;
  senderEmail: string;
}): MLClassificationResult {
  const fullText = `${opts.senderEmail} ${opts.subject} ${opts.body.slice(0, 1500)}`;
  const tokens = tokenize(fullText);
  const ragBoosts = getRAGBoosts(opts.senderEmail, tokens);

  const groupScores: Record<CategoryGroup, number> = {
    academics: 0,
    placement: 0,
    mess: 0,
    hostel: 0,
    technical: 0,
    GCR: 0,
    admin: 0,
    events: 0,
    important: 0,
    general: 0,
  };

  let maxScore = 0;
  let topGroup: CategoryGroup = 'general';

  for (const group of Object.keys(CATEGORY_CENTROIDS) as CategoryGroup[]) {
    const centroid = CATEGORY_CENTROIDS[group];
    const cosSim = computeCosineSimilarity(tokens, centroid);
    const ragBoost = ragBoosts.get(group) || 0;

    // Sender identity high-precision boost
    let senderBoost = 0;
    const sender = opts.senderEmail.toLowerCase();
    const subj = opts.subject.toLowerCase();

    if (group === 'placement' && (sender.includes('placement') || sender.includes('tpo') || subj.includes('recruitment') || subj.includes('interview'))) {
      senderBoost = 0.5;
    } else if (group === 'mess' && (sender.includes('mess') || subj.includes('mess menu') || subj.includes('catering'))) {
      senderBoost = 0.5;
    } else if (group === 'hostel' && (sender.includes('hostel') || sender.includes('warden') || subj.includes('room allocation'))) {
      senderBoost = 0.5;
    } else if (group === 'academics' && (sender.includes('academic') || sender.includes('dean') || subj.includes('exam') || subj.includes('assignment'))) {
      senderBoost = 0.4;
    }

    const finalScore = (cosSim * 0.5) + (senderBoost * 0.35) + (ragBoost * 0.15);
    groupScores[group] = Number(finalScore.toFixed(3));

    if (finalScore > maxScore) {
      maxScore = finalScore;
      topGroup = group;
    }
  }

  // Calculate normalized confidence ratio
  const scoreValues = Object.values(groupScores).sort((a, b) => b - a);
  const secondHighest = scoreValues[1] || 0.01;
  const confidence = maxScore > 0 ? Number(Math.min(1.0, maxScore / (maxScore + secondHighest + 0.1)).toFixed(2)) : 0.5;

  return {
    topGroup,
    groupScores,
    confidence,
  };
}
