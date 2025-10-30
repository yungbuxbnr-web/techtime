
export interface Job {
  id: string;
  wipNumber: string;
  vehicleRegistration: string;
  awValue: number;
  notes?: string;
  dateCreated: string;
  dateModified?: string;
  timeInMinutes: number; // Calculated from AWs (1 AW = 5 minutes)
  vhcStatus?: VHCStatus; // Vehicle Health Check status
}

export type VHCStatus = 'green' | 'amber' | 'red' | null;

export interface FormulaSettings {
  awToMinutes?: number; // 1 AW = X minutes (default 5)
  hoursPerDay?: number; // Working hours per day (default 8.5)
  targetAWsPerHour?: number; // Target AWs per hour (default 12)
  efficiencyGreenThreshold?: number; // Green efficiency threshold (default 65)
  efficiencyYellowThreshold?: number; // Yellow efficiency threshold (default 31)
}

export interface AppSettings {
  pin: string;
  isAuthenticated: boolean;
  targetHours?: number; // Monthly target hours (default 180)
  absenceHours?: number; // Total absence hours for the current month
  absenceMonth?: number; // Month for which absence hours are tracked
  absenceYear?: number; // Year for which absence hours are tracked
  theme?: 'light' | 'dark'; // Theme preference
  biometricEnabled?: boolean; // Biometric login enabled
  formulas?: FormulaSettings; // Custom formula settings
}

export interface MonthlyStats {
  totalAWs: number;
  totalTime: number; // in minutes
  totalJobs: number;
  totalSoldHours?: number; // in hours (converted from AWs)
  totalAvailableHours?: number; // in hours (weekdays only, minus absences)
  targetHours: number; // 180 hours = 10800 minutes
  utilizationPercentage: number;
  efficiency?: number; // efficiency percentage
}

export interface ExportOptions {
  type: 'daily' | 'weekly' | 'monthly' | 'all';
  format: 'pdf';
}

export interface PDFExportData {
  title: string;
  subtitle: string;
  generatedDate: string;
  summary: {
    totalJobs: number;
    completed: number;
    totalAWs: number;
    totalTime: string;
  };
  jobs: {
    regNumber: string;
    registration: string;
    jobType: string;
    aws: number;
    time: string;
    status: string;
  }[];
  signature: string;
  appVersion: string;
}

// New interfaces for enhanced features
export interface ScreenResolution {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isTablet: boolean;
  deviceType: 'phone' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelDensity: 'ldpi' | 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
}

export interface JobTableRow extends Job {
  isSelected: boolean;
  isEditing: boolean;
}

export interface CalculatedStats {
  totalAWs: number;
  totalTime: number; // in minutes
  totalJobs: number;
  averageAWsPerJob: number;
  totalHours: string; // formatted string
}

export interface EditableJobData {
  wipNumber: string;
  vehicleRegistration: string;
  awValue: number;
  notes: string;
}

// VHC (Vehicle Health Check) related types
export interface VHCColors {
  green: string;
  amber: string;
  red: string;
}

export interface VHCSummary {
  total: number;
  green: number;
  amber: number;
  red: number;
  notSet: number;
}
