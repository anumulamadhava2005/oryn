/**
 * Category classifier integrated with ML/PR Vector Space Model & Ensemble Engine.
 * Scores official emails using ML TF-IDF Cosine Similarity, Naïve Bayes Log-Likelihood,
 * Sender-First rules, and RAG feedback retrieval.
 * Non-official emails (not ending in @iiitdm.ac.in or official campus domains) are dumped into 'general'.
 */

import { CATEGORY_KEYWORDS, SENDER_CATEGORY_RULES } from './keywords';
import { CATEGORY_META } from '@/constants/categories';
import { classifyWithML } from './mlClassifier';
import type { Category, CategoryGroup } from '@/types/email';

/**
 * Check if the sender email belongs to the official institute domain (@iiitdm.ac.in)
 * or official campus notification channels (e.g. Google Classroom, NPTEL, Swayam).
 */
export function isOfficialEmail(senderEmail: string): boolean {
  if (!senderEmail) return false;
  const lower = senderEmail.toLowerCase().trim();
  return (
    lower.endsWith('@iiitdm.ac.in') ||
    lower.includes('iiitdm.ac.in') ||
    lower.endsWith('.ac.in') ||
    lower.endsWith('@classroom.google.com') ||
    lower.endsWith('@nptel.iitm.ac.in') ||
    lower.endsWith('@swayam.gov.in')
  );
}

function scoreKeywords(
  text: string,
  keywords: string[],
  weight: number,
): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += weight;
  }
  return score;
}

// Label IDs that indicate category directly
const LABEL_CATEGORY_MAP: Record<string, Category[]> = {
  CATEGORY_PROMOTIONS:    ['general'],
  CATEGORY_SOCIAL:        ['general'],
  CATEGORY_UPDATES:       ['circular', 'bank', 'payments'],
  CATEGORY_PERSONAL:      ['general'],
  IMPORTANT:              [],
};

export interface ClassifiedCategory {
  category: Category;
  score: number;
}

/**
 * Classify an email using the multi-feature ML/PR Ensemble Engine.
 * STRICT RULE: Only official emails (e.g. senders with @iiitdm.ac.in) are classified.
 * Non-official emails are dumped to 'general'.
 */
export function classifyEmail(opts: {
  subject: string;
  body: string;
  senderEmail: string;
  labelIds: string[];
}): ClassifiedCategory[] {
  const { subject, body, senderEmail, labelIds } = opts;

  // Dump non-official emails into 'general'
  if (!isOfficialEmail(senderEmail)) {
    return [{ category: 'general', score: 0 }];
  }

  const bodyExcerpt = body.slice(0, 1500);
  const scores: Map<Category, number> = new Map();

  const add = (cat: Category, delta: number) => {
    scores.set(cat, (scores.get(cat) ?? 0) + delta);
  };

  // 1. RUN ON-DEVICE ML / PATTERN RECOGNITION CLASSIFIER
  const mlResult = classifyWithML({ subject, body: bodyExcerpt, senderEmail });

  // Boost categories matching the ML top group
  for (const [cat, meta] of Object.entries(CATEGORY_META)) {
    if (meta.group === mlResult.topGroup) {
      add(cat as Category, Math.round(mlResult.confidence * 45));
    }
  }

  // 2. SENDER-FIRST MATCHING (High Precision Rules)
  const fullSenderText = `${senderEmail} ${subject}`;
  for (const rule of SENDER_CATEGORY_RULES) {
    if (rule.pattern.test(fullSenderText) || rule.pattern.test(senderEmail)) {
      add(rule.category, rule.score);
    }
  }

  // 3. Keyword scoring & N-gram support
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [Category, typeof CATEGORY_KEYWORDS[Category]][]) {
    if (!kws) continue;
    const s =
      scoreKeywords(subject, kws.subject, 30) +
      scoreKeywords(bodyExcerpt, kws.body, 10) +
      scoreKeywords(senderEmail, kws.sender, 25);
    if (s > 0) add(cat, s);
  }

  // 4. Gmail label signals
  for (const labelId of labelIds) {
    const cats = LABEL_CATEGORY_MAP[labelId] ?? [];
    for (const cat of cats) {
      add(cat, 15);
    }
  }

  // 5. Build sorted result
  const result: ClassifiedCategory[] = Array.from(scores.entries())
    .filter(([, s]) => s >= 10)
    .map(([category, score]) => ({ category, score }))
    .sort((a, b) => b.score - a.score);

  if (result.length === 0) {
    return [{ category: 'general', score: 0 }];
  }

  return result;
}

/** Derive CategoryGroup from the primary Category */
export function getCategoryGroup(category: Category): CategoryGroup {
  return CATEGORY_META[category]?.group ?? 'general';
}
