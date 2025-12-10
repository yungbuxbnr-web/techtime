
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Job, AppSettings } from '../types';
import { CalculationService } from './calculations';
import { Platform, Alert } from 'react-native';

export type ExportType = 'daily' | 'weekly' | 'monthly' | 'all' | 'simple';
export type ExportFormat = 'pdf' | 'json';

export interface ExportOptions {
  type: ExportType;
  format: ExportFormat;
  selectedDate?: Date;
  selectedMonth?: number;
  selectedYear?: number;
  selectedWeek?: { start: Date; end: Date };
}

export interface ExportResult {
  success: boolean;
  message: string;
  fileUri?: string;
}

interface DayGroup {
  date: string;
  dateObj: Date;
  jobs: Job[];
  totalAWs: number;
  totalHours: string;
}

interface WeekGroup {
  weekStart: Date;
  weekEnd: Date;
  days: DayGroup[];
  totalAWs: number;
  totalHours: string;
}

interface MonthGroup {
  month: string;
  year: number;
  weeks: WeekGroup[];
  totalAWs: number;
  totalHours: string;
}

/**
 * Export Service
 * Handles exporting job data to PDF and JSON formats
 */
export const ExportService = {
  /**
   * Main export function
   */
  async exportData(
    jobs: Job[],
    settings: AppSettings,
    technicianName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log('[ExportService] Starting export:', options);

      // Filter jobs based on export type
      const filteredJobs = this.filterJobsByType(jobs, options);
      
      if (filteredJobs.length === 0) {
        return {
          success: false,
          message: 'No jobs found for the selected period',
        };
      }

      // Export based on format
      if (options.format === 'pdf') {
        return await this.exportToPDF(filteredJobs, settings, technicianName, options);
      } else {
        return await this.exportToJSON(filteredJobs, settings, technicianName, options);
      }
    } catch (error: any) {
      console.error('[ExportService] Export error:', error);
      return {
        success: false,
        message: error?.message || 'Export failed',
      };
    }
  },

  /**
   * Filter jobs based on export type
   */
  filterJobsByType(jobs: Job[], options: ExportOptions): Job[] {
    const { type, selectedDate, selectedMonth, selectedYear, selectedWeek } = options;

    switch (type) {
      case 'daily':
        if (!selectedDate) return [];
        return CalculationService.getDailyJobs(jobs, selectedDate);

      case 'weekly':
        if (!selectedWeek) return [];
        return CalculationService.getJobsByDateRange(jobs, selectedWeek.start, selectedWeek.end);

      case 'monthly':
        if (selectedMonth === undefined || selectedYear === undefined) return [];
        return CalculationService.getJobsByMonth(jobs, selectedMonth, selectedYear);

      case 'all':
      case 'simple':
        return jobs;

      default:
        return [];
    }
  },

  /**
   * Group jobs by day, week, and month for simple PDF export
   */
  groupJobsForSimplePDF(jobs: Job[]): MonthGroup[] {
    // Sort jobs by date (oldest first)
    const sortedJobs = [...jobs].sort((a, b) => 
      new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
    );

    // Group by month
    const monthMap = new Map<string, Job[]>();
    
    sortedJobs.forEach(job => {
      const date = new Date(job.dateCreated);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(job);
    });

    // Process each month
    const monthGroups: MonthGroup[] = [];

    monthMap.forEach((monthJobs, monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Group jobs by week within the month
      const weekMap = new Map<string, Job[]>();
      
      monthJobs.forEach(job => {
        const date = new Date(job.dateCreated);
        const weekStart = this.getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey)!.push(job);
      });

      // Process each week
      const weekGroups: WeekGroup[] = [];
      
      weekMap.forEach((weekJobs, weekKey) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 5); // Monday to Saturday (6 days)

        // Group jobs by day within the week
        const dayMap = new Map<string, Job[]>();
        
        weekJobs.forEach(job => {
          const date = new Date(job.dateCreated);
          const dayKey = date.toISOString().split('T')[0];
          
          if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, []);
          }
          dayMap.get(dayKey)!.push(job);
        });

        // Process each day
        const dayGroups: DayGroup[] = [];
        
        dayMap.forEach((dayJobs, dayKey) => {
          const dateObj = new Date(dayKey);
          const totalAWs = dayJobs.reduce((sum, job) => sum + job.awValue, 0);
          const totalMinutes = totalAWs * 5;
          
          dayGroups.push({
            date: dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            dateObj,
            jobs: dayJobs,
            totalAWs,
            totalHours: CalculationService.formatTime(totalMinutes),
          });
        });

        // Sort days by date
        dayGroups.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        // Calculate week totals
        const weekTotalAWs = weekJobs.reduce((sum, job) => sum + job.awValue, 0);
        const weekTotalMinutes = weekTotalAWs * 5;

        weekGroups.push({
          weekStart,
          weekEnd,
          days: dayGroups,
          totalAWs: weekTotalAWs,
          totalHours: CalculationService.formatTime(weekTotalMinutes),
        });
      });

      // Sort weeks by start date
      weekGroups.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      // Calculate month totals
      const monthTotalAWs = monthJobs.reduce((sum, job) => sum + job.awValue, 0);
      const monthTotalMinutes = monthTotalAWs * 5;

      monthGroups.push({
        month: monthName,
        year,
        weeks: weekGroups,
        totalAWs: monthTotalAWs,
        totalHours: CalculationService.formatTime(monthTotalMinutes),
      });
    });

    // Sort months by year and month
    monthGroups.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month.localeCompare(b.month);
    });

    return monthGroups;
  },

  /**
   * Get the start of the week (Monday) for a given date
   */
  getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  },

  /**
   * Generate Simple PDF HTML content
   */
  generateSimplePDFHTML(
    jobs: Job[],
    technicianName: string
  ): string {
    const monthGroups = this.groupJobsForSimplePDF(jobs);
    
    // Calculate overall totals
    const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalMinutes = totalAWs * 5;
    const totalHours = CalculationService.formatTime(totalMinutes);
    const totalJobs = jobs.length;

    // Generate HTML for all months
    let monthsHTML = '';
    
    monthGroups.forEach(monthGroup => {
      monthsHTML += `
        <div class="month-section">
          <div class="month-header">
            <h2>📅 ${monthGroup.month}</h2>
            <div class="month-total">
              <span class="total-label">Month Total:</span>
              <span class="total-value">${monthGroup.totalAWs} AWs (${monthGroup.totalHours})</span>
            </div>
          </div>
      `;

      monthGroup.weeks.forEach((weekGroup, weekIndex) => {
        monthsHTML += `
          <div class="week-section">
        `;

        weekGroup.days.forEach(dayGroup => {
          monthsHTML += `
            <div class="day-section">
              <div class="day-header">
                <span class="day-date">${dayGroup.date}</span>
                <span class="day-total">${dayGroup.totalAWs} AWs (${dayGroup.totalHours})</span>
              </div>
              <table class="jobs-table">
                <thead>
                  <tr>
                    <th>WIP Number</th>
                    <th>Work Done</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
          `;

          dayGroup.jobs.forEach(job => {
            const workDone = job.notes || job.jobDescription || '-';
            const jobMinutes = job.awValue * 5;
            const jobHours = CalculationService.formatTime(jobMinutes);
            
            monthsHTML += `
              <tr>
                <td><strong>${job.wipNumber}</strong></td>
                <td>${workDone}</td>
                <td><strong>${jobHours}</strong></td>
              </tr>
            `;
          });

          monthsHTML += `
                </tbody>
              </table>
            </div>
          `;
        });

        // Add week total after Saturday
        monthsHTML += `
          <div class="week-total">
            <span class="week-label">Week Total (Monday - Saturday):</span>
            <span class="week-value">${weekGroup.totalAWs} AWs (${weekGroup.totalHours})</span>
          </div>
        </div>
        `;
      });

      monthsHTML += `
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Records - ${technicianName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.5;
              color: #1f2937;
              padding: 20px;
              background: #ffffff;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #2563eb;
            }
            
            .header h1 {
              font-size: 28px;
              font-weight: 800;
              color: #1f2937;
              margin-bottom: 8px;
            }
            
            .header .technician-name {
              font-size: 18px;
              font-weight: 600;
              color: #2563eb;
              margin-bottom: 12px;
            }
            
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
              padding: 20px;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border-radius: 12px;
              border: 2px solid #bae6fd;
            }
            
            .summary-item {
              text-align: center;
              padding: 12px;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
            }
            
            .summary-item .label {
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
              font-weight: 600;
            }
            
            .summary-item .value {
              font-size: 22px;
              font-weight: 800;
              color: #2563eb;
            }
            
            .month-section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            
            .month-header {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: #ffffff;
              padding: 16px 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .month-header h2 {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
            }
            
            .month-total {
              display: flex;
              gap: 10px;
              align-items: center;
            }
            
            .total-label {
              font-size: 11px;
              font-weight: 500;
              opacity: 0.9;
            }
            
            .total-value {
              font-size: 14px;
              font-weight: 700;
              background: rgba(255, 255, 255, 0.2);
              padding: 6px 12px;
              border-radius: 6px;
            }
            
            .week-section {
              margin-bottom: 25px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .day-section {
              margin-bottom: 15px;
              background: #ffffff;
              border-radius: 6px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .day-header {
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              padding: 10px 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #bae6fd;
            }
            
            .day-date {
              font-size: 12px;
              font-weight: 700;
              color: #0c4a6e;
            }
            
            .day-total {
              font-size: 11px;
              font-weight: 700;
              color: #2563eb;
              background: #ffffff;
              padding: 4px 10px;
              border-radius: 4px;
            }
            
            .jobs-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .jobs-table thead {
              background: #f8fafc;
            }
            
            .jobs-table th {
              text-align: left;
              padding: 10px 15px;
              font-size: 10px;
              font-weight: 700;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .jobs-table td {
              padding: 10px 15px;
              font-size: 11px;
              border-bottom: 1px solid #f3f4f6;
            }
            
            .jobs-table tbody tr:hover {
              background: #f9fafb;
            }
            
            .jobs-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            .week-total {
              margin-top: 15px;
              padding: 12px 15px;
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border: 2px solid #fbbf24;
            }
            
            .week-label {
              font-size: 11px;
              font-weight: 700;
              color: #92400e;
            }
            
            .week-value {
              font-size: 13px;
              font-weight: 800;
              color: #92400e;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            
            .footer p {
              font-size: 10px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            
            .signature {
              margin-top: 15px;
              padding: 12px 24px;
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: #ffffff;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              display: inline-block;
            }
            
            @media print {
              body {
                padding: 10px;
              }
              
              .month-section {
                page-break-inside: avoid;
              }
              
              .week-section {
                page-break-inside: avoid;
              }
              
              .day-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔧 Job Records Report</h1>
            <div class="technician-name">${technicianName}</div>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="label">Total Jobs</div>
              <div class="value">${totalJobs}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total AWs</div>
              <div class="value">${totalAWs}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total Hours</div>
              <div class="value">${totalHours}</div>
            </div>
          </div>
          
          ${monthsHTML}
          
          <div class="footer">
            <p><strong>Technician Records App</strong> v1.0.0</p>
            <p>Professional job tracking for vehicle technicians</p>
            <div class="signature">
              ✍️ ${technicianName}
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Calculate efficiency statistics for pie chart
   */
  calculateEfficiencyStats(jobs: Job[]): {
    vhcGreen: number;
    vhcOrange: number;
    vhcRed: number;
    vhcNone: number;
    totalAWs: number;
  } {
    let vhcGreen = 0;
    let vhcOrange = 0;
    let vhcRed = 0;
    let vhcNone = 0;

    jobs.forEach((job) => {
      const status = (job.vhcStatus || 'N/A').toLowerCase();
      const aws = job.awValue;

      if (status === 'green') {
        vhcGreen += aws;
      } else if (status === 'orange' || status === 'amber') {
        vhcOrange += aws;
      } else if (status === 'red') {
        vhcRed += aws;
      } else {
        vhcNone += aws;
      }
    });

    const totalAWs = vhcGreen + vhcOrange + vhcRed + vhcNone;

    return {
      vhcGreen,
      vhcOrange,
      vhcRed,
      vhcNone,
      totalAWs,
    };
  },

  /**
   * Generate SVG pie chart with modern styling
   */
  generatePieChartSVG(stats: {
    vhcGreen: number;
    vhcOrange: number;
    vhcRed: number;
    vhcNone: number;
    totalAWs: number;
  }): string {
    const { vhcGreen, vhcOrange, vhcRed, vhcNone, totalAWs } = stats;

    if (totalAWs === 0) {
      return `
        <svg width="280" height="280" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="emptyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="140" cy="140" r="100" fill="url(#emptyGradient)" />
          <circle cx="140" cy="140" r="70" fill="#ffffff" />
          <text x="140" y="140" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="600" fill="#6b7280">
            No Data
          </text>
        </svg>
      `;
    }

    // Calculate percentages
    const greenPercent = (vhcGreen / totalAWs) * 100;
    const orangePercent = (vhcOrange / totalAWs) * 100;
    const redPercent = (vhcRed / totalAWs) * 100;
    const nonePercent = (vhcNone / totalAWs) * 100;

    // Modern corporate colors with gradients
    const colors = {
      green: '#10b981',
      greenDark: '#059669',
      orange: '#f59e0b',
      orangeDark: '#d97706',
      red: '#ef4444',
      redDark: '#dc2626',
      none: '#94a3b8',
      noneDark: '#64748b',
    };

    // Calculate pie slices
    const radius = 100;
    const centerX = 140;
    const centerY = 140;

    let currentAngle = -90; // Start at top

    const createSlice = (percent: number, color: string, colorDark: string, id: string): string => {
      if (percent === 0) return '';

      const angle = (percent / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      currentAngle = endAngle;

      return `
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colorDark};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow${id}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="url(#${id})" stroke="#ffffff" stroke-width="3" filter="url(#shadow${id})" />
      `;
    };

    const slices = [
      createSlice(greenPercent, colors.green, colors.greenDark, 'greenGradient'),
      createSlice(orangePercent, colors.orange, colors.orangeDark, 'orangeGradient'),
      createSlice(redPercent, colors.red, colors.redDark, 'redGradient'),
      createSlice(nonePercent, colors.none, colors.noneDark, 'noneGradient'),
    ].join('');

    return `
      <svg width="280" height="280" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
          </linearGradient>
          <filter id="centerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        ${slices}
        <circle cx="${centerX}" cy="${centerY}" r="70" fill="url(#centerGradient)" filter="url(#centerShadow)" stroke="#e5e7eb" stroke-width="2" />
        <text x="${centerX}" y="${centerY - 15}" text-anchor="middle" font-size="38" font-weight="800" fill="#1e293b">
          ${totalAWs}
        </text>
        <text x="${centerX}" y="${centerY + 10}" text-anchor="middle" font-size="14" font-weight="600" fill="#64748b">
          Total AWs
        </text>
      </svg>
    `;
  },

  /**
   * Generate legend HTML for pie chart with modern styling
   */
  generateLegendHTML(stats: {
    vhcGreen: number;
    vhcOrange: number;
    vhcRed: number;
    vhcNone: number;
    totalAWs: number;
  }): string {
    const { vhcGreen, vhcOrange, vhcRed, vhcNone, totalAWs } = stats;

    const createLegendItem = (label: string, value: number, color: string, colorDark: string): string => {
      if (value === 0) return '';
      const percent = totalAWs > 0 ? ((value / totalAWs) * 100).toFixed(1) : '0.0';
      return `
        <div class="legend-item">
          <div class="legend-color-wrapper">
            <div class="legend-color" style="background: linear-gradient(135deg, ${color} 0%, ${colorDark} 100%);"></div>
          </div>
          <div class="legend-content">
            <div class="legend-label">${label}</div>
            <div class="legend-value">${value} AWs</div>
            <div class="legend-percent">${percent}%</div>
          </div>
        </div>
      `;
    };

    return `
      <div class="legend">
        ${createLegendItem('Green VHC', vhcGreen, '#10b981', '#059669')}
        ${createLegendItem('Orange VHC', vhcOrange, '#f59e0b', '#d97706')}
        ${createLegendItem('Red VHC', vhcRed, '#ef4444', '#dc2626')}
        ${createLegendItem('No VHC', vhcNone, '#94a3b8', '#64748b')}
      </div>
    `;
  },

  /**
   * Export to PDF with improved error handling
   */
  async exportToPDF(
    jobs: Job[],
    settings: AppSettings,
    technicianName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log('[ExportService] Generating PDF...');

      // Generate HTML content based on export type
      let html: string;
      if (options.type === 'simple') {
        html = this.generateSimplePDFHTML(jobs, technicianName);
      } else {
        html = this.generatePDFHTML(jobs, settings, technicianName, options);
      }

      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('[ExportService] PDF generated at temp location:', uri);

      // Generate filename
      const filename = this.generateFilename(options, 'pdf');
      
      // Determine storage directory based on platform
      let storageDir = FileSystem.documentDirectory;
      
      // Fallback to cache directory if document directory is not available
      if (!storageDir) {
        storageDir = FileSystem.cacheDirectory;
        console.log('[ExportService] Using cache directory as fallback');
      }

      if (!storageDir) {
        throw new Error('No storage directory available');
      }

      const permanentUri = storageDir + filename;

      // Copy to permanent location
      try {
        await FileSystem.copyAsync({
          from: uri,
          to: permanentUri,
        });
        console.log('[ExportService] PDF copied to permanent location:', permanentUri);
      } catch (copyError: any) {
        console.error('[ExportService] Error copying PDF:', copyError);
        // If copy fails, use the original temp URI
        console.log('[ExportService] Using temp URI for sharing');
      }

      // Share the file
      const fileToShare = permanentUri;
      
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          console.log('[ExportService] Sharing PDF...');
          await Sharing.shareAsync(fileToShare, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Job Records',
            UTI: 'com.adobe.pdf',
          });
          
          return {
            success: true,
            message: 'PDF exported successfully',
            fileUri: fileToShare,
          };
        } else {
          console.log('[ExportService] Sharing not available on this platform');
          
          // On platforms where sharing is not available, just save the file
          if (Platform.OS === 'web') {
            // For web, trigger download
            const link = document.createElement('a');
            link.href = fileToShare;
            link.download = filename;
            link.click();
            
            return {
              success: true,
              message: 'PDF downloaded successfully',
              fileUri: fileToShare,
            };
          }
          
          return {
            success: true,
            message: `PDF saved to: ${fileToShare}`,
            fileUri: fileToShare,
          };
        }
      } catch (shareError: any) {
        console.error('[ExportService] Error sharing PDF:', shareError);
        
        // If sharing fails, at least the file is saved
        return {
          success: true,
          message: `PDF saved but sharing failed. File location: ${fileToShare}`,
          fileUri: fileToShare,
        };
      }
    } catch (error: any) {
      console.error('[ExportService] PDF export error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'PDF export failed';
      
      if (error.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please check app permissions.';
      } else if (error.message?.includes('storage')) {
        errorMessage = 'Storage error. Please check available storage space.';
      } else if (error.message) {
        errorMessage = `PDF export failed: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * Export to JSON
   */
  async exportToJSON(
    jobs: Job[],
    settings: AppSettings,
    technicianName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log('[ExportService] Generating JSON...');

      // Generate JSON data
      const jsonData = this.generateJSONData(jobs, settings, technicianName, options);
      const jsonString = JSON.stringify(jsonData, null, 2);

      // Generate filename
      const filename = this.generateFilename(options, 'json');
      
      // Determine storage directory
      let storageDir = FileSystem.documentDirectory;
      if (!storageDir) {
        storageDir = FileSystem.cacheDirectory;
      }
      
      if (!storageDir) {
        throw new Error('No storage directory available');
      }
      
      const fileUri = storageDir + filename;

      // Write JSON file
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('[ExportService] JSON file created:', fileUri);

      // Share the file
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Job Records',
            UTI: 'public.json',
          });
        }
      } catch (shareError) {
        console.error('[ExportService] Error sharing JSON:', shareError);
      }

      return {
        success: true,
        message: 'JSON exported successfully',
        fileUri,
      };
    } catch (error: any) {
      console.error('[ExportService] JSON export error:', error);
      return {
        success: false,
        message: error?.message || 'JSON export failed',
      };
    }
  },

  /**
   * Generate PDF HTML content with modern corporate styling
   */
  generatePDFHTML(
    jobs: Job[],
    settings: AppSettings,
    technicianName: string,
    options: ExportOptions
  ): string {
    const { type } = options;
    
    // Calculate statistics
    const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalMinutes = totalAWs * 5;
    const totalHours = CalculationService.formatTime(totalMinutes);
    const totalJobs = jobs.length;

    // Calculate efficiency stats for pie chart
    const efficiencyStats = this.calculateEfficiencyStats(jobs);

    // Generate pie chart SVG
    const pieChartSVG = this.generatePieChartSVG(efficiencyStats);

    // Generate legend HTML
    const legendHTML = this.generateLegendHTML(efficiencyStats);

    // Get period title
    const periodTitle = this.getPeriodTitle(options);

    // Sort jobs by date (newest first)
    const sortedJobs = [...jobs].sort((a, b) => 
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );

    // Group jobs by month if exporting all
    const groupedJobs = type === 'all' ? this.groupJobsByMonth(sortedJobs) : null;

    // Generate job rows HTML
    let jobRowsHTML = '';
    
    if (groupedJobs) {
      // Render grouped by month
      Object.keys(groupedJobs).forEach((monthKey) => {
        const monthJobs = groupedJobs[monthKey];
        jobRowsHTML += `
          <tr class="month-separator">
            <td colspan="6">
              <div class="month-badge">
                <span class="month-icon">📅</span>
                <span class="month-text">${monthKey}</span>
              </div>
            </td>
          </tr>
        `;
        
        monthJobs.forEach((job, index) => {
          jobRowsHTML += this.generateJobRowHTML(job, index);
        });
      });
    } else {
      // Render without grouping
      sortedJobs.forEach((job, index) => {
        jobRowsHTML += this.generateJobRowHTML(job, index);
      });
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Records Export - ${periodTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.6;
              color: #1e293b;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
              padding: 40px 20px;
            }
            
            .page-container {
              max-width: 1200px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            
            .header-wrapper {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
              padding: 50px 40px;
              position: relative;
              overflow: hidden;
            }
            
            .header-wrapper::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -10%;
              width: 500px;
              height: 500px;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              border-radius: 50%;
            }
            
            .header-wrapper::after {
              content: '';
              position: absolute;
              bottom: -30%;
              left: -5%;
              width: 400px;
              height: 400px;
              background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
              border-radius: 50%;
            }
            
            .header {
              position: relative;
              z-index: 1;
              text-align: center;
            }
            
            .company-logo {
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
              border-radius: 12px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              margin-bottom: 20px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }
            
            .header h1 {
              font-size: 42px;
              font-weight: 800;
              color: #ffffff;
              margin-bottom: 12px;
              letter-spacing: -1px;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            }
            
            .header h2 {
              font-size: 24px;
              font-weight: 600;
              color: #e0f2fe;
              margin-bottom: 16px;
              letter-spacing: 0.5px;
            }
            
            .header-meta {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 20px;
              flex-wrap: wrap;
            }
            
            .header-meta-item {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #bfdbfe;
              font-size: 12px;
              font-weight: 500;
            }
            
            .header-meta-icon {
              font-size: 16px;
            }
            
            .content-wrapper {
              padding: 40px;
            }
            
            .chart-section {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 16px;
              padding: 40px;
              margin-bottom: 40px;
              border: 2px solid #e2e8f0;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            }
            
            .chart-title {
              text-align: center;
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 30px;
              text-transform: uppercase;
              letter-spacing: 2px;
              position: relative;
              padding-bottom: 15px;
            }
            
            .chart-title::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 80px;
              height: 4px;
              background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
              border-radius: 2px;
            }
            
            .chart-container {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 50px;
              flex-wrap: wrap;
            }
            
            .chart-wrapper {
              flex-shrink: 0;
            }
            
            .legend {
              display: flex;
              flex-direction: column;
              gap: 16px;
              min-width: 240px;
            }
            
            .legend-item {
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 14px 18px;
              background: #ffffff;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              border: 1px solid #e2e8f0;
              transition: all 0.3s ease;
            }
            
            .legend-color-wrapper {
              flex-shrink: 0;
            }
            
            .legend-color {
              width: 24px;
              height: 24px;
              border-radius: 6px;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            }
            
            .legend-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            
            .legend-label {
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
            }
            
            .legend-value {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
            }
            
            .legend-percent {
              font-size: 10px;
              font-weight: 500;
              color: #94a3b8;
            }
            
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 40px;
            }
            
            .summary-card {
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border: 2px solid #e2e8f0;
              border-radius: 14px;
              padding: 24px;
              text-align: center;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
              position: relative;
              overflow: hidden;
            }
            
            .summary-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
            }
            
            .summary-card .label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              margin-bottom: 12px;
              font-weight: 700;
            }
            
            .summary-card .value {
              font-size: 36px;
              font-weight: 800;
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              line-height: 1;
            }
            
            .table-section {
              margin-bottom: 40px;
            }
            
            .table-header {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 20px;
              padding-bottom: 12px;
              border-bottom: 3px solid #e2e8f0;
            }
            
            .table-container {
              border-radius: 14px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
              border: 2px solid #e2e8f0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              background: #ffffff;
            }
            
            thead {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            }
            
            th {
              color: #ffffff;
              font-weight: 700;
              text-align: left;
              padding: 16px 18px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-bottom: 3px solid #1e40af;
            }
            
            td {
              padding: 16px 18px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 12px;
              color: #334155;
            }
            
            tbody tr {
              transition: background-color 0.2s ease;
            }
            
            tbody tr:nth-child(even) {
              background-color: #f8fafc;
            }
            
            tbody tr:hover {
              background-color: #e0f2fe !important;
            }
            
            tbody tr:last-child td {
              border-bottom: none;
            }
            
            .month-separator {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
            }
            
            .month-separator td {
              padding: 0 !important;
              border-bottom: none !important;
            }
            
            .month-badge {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 16px 20px;
              font-weight: 800;
              font-size: 14px;
              color: #1e40af;
            }
            
            .month-icon {
              font-size: 20px;
            }
            
            .month-text {
              letter-spacing: 0.5px;
            }
            
            .vhc-badge {
              display: inline-block;
              padding: 6px 14px;
              border-radius: 8px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            }
            
            .vhc-green {
              background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
              color: #065f46;
              border: 1px solid #6ee7b7;
            }
            
            .vhc-orange {
              background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
              color: #92400e;
              border: 1px solid #fb923c;
            }
            
            .vhc-red {
              background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
              color: #991b1b;
              border: 1px solid #fca5a5;
            }
            
            .vhc-none {
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
              color: #475569;
              border: 1px solid #cbd5e1;
            }
            
            .footer {
              margin-top: 50px;
              padding: 40px;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-top: 3px solid #e2e8f0;
              text-align: center;
            }
            
            .footer-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            
            .footer-logo {
              width: 50px;
              height: 50px;
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              border-radius: 10px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
            }
            
            .footer p {
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
            }
            
            .footer-brand {
              font-weight: 800;
              color: #1e293b;
              font-size: 13px;
            }
            
            .signature-section {
              margin-top: 30px;
              padding-top: 30px;
              border-top: 2px solid #e2e8f0;
            }
            
            .signature {
              display: inline-block;
              padding: 18px 36px;
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: #ffffff;
              border-radius: 10px;
              font-size: 15px;
              font-weight: 700;
              box-shadow: 0 6px 20px rgba(30, 64, 175, 0.3);
              letter-spacing: 0.5px;
            }
            
            .signature-icon {
              margin-right: 8px;
              font-size: 18px;
            }
            
            .confidential-notice {
              margin-top: 20px;
              padding: 16px;
              background: #fef3c7;
              border: 2px solid #fbbf24;
              border-radius: 8px;
              font-size: 10px;
              color: #92400e;
              font-weight: 600;
              text-align: center;
            }
            
            @media print {
              body {
                padding: 0;
                background: #ffffff;
              }
              
              .page-container {
                box-shadow: none;
                border-radius: 0;
              }
              
              .summary {
                page-break-inside: avoid;
              }
              
              .chart-section {
                page-break-inside: avoid;
              }
              
              table {
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              thead {
                display: table-header-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header-wrapper">
              <div class="header">
                <div class="company-logo">🔧</div>
                <h1>Technician Records</h1>
                <h2>${technicianName || 'Professional Technician'}</h2>
                <div class="header-meta">
                  <div class="header-meta-item">
                    <span class="header-meta-icon">📊</span>
                    <span>${periodTitle}</span>
                  </div>
                  <div class="header-meta-item">
                    <span class="header-meta-icon">📅</span>
                    <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div class="header-meta-item">
                    <span class="header-meta-icon">🕐</span>
                    <span>${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="content-wrapper">
              <div class="chart-section">
                <div class="chart-title">⚡ Efficiency Analysis</div>
                <div class="chart-container">
                  <div class="chart-wrapper">
                    ${pieChartSVG}
                  </div>
                  ${legendHTML}
                </div>
              </div>
              
              <div class="summary">
                <div class="summary-card">
                  <div class="label">Total Jobs</div>
                  <div class="value">${totalJobs}</div>
                </div>
                <div class="summary-card">
                  <div class="label">Total AWs</div>
                  <div class="value">${totalAWs}</div>
                </div>
                <div class="summary-card">
                  <div class="label">Total Time</div>
                  <div class="value">${totalHours}</div>
                </div>
                <div class="summary-card">
                  <div class="label">Avg AWs/Job</div>
                  <div class="value">${totalJobs > 0 ? (totalAWs / totalJobs).toFixed(1) : '0'}</div>
                </div>
              </div>
              
              <div class="table-section">
                <div class="table-header">📋 Detailed Job Records</div>
                <div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>📅 Date</th>
                        <th>🔢 WIP Number</th>
                        <th>🚗 Vehicle Reg</th>
                        <th>🔍 VHC Status</th>
                        <th>📝 Description</th>
                        <th>⚙️ AWs</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${jobRowsHTML}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-content">
                <div class="footer-logo">🔧</div>
                <p class="footer-brand">Technician Records App</p>
                <p>Professional job tracking and reporting system for vehicle technicians</p>
                <p>Version 1.0.0 • Confidential Document</p>
                
                <div class="signature-section">
                  <div class="signature">
                    <span class="signature-icon">✍️</span>
                    <span>Digitally Signed by ${technicianName || 'Technician'}</span>
                  </div>
                </div>
                
                <div class="confidential-notice">
                  ⚠️ CONFIDENTIAL: This document contains proprietary information. Unauthorized distribution is prohibited.
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generate a single job row HTML with modern styling
   */
  generateJobRowHTML(job: Job, index: number): string {
    const date = new Date(job.dateCreated).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const vhcStatus = job.vhcStatus || 'N/A';
    const vhcClass = this.getVHCClass(vhcStatus);
    const description = job.notes || job.jobDescription || '-';

    return `
      <tr>
        <td><strong>${date}</strong></td>
        <td><strong>${job.wipNumber}</strong></td>
        <td><strong>${job.vehicleRegistration}</strong></td>
        <td><span class="vhc-badge ${vhcClass}">${vhcStatus}</span></td>
        <td>${description}</td>
        <td><strong>${job.awValue}</strong></td>
      </tr>
    `;
  },

  /**
   * Get VHC CSS class
   */
  getVHCClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'green':
        return 'vhc-green';
      case 'orange':
      case 'amber':
        return 'vhc-orange';
      case 'red':
        return 'vhc-red';
      default:
        return 'vhc-none';
    }
  },

  /**
   * Group jobs by month
   */
  groupJobsByMonth(jobs: Job[]): Record<string, Job[]> {
    const grouped: Record<string, Job[]> = {};

    jobs.forEach((job) => {
      const date = new Date(job.dateCreated);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }

      grouped[monthKey].push(job);
    });

    return grouped;
  },

  /**
   * Generate JSON data
   */
  generateJSONData(
    jobs: Job[],
    settings: AppSettings,
    technicianName: string,
    options: ExportOptions
  ): any {
    const { type } = options;
    const periodTitle = this.getPeriodTitle(options);

    // Sort jobs by date (newest first)
    const sortedJobs = [...jobs].sort((a, b) => 
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );

    // Map jobs to the standard format
    const formattedJobs = sortedJobs.map((job) => ({
      wipNumber: job.wipNumber,
      vehicleReg: job.vehicleRegistration,
      vhcStatus: job.vhcStatus || 'NONE',
      description: job.notes || job.jobDescription || '',
      aws: job.awValue,
      jobDateTime: job.dateCreated,
    }));

    return {
      jobs: formattedJobs,
      metadata: {
        exportType: type,
        period: periodTitle,
        technicianName,
        exportDate: new Date().toISOString(),
        totalJobs: jobs.length,
        totalAWs: jobs.reduce((sum, job) => sum + job.awValue, 0),
        appVersion: '1.0.0',
        platform: Platform.OS,
      },
    };
  },

  /**
   * Get period title
   */
  getPeriodTitle(options: ExportOptions): string {
    const { type, selectedDate, selectedMonth, selectedYear, selectedWeek } = options;

    switch (type) {
      case 'daily':
        return selectedDate 
          ? `Daily Report - ${selectedDate.toLocaleDateString()}`
          : 'Daily Report';

      case 'weekly':
        if (selectedWeek) {
          const start = selectedWeek.start.toLocaleDateString();
          const end = selectedWeek.end.toLocaleDateString();
          return `Weekly Report - ${start} to ${end}`;
        }
        return 'Weekly Report';

      case 'monthly':
        if (selectedMonth !== undefined && selectedYear !== undefined) {
          const date = new Date(selectedYear, selectedMonth, 1);
          return `Monthly Report - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        }
        return 'Monthly Report';

      case 'all':
        return 'Complete Job History';

      case 'simple':
        return 'Simple Job List';

      default:
        return 'Job Records Export';
    }
  },

  /**
   * Generate filename
   */
  generateFilename(options: ExportOptions, extension: string): string {
    const { type, selectedDate, selectedMonth, selectedYear } = options;
    const timestamp = new Date().toISOString().split('T')[0];

    let prefix = 'jobs';

    switch (type) {
      case 'daily':
        prefix = selectedDate 
          ? `jobs-daily-${selectedDate.toISOString().split('T')[0]}`
          : `jobs-daily-${timestamp}`;
        break;

      case 'weekly':
        prefix = `jobs-weekly-${timestamp}`;
        break;

      case 'monthly':
        if (selectedMonth !== undefined && selectedYear !== undefined) {
          const monthStr = String(selectedMonth + 1).padStart(2, '0');
          prefix = `jobs-monthly-${selectedYear}-${monthStr}`;
        } else {
          prefix = `jobs-monthly-${timestamp}`;
        }
        break;

      case 'all':
        prefix = `jobs-all-${timestamp}`;
        break;

      case 'simple':
        prefix = `jobs-simple-${timestamp}`;
        break;
    }

    return `${prefix}.${extension}`;
  },

  /**
   * Get available months from jobs
   */
  getAvailableMonths(jobs: Job[]): { month: number; year: number; label: string; count: number }[] {
    const monthMap = new Map<string, { month: number; year: number; count: number }>();

    jobs.forEach((job) => {
      const date = new Date(job.dateCreated);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${month}`;

      if (monthMap.has(key)) {
        const existing = monthMap.get(key)!;
        monthMap.set(key, { ...existing, count: existing.count + 1 });
      } else {
        monthMap.set(key, { month, year, count: 1 });
      }
    });

    const result = Array.from(monthMap.values()).map((item) => {
      const date = new Date(item.year, item.month, 1);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { ...item, label };
    });

    // Sort by year and month (newest first)
    return result.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  },

  /**
   * Get week range for a given date
   */
  getWeekRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // End of week (Saturday)
    end.setHours(23, 59, 59, 999);

    return { start, end };
  },
};
