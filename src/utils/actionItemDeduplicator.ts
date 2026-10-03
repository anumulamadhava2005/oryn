/**
 * Action Item Deduplicator.
 * Identifies and merges near-duplicate action items created by multiple faculty/admin
 * forwards and broadcast reminders (e.g. "Gentle reminder to attend live telecast at 9 AM").
 */

import type { ParsedEmail } from '@/types/email';

export interface DeduplicatedActionItem {
  key: string;
  action: string;
  email: ParsedEmail;
  allSenders: string[];
  allEmailIds: string[];
}

const NOISE_PREFIXES = [
  /^gentle\s+reminder\s+(to\s+|for\s+|about\s+|:)?/i,
  /^reminder\s*:\s*/i,
  /^reminder\s+(to\s+|for\s+|about\s+|:)?/i,
  /^kind\s+reminder\s+(to\s+|for\s+|about\s+|:)?/i,
  /^urgent\s*:\s*/i,
  /^important\s*:\s*/i,
  /^fwd\s*:\s*/i,
  /^fwd\s*-\s*/i,
  /^please\s+note\s+(that\s+|to\s+)?/i,
  /^all\s+(students|members|faculty)\s+(are\s+requested|requested|invited)\s+to\s+/i,
  /^you\s+are\s+requested\s+to\s+/i,
  /^please\s+/i,
];

/**
 * Strips common email reminder boilerplate and normalizes whitespace and punctuation.
 */
export function normalizeActionText(text: string): string {
  let cleaned = text.trim();
  for (const prefix of NOISE_PREFIXES) {
    cleaned = cleaned.replace(prefix, '').trim();
  }
  return cleaned
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates word-level Jaccard similarity between two normalized strings.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Deduplicates and clusters action items based on semantic text overlap.
 */
export function deduplicateActionItems(
  items: Array<{ email: ParsedEmail; action: string }>
): DeduplicatedActionItem[] {
  const clusters: DeduplicatedActionItem[] = [];

  for (const item of items) {
    const rawText = item.action.trim();
    if (!rawText) continue;

    const normText = normalizeActionText(rawText);
    if (!normText) continue;

    let matchedCluster: DeduplicatedActionItem | null = null;

    for (const cluster of clusters) {
      const clusterNorm = normalizeActionText(cluster.action);
      
      // Exact match or high Jaccard token overlap (>= 60%) or mutual containment
      const similarity = jaccardSimilarity(normText, clusterNorm);
      const isSub =
        (normText.length > 15 && clusterNorm.includes(normText)) ||
        (clusterNorm.length > 15 && normText.includes(clusterNorm));

      if (similarity >= 0.6 || isSub) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      // Merge sender and email ID
      if (!matchedCluster.allSenders.includes(item.email.sender)) {
        matchedCluster.allSenders.push(item.email.sender);
      }
      if (!matchedCluster.allEmailIds.includes(item.email.id)) {
        matchedCluster.allEmailIds.push(item.email.id);
      }
      // If this action text is more descriptive/longer, adopt it
      if (rawText.length > matchedCluster.action.length) {
        matchedCluster.action = rawText;
      }
      // Keep the most recent email
      if (item.email.date > matchedCluster.email.date) {
        matchedCluster.email = item.email;
      }
    } else {
      clusters.push({
        key: `${item.email.id}-${normText.slice(0, 32)}`,
        action: rawText,
        email: item.email,
        allSenders: [item.email.sender],
        allEmailIds: [item.email.id],
      });
    }
  }

  return clusters;
}
