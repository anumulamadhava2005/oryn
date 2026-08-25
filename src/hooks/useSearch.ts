/**
 * useSearch hook — upgraded with fuzzy matching, debounce, and recent searches.
 * Full-text + trigram search across sender, subject, body, tags, and category.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useEmailsStore } from '@/store/emails';
import { fuzzyScore, getRecentSearches, addRecentSearch, clearRecentSearches } from '@/utils/search';
import type { ParsedEmail } from '@/types/email';

const DEBOUNCE_MS = 250;
const FUZZY_THRESHOLD = 0.3;

interface SearchableFields {
  haystack: string;
  fields: string[];
}

function getSearchableFields(email: ParsedEmail): SearchableFields {
  const fields = [
    email.sender,
    email.senderEmail,
    email.subject,
    email.snippet,
    email.body.slice(0, 500),
    email.category,
    email.categoryGroup,
    ...email.tags,
    ...email.labelNames,
    ...email.extractedEntities.companyNames,
    ...email.extractedEntities.courseCodes,
    ...email.extractedEntities.facultyNames,
    ...email.extractedEntities.eventNames,
    ...email.extractedEntities.venueNames,
  ];
  return {
    haystack: fields.join(' ').toLowerCase(),
    fields,
  };
}

function scoreEmail(email: ParsedEmail, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const { haystack, fields } = getSearchableFields(email);

  // Exact substring match — strong signal
  if (haystack.includes(q)) {
    // Boost for subject/sender match
    if (email.subject.toLowerCase().includes(q)) return 1.0;
    if (email.sender.toLowerCase().includes(q)) return 0.95;
    if (email.senderEmail.toLowerCase().includes(q)) return 0.9;
    return 0.8;
  }

  // Fuzzy match across individual fields
  let bestScore = 0;
  for (const field of fields) {
    const score = fuzzyScore(q, field);
    if (score > bestScore) bestScore = score;
  }

  return bestScore >= FUZZY_THRESHOLD ? bestScore * 0.7 : 0;
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const emails = useEmailsStore(s => s.emails);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Scored + sorted search results
  const results = useMemo<ParsedEmail[]>(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const scored: Array<{ email: ParsedEmail; score: number }> = [];
    for (const email of emails) {
      const score = scoreEmail(email, q);
      if (score > 0) {
        scored.push({ email, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score || b.email.date - a.email.date)
      .slice(0, 100)
      .map(s => s.email);
  }, [emails, debouncedQuery]);

  // Save to recent searches on submit
  const commitSearch = useCallback((q?: string) => {
    const term = (q ?? query).trim();
    if (term.length >= 2) {
      addRecentSearch(term);
      setRecentSearches(getRecentSearches());
    }
  }, [query]);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Category suggestions based on available emails
  const suggestions = useMemo(() => {
    const groups = new Set<string>();
    const senders = new Map<string, number>();
    for (const e of emails) {
      if (e.categoryGroup) groups.add(e.categoryGroup);
      senders.set(e.sender, (senders.get(e.sender) ?? 0) + 1);
    }
    const topSenders = [...senders.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      groups: [...groups],
      senders: topSenders,
    };
  }, [emails]);

  return {
    query,
    setQuery,
    results,
    hasQuery: query.trim().length > 0,
    recentSearches,
    commitSearch,
    clearRecent,
    suggestions,
  };
}
