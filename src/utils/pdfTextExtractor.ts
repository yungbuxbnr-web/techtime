
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Extract text from a PDF file using a simpler approach
 * Note: This is a basic implementation that reads PDF as text
 * For production use, consider using a native PDF library
 * 
 * @param uri - The URI of the PDF file
 * @returns Promise<string> - The extracted text content
 */
export async function getPdfText(uri: string): Promise<string> {
  try {
    console.log('[PDF Text Extractor] Starting text extraction from:', uri);
    
    // Read file as string (this is a simplified approach)
    // For better PDF parsing, you would need a native module
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    console.log('[PDF Text Extractor] File read, length:', content.length);
    
    if (!content || content.length < 50) {
      throw new Error('Empty or invalid PDF file');
    }
    
    // Basic PDF text extraction
    // PDFs store text between BT (Begin Text) and ET (End Text) operators
    // This is a very basic parser and may not work for all PDFs
    let extractedText = '';
    
    // Try to extract text content from PDF structure
    const textMatches = content.match(/\(([^)]+)\)/g);
    if (textMatches) {
      extractedText = textMatches
        .map(match => match.slice(1, -1))
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\/g, '');
    }
    
    // If no text found with basic extraction, try alternative method
    if (!extractedText || extractedText.length < 50) {
      // Look for text between Tj operators
      const tjMatches = content.match(/\[([^\]]+)\]\s*TJ/g);
      if (tjMatches) {
        extractedText = tjMatches
          .map(match => {
            const inner = match.match(/\(([^)]+)\)/g);
            return inner ? inner.map(m => m.slice(1, -1)).join(' ') : '';
          })
          .join(' ')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\/g, '');
      }
    }
    
    if (!extractedText || extractedText.trim().length < 50) {
      console.error('[PDF Text Extractor] Could not extract sufficient text from PDF');
      throw new Error('Could not extract text from PDF. The PDF may be image-based or encrypted.');
    }
    
    console.log('[PDF Text Extractor] Text extracted successfully, length:', extractedText.length);
    console.log('[PDF Text Extractor] First 500 characters:', extractedText.substring(0, 500));
    
    return extractedText;
  } catch (err: any) {
    console.error('[PDF Text Extractor] Failed to extract text:', err);
    console.error('[PDF Text Extractor] Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    
    // Provide helpful error message
    if (err.message.includes('Could not extract text')) {
      throw err;
    }
    
    throw new Error('Failed to extract text from PDF. Please ensure the PDF contains searchable text (not scanned images).');
  }
}
