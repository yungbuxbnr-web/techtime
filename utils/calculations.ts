
import { Job, MonthlyStats } from '../types';

export const CalculationService = {
  // Convert AWs to minutes (1 AW = 5 minutes)
  awsToMinutes(aws: number): number {
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

  // Calculate monthly stats
  calculateMonthlyStats(jobs: Job[]): MonthlyStats {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyJobs = jobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear;
    });

    const totalAWs = monthlyJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalTime = totalAWs * 5; // minutes
    const totalJobs = monthlyJobs.length;
    const targetHours = 180;
    const targetMinutes = targetHours * 60; // 10800 minutes
    const utilizationPercentage = (totalTime / targetMinutes) * 100;

    return {
      totalAWs,
      totalTime,
      totalJobs,
      targetHours,
      utilizationPercentage: Math.min(utilizationPercentage, 100)
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
  }
};
