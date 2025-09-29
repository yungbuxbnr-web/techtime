
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
