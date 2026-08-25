/**
 * Main classifier entry point.
 * Takes a raw Gmail message + already-parsed headers/body and
 * returns classification results that get merged into ParsedEmail.
 */

import { classifyEmail, getCategoryGroup, isOfficialEmail } from './category';
import { scorePriority } from './priority';
import { detectDeadline, scoreUrgency } from '@/parsers/deadline';
import { extractEntities, buildTags, extractActionItems } from '@/parsers/entities';
import type { Category, CategoryGroup, ExtractedEntities, ParsedEmail, Priority } from '@/types/email';

export interface ClassificationResult {
  category: Category;
  categories: Category[];
  categoryGroup: CategoryGroup;
  priority: Priority;
  priorityScore: number;
  deadline: string | null;
  deadlineLabel: string | null;
  urgencyScore: number;
  extractedEntities: ExtractedEntities;
  actionItems: string[];
  tags: string[];
}

/**
 * Run the full classification pipeline.
 * @param emailDate - Unix ms timestamp of the email, used for relative deadline resolution.
 */
export function classifyAndEnrich(opts: {
  subject: string;
  body: string;
  senderEmail: string;
  labelIds: string[];
  emailDate: number;
}): ClassificationResult {
  const { subject, body, senderEmail, labelIds, emailDate } = opts;
  const isOfficial = isOfficialEmail(senderEmail);

  // NON-OFFICIAL EMAILS: Dump to 'general' with zero deadlines/action items
  if (!isOfficial) {
    return {
      category: 'general',
      categories: ['general'],
      categoryGroup: 'general',
      priority: 'low',
      priorityScore: 10,
      deadline: null,
      deadlineLabel: null,
      urgencyScore: 0,
      extractedEntities: {
        courseCodes: [],
        facultyNames: [],
        companyNames: [],
        buildingNames: [],
        roomNumbers: [],
        dates: [],
        times: [],
        phoneNumbers: [],
        emails: [senderEmail],
        urls: [],
        eventNames: [],
        venueNames: [],
      },
      actionItems: [],
      tags: [],
    };
  }

  // OFFICIAL CAMPUS EMAILS: Perform full classification & enrichment
  const categoryResults = classifyEmail({ subject, body, senderEmail, labelIds });
  const primaryCategory = categoryResults[0]?.category ?? 'general';
  const allCategories = categoryResults.map(r => r.category);
  const categoryGroup = getCategoryGroup(primaryCategory);

  // 2. Deadline extraction (only for official emails)
  const deadlineResult = detectDeadline(`${subject}\n${body}`, new Date(emailDate));

  // 3. Priority scoring
  const { priority, score: priorityScore } = scorePriority({
    category: primaryCategory,
    subject,
    body,
    senderEmail,
    labelIds,
    hasDeadline: deadlineResult !== null,
    emailDate,
  });

  // 4. Urgency score
  const urgencyScore = scoreUrgency(subject, body);

  // 5. Entity extraction
  const extractedEntities = extractEntities(subject, body);

  // 6. Action items
  const actionItems = extractActionItems(body);

  // 7. Tags
  const tags = buildTags(extractedEntities);

  return {
    category: primaryCategory,
    categories: allCategories,
    categoryGroup,
    priority,
    priorityScore,
    deadline: deadlineResult?.iso ?? null,
    deadlineLabel: deadlineResult?.label ?? null,
    urgencyScore,
    extractedEntities,
    actionItems,
    tags,
  };
}
