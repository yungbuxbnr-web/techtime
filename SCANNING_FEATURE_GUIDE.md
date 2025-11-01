
# Scanning Feature Guide

This guide explains how to use the new scanning functionality in the TechTrace app.

## Overview

The app now supports scanning vehicle registration plates and job cards using your device's camera and OCR (Optical Character Recognition) technology.

## Features

### 1. Scan Registration (Scan Reg)
- **Location**: Camera icon button next to the Vehicle Registration input field
- **Purpose**: Quickly scan vehicle registration plates
- **How it works**:
  1. Tap the camera icon next to the Registration field
  2. Position the license plate in the camera frame
  3. Tap the capture button
  4. The app will automatically extract and fill in the registration number

### 2. Scan Job Card
- **Location**: "📄 Scan Job Card" button below the WIP/Registration inputs
- **Purpose**: Extract WIP number, Job number, and Registration from job cards
- **How it works**:
  1. Tap the "Scan Job Card" button
  2. Choose to take a photo or select from files
  3. Position the job card in the camera frame (or select an image)
  4. The app will extract all available data
  5. Review the detected values and select which ones to use
  6. Tap "Apply" to fill in the form

## Setup

### 1. Get a Google Cloud Vision API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Cloud Vision API:
   - Go to [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
   - Click "Enable"
4. Create an API key:
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "API Key"
   - Copy your API key

### 2. Configure the App

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```
   OCR_PROVIDER=vision
   OCR_API_KEY=your_actual_api_key_here
   ```

2. **Important**: Never commit your `.env` file to version control!
   - The `.env` file is already in `.gitignore`
   - Only commit `.env.example` with placeholder values

### 3. Update app.json

Add your API key to the `extra` section in `app.json`:
```json
{
  "expo": {
    "extra": {
      "OCR_PROVIDER": "vision",
      "OCR_API_KEY": "your_actual_api_key_here"
    }
  }
}
```

**Note**: For production apps, use environment variables or Expo's secure storage instead of hardcoding the API key.

## Testing Without API Key

You can test the scanning UI without an API key by using the mock OCR provider:

1. Set `OCR_PROVIDER=mock` in your `.env` file
2. The app will return sample data instead of calling the real API
3. This is useful for UI testing and development

## How It Works

### Image Processing Pipeline

1. **Capture**: Take a photo using the device camera
2. **Preprocessing**:
   - Auto-fix orientation
   - Resize to optimal width (1600px)
   - Compress to reduce file size (<2 MB)
3. **OCR**: Send to Google Cloud Vision API
4. **Parsing**: Extract relevant data using regex patterns
5. **Validation**: Check confidence levels and present results

### UK Registration Plate Patterns

The app supports both modern and legacy UK registration formats:

- **Modern**: AB12 CDE (2 letters, 2 digits, 3 letters)
- **Legacy**: ABC 123, A123 BCD, etc.

The parser automatically:
- Normalizes spacing and capitalization
- Handles common OCR mistakes (0↔O, 1↔I)
- Applies position-based corrections
- Prefers modern format when multiple matches found

### Job Card Parsing

The app looks for these fields in job cards:
- **WIP Number**: Patterns like "WIP No: 12345", "WIP: 12345"
- **Job Number**: Patterns like "Job No: 12345", "Job: 12345"
- **Registration**: UK VRM patterns (see above)

## User Experience

### Confidence Levels

Scan results show confidence levels:
- **Green (80%+)**: High confidence, likely correct
- **Orange (60-79%)**: Medium confidence, review recommended
- **Red (<60%)**: Low confidence, manual verification needed

### Field Protection

The app protects manually entered data:
- If you've already typed in a field, the app will ask before overwriting
- This prevents accidental data loss

### Offline Handling

If no internet connection is detected:
- The app will show a friendly error message
- You can still enter data manually
- Scanning will work again once online

## Troubleshooting

### "OCR Not Configured" Error
- Make sure you've added your API key to `.env` and `app.json`
- Restart the Expo development server after adding the key

### "No Text Detected" Error
- Ensure good lighting conditions
- Hold the camera steady
- Make sure the document is in focus
- Try capturing from a different angle

### "Scan Timeout" Error
- Check your internet connection
- Try again with better lighting
- The image might be too large - the app will automatically retry with lower resolution

### Low Confidence Results
- Improve lighting conditions
- Clean the camera lens
- Ensure the document is flat and not wrinkled
- Try capturing from directly above the document

## Performance Tips

1. **Lighting**: Use good, even lighting for best results
2. **Distance**: Hold the camera 6-12 inches from the document
3. **Angle**: Capture from directly above (90° angle)
4. **Stability**: Hold the device steady or use a surface
5. **Focus**: Wait for the camera to focus before capturing

## Privacy & Security

- **No Data Storage**: Images are processed and immediately discarded
- **API Key Security**: Never commit your API key to version control
- **GDPR Compliant**: Only vehicle registration numbers are stored (no personal data)
- **Local Processing**: Image preprocessing happens on-device

## Cost Considerations

Google Cloud Vision API pricing (as of 2024):
- First 1,000 requests/month: FREE
- Additional requests: $1.50 per 1,000 requests

For typical usage (scanning a few job cards per day), you'll likely stay within the free tier.

## Future Enhancements

Planned improvements:
- Offline OCR using on-device ML models
- Barcode scanning for WIP numbers
- PDF support for job cards
- Batch scanning multiple job cards
- Custom training for specific job card formats

## Support

If you encounter issues:
1. Check this guide first
2. Verify your API key is correct
3. Check the app logs for error messages
4. Ensure you have the latest version of the app

## Technical Details

### Dependencies
- `expo-camera`: Camera access and photo capture
- `expo-barcode-scanner`: Barcode detection (future use)
- `expo-image-manipulator`: Image preprocessing
- `expo-document-picker`: File selection
- `react-native-dotenv`: Environment variable management

### File Structure
```
services/
  ocr.ts                    # OCR service wrapper
  scan/
    parsers.ts              # Text parsing and extraction
    pipeline.ts             # Image processing pipeline
features/
  scan/
    CameraModal.tsx         # Camera UI component
    ScanResultSheet.tsx     # Results confirmation UI
```

### API Reference

See the inline documentation in the source files for detailed API information.
