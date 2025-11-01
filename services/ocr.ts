
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// OCR Provider types
export type OCRProvider = 'vision' | 'tesseract' | 'mock';

// OCR Configuration
export interface OCRConfig {
  provider: OCRProvider;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

// OCR Result
export interface OCRResult {
  text: string;
  confidence: number;
  blocks?: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Get OCR configuration from environment
function getOCRConfig(): OCRConfig {
  const provider = (Constants.expoConfig?.extra?.OCR_PROVIDER || 'vision') as OCRProvider;
  const apiKey = Constants.expoConfig?.extra?.OCR_API_KEY;
  
  console.log('[OCR] Provider:', provider);
  console.log('[OCR] API Key configured:', !!apiKey);
  
  return {
    provider,
    apiKey,
    timeout: 12000, // 12 seconds
    maxRetries: 2,
  };
}

// Google Cloud Vision OCR
async function performVisionOCR(imageUri: string, apiKey: string, timeout: number): Promise<OCRResult> {
  console.log('[OCR] Starting Google Cloud Vision OCR');
  
  try {
    // Read image as base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('[OCR] Image encoded, size:', base64Image.length, 'chars');
    
    // Prepare request
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };
    
    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[OCR] API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('OCR_RATE_LIMIT');
      } else if (response.status >= 500) {
        throw new Error('OCR_SERVER_ERROR');
      } else {
        throw new Error(`OCR API error: ${response.status}`);
      }
    }
    
    const result = await response.json();
    console.log('[OCR] API response received');
    
    // Extract text from response
    const textAnnotations = result.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      console.log('[OCR] No text detected');
      return {
        text: '',
        confidence: 0,
        blocks: [],
      };
    }
    
    // First annotation contains full text
    const fullText = textAnnotations[0].description || '';
    
    // Calculate average confidence
    const confidences = textAnnotations
      .slice(1)
      .map((annotation: any) => annotation.confidence || 0)
      .filter((c: number) => c > 0);
    
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum: number, c: number) => sum + c, 0) / confidences.length
      : 0.5;
    
    console.log('[OCR] Text extracted, length:', fullText.length, 'confidence:', avgConfidence.toFixed(2));
    
    return {
      text: fullText,
      confidence: avgConfidence,
      blocks: textAnnotations.slice(1).map((annotation: any) => ({
        text: annotation.description || '',
        confidence: annotation.confidence || 0,
        boundingBox: annotation.boundingPoly?.vertices?.[0] ? {
          x: annotation.boundingPoly.vertices[0].x || 0,
          y: annotation.boundingPoly.vertices[0].y || 0,
          width: (annotation.boundingPoly.vertices[2]?.x || 0) - (annotation.boundingPoly.vertices[0].x || 0),
          height: (annotation.boundingPoly.vertices[2]?.y || 0) - (annotation.boundingPoly.vertices[0].y || 0),
        } : undefined,
      })),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[OCR] Request timeout');
      throw new Error('OCR_TIMEOUT');
    }
    console.log('[OCR] Error:', error.message);
    throw error;
  }
}

// Mock OCR for testing (no API key required)
async function performMockOCR(imageUri: string): Promise<OCRResult> {
  console.log('[OCR] Using mock OCR (for testing)');
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock data that matches the sample job card
  return {
    text: `Marshall Salisbury BMW Service
Authorised Workshop
JOB CARD
Vehicle name
WIP No. 88921
Invoice Name & Address
Fuel reading
For use by Service/BS
Job No. 554333
For use by Service/BS
Raised by operator: 0017
Chassis No. XYZ123456
Engine No. AB21 CDE
2.0 Sedan
Date
Customer Order No. 100020
Date. 10/03 29/02/2024
V.S. B. No. V.S.B. No. 123
Date Job Date Time Due Due Out
Color Color Last
Date Josn Time Due 060/2025
SUPPLY PART 12 20 Sedan 10/03/2022 10/0252 11.00
SUPPLY VEHICLE SUPPLY JUE 11/08/2625
SUPPLY TYRE CHECK 11/08/2025
Description of Work Carieed 42 175,00
Tyre Check`,
    confidence: 0.85,
    blocks: [],
  };
}

// Main OCR function with retry logic
export async function performOCR(imageUri: string): Promise<OCRResult> {
  const config = getOCRConfig();
  
  console.log('[OCR] Starting OCR with provider:', config.provider);
  
  // Check network connectivity
  try {
    const networkState = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-cache',
    });
    console.log('[OCR] Network check:', networkState.ok ? 'online' : 'offline');
  } catch (error) {
    console.log('[OCR] Network check failed, assuming offline');
    throw new Error('OCR_OFFLINE');
  }
  
  // Perform OCR based on provider
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < (config.maxRetries || 1); attempt++) {
    try {
      console.log('[OCR] Attempt', attempt + 1, 'of', config.maxRetries);
      
      if (config.provider === 'vision') {
        if (!config.apiKey) {
          throw new Error('OCR_NO_API_KEY');
        }
        return await performVisionOCR(imageUri, config.apiKey, config.timeout || 12000);
      } else if (config.provider === 'mock') {
        return await performMockOCR(imageUri);
      } else {
        throw new Error(`Unsupported OCR provider: ${config.provider}`);
      }
    } catch (error: any) {
      lastError = error;
      console.log('[OCR] Attempt', attempt + 1, 'failed:', error.message);
      
      // Don't retry on certain errors
      if (error.message === 'OCR_NO_API_KEY' || error.message === 'OCR_OFFLINE') {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < (config.maxRetries || 1) - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log('[OCR] Waiting', delay, 'ms before retry');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  throw lastError || new Error('OCR_FAILED');
}

// Check if OCR is configured
export function isOCRConfigured(): boolean {
  const config = getOCRConfig();
  return config.provider === 'mock' || !!config.apiKey;
}

// Get OCR status message
export function getOCRStatusMessage(): string {
  const config = getOCRConfig();
  
  if (config.provider === 'mock') {
    return 'Using mock OCR (for testing)';
  }
  
  if (!config.apiKey) {
    return 'OCR not configured. Please add OCR_API_KEY to .env file.';
  }
  
  return `OCR configured with ${config.provider}`;
}
