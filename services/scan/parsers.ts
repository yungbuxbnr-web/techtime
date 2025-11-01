
// UK Vehicle Registration Mark (VRM) patterns and parsers

export interface ParseResult {
  value: string;
  confidence: number;
  sourceLine: string;
  pattern?: string;
}

// Modern UK plate pattern: AB12 CDE (2 letters, 2 digits, 3 letters)
const MODERN_VRM_PATTERN = /\b([A-Z]{2})(\d{2})\s?([A-Z]{3})\b/gi;

// Legacy UK plate patterns:
// - ABC 123D (3 letters, space, 3 digits, optional letter)
// - A123 BCD (1 letter, 3 digits, space, 3 letters)
// - AB12 CDE (already covered by modern)
const LEGACY_VRM_PATTERNS = [
  /\b(?!OI|IO)([A-Z]{1,3})\s?(\d{1,3})\s?([A-Z]{1,3})\b/gi,
];

// WIP number pattern: WIP No: 12345 or WIP: 12345 or WIP 12345
const WIP_PATTERN = /\b(?:WIP\s*(?:No\.?|#|:)?\s*)([A-Z0-9\-]{3,})\b/gi;

// Job number pattern: Job No: 12345 or Job: 12345 or Job 12345
const JOB_PATTERN = /\b(?:Job\s*(?:No\.?|#|:)\s*)([A-Z0-9\-]{3,})\b/gi;

// Normalize VRM: remove spaces, convert to uppercase, handle ambiguous characters
export function normalizeVRM(vrm: string): string {
  let normalized = vrm.toUpperCase().replace(/\s+/g, '');
  
  // Handle common OCR mistakes in VRM context
  // In UK plates, certain positions should only have letters or digits
  // Modern format: LL DD LLL (L=letter, D=digit)
  
  const modernMatch = normalized.match(/^([A-Z]{2})(\d{2})([A-Z]{3})$/);
  if (modernMatch) {
    // Modern plate - apply position-based corrections
    let [, letters1, digits, letters2] = modernMatch;
    
    // In digit positions, convert O to 0, I to 1
    digits = digits.replace(/O/g, '0').replace(/I/g, '1');
    
    // In letter positions, convert 0 to O, 1 to I (less common)
    letters1 = letters1.replace(/0/g, 'O').replace(/1/g, 'I');
    letters2 = letters2.replace(/0/g, 'O').replace(/1/g, 'I');
    
    normalized = letters1 + digits + letters2;
  }
  
  return normalized;
}

// Format VRM for display: AB12 CDE
export function formatVRM(vrm: string): string {
  const normalized = normalizeVRM(vrm);
  
  // Modern format: AB12 CDE
  const modernMatch = normalized.match(/^([A-Z]{2})(\d{2})([A-Z]{3})$/);
  if (modernMatch) {
    return `${modernMatch[1]}${modernMatch[2]} ${modernMatch[3]}`;
  }
  
  // Legacy formats - just return normalized
  return normalized;
}

// Calculate confidence based on pattern match and context
function calculateConfidence(
  match: RegExpMatchArray,
  pattern: string,
  sourceLine: string
): number {
  let confidence = 0.7; // Base confidence
  
  // Boost confidence if preceded by registration-related keywords
  const lowerLine = sourceLine.toLowerCase();
  if (
    lowerLine.includes('reg') ||
    lowerLine.includes('registration') ||
    lowerLine.includes('vehicle') ||
    lowerLine.includes('chassis')
  ) {
    confidence += 0.2;
  }
  
  // Boost confidence for modern plate format
  if (pattern === 'modern') {
    confidence += 0.1;
  }
  
  // Cap at 0.95 (never 100% certain with OCR)
  return Math.min(confidence, 0.95);
}

// Extract registration numbers from text
export function extractReg(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const lines = text.split('\n');
  const seenValues = new Set<string>();
  
  console.log('[Parser] Extracting registration from', lines.length, 'lines');
  
  // Try modern pattern first
  lines.forEach((line, lineIndex) => {
    const matches = Array.from(line.matchAll(MODERN_VRM_PATTERN));
    matches.forEach(match => {
      const raw = match[0];
      const normalized = normalizeVRM(raw);
      
      if (!seenValues.has(normalized)) {
        seenValues.add(normalized);
        const confidence = calculateConfidence(match, 'modern', line);
        
        results.push({
          value: formatVRM(normalized),
          confidence,
          sourceLine: line.trim(),
          pattern: 'modern',
        });
        
        console.log('[Parser] Found modern VRM:', normalized, 'confidence:', confidence.toFixed(2));
      }
    });
  });
  
  // Try legacy patterns if no modern plates found
  if (results.length === 0) {
    LEGACY_VRM_PATTERNS.forEach(pattern => {
      lines.forEach(line => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          const raw = match[0];
          const normalized = normalizeVRM(raw);
          
          // Filter out obvious non-plates (too short, all digits, etc.)
          if (normalized.length < 3 || /^\d+$/.test(normalized)) {
            return;
          }
          
          if (!seenValues.has(normalized)) {
            seenValues.add(normalized);
            const confidence = calculateConfidence(match, 'legacy', line);
            
            results.push({
              value: formatVRM(normalized),
              confidence,
              sourceLine: line.trim(),
              pattern: 'legacy',
            });
            
            console.log('[Parser] Found legacy VRM:', normalized, 'confidence:', confidence.toFixed(2));
          }
        });
      });
    });
  }
  
  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[Parser] Found', results.length, 'registration candidates');
  return results;
}

// Extract WIP numbers from text
export function extractWip(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const lines = text.split('\n');
  const seenValues = new Set<string>();
  
  console.log('[Parser] Extracting WIP from', lines.length, 'lines');
  
  lines.forEach(line => {
    const matches = Array.from(line.matchAll(WIP_PATTERN));
    matches.forEach(match => {
      const value = match[1].trim();
      
      // Filter out obvious non-WIP values
      if (value.length < 3 || value.length > 10) {
        return;
      }
      
      if (!seenValues.has(value)) {
        seenValues.add(value);
        
        // Higher confidence if line contains "WIP"
        const confidence = line.toLowerCase().includes('wip') ? 0.9 : 0.7;
        
        results.push({
          value,
          confidence,
          sourceLine: line.trim(),
          pattern: 'wip',
        });
        
        console.log('[Parser] Found WIP:', value, 'confidence:', confidence.toFixed(2));
      }
    });
  });
  
  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[Parser] Found', results.length, 'WIP candidates');
  return results;
}

// Extract job numbers from text
export function extractJob(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const lines = text.split('\n');
  const seenValues = new Set<string>();
  
  console.log('[Parser] Extracting Job No from', lines.length, 'lines');
  
  lines.forEach(line => {
    const matches = Array.from(line.matchAll(JOB_PATTERN));
    matches.forEach(match => {
      const value = match[1].trim();
      
      // Filter out obvious non-job values
      if (value.length < 3 || value.length > 10) {
        return;
      }
      
      if (!seenValues.has(value)) {
        seenValues.add(value);
        
        // Higher confidence if line contains "Job"
        const confidence = line.toLowerCase().includes('job') ? 0.9 : 0.7;
        
        results.push({
          value,
          confidence,
          sourceLine: line.trim(),
          pattern: 'job',
        });
        
        console.log('[Parser] Found Job No:', value, 'confidence:', confidence.toFixed(2));
      }
    });
  });
  
  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[Parser] Found', results.length, 'Job No candidates');
  return results;
}

// De-duplicate near-matches (e.g., "AB12CDE" and "AB12 CDE")
export function deduplicateResults(results: ParseResult[]): ParseResult[] {
  const deduplicated: ParseResult[] = [];
  const normalized = new Set<string>();
  
  results.forEach(result => {
    const key = result.value.replace(/\s+/g, '').toUpperCase();
    if (!normalized.has(key)) {
      normalized.add(key);
      deduplicated.push(result);
    }
  });
  
  return deduplicated;
}
