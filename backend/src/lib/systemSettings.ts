import { DEFAULT_USD_VND_RATE, normalizeUsdVndRate } from '@/lib/currency';
import { prisma } from '@/lib/prisma';

export const DEFAULT_APP_NAME = 'Eagle Rise';

export type SystemSettingsData = {
  usdVndRate: number;
  logo: string | null;
  appName: string;
};

function normalizeAppName(raw: unknown, fallback = DEFAULT_APP_NAME): string {
  const name = String(raw ?? fallback).trim();
  return name || fallback;
}

export async function getSystemSettings(): Promise<SystemSettingsData> {
  try {
    const row = await prisma.financeSettings.findUnique({ where: { id: 1 } });
    return {
      usdVndRate: normalizeUsdVndRate(row?.usdVndRate),
      logo: row?.logo?.trim() || null,
      appName: normalizeAppName(row?.appName),
    };
  } catch {
    return {
      usdVndRate: DEFAULT_USD_VND_RATE,
      logo: null,
      appName: DEFAULT_APP_NAME,
    };
  }
}

export async function updateSystemSettings(
  input: Partial<SystemSettingsData>
): Promise<SystemSettingsData> {
  const current = await getSystemSettings();

  const usdVndRate =
    input.usdVndRate !== undefined
      ? normalizeUsdVndRate(input.usdVndRate)
      : current.usdVndRate;
  const logo = input.logo !== undefined ? input.logo?.trim() || null : current.logo;
  const appName =
    input.appName !== undefined ? normalizeAppName(input.appName) : current.appName;

  const row = await prisma.financeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, usdVndRate, logo, appName },
    update: { usdVndRate, logo, appName },
  });

  return {
    usdVndRate: row.usdVndRate,
    logo: row.logo?.trim() || null,
    appName: normalizeAppName(row.appName),
  };
}
