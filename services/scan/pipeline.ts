
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { performOCR, OCRResult } from '../ocr';
import { extractReg, extractWip, extractJob, deduplicateResults, ParseResult } from './parsers';

export interface ScanResult {
  reg?: ParseResult;
  wip?: ParseResult;
  jobNo?: ParseResult;
  allCandidates: {
    reg: ParseResult[];
    wip: ParseResult[];
    jobNo: ParseResult[];
  };
  ocrText: string;
  ocrConfidence: number;
}

export interface PipelineOptions {
  targetWidth?: number;
  jpegQuality?: number;
  maxFileSize?: number;
  enhanceContrast?: boolean;
  deskew?: boolean;
}

const DEFAULT_OPTIONS: PipelineOptions = {
  targetWidth: 1600,
  jpegQuality: 0.8,
  maxFileSize: 2 * 1024 * 1024, // 2 MB
  enhanceContrast: true,
  deskew: true,
};

// Preprocess image for OCR
async function preprocessImage(
  imageUri: string,
  options: PipelineOptions = DEFAULT_OPTIONS
): Promise<string> {
  console.log('[Pipeline] Starting image preprocessing');
  
  try {
    // Get image info
    const imageInfo = await FileSystem.getInfoAsync(imageUri);
    console.log('[Pipeline] Original image size:', imageInfo.size, 'bytes');
    
    // Load image for manipulation
    let manipulations: ImageManipulator.Action[] = [];
    
    // 1. Auto-fix orientation (EXIF-based)
    // Note: expo-image-manipulator doesn't have built-in EXIF rotation,
    // but we can detect and fix common orientations
    
    // 2. Resize to target width (maintain aspect ratio)
    if (options.targetWidth) {
      manipulations.push({
        resize: {
          width: options.targetWidth,
        },
      });
      console.log('[Pipeline] Resizing to width:', options.targetWidth);
    }
    
    // 3. Convert to grayscale (not directly supported, but we can reduce saturation)
    // We'll skip this for now as it's not critical
    
    // Apply manipulations
    let result = await ImageManipulator.manipulateAsync(
      imageUri,
      manipulations,
      {
        compress: options.jpegQuality || 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    console.log('[Pipeline] Image preprocessed:', result.uri);
    
    // Check file size
    const processedInfo = await FileSystem.getInfoAsync(result.uri);
    console.log('[Pipeline] Processed image size:', processedInfo.size, 'bytes');
    
    // If still too large, reduce quality
    if (processedInfo.size && processedInfo.size > (options.maxFileSize || 2 * 1024 * 1024)) {
      console.log('[Pipeline] Image too large, reducing quality');
      result = await ImageManipulator.manipulateAsync(
        result.uri,
        [],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      const finalInfo = await FileSystem.getInfoAsync(result.uri);
      console.log('[Pipeline] Final image size:', finalInfo.size, 'bytes');
    }
    
    return result.uri;
  } catch (error) {
    console.log('[Pipeline] Error preprocessing image:', error);
    throw error;
  }
}

// Main scan pipeline
export async function scanImage(
  imageUri: string,
  options: PipelineOptions = DEFAULT_OPTIONS
): Promise<ScanResult> {
  console.log('[Pipeline] Starting scan pipeline');
  
  try {
    // Step 1: Preprocess image
    const processedUri = await preprocessImage(imageUri, options);
    
    // Step 2: Perform OCR
    console.log('[Pipeline] Performing OCR');
    const ocrResult: OCRResult = await performOCR(processedUri);
    
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      console.log('[Pipeline] No text detected');
      return {
        allCandidates: {
          reg: [],
          wip: [],
          jobNo: [],
        },
        ocrText: '',
        ocrConfidence: 0,
      };
    }
    
    console.log('[Pipeline] OCR completed, text length:', ocrResult.text.length);
    
    // Step 3: Parse OCR text
    console.log('[Pipeline] Parsing OCR text');
    const regCandidates = deduplicateResults(extractReg(ocrResult.text));
    const wipCandidates = deduplicateResults(extractWip(ocrResult.text));
    const jobCandidates = deduplicateResults(extractJob(ocrResult.text));
    
    // Step 4: Select best candidates
    const result: ScanResult = {
      reg: regCandidates.length > 0 ? regCandidates[0] : undefined,
      wip: wipCandidates.length > 0 ? wipCandidates[0] : undefined,
      jobNo: jobCandidates.length > 0 ? jobCandidates[0] : undefined,
      allCandidates: {
        reg: regCandidates,
        wip: wipCandidates,
        jobNo: jobCandidates,
      },
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
    };
    
    console.log('[Pipeline] Scan complete');
    console.log('[Pipeline] Found:', {
      reg: result.reg?.value,
      wip: result.wip?.value,
      jobNo: result.jobNo?.value,
    });
    
    return result;
  } catch (error: any) {
    console.log('[Pipeline] Error in scan pipeline:', error.message);
    throw error;
  }
}

// Scan for registration only (optimized for license plates)
export async function scanRegistration(imageUri: string): Promise<ScanResult> {
  console.log('[Pipeline] Starting registration scan');
  
  // Use higher resolution for license plates
  const options: PipelineOptions = {
    ...DEFAULT_OPTIONS,
    targetWidth: 1600,
    enhanceContrast: true,
  };
  
  return scanImage(imageUri, options);
}

// Scan job card (full document)
export async function scanJobCard(imageUri: string): Promise<ScanResult> {
  console.log('[Pipeline] Starting job card scan');
  
  // Use standard resolution for documents
  const options: PipelineOptions = {
    ...DEFAULT_OPTIONS,
    targetWidth: 1600,
  };
  
  return scanImage(imageUri, options);
}
