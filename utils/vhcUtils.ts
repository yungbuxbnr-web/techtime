
import { VHCStatus, VHCColors, VHCSummary, Job } from '../types';

// VHC Color Constants
export const VHC_COLORS: VHCColors = {
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
};

// Map new VHC status format to old format
export function mapVHCStatus(status?: string): VHCStatus | undefined {
  if (!status) return undefined;
  
  const normalized = status.toLowerCase();
  
  switch (normalized) {
    case 'red':
      return 'red';
    case 'orange':
    case 'amber':
      return 'amber';
    case 'green':
      return 'green';
    default:
      return undefined;
  }
}

// Get VHC color based on status
export function getVHCColor(status?: VHCStatus): string | null {
  if (!status) return null;
  return VHC_COLORS[status];
}

// Get VHC label based on status
export function getVHCLabel(status?: VHCStatus): string {
  if (!status) return 'Not Set';
  
  switch (status) {
    case 'green':
      return 'Green • OK';
    case 'amber':
      return 'Amber • Needs Attention';
    case 'red':
      return 'Red • Urgent';
    default:
      return 'Not Set';
  }
}

// Get VHC short label (for compact displays)
export function getVHCShortLabel(status?: VHCStatus): string {
  if (!status) return 'Not Set';
  
  switch (status) {
    case 'green':
      return 'OK';
    case 'amber':
      return 'Attention';
    case 'red':
      return 'Urgent';
    default:
      return 'Not Set';
  }
}

// Calculate VHC summary from jobs
export function calculateVHCSummary(jobs: Job[]): VHCSummary {
  const summary: VHCSummary = {
    total: jobs.length,
    green: 0,
    amber: 0,
    red: 0,
    notSet: 0,
  };

  jobs.forEach(job => {
    if (job.vhcStatus === 'green') {
      summary.green++;
    } else if (job.vhcStatus === 'amber') {
      summary.amber++;
    } else if (job.vhcStatus === 'red') {
      summary.red++;
    } else {
      summary.notSet++;
    }
  });

  return summary;
}

// Filter jobs by VHC status
export function filterJobsByVHC(jobs: Job[], filter: VHCStatus | 'all' | 'notset'): Job[] {
  if (filter === 'all') {
    return jobs;
  }
  
  if (filter === 'notset') {
    return jobs.filter(job => !job.vhcStatus);
  }
  
  return jobs.filter(job => job.vhcStatus === filter);
}

// Sort jobs by VHC status (Red → Amber → Green → Not Set)
export function sortJobsByVHC(jobs: Job[]): Job[] {
  const statusOrder: Record<string, number> = {
    red: 1,
    amber: 2,
    green: 3,
    notset: 4,
  };

  return [...jobs].sort((a, b) => {
    const aStatus = a.vhcStatus || 'notset';
    const bStatus = b.vhcStatus || 'notset';
    return statusOrder[aStatus] - statusOrder[bStatus];
  });
}

// Sort jobs by WIP number
export function sortJobsByWIP(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => a.wipNumber.localeCompare(b.wipNumber));
}

// Sort jobs by registration
export function sortJobsByReg(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => 
    a.vehicleRegistration.localeCompare(b.vehicleRegistration)
  );
}

// Generate VHC dot SVG for PDF
export function generateVHCDotSVG(status?: VHCStatus, size: number = 10): string {
  const color = getVHCColor(status);
  if (!color) return '';
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/>
  </svg>`;
}

// Get accessibility label for VHC status
export function getVHCAccessibilityLabel(status?: VHCStatus): string {
  if (!status) return 'No vehicle health check status';
  
  switch (status) {
    case 'green':
      return 'VHC: Green - Vehicle OK';
    case 'amber':
      return 'VHC: Amber - Vehicle needs attention';
    case 'red':
      return 'VHC: Red - Vehicle urgent';
    default:
      return 'No vehicle health check status';
  }
}
