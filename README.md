
# TechTime - Technician Records App

A professional job tracking application for vehicle technicians built with React Native and Expo 54.

## 🚀 Features

- **Job Tracking**: Log jobs with WIP numbers, vehicle registrations, and AW values
- **Time Calculation**: Automatic time calculation (1 AW = 5 minutes)
- **Efficiency Monitoring**: Track monthly efficiency and performance metrics
- **VHC Status**: Color-coded vehicle health check indicators
- **Export Reports**: Generate PDF and JSON reports (daily, weekly, monthly, all-time)
- **Dark Mode**: Full light/dark theme support
- **Security**: PIN protection and biometric authentication
- **Absence Logger**: Track absences and adjust calculations automatically
- **Smart Suggestions**: Auto-complete for repeat jobs and customers
- **OCR Scanning**: Scan job cards with camera (requires internet)

## 📋 Requirements

- Node.js 18-22
- npm or pnpm
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

## 🛠️ Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Start development server
npm start
# or
pnpm start

# Run on iOS
npm run ios
# or
pnpm ios

# Run on Android
npm run android
# or
pnpm android
```

## 🏗️ Build

### Android

```bash
# Local build
npm run build:android

# EAS build
npm run build:eas:android
```

### iOS

```bash
# Local build
npm run build:ios

# EAS build
npm run build:eas:ios
```

## 📱 App Structure

```
app/
├── _layout.tsx          # Root layout with navigation
├── index.tsx            # Entry point with auth check
├── auth.tsx             # PIN authentication screen
├── dashboard.tsx        # Main dashboard
├── jobs.tsx             # Jobs list
├── add-job.tsx          # Add/edit job form
├── statistics.tsx       # Statistics overview
├── settings.tsx         # App settings
└── ...                  # Other screens

components/
├── ErrorBoundary.tsx    # Error handling
├── NotificationToast.tsx # Toast notifications
├── ProgressCircle.tsx   # Circular progress indicator
└── ...                  # Other components

utils/
├── storage.ts           # AsyncStorage wrapper
├── calculations.ts      # AW and efficiency calculations
├── exportService.ts     # PDF/JSON export
└── ...                  # Other utilities
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file (optional):

```env
EXPO_PROJECT_ID=your-project-id
```

### App Settings

- **PIN**: Default is `3101` (changeable in settings)
- **Target Hours**: Default is 180 hours/month
- **Theme**: Light or dark mode
- **Biometric**: Face ID / Touch ID support

## 📊 Calculations

- **1 AW = 5 minutes**
- **Efficiency = (Total Sold Hours / Total Available Hours) × 100**
- **Available Hours = Working days × 8.5 hours (Mon-Fri only)**
- **Sold Hours = Total AWs × 0.0833 hours**

### Efficiency Ranges

- **Green (65-100%)**: Excellent performance
- **Yellow (31-64%)**: Average performance
- **Red (0-30%)**: Needs improvement

## 🔐 Security

- PIN protection (4-6 digits)
- Biometric authentication (Face ID / Touch ID)
- Secure local storage
- GDPR compliant (stores only vehicle registration numbers)

## 📤 Export Formats

### PDF Export
- Professional formatted reports
- Pie charts for VHC status distribution
- Monthly grouping for "All Jobs" export
- Includes efficiency metrics

### JSON Export
- Complete job data
- Metadata included
- Easy to import/backup

## 🐛 Troubleshooting

### Build Issues

If you encounter build errors:

```bash
# Clean and rebuild
npm run gradle:clean
npm run prebuild

# Fix C++ build issues
npm run fix:cpp

# Fix Reanimated issues
npm run fix:reanimated
```

### Common Issues

1. **Duplicate FBJNI classes**: Fixed by `fbjniExclusion.plugin.cjs`
2. **C++ build errors**: Fixed by `cppBuildConfig.plugin.cjs`
3. **Reanimated errors**: Fixed by `reanimatedConfig.plugin.cjs`

## 📝 License

Private - All rights reserved

## 👤 Author

Buckston Rugge

---

**Version**: 1.0.0  
**Platform**: React Native 0.81.4 + Expo 54  
**Last Updated**: December 2025
