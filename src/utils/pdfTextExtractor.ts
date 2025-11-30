
import * as FileSystem from 'expo-file-system/legacy';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extract text from a PDF file using pdfjs-dist
 * 
 * @param uri - The URI of the PDF file
 * @returns Promise<string> - The extracted text content
 */
export async function getPdfText(uri: string): Promise<string> {
  try {
    console.log('[PDF Text Extractor] Starting text extraction from:', uri);
    
    // Read file into base64 then into Uint8Array
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('[PDF Text Extractor] File read as base64, length:', base64.length);
    
    // Convert base64 to binary string
    const raw = atob(base64);
    const len = raw.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = raw.charCodeAt(i);
    }
    
    console.log('[PDF Text Extractor] Converted to Uint8Array, length:', bytes.length);
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    
    console.log('[PDF Text Extractor] PDF loaded, total pages:', pdf.numPages);
    
    let fullText = '';
    const maxPages = pdf.numPages;
    
    // Extract text from each page
    for (let p = 1; p <= maxPages; p++) {
      console.log(`[PDF Text Extractor] Processing page ${p}/${maxPages}...`);
      
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = content.items
        .map((i: any) => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      fullText += pageText + '\n';
      
      console.log(`[PDF Text Extractor] Page ${p} extracted, length: ${pageText.length}`);
    }
    
    if (!fullText.trim()) {
      throw new Error('Empty PDF text');
    }
    
    console.log('[PDF Text Extractor] Total text extracted:', fullText.length, 'characters');
    console.log('[PDF Text Extractor] First 500 characters:', fullText.substring(0, 500));
    
    return fullText;
  } catch (err: any) {
    console.error('[PDF Text Extractor] Failed to extract text:', err);
    console.error('[PDF Text Extractor] Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    throw new Error('Failed to extract text from PDF');
  }
}
