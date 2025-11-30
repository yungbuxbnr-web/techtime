
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
   * Generate SVG pie chart
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
        <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <circle cx="150" cy="150" r="100" fill="#e5e7eb" />
          <text x="150" y="150" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="#6b7280">
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

    // Colors
    const colors = {
      green: '#10b981',
      orange: '#f59e0b',
      red: '#ef4444',
      none: '#9ca3af',
    };

    // Calculate pie slices
    const radius = 100;
    const centerX = 150;
    const centerY = 150;

    let currentAngle = -90; // Start at top

    const createSlice = (percent: number, color: string): string => {
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
        <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${color}" stroke="#ffffff" stroke-width="2" />
      `;
    };

    const slices = [
      createSlice(greenPercent, colors.green),
      createSlice(orangePercent, colors.orange),
      createSlice(redPercent, colors.red),
      createSlice(nonePercent, colors.none),
    ].join('');

    return `
      <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        ${slices}
        <circle cx="${centerX}" cy="${centerY}" r="60" fill="#ffffff" />
        <text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="32" font-weight="700" fill="#1f2937">
          ${totalAWs}
        </text>
        <text x="${centerX}" y="${centerY + 15}" text-anchor="middle" font-size="14" fill="#6b7280">
          Total AWs
        </text>
      </svg>
    `;
  },

  /**
   * Generate legend HTML for pie chart
   */
  generateLegendHTML(stats: {
    vhcGreen: number;
    vhcOrange: number;
    vhcRed: number;
    vhcNone: number;
    totalAWs: number;
  }): string {
    const { vhcGreen, vhcOrange, vhcRed, vhcNone, totalAWs } = stats;

    const createLegendItem = (label: string, value: number, color: string): string => {
      if (value === 0) return '';
      const percent = totalAWs > 0 ? ((value / totalAWs) * 100).toFixed(1) : '0.0';
      return `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${color};"></div>
          <div class="legend-label">${label}</div>
          <div class="legend-value">${value} AWs (${percent}%)</div>
        </div>
      `;
    };

    return `
      <div class="legend">
        ${createLegendItem('Green VHC', vhcGreen, '#10b981')}
        ${createLegendItem('Orange VHC', vhcOrange, '#f59e0b')}
        ${createLegendItem('Red VHC', vhcRed, '#ef4444')}
        ${createLegendItem('No VHC', vhcNone, '#9ca3af')}
      </div>
    `;
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
   * Generate PDF HTML content with modern styling and pie chart
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
          <tr style="background-color: #e0f2fe;">
            <td colspan="6" style="padding: 14px; font-weight: 700; font-size: 13px; border-bottom: 3px solid #0ea5e9; color: #0c4a6e;">
              📅 ${monthKey}
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
              padding: 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .page-wrapper {
              background: #ffffff;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 4px solid transparent;
              background: linear-gradient(90deg, #667eea, #764ba2);
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            
            .header h1 {
              font-size: 36px;
              font-weight: 800;
              margin-bottom: 12px;
              letter-spacing: -0.5px;
            }
            
            .header h2 {
              font-size: 22px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 8px;
              -webkit-text-fill-color: #1f2937;
            }
            
            .header p {
              font-size: 13px;
              color: #6b7280;
              -webkit-text-fill-color: #6b7280;
            }
            
            .chart-section {
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border-radius: 16px;
              padding: 30px;
              margin-bottom: 40px;
              box-shadow: 0 4px 20px rgba(14, 165, 233, 0.15);
              border: 2px solid #bae6fd;
            }
            
            .chart-title {
              text-align: center;
              font-size: 20px;
              font-weight: 700;
              color: #0c4a6e;
              margin-bottom: 25px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .chart-container {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 40px;
              flex-wrap: wrap;
            }
            
            .chart-wrapper {
              flex-shrink: 0;
            }
            
            .legend {
              display: flex;
              flex-direction: column;
              gap: 12px;
              min-width: 200px;
            }
            
            .legend-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px 16px;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              transition: transform 0.2s;
            }
            
            .legend-color {
              width: 20px;
              height: 20px;
              border-radius: 4px;
              flex-shrink: 0;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .legend-label {
              font-size: 12px;
              font-weight: 600;
              color: #374151;
              flex: 1;
            }
            
            .legend-value {
              font-size: 11px;
              font-weight: 700;
              color: #6b7280;
              white-space: nowrap;
            }
            
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 40px;
            }
            
            .summary-card {
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              transition: transform 0.2s;
            }
            
            .summary-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
            }
            
            .summary-card .label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
              font-weight: 600;
            }
            
            .summary-card .value {
              font-size: 28px;
              font-weight: 800;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            
            .table-container {
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              margin-bottom: 40px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
            }
            
            th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              font-weight: 700;
              text-align: left;
              padding: 16px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            td {
              padding: 14px 16px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }
            
            tr:hover {
              background: #f1f5f9 !important;
            }
            
            tr:last-child td {
              border-bottom: none;
            }
            
            .vhc-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .vhc-green {
              background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
              color: #065f46;
            }
            
            .vhc-orange {
              background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
              color: #92400e;
            }
            
            .vhc-red {
              background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
              color: #991b1b;
            }
            
            .vhc-none {
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              color: #6b7280;
            }
            
            .footer {
              margin-top: 50px;
              padding-top: 30px;
              border-top: 3px solid #e5e7eb;
              text-align: center;
            }
            
            .footer-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
            }
            
            .footer p {
              font-size: 11px;
              color: #6b7280;
            }
            
            .signature {
              margin-top: 20px;
              padding: 16px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 700;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            
            .watermark {
              position: fixed;
              bottom: 20px;
              right: 20px;
              opacity: 0.1;
              font-size: 80px;
              font-weight: 900;
              color: #667eea;
              transform: rotate(-15deg);
              pointer-events: none;
            }
            
            @media print {
              body {
                padding: 10px;
                background: #ffffff;
              }
              
              .page-wrapper {
                box-shadow: none;
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
              
              .watermark {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-wrapper">
            <div class="header">
              <h1>🔧 Technician Records</h1>
              <h2>${technicianName || 'Technician'}</h2>
              <p>${periodTitle}</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="chart-section">
              <div class="chart-title">⚡ Efficiency Breakdown</div>
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
            
            <div class="footer">
              <div class="footer-content">
                <p><strong>Technician Records App</strong> v1.0.0</p>
                <p>Professional job tracking for vehicle technicians</p>
                <div class="signature">
                  ✍️ Digitally signed by ${technicianName || 'Technician'}
                </div>
              </div>
            </div>
          </div>
          
          <div class="watermark">TECH</div>
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
