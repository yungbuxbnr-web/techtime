
export interface ParseResult {
  value: string;
  confidence: number;
  sourceLine: string;
  pattern?: string;
}

const MODERN_VRM_PATTERN = /\b([A-Z]{2})(\d{2})\s?([A-Z]{3})\b/gi;

const LEGACY_VRM_PATTERNS = [
  /\b(?!OI|IO)([A-Z]{1,3})\s?(\d{1,3})\s?([A-Z]{1,3})\b/gi,
];

// Updated WIP pattern to match Marshall job cards
// Matches: "WIP No. 20705", "WIP NO: 88921", "WIPNo20705"
const WIP_PATTERN = /\b(?:WIP\s*(?:No\.?|#|:)?\s*)([0-9]{3,})\b/gi;

const JOB_PATTERN = /\b(?:Job\s*(?:No\.?|#|:)\s*)([A-Z0-9-]{3,})\b/gi;

export function normalizeVRM(vrm: string): string {
  let normalized = vrm.toUpperCase().replace(/\s+/g, '');
  
  const modernMatch = normalized.match(/^([A-Z]{2})(\d{2})([A-Z]{3})$/);
  if (modernMatch) {
    let [, letters1, digits, letters2] = modernMatch;
    
    digits = digits.replace(/O/g, '0').replace(/I/g, '1');
    
    letters1 = letters1.replace(/0/g, 'O').replace(/1/g, 'I');
    letters2 = letters2.replace(/0/g, 'O').replace(/1/g, 'I');
    
    normalized = letters1 + digits + letters2;
  }
  
  return normalized;
}

export function formatVRM(vrm: string): string {
  const normalized = normalizeVRM(vrm);
  
  const modernMatch = normalized.match(/^([A-Z]{2})(\d{2})([A-Z]{3})$/);
  if (modernMatch) {
    return `${modernMatch[1]}${modernMatch[2]} ${modernMatch[3]}`;
  }
  
  return normalized;
}

function calculateConfidence(
  match: RegExpMatchArray,
  pattern: string,
  sourceLine: string
): number {
  let confidence = 0.7;
  
  const lowerLine = sourceLine.toLowerCase();
  if (
    lowerLine.includes('reg') ||
    lowerLine.includes('registration') ||
    lowerLine.includes('vehicle') ||
    lowerLine.includes('chassis')
  ) {
    confidence += 0.2;
  }
  
  if (pattern === 'modern') {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 0.95);
}

export function extractReg(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const lines = text.split('\n');
  const seenValues = new Set<string>();
  
  console.log('[Parser] Extracting registration from', lines.length, 'lines');
  
  // First, try to find registration near "Reg" label
  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('reg')) {
      const matches = Array.from(line.matchAll(MODERN_VRM_PATTERN));
      matches.forEach(match => {
        const raw = match[0];
        const normalized = normalizeVRM(raw);
        
        if (!seenValues.has(normalized)) {
          seenValues.add(normalized);
          const confidence = 0.95; // High confidence when near "Reg" label
          
          results.push({
            value: formatVRM(normalized),
            confidence,
            sourceLine: line.trim(),
            pattern: 'modern-labeled',
          });
          
          console.log('[Parser] Found labeled VRM:', normalized, 'confidence:', confidence.toFixed(2));
        }
      });
    }
  });
  
  // Then, find all modern VRMs
  if (results.length === 0) {
    lines.forEach((line) => {
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
  }
  
  // Fallback to legacy patterns
  if (results.length === 0) {
    LEGACY_VRM_PATTERNS.forEach(pattern => {
      lines.forEach(line => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          const raw = match[0];
          const normalized = normalizeVRM(raw);
          
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
  
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[Parser] Found', results.length, 'registration candidates');
  return results;
}

export function extractWip(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const lines = text.split('\n');
  const seenValues = new Set<string>();
  
  console.log('[Parser] Extracting WIP from', lines.length, 'lines');
  
  lines.forEach(line => {
    const matches = Array.from(line.matchAll(WIP_PATTERN));
    matches.forEach(match => {
      const value = match[1].trim();
      
      // WIP numbers should be 3-10 digits
      if (value.length < 3 || value.length > 10) {
        return;
      }
      
      // Skip if it's all zeros
      if (/^0+$/.test(value)) {
        return;
      }
      
      if (!seenValues.has(value)) {
        seenValues.add(value);
        
        // Higher confidence when "WIP" is explicitly mentioned
        const confidence = line.toLowerCase().includes('wip') ? 0.95 : 0.7;
        
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
  
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[Parser] Found', results.length, 'WIP candidates');
  return results;
}

export function extractJob(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const lines = text.split('\n');
  const seenValues = new Set<string>();
  
  console.log('[Parser] Extracting Job No from', lines.length, 'lines');
  
  lines.forEach(line => {
    const matches = Array.from(line.matchAll(JOB_PATTERN));
    matches.forEach(match => {
      const value = match[1].trim();
      
      if (value.length < 3 || value.length > 10) {
        return;
      }
      
      if (!seenValues.has(value)) {
        seenValues.add(value);
        
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
  
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[Parser] Found', results.length, 'Job No candidates');
  return results;
}

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
