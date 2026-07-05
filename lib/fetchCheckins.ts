import { CheckInData, getMockCheckIns } from './mockData';

export type CheckinsResponse = {
  success: boolean;
  data?: CheckInData[];
  error?: string;
  mode?: 'mock' | 'live';
};

/**
 * Fetches check-in data for the dashboard.
 * On GitHub Pages (static hosting), returns bundled mock data — no server API available.
 */
export async function fetchCheckins(): Promise<CheckinsResponse> {
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true') {
    const checkIns = getMockCheckIns();
    checkIns.sort(
      (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    );
    return { success: true, data: checkIns, mode: 'mock' };
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const response = await fetch(`${basePath}/api/checkins`);
  return response.json();
}
