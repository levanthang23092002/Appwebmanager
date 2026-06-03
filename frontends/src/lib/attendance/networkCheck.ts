import { apiFetch } from '../api';

export async function fetchAllowedWifiSsids(): Promise<string[]> {
  const { ok, data } = await apiFetch<{ ssids?: string[] }>('/api/attendance/wifi');
  if (!ok || !data.ssids?.length) return [];
  return data.ssids;
}
