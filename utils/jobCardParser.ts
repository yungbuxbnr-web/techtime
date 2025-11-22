
/**
 * Job Card Parser
 * 
 * Parses OCR text from Marshall job cards to extract:
 * - WIP No → jobNumber
 * - Reg No → regNumber
 * 
 * Designed to handle noisy OCR output with robust regex patterns.
 */

export type ParsedJobCard = {
  jobNumber: string | null;
  regNumber: string | null;
};

/**
 * Main parser function
 * 
 * @param ocrText - Full OCR text from job card image
 * @returns Parsed job card data with jobNumber and regNumber
 */
export function parseJobCardText(ocrText: string): ParsedJobCard {
  console.log('[JobCardParser] Parsing OCR text, length:', ocrText.length);
  
  const jobNumber = parseJobNumber(ocrText);
  const regNumber = parseRegNumber(ocrText);
  
  console.log('[JobCardParser] Results:', { jobNumber, regNumber });
  
  return { jobNumber, regNumber };
}

/**
 * Extract WIP No → jobNumber
 * 
 * Pattern: WIP\s*No\.?\s*[:#-]?\s*([0-9]{3,})
 * 
 * Matches:
 * - "WIP No 20705"
 * - "WIP NO: 20705"
 * - "WIP No. 20705"
 * - "WIPNo20705"
 * 
 * Robust to:
 * - Case variations (WIP, wip, Wip)
 * - Extra spaces
 * - Various separators (., :, -, or none)
 * - OCR noise around the number
 */
function parseJobNumber(ocrText: string): string | null {
  // Pattern explanation:
  // WIP\s*No\.? - Matches "WIP No" or "WIP NO" with optional period
  // \s*[:#-]?\s* - Optional separator (colon, hash, dash) with spaces
  // ([0-9]{3,}) - Capture 3+ digits (the actual WIP number)
  const WIP_PATTERN = /WIP\s*No\.?\s*[:#-]?\s*([0-9]{3,})/i;
  
  const match = ocrText.match(WIP_PATTERN);
  
  if (match && match[1]) {
    const jobNumber = match[1].trim();
    console.log('[JobCardParser] Found WIP No:', jobNumber);
    return jobNumber;
  }
  
  console.log('[JobCardParser] No WIP No found');
  return null;
}

/**
 * Extract Reg No → regNumber
 * 
 * Two-stage approach:
 * 1. Try labeled pattern (near "Reg" text)
 * 2. Fallback to UK registration pattern
 * 
 * Labeled pattern: Reg(?:istration)?\s*No\.?\s*[:#-]?\s*([A-Z0-9 ]{4,10})
 * 
 * Matches:
 * - "Reg No HG19OVM"
 * - "Registration No. HG19 OVM"
 * - "Reg. No: HG19OVM"
 * 
 * Fallback pattern: [A-Z]{2}[0-9]{2}\s?[A-Z]{3}
 * 
 * Matches UK format:
 * - "HG19OVM"
 * - "HG19 OVM"
 * 
 * Robust to:
 * - Case variations
 * - Extra spaces
 * - Various separators
 * - OCR misreads (0/O, 1/I confusion handled by normalization)
 */
function parseRegNumber(ocrText: string): string | null {
  // First, try labeled pattern
  const labeled = parseLabeledRegNumber(ocrText);
  if (labeled) {
    return labeled;
  }
  
  // Fallback to UK registration pattern
  const fallback = parseFallbackRegNumber(ocrText);
  if (fallback) {
    return fallback;
  }
  
  console.log('[JobCardParser] No registration found');
  return null;
}

/**
 * Parse registration using labeled pattern
 * 
 * Looks for "Reg" or "Registration" followed by "No" and the registration
 */
function parseLabeledRegNumber(ocrText: string): string | null {
  // Pattern explanation:
  // Reg(?:istration)? - Matches "Reg" or "Registration"
  // \s*No\.? - Matches "No" or "No." with optional spaces
  // \s*[:#-]?\s* - Optional separator with spaces
  // ([A-Z0-9 ]{4,10}) - Capture 4-10 alphanumeric chars (the registration)
  const REG_PATTERN = /Reg(?:istration)?\s*No\.?\s*[:#-]?\s*([A-Z0-9 ]{4,10})/i;
  
  const match = ocrText.match(REG_PATTERN);
  
  if (match && match[1]) {
    const regNumber = normalizeRegNumber(match[1]);
    console.log('[JobCardParser] Found labeled Reg No:', regNumber);
    return regNumber;
  }
  
  return null;
}

/**
 * Parse registration using UK format pattern
 * 
 * Fallback when no labeled pattern is found
 * Matches modern UK format: XX00 XXX
 */
function parseFallbackRegNumber(ocrText: string): string | null {
  // Pattern explanation:
  // [A-Z]{2} - Two letters (area code)
  // [0-9]{2} - Two digits (age identifier)
  // \s? - Optional space
  // [A-Z]{3} - Three letters (random)
  const FALLBACK_REG_PATTERN = /\b([A-Z]{2}[0-9]{2}\s?[A-Z]{3})\b/i;
  
  const match = ocrText.match(FALLBACK_REG_PATTERN);
  
  if (match && match[1]) {
    const regNumber = normalizeRegNumber(match[1]);
    console.log('[JobCardParser] Found fallback Reg No:', regNumber);
    return regNumber;
  }
  
  return null;
}

/**
 * Normalize registration number
 * 
 * - Uppercase
 * - Collapse multiple spaces to single space
 * - Trim leading/trailing spaces
 * - Format as XX00 XXX (with space)
 */
function normalizeRegNumber(regNumber: string): string {
  // Uppercase
  let normalized = regNumber.toUpperCase();
  
  // Remove all spaces first
  normalized = normalized.replace(/\s+/g, '');
  
  // Trim
  normalized = normalized.trim();
  
  // Format as XX00 XXX if it matches UK format
  const ukMatch = normalized.match(/^([A-Z]{2})([0-9]{2})([A-Z]{3})$/);
  if (ukMatch) {
    normalized = `${ukMatch[1]}${ukMatch[2]} ${ukMatch[3]}`;
  }
  
  return normalized;
}

/**
 * Test the parser with sample text
 * 
 * For debugging and validation
 */
export function testParser() {
  const sampleText = `
    Marshall Salisbury BMW Service
    Authorised Workshop
    JOB CARD
    WIP No. 20705
    Job No. 127162
    Reg. No: HG19OVM
    Date: 31/03/2019
  `;
  
  const result = parseJobCardText(sampleText);
  console.log('[JobCardParser] Test result:', result);
  
  return result;
}
