// Test Event Extraction from Email Text

function parseAddress(raw) {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim() };
  }
  if (raw.includes('@')) return { name: raw.trim(), email: raw.trim() };
  return { name: raw.trim(), email: '' };
}

const KNOWN_CLUBS = {
  'csg@iiitdm.ac.in': { name: 'Computer Science Guild (CSG)', category: 'Technical' },
  'gdsc@iiitdm.ac.in': { name: 'GDG on Campus IIITDM', category: 'Technical' },
  'gdg@iiitdm.ac.in': { name: 'GDG on Campus IIITDM', category: 'Technical' },
  'robotics@iiitdm.ac.in': { name: 'Robotics Club', category: 'Technical' },
  'auv@iiitdm.ac.in': { name: 'AUV Society', category: 'Technical' },
  'edc@iiitdm.ac.in': { name: 'Entrepreneurship Development Cell (EDC)', category: 'Technical' },
  'ecell@iiitdm.ac.in': { name: 'Entrepreneurship Development Cell (EDC)', category: 'Technical' },
  'zerog@iiitdm.ac.in': { name: 'ZeroG Design Club', category: 'Design' },
  'design@iiitdm.ac.in': { name: 'ZeroG Design Club', category: 'Design' },
  'sports@iiitdm.ac.in': { name: 'Sports Affairs Council', category: 'Sports' },
  'cultural@iiitdm.ac.in': { name: 'Cultural Affairs Council', category: 'Cultural' },
  'literary@iiitdm.ac.in': { name: 'Literary & Debating Club', category: 'Cultural' },
  'music@iiitdm.ac.in': { name: 'Music Club', category: 'Cultural' },
  'dance@iiitdm.ac.in': { name: 'Dance Club', category: 'Cultural' },
  'dramatics@iiitdm.ac.in': { name: 'Dramatics Club', category: 'Cultural' },
  'shunya@iiitdm.ac.in': { name: 'Shunya Math Club', category: 'Technical' },
  'rotaract@iiitdm.ac.in': { name: 'Rotaract Club', category: 'Cultural' },
  'nss@iiitdm.ac.in': { name: 'National Service Scheme (NSS)', category: 'Cultural' },
  'vashisht@iiitdm.ac.in': { name: 'Vashisht Tech Fest', category: 'Technical' },
  'samgatha@iiitdm.ac.in': { name: 'Samgatha Cultural Fest', category: 'Cultural' },
};

function extractClubInfo(fromHeader, subject, body) {
  const { name: senderName, email: senderEmail } = parseAddress(fromHeader || '');
  const lowerEmail = senderEmail.toLowerCase();

  let clubName = '';
  let category = 'Technical';

  if (KNOWN_CLUBS[lowerEmail]) {
    clubName = KNOWN_CLUBS[lowerEmail].name;
    category = KNOWN_CLUBS[lowerEmail].category;
  }

  // Check subject prefix e.g. [CSG], [GDSC], [Robotics]
  const prefixMatch = subject.match(/^\[([A-Za-z0-9\s-_]{2,15})\]/i);
  if (prefixMatch && !clubName) {
    const code = prefixMatch[1].trim().toUpperCase();
    for (const [em, info] of Object.entries(KNOWN_CLUBS)) {
      if (info.name.toUpperCase().includes(code) || em.toUpperCase().startsWith(code.toLowerCase())) {
        clubName = info.name;
        category = info.category;
        break;
      }
    }
    if (!clubName) {
      clubName = `${code} Club`;
    }
  }

  // Check body signature e.g. "Regards, Team CSG"
  if (!clubName) {
    const sigMatch = body.match(/(?:Regards|Warm\s+Regards|Cheers|Team|Organized\s+by)[\s,:\-]+([A-Za-z0-9\s]{3,35}(?:Club|Guild|Society|Cell|Council|Team|Fest|Chapter))/i);
    if (sigMatch) {
      clubName = sigMatch[1].trim();
    }
  }

  // Fallback to sender display name
  if (!clubName && senderName && !senderName.includes('@') && !senderName.match(/^[A-Z]{2}\d{2}/)) {
    clubName = senderName.replace(/IIITDM\s*(?:Kancheepuram)?/gi, '').trim();
    if (clubName) clubName += ' IIITDM';
  }

  if (!clubName && lowerEmail.includes('iiitdm.ac.in')) {
    const prefix = lowerEmail.split('@')[0];
    if (!prefix.match(/^[a-z]{2}\d{2}/)) {
      clubName = prefix.charAt(0).toUpperCase() + prefix.slice(1) + ' Club';
    }
  }

  return {
    name: clubName || 'Campus Club',
    email: senderEmail || 'club@iiitdm.ac.in',
    category,
    description: `Official campus organization for ${clubName || 'students'} at IIITDM Kancheepuram`,
  };
}

