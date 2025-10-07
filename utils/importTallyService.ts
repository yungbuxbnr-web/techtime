
import { GoogleDriveService, GoogleDriveFile } from './googleDriveService';
import { BackupData } from './backupService';
import { Job } from '../types';

export interface ImportTallyData {
  backupInfo: {
    fileName: string;
    fileId: string;
    createdDate: string;
    modifiedDate: string;
    fileSize: string;
  };
  jobStats: {
    totalJobs: number;
    totalAWs: number;
    totalTimeMinutes: number;
    totalTimeFormatted: string;
    averageAWsPerJob: number;
    dateRange: {
      earliest: string;
      latest: string;
      span: string;
    };
  };
  monthlyBreakdown: {
    [monthYear: string]: {
      jobs: number;
      aws: number;
      timeMinutes: number;
      timeFormatted: string;
    };
  };
  vehicleBreakdown: {
    [registration: string]: {
      jobs: number;
      aws: number;
      timeMinutes: number;
      timeFormatted: string;
    };
  };
  wipBreakdown: {
    [wipNumber: string]: {
      registration: string;
      aws: number;
      timeMinutes: number;
      timeFormatted: string;
      date: string;
      notes?: string;
    };
  };
  performanceMetrics: {
    utilizationPercentage: number;
    targetHours: number;
    actualHours: number;
    remainingHours: number;
    efficiency: 'Above Target' | 'On Target' | 'Below Target';
  };
}

