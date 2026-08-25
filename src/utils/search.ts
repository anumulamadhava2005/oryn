/**
 * Search utilities — fuzzy matching and recent search persistence.
 */

import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oryn-search' });
const RECENT_KEY = 'search:recent';
const MAX_RECENT = 8;

// ─── Recent Searches ──────────────────────────────────────────────────────────

export function getRecentSearches(): string[] {
  const raw = storage.getString(RECENT_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;

  const recent = getRecentSearches().filter(s => s !== trimmed);
  recent.unshift(trimmed);
  storage.set(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function clearRecentSearches(): void {
  storage.delete(RECENT_KEY);
}

// ─── Fuzzy Match ──────────────────────────────────────────────────────────────

/**
 * Simple trigram-based fuzzy matching.
 * Returns a relevance score between 0 (no match) and 1 (perfect match).
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  if (!q || !t) return 0;

  // Exact substring match — highest score
  if (t.includes(q)) return 1;

  // Check if all characters of query appear in order (subsequence)
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi < q.length) return 0; // not even a subsequence

  // Trigram overlap scoring
  const qTrigrams = buildTrigrams(q);
  const tTrigrams = buildTrigrams(t);

  if (qTrigrams.size === 0) return 0;

  let matches = 0;
  for (const tri of qTrigrams) {
    if (tTrigrams.has(tri)) matches++;
  }

  return matches / qTrigrams.size;
}

function buildTrigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) {
    set.add(s.slice(i, i + 3));
  }
  // Also add bigrams for short queries
  if (s.length <= 5) {
    for (let i = 0; i <= s.length - 2; i++) {
      set.add(s.slice(i, i + 2));
    }
  }
  return set;
}
