
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Job, AppSettings } from '../types';
import { CalculationService } from './calculations';
import { Platform } from 'react-native';

export type ExportType = 'daily' | 'weekly' | 'monthly' | 'all';
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
        return jobs;

      default:
        return [];
    }
  },

  /**
   * Export to PDF
   */
  async exportToPDF(
    jobs: Job[],
    settings: AppSettings,
    technicianName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log('[ExportService] Generating PDF...');

      // Generate HTML content
      const html = this.generatePDFHTML(jobs, settings, technicianName, options);

      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('[ExportService] PDF generated:', uri);

      // Generate filename
      const filename = this.generateFilename(options, 'pdf');
      
      // Copy to a permanent location
      const permanentUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + filename;
      await FileSystem.copyAsync({
        from: uri,
        to: permanentUri,
      });

      // Share the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(permanentUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Job Records',
          UTI: 'com.adobe.pdf',
        });
      }

      return {
        success: true,
        message: 'PDF exported successfully',
        fileUri: permanentUri,
      };
    } catch (error: any) {
      console.error('[ExportService] PDF export error:', error);
      return {
        success: false,
        message: error?.message || 'PDF export failed',
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
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + filename;

      // Write JSON file
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('[ExportService] JSON file created:', fileUri);

      // Share the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Job Records',
          UTI: 'public.json',
        });
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
   * Generate PDF HTML content
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
          <tr style="background-color: #e3f2fd;">
            <td colspan="6" style="padding: 12px; font-weight: bold; font-size: 14px; border-bottom: 2px solid #2563eb;">
              ${monthKey}
            </td>
          </tr>
        `;
        
        monthJobs.forEach((job, index) => {
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          jobRowsHTML += this.generateJobRowHTML(job, bgColor);
        });
      });
    } else {
      // Render without grouping
      sortedJobs.forEach((job, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        jobRowsHTML += this.generateJobRowHTML(job, bgColor);
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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 12px;
              line-height: 1.6;
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
              font-size: 24px;
              font-weight: 700;
              color: #2563eb;
              margin-bottom: 8px;
            }
            
            .header h2 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 4px;
            }
            
            .header p {
              font-size: 12px;
              color: #6b7280;
            }
            
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            
            .summary-card {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            
            .summary-card .label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            
            .summary-card .value {
              font-size: 20px;
              font-weight: 700;
              color: #2563eb;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            th {
              background: #2563eb;
              color: #ffffff;
              font-weight: 600;
              text-align: left;
              padding: 12px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            
            tr:hover {
              background: #f1f5f9 !important;
            }
            
            .vhc-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
            }
            
            .vhc-green {
              background: #d1fae5;
              color: #065f46;
            }
            
            .vhc-orange {
              background: #fed7aa;
              color: #92400e;
            }
            
            .vhc-red {
              background: #fee2e2;
              color: #991b1b;
            }
            
            .vhc-none {
              background: #e5e7eb;
              color: #6b7280;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
            }
            
            .signature {
              margin-top: 15px;
              font-size: 13px;
              font-weight: 600;
              color: #2563eb;
            }
            
            @media print {
              body {
                padding: 10px;
              }
              
              .summary {
                page-break-inside: avoid;
              }
              
              table {
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Technician Records</h1>
            <h2>${technicianName || 'Technician'}</h2>
            <p>${periodTitle}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
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
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>WIP Number</th>
                <th>Vehicle Reg</th>
                <th>VHC Status</th>
                <th>Description</th>
                <th>AWs</th>
              </tr>
            </thead>
            <tbody>
              ${jobRowsHTML}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Technician Records App v1.0.0</p>
            <p>Professional job tracking for vehicle technicians</p>
            <p class="signature">✍️ Digitally signed by ${technicianName || 'Technician'}</p>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generate a single job row HTML
   */
  generateJobRowHTML(job: Job, bgColor: string): string {
    const date = new Date(job.dateCreated).toLocaleDateString();
    const vhcStatus = job.vhcStatus || 'N/A';
    const vhcClass = this.getVHCClass(vhcStatus);
    const description = job.notes || job.jobDescription || '-';

    return `
      <tr style="background-color: ${bgColor};">
        <td>${date}</td>
        <td><strong>${job.wipNumber}</strong></td>
        <td>${job.vehicleRegistration}</td>
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
