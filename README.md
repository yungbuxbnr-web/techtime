
# TechTime - Technician Job Tracking App

A modern React Native + Expo app for tracking vehicle technician jobs, calculating work hours, and managing monthly targets.

## Features

- **Job Tracking**: Log jobs with WIP numbers, vehicle registrations, and AW values
- **Camera Scanning**: Scan job cards using OCR to auto-fill job details
- **Smart Suggestions**: Auto-complete based on previous jobs and vehicles
- **Monthly Stats**: Track hours, efficiency, and progress toward monthly targets
- **Vehicle Health Check**: Color-coded vehicle condition tracking
- **Export Options**: Export job data in various formats (daily, weekly, monthly)
- **Dark Mode**: Full support for light and dark themes
- **Secure**: PIN-protected access with biometric authentication support

## Tech Stack

- React Native 0.81.4
- Expo 54
- TypeScript
- Expo Router for navigation
- Expo Camera for scanning
- Google Cloud Vision API for OCR

## Getting Started

### Prerequisites

- Node.js 18-22
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run on Android
npm run dev:android

# Run on iOS
npm run dev:ios
```

### Building

```bash
# Android
npm run build:android

# iOS
npm run build:ios

# EAS Build (recommended)
npm run build:eas:android
npm run build:eas:ios
```

## Configuration

### OCR Setup (Optional)

To enable job card scanning:

1. Get a Google Cloud Vision API key
2. Create a `.env` file:
   ```
   OCR_PROVIDER=vision
   OCR_API_KEY=your_api_key_here
   ```

Without OCR configuration, the app will use mock data for testing.

## Project Structure

```
├── app/                    # App screens (Expo Router)
├── components/             # Reusable components
├── features/              # Feature-specific components
│   └── scan/              # Camera and scanning features
├── services/              # Business logic and services
│   ├── ocr.ts            # OCR service
│   └── scan/             # Scanning pipeline
├── utils/                 # Utility functions
├── styles/               # Common styles and themes
└── types/                # TypeScript type definitions
```

## Key Screens

- **Dashboard**: Overview of monthly stats and quick actions
- **Add Job**: Create new job entries with scanning support
- **Jobs**: View and manage all jobs
- **Statistics**: Detailed analytics and charts
- **Settings**: App configuration and preferences

## License

Private - All rights reserved
