
import { Job, MonthlyStats } from '../types';

export const CalculationService = {
  // Convert AWs to minutes (1 AW = 5 minutes)
  awsToMinutes(aws: number): number {
    return aws * 5;
  },

  // Alias for awsToMinutes for backward compatibility
  calculateTimeFromAWs(aws: number): number {
    return aws * 5;
  },

  // Convert minutes to hours
  minutesToHours(minutes: number): number {
    return minutes / 60;
  },

  // Format time for display
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  },

  // Calculate available working hours for a given month
  // Monday to Friday, 8 AM to 5 PM (9 hours), minus 30 minutes lunch = 8.5 hours per day
  calculateAvailableHours(month: number, year: number): number {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let workingDays = 0;
    
    // Iterate through all days in the month
    for (let day = firstDay.getDate(); day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      
      // Count Monday (1) to Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }
    
    // 8.5 hours per working day (8 AM to 5 PM minus 30 min lunch)
    const hoursPerDay = 8.5;
    const totalAvailableHours = workingDays * hoursPerDay;
    
    console.log(`Available hours for ${month + 1}/${year}: ${totalAvailableHours} (${workingDays} working days)`);
    return totalAvailableHours;
  },

  // Calculate available hours from start of month to current date
  calculateAvailableHoursToDate(month: number, year: number): number {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // If the month is in the future, return 0
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return 0;
    }
    
    const firstDay = new Date(year, month, 1);
    let lastDay: Date;
    
    // If it's the current month, calculate up to today
    if (year === currentYear && month === currentMonth) {
      lastDay = today;
    } else {
      // If it's a past month, calculate for the entire month
      lastDay = new Date(year, month + 1, 0);
    }
    
    let workingDays = 0;
    
    // Iterate through days from first day to last day
    for (let day = firstDay.getDate(); day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      
      // Count Monday (1) to Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }
    
    // 8.5 hours per working day
    const hoursPerDay = 8.5;
    const totalAvailableHours = workingDays * hoursPerDay;
    
    console.log(`Available hours to date for ${month + 1}/${year}: ${totalAvailableHours} (${workingDays} working days)`);
    return totalAvailableHours;
  },

  // Calculate efficiency: (Total AW Hours / Total Available Hours) * 100
  calculateEfficiency(totalAwMinutes: number, month: number, year: number): number {
    const totalAwHours = this.minutesToHours(totalAwMinutes);
    const availableHours = this.calculateAvailableHoursToDate(month, year);
    
    if (availableHours === 0) {
      return 0;
    }
    
    const efficiency = (totalAwHours / availableHours) * 100;
    console.log(`Efficiency: ${efficiency.toFixed(2)}% (${totalAwHours.toFixed(2)}h / ${availableHours.toFixed(2)}h)`);
    
    return Math.min(efficiency, 100); // Cap at 100%
  },

  // Calculate performance metrics for different time periods
  calculatePerformanceMetrics(jobs: Job[], type: 'daily' | 'weekly' | 'monthly', targetHours?: number, month?: number, year?: number): {
    totalAWs: number;
    totalMinutes: number;
    totalHours: number;
    targetHours: number;
    availableHours: number;
    utilizationPercentage: number;
    efficiency: number;
    avgAWsPerHour: number;
  } {
    const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalMinutes = totalAWs * 5;
    const totalHours = this.minutesToHours(totalMinutes);
    
    let defaultTargetHours = 0;
    let availableHours = 0;
    
    const currentMonth = month !== undefined ? month : new Date().getMonth();
    const currentYear = year !== undefined ? year : new Date().getFullYear();
    
    switch (type) {
      case 'daily':
        defaultTargetHours = 8.5; // 8.5 hours per day
        availableHours = 8.5;
        break;
      case 'weekly':
        defaultTargetHours = 42.5; // 8.5 hours * 5 days
        availableHours = 42.5;
        break;
      case 'monthly':
        availableHours = this.calculateAvailableHoursToDate(currentMonth, currentYear);
        defaultTargetHours = targetHours || availableHours;
        break;
    }
    
    const finalTargetHours = targetHours || defaultTargetHours;
    const utilizationPercentage = finalTargetHours > 0 ? Math.min((totalHours / finalTargetHours) * 100, 100) : 0;
    
    // Calculate efficiency based on available hours
    const efficiency = availableHours > 0 ? Math.min((totalHours / availableHours) * 100, 100) : 0;
    
    const targetAWsPerHour = 12; // Assuming 12 AWs per hour as target
    const avgAWsPerHour = totalHours > 0 ? totalAWs / totalHours : 0;
    
    return {
      totalAWs,
      totalMinutes,
      totalHours,
      targetHours: finalTargetHours,
      availableHours,
      utilizationPercentage,
      efficiency,
      avgAWsPerHour
    };
  },

  // Calculate monthly stats with corrected efficiency
  calculateMonthlyStats(jobs: Job[], targetHours: number = 180): MonthlyStats {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyJobs = jobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear;
    });

    const totalAWs = monthlyJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalTime = totalAWs * 5; // minutes
    const totalJobs = monthlyJobs.length;
    
    // Calculate available hours for the current month up to today
    const availableHours = this.calculateAvailableHoursToDate(currentMonth, currentYear);
    const targetMinutes = availableHours * 60;
    
    // Efficiency based on available hours
    const efficiency = this.calculateEfficiency(totalTime, currentMonth, currentYear);
    
    // Utilization based on target hours (for backward compatibility)
    const utilizationPercentage = targetMinutes > 0 ? Math.min((totalTime / targetMinutes) * 100, 100) : 0;

    return {
      totalAWs,
      totalTime,
      totalJobs,
      targetHours: availableHours, // Use available hours as the realistic target
      utilizationPercentage: efficiency // Use efficiency as the utilization percentage
    };
  },

  // Get jobs by date range
  getJobsByDateRange(jobs: Job[], startDate: Date, endDate: Date): Job[] {
    return jobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate >= startDate && jobDate <= endDate;
    });
  },

  // Get daily jobs
  getDailyJobs(jobs: Job[], date: Date): Job[] {
    return jobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.toDateString() === date.toDateString();
    });
  },

  // Get weekly jobs
  getWeeklyJobs(jobs: Job[], date: Date): Job[] {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return this.getJobsByDateRange(jobs, startOfWeek, endOfWeek);
  },

  // Get monthly jobs
  getMonthlyJobs(jobs: Job[], date: Date): Job[] {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return this.getJobsByDateRange(jobs, startOfMonth, endOfMonth);
  },

  // Get jobs by specific month and year
  getJobsByMonth(jobs: Job[], month: number, year: number): Job[] {
    return jobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.getMonth() === month && jobDate.getFullYear() === year;
    });
  },

  // Get jobs by month and year (alias for compatibility)
  getJobsByMonthYear(jobs: Job[], month: number, year: number): Job[] {
    return this.getJobsByMonth(jobs, month, year);
  },

  // Get available months that have jobs
  getAvailableMonths(jobs: Job[]): { month: number; year: number; count: number }[] {
    const monthMap = new Map<string, number>();
    
    jobs.forEach(job => {
      const jobDate = new Date(job.dateCreated);
      const key = `${jobDate.getFullYear()}-${jobDate.getMonth()}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });

    const result: { month: number; year: number; count: number }[] = [];
    
    monthMap.forEach((count, key) => {
      const numberArray = key.split('-').map(Number);
      const [year, month] = numberArray;
      result.push({ month, year, count });
    });

    // Sort by year and month (newest first)
    return result.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  },

  // Filter jobs by month for display
  filterJobsByMonth(jobs: Job[], month: number, year: number): Job[] {
    return jobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.getMonth() === month && jobDate.getFullYear() === year;
    });
  }
};
