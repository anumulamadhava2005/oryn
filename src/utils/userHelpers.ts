/**
 * User profile & greeting helpers.
 * Intelligently resolves human given names, filtering out institutional roll numbers
 * (e.g. 'CS23B1008') common in campus Google Workspace accounts.
 */

import type { GoogleUser } from '@/types/auth';

const ROLL_NUMBER_REGEX = /^[A-Za-z]{2,4}\d{2}[A-Za-z]\d{3,4}$/;

function titleCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Extracts a warm, personal first name for greetings (e.g. "Madhava" instead of "CS23B1008").
 */
export function getPersonalizedGreetingName(user: GoogleUser | null | undefined): string {
  if (!user) return 'there';

  // 1. If givenName is present and NOT a roll number, use it
  if (user.givenName && !ROLL_NUMBER_REGEX.test(user.givenName.trim())) {
    const clean = user.givenName.trim().split(/\s+/)[0];
    if (clean && !ROLL_NUMBER_REGEX.test(clean)) {
      return titleCase(clean);
    }
  }

  // 2. Scan full user.name for human tokens (skipping roll numbers)
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    const humanParts = parts.filter(
      (part) => !ROLL_NUMBER_REGEX.test(part) && /^[A-Za-z]+$/.test(part)
    );

    if (humanParts.length > 0) {
      // Pick the first human part (or check familyName if available)
      return titleCase(humanParts[0]);
    }
  }

  // 3. Check familyName
  if (user.familyName && !ROLL_NUMBER_REGEX.test(user.familyName.trim())) {
    const clean = user.familyName.trim().split(/\s+/)[0];
    if (clean && !ROLL_NUMBER_REGEX.test(clean)) {
      return titleCase(clean);
    }
  }

  // 4. Fallback: inspect email handle if not a raw roll number
  if (user.email) {
    const handle = user.email.split('@')[0];
    if (!ROLL_NUMBER_REGEX.test(handle)) {
      const nameFromEmail = handle.replace(/[._\d]+/g, ' ').trim().split(/\s+/)[0];
      if (nameFromEmail && nameFromEmail.length > 1) {
        return titleCase(nameFromEmail);
      }
    }
  }

  return 'there';
}
