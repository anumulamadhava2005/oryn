/**
 * Shared Lost & Found helpers, formatters, metadata parsers, and sharing utilities.
 */

import { Colors } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferences';
import type { LostItem } from '@/services/lostFoundApi';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// ─── Campus Data ──────────────────────────────────────────────────

export const CUSTODY_LOCATIONS = [
  'With Me',
  'Main Gate Security Desk',
  'Hostel Warden Office',
  'Library Front Counter',
  'Department Office',
  'Campus Reception',
  'Other',
];

// ─── Category Icon Maps ───────────────────────────────────────────

export const CATEGORY_ICONS_VIBRANT: Record<string, { icon: string; color: string; bg: string }> = {
  Electronics: { icon: 'laptop-outline',        color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Documents:   { icon: 'document-text-outline', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.14)' },
  Clothing:    { icon: 'shirt-outline',         color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.14)' },
  Keys:        { icon: 'key-outline',           color: '#30B0C7', bg: 'rgba(48, 176, 199, 0.14)' },
  Wallet:      { icon: 'wallet-outline',        color: '#34C759', bg: 'rgba(52, 199, 89, 0.14)' },
  Bag:         { icon: 'bag-outline',           color: '#5856D6', bg: 'rgba(88, 86, 214, 0.14)' },
  Bottle:      { icon: 'water-outline',         color: '#32ADE6', bg: 'rgba(50, 173, 230, 0.14)' },
  Other:       { icon: 'help-circle-outline',   color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.14)' },
  All:         { icon: 'grid-outline',          color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
};

export const CATEGORY_ICONS_MONO: Record<string, { icon: string; color: string; bg: string }> = {
  Electronics: { icon: 'laptop-outline',        color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Documents:   { icon: 'document-text-outline', color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Clothing:    { icon: 'shirt-outline',         color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Keys:        { icon: 'key-outline',           color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Wallet:      { icon: 'wallet-outline',        color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Bag:         { icon: 'bag-outline',           color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Bottle:      { icon: 'water-outline',         color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
  Other:       { icon: 'help-circle-outline',   color: '#AEAEB2', bg: 'rgba(174, 174, 178, 0.14)' },
  All:         { icon: 'grid-outline',          color: '#EFEFEF', bg: 'rgba(239, 239, 239, 0.14)' },
};

export function getCategoryMeta(category: string, mode?: 'vibrant' | 'monochrome') {
  const currentMode = mode ?? usePreferencesStore.getState().themeMode;
  const map = currentMode === 'monochrome' ? CATEGORY_ICONS_MONO : CATEGORY_ICONS_VIBRANT;
  return map[category] ?? map.Other;
}

// ─── Formatting Helpers ───────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (isNaN(s) || s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Strips raw backend metadata bracket tags while PRESERVING the full text description from the email.
 * Cleans up markdown formatting asterisks (e.g. **bold** -> bold) so raw asterisks are never shown.
 */
export function cleanItemDescription(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Strip internal bracket tags
  text = text
    .replace(/\[(?:Lost|Found|Reported)\s+on:[^\]]+\]/gi, '')
    .replace(/\[URGENT\]/gi, '')
    .replace(/\[REWARD:[^\]]+\]/gi, '')
    .replace(/\[CUSTODY:[^\]]+\]/gi, '')
    .replace(/\[QUESTION:[^\]]+\]/gi, '');

  // 2. Strip forwarded message header dividers (if present at start)
  text = text.replace(
    /^[-]{2,}\s*Forwarded\s+message\s*[-]{2,}[\r\n]+(?:From:[^\r\n]*[\r\n]+)?(?:Date:[^\r\n]*[\r\n]+)?(?:Subject:[^\r\n]*[\r\n]+)?(?:To:[^\r\n]*[\r\n]+)?/gi,
    ''
  );

  // 3. Clean markdown bold/italic asterisks so they don't appear as literal `**`
  text = text.replace(/\*{2,}([^*]+)\*{2,}/g, '$1');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1$2$3');

  // 4. Strip leftover lone asterisks or divider lines consisting only of asterisks/dashes
  text = text.replace(/^\s*[\*\-_=]{2,}\s*$/gm, '');
  text = text.replace(/\*{2,}/g, '');

  // 5. Normalise spaces while preserving paragraph newlines
  text = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

export function parseMetadata(description: string) {
  const isUrgent = description.includes('[URGENT]');
  const rewardMatch = description.match(/\[REWARD:\s*([^\]]+)\]/);
  const custodyMatch = description.match(/\[CUSTODY:\s*([^\]]+)\]/);
  const questionMatch = description.match(/\[QUESTION:\s*([^\]]+)\]/);
  const cleanDescription = cleanItemDescription(description);

  return {
    isUrgent,
    reward: rewardMatch ? rewardMatch[1].trim() : null,
    custody: custodyMatch ? custodyMatch[1].trim() : null,
    secretQuestion: questionMatch ? questionMatch[1].trim() : null,
    cleanDescription,
  };
}

export function getHumanizedSubtitle(item: LostItem): string {
  let loc = [item.building, item.location_found].filter(Boolean).join(' · ').trim();

  // If no location or generic 'Campus', extract known landmarks from title/desc
  if (!loc || loc.toLowerCase() === 'campus') {
    const combined = `${item.title} ${item.description}`.toLowerCase();
    const spots = [
      { name: 'Badminton Court', pattern: /\bbadminton\s*court\b/i },
      { name: 'Basketball Court', pattern: /\bbasketball\s*court\b/i },
      { name: 'Jasmine Hostel', pattern: /\bjasmine\s*hostel\b/i },
      { name: 'Ashoka Hostel', pattern: /\bashoka(?:\s*hostel|\s*\d+th\s*floor)?\b/i },
      { name: 'Shakti Mess', pattern: /\bshakti\s*mess\b/i },
      { name: 'Arjuna Sports Complex', pattern: /\barjuna\s*(?:sports)?\b/i },
      { name: 'Library', pattern: /\blibrary\b/i },
      { name: 'Ultimate Dining', pattern: /\bultimate\b/i },
      { name: 'Main Gate Security', pattern: /\b(?:main\s*gate|security)\b/i },
      { name: 'Academic Block', pattern: /\bacademic\s*block\b/i },
    ];
    for (const spot of spots) {
      if (spot.pattern.test(combined)) {
        loc = spot.name;
        break;
      }
    }
  }

  const relTime = timeAgo(item.created_at);

  if (loc && loc.toLowerCase() !== 'campus') {
    return `${item.status === 'found' ? 'Found near' : 'Lost near'} ${loc} · ${relTime}`;
  }
  return `${item.status === 'found' ? 'Found' : 'Reported'} · ${relTime}`;
}

export const AVATAR_PALETTE = [
  '#007AFF', // iOS Blue
  '#34C759', // iOS Green
  '#5856D6', // iOS Indigo
  '#AF52DE', // iOS Purple
  '#FF9500', // iOS Orange
  '#30B0C7', // iOS Teal
  '#FF2D55', // iOS Pink
  '#32ADE6', // iOS Cyan
  '#00C7BE', // iOS Mint
  '#6366F1', // Indigo Accent
];

export function getDeterministicAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function parsePosterDetails(item: LostItem) {
  let rawName = item.poster_name?.trim() || '';
  let rollNumber: string | null = null;

  // Extract roll number if present in name, e.g. "PHOOLWALE MUHAMMAD AFEEF (EC25B1073)"
  const rollInName = rawName.match(/\(([A-Z0-9]{8,12})\)/i);
  if (rollInName) {
    rollNumber = rollInName[1].toUpperCase();
    rawName = rawName.replace(/\([A-Z0-9]{8,12}\)/i, '').trim();
  }

  // If no name, check email
  if (!rawName && item.poster_email) {
    const rollInEmail = item.poster_email.match(/^([a-z0-9]{8,12})@/i);
    if (rollInEmail) {
      rollNumber = rollInEmail[1].toUpperCase();
      rawName = `Student (${rollNumber})`;
    }
  }

  if (!rawName || rawName.toLowerCase() === 'campus student') {
    rawName = rollNumber ? `Student (${rollNumber})` : 'Campus Member';
  }

  // Format name into Title Case
  const formattedName = rawName
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  // 2-letter initials
  const parts = formattedName.split(' ').filter(Boolean);
  let initials = 'U';
  if (parts.length >= 2) {
    initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  const colorSeed = item.poster_id || item.poster_email || rawName;
  const avatarColor = getDeterministicAvatarColor(colorSeed);

  return {
    displayName: formattedName,
    rollNumber,
    initials,
    avatarColor,
  };
}

export async function shareLostFoundItem(item: LostItem): Promise<void> {
  const isFound = item.status === 'found';
  const { cleanDescription } = parseMetadata(item.description);
  const locationInfo = item.building
    ? `📍 Location: ${item.building}${item.location_found ? ` · ${item.location_found}` : ''}\n`
    : item.location_found ? `📍 Location: ${item.location_found}\n` : '';
  const dateInfo = item.created_at ? `📅 Date: ${formatDateTime(item.created_at)}\n` : '';
  const categoryInfo = item.category ? `📂 Category: ${item.category}\n` : '';
  const shareTitle = `[${isFound ? 'FOUND' : 'LOST'} on Campus] ${item.title}`;
  const shareMessage = `${shareTitle}\n${categoryInfo}${locationInfo}${dateInfo}\n${cleanDescription}\n\nPosted on Oryn Campus Lost & Found by ${item.poster_name || 'student'}${item.image_url ? `\n🖼️ Photo: ${item.image_url}` : ''}`;

  if (item.image_url) {
    try {
      let localUri: string | null = null;
      const safeId = String(item.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cacheDir = FileSystem.cacheDirectory || '';
      if (item.image_url.startsWith('file://')) {
        localUri = item.image_url;
      } else if (item.image_url.startsWith('data:')) {
        const match = item.image_url.match(/^data:([^;]+);base64,(.+)$/);
        const mime = match ? match[1] : 'image/jpeg';
        const b64 = match ? match[2] : item.image_url.split(',')[1] ?? item.image_url;
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const uri = `${cacheDir}share_${safeId}.${ext}`;
        await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
        localUri = uri;
      } else if (item.image_url.startsWith('http')) {
        const rawExt = item.image_url.split('?')[0].split('.').pop()?.toLowerCase();
        const ext = rawExt && ['jpg','jpeg','png','webp'].includes(rawExt) ? rawExt : 'jpg';
        const uri = `${cacheDir}share_${safeId}.${ext}`;
        const dl = await FileSystem.downloadAsync(item.image_url, uri);
        localUri = dl.uri;
      }
      if (localUri) {
        const mime = localUri.endsWith('.png') ? 'image/png' : localUri.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        await Sharing.shareAsync(localUri, {
          mimeType: mime,
          dialogTitle: shareTitle,
          UTI: mime,
        });
        return;
      }
    } catch {
      // fallback to plain text sharing
    }
  }

  // Fallback: share plain text via expo-sharing
  try {
    const textFileUri = `${FileSystem.cacheDirectory || ''}lost_found_${item.id || 'post'}.txt`;
    await FileSystem.writeAsStringAsync(textFileUri, shareMessage, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(textFileUri, {
      mimeType: 'text/plain',
      dialogTitle: shareTitle,
      UTI: 'public.plain-text',
    });
  } catch {
    // Sharing cancelled or not available
  }
}
