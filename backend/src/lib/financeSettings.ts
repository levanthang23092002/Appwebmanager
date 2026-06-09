import { getSystemSettings, updateSystemSettings } from '@/lib/systemSettings';

export type FinanceSettingsData = {
  usdVndRate: number;
};

export async function getFinanceSettings(): Promise<FinanceSettingsData> {
  const settings = await getSystemSettings();
  return { usdVndRate: settings.usdVndRate };
}

export async function updateFinanceSettings(
  input: Partial<FinanceSettingsData>
): Promise<FinanceSettingsData> {
  const settings = await updateSystemSettings(input);
  return { usdVndRate: settings.usdVndRate };
}
