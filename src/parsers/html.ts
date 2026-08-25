/**
 * HTML → plain-text stripping utilities.
 * No external DOM library required — uses pure regex/string ops
 * that are safe in a JS-only React Native environment.
 */

/** Decode common HTML entities */
function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/gi, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

/**
 * Convert HTML to plain text, preserving meaningful whitespace.
 * Strips scripts, styles, and all tags. Converts block-level
 * elements to line breaks.
 */
export function htmlToText(html: string): string {
  if (!html || !html.trim()) return '';

  let text = html;

  // Remove <script> and <style> blocks entirely
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Convert common block elements to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/?(p|div|section|article|header|footer|h[1-6]|li|tr)[^>]*>/gi, '\n');
  text = text.replace(/<\/?(table|thead|tbody|tfoot)[^>]*>/gi, '\n');
  text = text.replace(/<hr[^>]*>/gi, '\n---\n');

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeEntities(text);

  // Normalise whitespace: collapse runs of spaces/tabs
  text = text.replace(/[ \t]+/g, ' ');

  // Collapse more than 2 consecutive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim each line
  text = text
    .split('\n')
    .map(l => l.trim())
    .join('\n');

  return text.trim();
}

/** Extract all href values from anchor tags */
export function extractLinks(html: string): string[] {
  const links: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1].trim();
    if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
      links.push(href);
    }
  }
  return [...new Set(links)];
}