function extractPerks(text) {
  const perks = [];
  if (/\b(?:certificates?|e-cert(?:ificate)?s?|participation\s+cert(?:ificate)?s?)\b/i.test(text)) {
    perks.push('Certificates');
  }
  if (/\b(?:refreshments?|snacks?|food|lunch|dinner|high\s+tea|pizza|drinks|beverages)\b/i.test(text)) {
    perks.push('Refreshments');
  }
  if (/\b(?:on[-\s]duty|\bod\b|duty\s+leave|attendance\s+(?:will\s+be\s+)?provided)\b/i.test(text)) {
    perks.push('OD Available');
  }
  if (/\b(?:cash\s*prizes?|prizes?\s*worth|exciting\s*prizes|swags?|goodies|t[-\s]*shirts?|merchandise|troph(?:y|ies)|medals?)\b/i.test(text)) {
    perks.push('Prizes');
  }
  if (/\b(?:free\s*(?:entry|registration)|no\s*entry\s*fee|entry\s*fee\s*:\s*nil)\b/i.test(text)) {
    perks.push('Free Entry');
  }
  if (/\b(?:hands[-\s]*on|take[-\s]*home\s*kit|hardware\s*kit|components?\s*provided)\b/i.test(text)) {
    perks.push('Hands-on Kit');
  }
  return perks;
}

function extractVenue(text) {
  const venueFieldMatch = text.match(/(?:Venue|Location|Where|Place|Room)\s*[:\-–]\s*([^\n\r,]+)/i);
  if (venueFieldMatch) {
    return venueFieldMatch[1].trim();
  }
  const lhcMatch = text.match(/\b(LHC\s*[- ]?\s*\d{3})\b/i);
  if (lhcMatch) return lhcMatch[1].toUpperCase().replace(/\s+/, ' ');

  const hallMatch = text.match(/\b(Hall\s*(?:0[1-9]|[1-4][0-9])|H\s*[- ]?\s*(?:0[1-9]|[1-4][0-9]))\b/i);
  if (hallMatch) return hallMatch[1].toUpperCase();

  const semHallMatch = text.match(/\b(Seminar\s*Hall(?:\s*[12]|Annex)?)\b/i);
  if (semHallMatch) return semHallMatch[1];

  const audMatch = text.match(/\b(Main\s*Auditorium|Auditorium)\b/i);
  if (audMatch) return audMatch[1];

  const oatMatch = text.match(/\b(Open\s*Air\s*Theat(?:er|re)|OAT)\b/i);
  if (oatMatch) return 'Open Air Theatre (OAT)';

  const sacMatch = text.match(/\b(Student\s*Activity\s*Cent(?:er|re)|SAC)\b/i);
  if (sacMatch) return 'Student Activity Centre (SAC)';

  const sportsMatch = text.match(/\b(Sports\s*Complex|Football\s*Ground|Cricket\s*Ground|Badminton\s*Court|Basketball\s*Court)\b/i);
  if (sportsMatch) return sportsMatch[1];

  const onlineMatch = text.match(/\b(Google\s*Meet|Zoom|Microsoft\s*Teams|Online)\b/i);
  if (onlineMatch) return onlineMatch[1];

  return 'IIITDM Campus';
}

function extractRegistrationUrl(text) {
  const match = text.match(/(https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|unstop\.com|lu\.ma|devfolio\.co)[^\s<>"'\)]+)/i);
  return match ? match[1] : null;
}

// Test sample email
const sampleSubject = "[CSG] Workshop on Generative AI & Antigravity - Register Now!";
const sampleBody = `
Dear Students,

Computer Science Guild (CSG) is excited to announce a hands-on workshop on Generative AI & Autonomous Agents.

Date: 25th September 2026
Timings: 5:00 PM to 7:30 PM
Venue: LHC-101 (Lecture Hall Complex)

Perks:
- Certificates of participation for all attendees
- Refreshments and high tea will be served
- OD (On-Duty) attendance will be provided for all years
- Exciting cash prizes worth Rs. 10,000 for top project submissions!

Registration Link: https://forms.gle/sampleGenAI2026
Last Date to Register: 24th September 2026, 11:59 PM.

Regards,
Team CSG - Computer Science Guild
IIITDM Kancheepuram
`;

const club = extractClubInfo('"CSG IIITDM" <csg@iiitdm.ac.in>', sampleSubject, sampleBody);
const perks = extractPerks(sampleBody);
const venue = extractVenue(sampleBody);
const regUrl = extractRegistrationUrl(sampleBody);

console.log("Extracted Club:", club);
console.log("Extracted Perks:", perks);
console.log("Extracted Venue:", venue);
console.log("Extracted Registration URL:", regUrl);