export const ImportTallyService = {
  /**
   * Import and tally data from a Google Drive backup file
   */
  async importAndTallyFromGoogleDrive(
    accessToken: string,
    fileId: string,
    fileName: string
  ): Promise<{ success: boolean; data?: ImportTallyData; message: string }> {
    try {
      console.log('Starting import and tally process for file:', fileName);

      // First, get file metadata
      const fileMetadata = await this.getFileMetadata(accessToken, fileId);
      if (!fileMetadata.success) {
        return {
          success: false,
          message: fileMetadata.message || 'Failed to get file metadata'
        };
      }

      // Download the backup data
      const downloadResult = await GoogleDriveService.downloadBackup(accessToken, fileId);
      if (!downloadResult.success || !downloadResult.data) {
        return {
          success: false,
          message: downloadResult.message
        };
      }

      // Process and tally the data
      const tallyData = this.processBackupData(downloadResult.data, fileMetadata.metadata!);

      console.log('Import and tally completed successfully');
      return {
        success: true,
        data: tallyData,
        message: `Successfully imported and tallied data from "${fileName}"`
      };

    } catch (error) {
      console.log('Error in import and tally process:', error);
      return {
        success: false,
        message: `Failed to import and tally data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Get file metadata from Google Drive
   */
  async getFileMetadata(
    accessToken: string,
    fileId: string
  ): Promise<{ success: boolean; metadata?: GoogleDriveFile; message?: string }> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,createdTime,modifiedTime,size`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const metadata = await response.json();
        return { success: true, metadata };
      } else {
        const errorText = await response.text();
        console.log('Error getting file metadata:', errorText);
        return {
          success: false,
          message: `Failed to get file metadata: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.log('Error getting file metadata:', error);
      return {
        success: false,
        message: `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Process backup data and generate comprehensive tally
   */
  processBackupData(backupData: BackupData, fileMetadata: GoogleDriveFile): ImportTallyData {
    console.log('Processing backup data for tally...');

    const jobs = backupData.jobs;
    
    // Basic job statistics
    const totalJobs = jobs.length;
    const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalTimeMinutes = totalAWs * 5; // 1 AW = 5 minutes
    const totalTimeFormatted = this.formatTime(totalTimeMinutes);
    const averageAWsPerJob = totalJobs > 0 ? Math.round((totalAWs / totalJobs) * 100) / 100 : 0;

    // Date range analysis
    const dates = jobs.map(job => new Date(job.dateCreated)).sort((a, b) => a.getTime() - b.getTime());
    const earliest = dates.length > 0 ? dates[0].toISOString() : '';
    const latest = dates.length > 0 ? dates[dates.length - 1].toISOString() : '';
    const spanDays = dates.length > 0 ? Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const span = spanDays === 0 ? 'Same day' : `${spanDays} days`;

    // Monthly breakdown
    const monthlyBreakdown: { [monthYear: string]: { jobs: number; aws: number; timeMinutes: number; timeFormatted: string } } = {};
    
    jobs.forEach(job => {
      const date = new Date(job.dateCreated);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyBreakdown[monthYear]) {
        monthlyBreakdown[monthYear] = { jobs: 0, aws: 0, timeMinutes: 0, timeFormatted: '' };
      }
      
      monthlyBreakdown[monthYear].jobs += 1;
      monthlyBreakdown[monthYear].aws += job.awValue;
      monthlyBreakdown[monthYear].timeMinutes += job.awValue * 5;
      monthlyBreakdown[monthYear].timeFormatted = this.formatTime(monthlyBreakdown[monthYear].timeMinutes);
    });

    // Vehicle breakdown
    const vehicleBreakdown: { [registration: string]: { jobs: number; aws: number; timeMinutes: number; timeFormatted: string } } = {};
    
    jobs.forEach(job => {
      const registration = job.vehicleRegistration.toUpperCase();
      
      if (!vehicleBreakdown[registration]) {
        vehicleBreakdown[registration] = { jobs: 0, aws: 0, timeMinutes: 0, timeFormatted: '' };
      }
      
      vehicleBreakdown[registration].jobs += 1;
      vehicleBreakdown[registration].aws += job.awValue;
      vehicleBreakdown[registration].timeMinutes += job.awValue * 5;
      vehicleBreakdown[registration].timeFormatted = this.formatTime(vehicleBreakdown[registration].timeMinutes);
    });

    // WIP breakdown
    const wipBreakdown: { [wipNumber: string]: { registration: string; aws: number; timeMinutes: number; timeFormatted: string; date: string; notes?: string } } = {};
    
    jobs.forEach(job => {
      wipBreakdown[job.wipNumber] = {
        registration: job.vehicleRegistration.toUpperCase(),
        aws: job.awValue,
        timeMinutes: job.awValue * 5,
        timeFormatted: this.formatTime(job.awValue * 5),
        date: job.dateCreated,
        notes: job.notes
      };
    });

    // Performance metrics (assuming 180 hours monthly target)
    const targetHours = 180;
    const actualHours = Math.round((totalTimeMinutes / 60) * 100) / 100;
    const utilizationPercentage = Math.round((actualHours / targetHours) * 100);
    const remainingHours = Math.max(0, targetHours - actualHours);
    
    let efficiency: 'Above Target' | 'On Target' | 'Below Target';
    if (utilizationPercentage >= 100) {
      efficiency = 'Above Target';
    } else if (utilizationPercentage >= 90) {
      efficiency = 'On Target';
    } else {
      efficiency = 'Below Target';
    }

    const tallyData: ImportTallyData = {
      backupInfo: {
        fileName: fileMetadata.name,
        fileId: fileMetadata.id,
        createdDate: fileMetadata.createdTime,
        modifiedDate: fileMetadata.modifiedTime,
        fileSize: fileMetadata.size ? `${Math.round(parseInt(fileMetadata.size) / 1024)} KB` : 'Unknown'
      },
      jobStats: {
        totalJobs,
        totalAWs,
        totalTimeMinutes,
        totalTimeFormatted,
        averageAWsPerJob,
        dateRange: {
          earliest,
          latest,
          span
        }
      },
      monthlyBreakdown,
      vehicleBreakdown,
      wipBreakdown,
      performanceMetrics: {
        utilizationPercentage,
        targetHours,
        actualHours,
        remainingHours,
        efficiency
      }
    };

    console.log('Backup data processing completed:', {
      totalJobs,
      totalAWs,
      totalHours: actualHours,
      monthlyBreakdowns: Object.keys(monthlyBreakdown).length,
      vehicleBreakdowns: Object.keys(vehicleBreakdown).length
    });

    return tallyData;
  },

  /**
   * Format time in minutes to hours and minutes string
   */
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  },

  /**
   * Generate summary report text
   */
  generateSummaryReport(tallyData: ImportTallyData): string {
    const { backupInfo, jobStats, performanceMetrics } = tallyData;
    
    const report = `
TECHTRACE BACKUP IMPORT SUMMARY
================================

File Information:
- File Name: ${backupInfo.fileName}
- File Size: ${backupInfo.fileSize}
- Created: ${new Date(backupInfo.createdDate).toLocaleDateString()}
- Modified: ${new Date(backupInfo.modifiedDate).toLocaleDateString()}

Job Statistics:
- Total Jobs: ${jobStats.totalJobs}
- Total AWs: ${jobStats.totalAWs}
- Total Time: ${jobStats.totalTimeFormatted}
- Average AWs per Job: ${jobStats.averageAWsPerJob}
- Date Range: ${jobStats.dateRange.span}

Performance Metrics:
- Target Hours: ${performanceMetrics.targetHours}h
- Actual Hours: ${performanceMetrics.actualHours}h
- Utilization: ${performanceMetrics.utilizationPercentage}%
- Remaining Hours: ${performanceMetrics.remainingHours}h
- Efficiency: ${performanceMetrics.efficiency}

Monthly Breakdown:
${Object.entries(tallyData.monthlyBreakdown)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, data]) => `- ${month}: ${data.jobs} jobs, ${data.aws} AWs, ${data.timeFormatted}`)
  .join('\n')}

Top Vehicles by Jobs:
${Object.entries(tallyData.vehicleBreakdown)
  .sort(([, a], [, b]) => b.jobs - a.jobs)
  .slice(0, 5)
  .map(([reg, data]) => `- ${reg}: ${data.jobs} jobs, ${data.aws} AWs, ${data.timeFormatted}`)
  .join('\n')}
`;

    return report.trim();
  },

  /**
   * Export tally data to JSON for further processing
   */
  exportTallyToJSON(tallyData: ImportTallyData): string {
    return JSON.stringify(tallyData, null, 2);
  }
};
