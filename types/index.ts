
export interface Job {
  id: string;
  wipNumber: string;
  vehicleRegistration: string;
  awValue: number;
  timeInMinutes: number;
  notes?: string;
  jobDescription?: string;
  vhcColor?: 'green' | 'orange' | 'red' | null;
  vhcStatus?: string;
  dateCreated: string;
  dateModified?: string;
}

export interface AppSettings {
  pin: string;
  isAuthenticated: boolean;
  targetHours: number;
  theme?: 'light' | 'dark';
  biometricEnabled?: boolean;
  absenceHours?: number;
  absenceMonth?: number;
  absenceYear?: number;
}

export interface MonthlyStats {
  totalJobs: number;
  totalAWs: number;
  totalTime: number;
  totalSoldHours: number;
  totalAvailableHours: number;
  targetHours: number;
  utilizationPercentage: number;
  efficiency: number;
}

export interface WorkSchedule {
  workDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  startTime: string;
  endTime: string;
  lunchBreakDuration: number;
  autoTimeTracking: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string;
  weeklyReport: boolean;
  weeklyReportDay: number;
  monthlyReport: boolean;
  lowEfficiencyAlert: boolean;
  lowEfficiencyThreshold: number;
}
