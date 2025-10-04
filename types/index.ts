
export interface Job {
  id: string;
  wipNumber: string;
  vehicleRegistration: string;
  awValue: number;
  notes?: string;
  dateCreated: string;
  timeInMinutes: number; // Calculated from AWs (1 AW = 5 minutes)
}

export interface AppSettings {
  pin: string;
  isAuthenticated: boolean;
}

export interface MonthlyStats {
  totalAWs: number;
  totalTime: number; // in minutes
  totalJobs: number;
  targetHours: number; // 180 hours = 10800 minutes
  utilizationPercentage: number;
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
