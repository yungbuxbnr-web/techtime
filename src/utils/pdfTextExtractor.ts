
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Extract text from a PDF file
 * This implementation reads the PDF as base64 and attempts to extract text
 * from the PDF structure.
 * 
 * @param uri - The URI of the PDF file
 * @returns Promise<string> - The extracted text content
 */
export async function getPdfText(uri: string): Promise<string> {
  try {
    console.log('[PDF Text Extractor] Starting text extraction from:', uri);
    
    // Read file as base64 first (PDFs are binary files)
    const base64Content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    if (!base64Content || base64Content.length < 100) {
      throw new Error('Empty or invalid PDF file');
    }
    
    console.log('[PDF Text Extractor] File read as base64, length:', base64Content.length);
    
    // Decode base64 to get the raw PDF content
    let pdfContent: string;
    try {
      pdfContent = atob(base64Content);
    } catch (error) {
      console.error('[PDF Text Extractor] Failed to decode base64:', error);
      throw new Error('Failed to decode PDF file. The file may be corrupted.');
    }
    
    console.log('[PDF Text Extractor] PDF decoded, content length:', pdfContent.length);
    
    // Check if this is actually a PDF file
    if (!pdfContent.startsWith('%PDF-')) {
      throw new Error('This does not appear to be a valid PDF file. Please select a Tech Records PDF export.');
    }
    
    // Extract text from PDF structure
    // PDFs store text in various ways, we'll try multiple methods
    let extractedText = '';
    
    // Method 1: Extract text between parentheses (most common text encoding in PDFs)
    // Text in PDFs is often encoded as: (Text content) Tj
    const textMatches = pdfContent.match(/\(([^)\\]*(\\.[^)\\]*)*)\)\s*Tj/g);
    if (textMatches && textMatches.length > 0) {
      console.log('[PDF Text Extractor] Found', textMatches.length, 'text matches using Method 1');
      extractedText = textMatches
        .map(match => {
          // Extract text between parentheses
          const textMatch = match.match(/\(([^)\\]*(\\.[^)\\]*)*)\)/);
          if (textMatch && textMatch[1]) {
            return textMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '')
              .replace(/\\t/g, '\t')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
          }
          return '';
        })
        .filter(text => text.length > 0)
        .join(' ');
    }
    
    // Method 2: Extract text arrays (alternative PDF text encoding)
    // Text can also be encoded as: [(Text) (More text)] TJ
    if (!extractedText || extractedText.length < 100) {
      console.log('[PDF Text Extractor] Trying Method 2 (text arrays)...');
      const arrayMatches = pdfContent.match(/\[([^\]]*)\]\s*TJ/g);
      if (arrayMatches && arrayMatches.length > 0) {
        console.log('[PDF Text Extractor] Found', arrayMatches.length, 'array matches using Method 2');
        const arrayText = arrayMatches
          .map(match => {
            const innerMatches = match.match(/\(([^)\\]*(\\.[^)\\]*)*)\)/g);
            if (innerMatches) {
              return innerMatches
                .map(m => {
                  const textMatch = m.match(/\(([^)\\]*(\\.[^)\\]*)*)\)/);
                  if (textMatch && textMatch[1]) {
                    return textMatch[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\r/g, '')
                      .replace(/\\t/g, '\t')
                      .replace(/\\\(/g, '(')
                      .replace(/\\\)/g, ')')
                      .replace(/\\\\/g, '\\');
                  }
                  return '';
                })
                .join('');
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (arrayText.length > extractedText.length) {
          extractedText = arrayText;
        }
      }
    }
    
    // Method 3: Look for stream objects with text content
    if (!extractedText || extractedText.length < 100) {
      console.log('[PDF Text Extractor] Trying Method 3 (stream objects)...');
      const streamMatches = pdfContent.match(/stream\s+([\s\S]*?)\s+endstream/g);
      if (streamMatches && streamMatches.length > 0) {
        console.log('[PDF Text Extractor] Found', streamMatches.length, 'stream objects');
        const streamText = streamMatches
          .map(stream => {
            const content = stream.replace(/^stream\s+/, '').replace(/\s+endstream$/, '');
            const textMatches = content.match(/\(([^)\\]*(\\.[^)\\]*)*)\)\s*Tj/g);
            if (textMatches) {
              return textMatches
                .map(match => {
                  const textMatch = match.match(/\(([^)\\]*(\\.[^)\\]*)*)\)/);
                  if (textMatch && textMatch[1]) {
                    return textMatch[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\r/g, '')
                      .replace(/\\t/g, '\t')
                      .replace(/\\\(/g, '(')
                      .replace(/\\\)/g, ')')
                      .replace(/\\\\/g, '\\');
                  }
                  return '';
                })
                .join(' ');
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (streamText.length > extractedText.length) {
          extractedText = streamText;
        }
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!extractedText || extractedText.length < 50) {
      console.error('[PDF Text Extractor] Could not extract sufficient text from PDF');
      console.log('[PDF Text Extractor] PDF starts with:', pdfContent.substring(0, 200));
      throw new Error(
        'Could not extract text from PDF. This may be because:\n\n' +
        '• The PDF contains scanned images instead of searchable text\n' +
        '• The PDF is encrypted or password-protected\n' +
        '• The PDF uses an unsupported text encoding\n\n' +
        'Please ensure you are using a Tech Records PDF export with searchable text.'
      );
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
    if (err.message.includes('Could not extract text from PDF')) {
      throw err;
    }
    
    if (err.message.includes('not appear to be a valid PDF')) {
      throw err;
    }
    
    if (err.message.includes('Failed to decode PDF')) {
      throw err;
    }
    
    throw new Error(
      'Unable to read PDF text. Please make sure this is a Tech Records PDF export.\n\n' +
      'Common issues:\n' +
      '• File is not a valid PDF\n' +
      '• PDF is corrupted or incomplete\n' +
      '• PDF contains only images (not searchable text)\n' +
      '• File permissions issue'
    );
  }
}
