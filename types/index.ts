
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
  format: 'pdf' | 'excel';
}
