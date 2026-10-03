const fs = require('fs');
const emails = JSON.parse(fs.readFileSync('/home/resetadmin/projects/mint_vps/data/cached_500_emails.json'));
const tug = emails.find(e => e.id === '1a0b3200df1c7c22');
const body = tug.body;

const clean = body
  .replace(/\[image:\s*[^\]]+\]/gi, ' ')
  .replace(/\b(?:WhatsApp Image|image\d*|\d{5,})\b[^\n\r]*?\.(?:jpeg|jpg|png|webp)/gi, ' ')
  .replace(/[*_~`#]/g, ' ');

console.log('CLEAN SUBSTRING AROUND DATE:');
console.log(clean.slice(clean.indexOf('Date'), clean.indexOf('Date') + 150));

const dateFieldMatch = clean.match(/(?:Competition\s*Date|Event\s*Date|Date|When|Schedule)\s*[:\-–]\s*([^\n\r,]+)/i);
console.log('dateFieldMatch:', dateFieldMatch);

const pat1 = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s*,?\s*(\d{4}))?\b/i;
console.log('pat1 on dateFieldStr:', dateFieldMatch ? dateFieldMatch[1].match(pat1) : null);
