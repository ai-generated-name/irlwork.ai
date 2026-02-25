/**
 * PII detection regex patterns with false-positive mitigation.
 *
 * Each pattern returns an object with:
 *   - regex: the detection pattern
 *   - label: human-readable label for the PII type
 *   - mask: function to partially mask detected value
 *   - falsePositiveCheck: optional function to filter out false positives
 *   - suggestion: what private field to use instead
 */

// Common false-positive contexts for addresses
const ADDRESS_FALSE_POSITIVES = /\b(\d+)\s*(bedroom|br|bath|ba|story|stories|floor|sqft|sq\s*ft|square\s*feet|acre|lot|unit[s]?\b(?!\s*\d)|item|step|hour|minute|piece|pound|lb|kg|inch|foot|feet|meter|cm|mm|gallon|liter|mile|km|year|month|week|day|task|star|review)/i;

// Street suffixes for address detection
const STREET_SUFFIXES = '(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Way|Pl(?:ace)?|Cir(?:cle)?|Hwy|Highway|Pkwy|Parkway|Terr(?:ace)?|Crescent|Alley|Path)';

const PII_PATTERNS = [
  // Street addresses (English format): "123 Main St", "45B Oak Avenue"
  {
    id: 'address_english',
    regex: new RegExp(`\\b(\\d{1,5}[A-Za-z]?)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+${STREET_SUFFIXES}\\b`, 'gi'),
    label: 'street address',
    suggestion: 'Move address to the private_address field',
    mask: (match) => {
      const parts = match.split(' ');
      if (parts.length >= 3) {
        return parts[0] + ' ' + parts[1].substring(0, 3) + '***' + ' ' + parts[parts.length - 1];
      }
      return match.substring(0, 6) + '***';
    },
    falsePositiveCheck: (match, fullText) => {
      // Check if this looks like a measurement/quantity rather than an address
      return !ADDRESS_FALSE_POSITIVES.test(match);
    },
  },

  // Vietnamese-style addresses: "45B Nguyen Hue", "123 Le Loi"
  {
    id: 'address_vietnamese',
    regex: /\b(\d{1,5}[A-Za-z]?)\s+(Nguyen|Le|Tran|Pham|Hoang|Vo|Bui|Dang|Do|Ngo|Ly|Hai\s+Ba\s+Trung|Dong\s+Khoi|Nam\s+Ky\s+Khoi\s+Nghia|Pasteur|Cach\s+Mang)\s+\w+/gi,
    label: 'street address',
    suggestion: 'Move address to the private_address field',
    mask: (match) => {
      const parts = match.split(' ');
      return parts[0] + ' ' + parts[1].substring(0, 3) + '***';
    },
  },

  // Apartment/unit numbers: "Apt 4B", "Unit 12", "Suite 300"
  {
    id: 'unit_number',
    regex: /\b(Apt\.?|Apartment|Unit|Suite|Ste\.?|Room|Rm\.?|#)\s*(\d+[A-Za-z]?)\b/gi,
    label: 'unit/apartment number',
    suggestion: 'Move unit number to the private_address field',
    mask: (match) => {
      const parts = match.split(/\s+/);
      return parts[0] + ' ***';
    },
    falsePositiveCheck: (match) => {
      // "Unit" alone followed by non-address context is fine, but "Unit 4B" is PII
      return true;
    },
  },

  // Phone numbers (requires separators or country prefix — avoids matching zip codes, reference numbers)
  {
    id: 'phone',
    regex: /(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s])?\d{3,4}[-.\s]\d{3,4}\b/g,
    label: 'phone number',
    suggestion: 'Move phone number to the private_contact field',
    mask: (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 7) {
        return digits.substring(0, 3) + '***' + digits.substring(digits.length - 3);
      }
      return '***' + digits.substring(digits.length - 3);
    },
    falsePositiveCheck: (match) => {
      // Must have at least 7 digits to be a phone number
      const digits = match.replace(/\D/g, '');
      return digits.length >= 7;
    },
  },

  // Phone numbers with country prefix (no separators needed): "+84901234567"
  {
    id: 'phone_intl',
    regex: /\+\d{10,15}\b/g,
    label: 'phone number',
    suggestion: 'Move phone number to the private_contact field',
    mask: (match) => {
      return match.substring(0, 4) + '***' + match.substring(match.length - 3);
    },
  },

  // Email addresses
  {
    id: 'email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    label: 'email address',
    suggestion: 'Move email address to the private_contact field',
    mask: (match) => {
      const [local, domain] = match.split('@');
      return local.substring(0, 2) + '***@' + domain;
    },
  },

  // Names with contact context: "contact John Smith", "ask for Maria"
  {
    id: 'contact_name',
    regex: /\b(?:contact|ask\s+for|call|meet|speak\s+(?:to|with)|find|look\s+for|see)\s+(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
    label: 'contact name',
    suggestion: 'Move contact information to the private_contact field',
    mask: (match) => {
      // Find the name part after the verb
      const nameMatch = match.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/i);
      if (nameMatch) {
        return match.replace(nameMatch[1], nameMatch[1].substring(0, 2) + '***');
      }
      return match.substring(0, 10) + '***';
    },
  },

  // Social media handles: @username
  {
    id: 'social_handle',
    regex: /@[a-zA-Z0-9_]{2,30}\b/g,
    label: 'social media handle',
    suggestion: 'Move social media info to the private_contact field',
    mask: (match) => '@' + match.substring(1, 4) + '***',
    falsePositiveCheck: (match) => {
      // Common non-social @ uses
      const nonSocial = ['@gmail', '@yahoo', '@hotmail', '@outlook', '@example', '@test'];
      return !nonSocial.some(ns => match.toLowerCase().startsWith(ns));
    },
  },

  // Social media references: "my instagram is", "find me on facebook"
  {
    id: 'social_reference',
    regex: /\b(?:my|find\s+me\s+on|follow\s+(?:me\s+)?on|add\s+me\s+on|check\s+(?:out\s+)?my)\s+(?:instagram|facebook|twitter|tiktok|snapchat|linkedin|whatsapp|telegram|line|zalo|wechat|viber)\b/gi,
    label: 'social media reference',
    suggestion: 'Move social media info to the private_contact field',
    mask: (match) => match.substring(0, 10) + '***',
  },

  // URLs/links
  {
    id: 'url',
    regex: /https?:\/\/[^\s<>"']+/gi,
    label: 'URL/link',
    suggestion: 'Remove URLs from public fields or move to private_notes',
    mask: (match) => {
      try {
        const url = new URL(match);
        return url.protocol + '//' + url.hostname + '/***';
      } catch {
        return match.substring(0, 15) + '***';
      }
    },
  },

  // www. links without protocol
  {
    id: 'www_url',
    regex: /\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>"']*/gi,
    label: 'URL/link',
    suggestion: 'Remove URLs from public fields or move to private_notes',
    mask: (match) => 'www.' + match.substring(4, 10) + '***',
  },
];

// Public fields that should be scanned for PII
const PUBLIC_FIELDS_TO_SCAN = ['title', 'description', 'location_zone', 'requirements'];

// Private fields where PII is allowed (encrypted at rest)
const PRIVATE_FIELDS = ['private_address', 'private_notes', 'private_contact'];

module.exports = { PII_PATTERNS, PUBLIC_FIELDS_TO_SCAN, PRIVATE_FIELDS };
