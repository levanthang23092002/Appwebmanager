import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import defaultLogo from '../assets/logo.png';
import { apiFetch } from './api';
import { DEFAULT_USD_VND_RATE } from './currency';

export const DEFAULT_APP_NAME = 'Eagle Rise';

export type SystemSettings = {
  usdVndRate: number;
  logo: string | null;
  appName: string;
};

interface SystemSettingsContextValue {
  settings: SystemSettings;
  logoUrl: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const defaultSettings: SystemSettings = {
  usdVndRate: DEFAULT_USD_VND_RATE,
  logo: null,
  appName: DEFAULT_APP_NAME,
};

const CACHE_KEY = 'system_settings_v1';

function readCache(): SystemSettings | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SystemSettings;
  } catch {
    return null;
  }
}

function writeCache(data: SystemSettings) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

const SystemSettingsContext = createContext<SystemSettingsContextValue | null>(null);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(() => readCache() ?? defaultSettings);
  const [loading, setLoading] = useState(!readCache());

  const refresh = useCallback(async () => {
    const cached = readCache();
    if (cached) {
      setSettings(cached);
      setLoading(false);
    }

    const { ok, data } = await apiFetch<SystemSettings>('/api/system/settings?lite=1');
    if (ok) {
      setSettings((prev) => ({
        usdVndRate: data.usdVndRate,
        appName: data.appName,
        logo: prev.logo ?? cached?.logo ?? null,
      }));
    }
    setLoading(false);

    const full = await apiFetch<SystemSettings>('/api/system/settings');
    if (full.ok) {
      setSettings(full.data);
      writeCache(full.data);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener('system-settings-updated', onUpdate);
    return () => window.removeEventListener('system-settings-updated', onUpdate);
  }, [refresh]);

  const logoUrl = settings.logo?.trim() || defaultLogo;

  const value = useMemo(
    () => ({ settings, logoUrl, loading, refresh }),
    [settings, logoUrl, loading, refresh]
  );

  return (
    <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const ctx = useContext(SystemSettingsContext);
  if (!ctx) throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  return ctx;
}
