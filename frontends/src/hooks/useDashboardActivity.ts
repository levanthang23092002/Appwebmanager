import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatNotificationTime } from '../lib/notifications';

export type DashboardActivityKind =
  | 'task_assigned'
  | 'task_done'
  | 'task_review'
  | 'task_rejected'
  | 'cost_created'
  | 'cost_approved'
  | 'cost_canceled'
  | 'user_registered';

export interface DashboardActivity {
  id: string;
  kind: DashboardActivityKind;
  dotClass: 'indigo-bg' | 'purple-bg' | 'green-bg' | 'slate-bg';
  actor: string;
  text: string;
  detail: string;
  createdAt: string;
}

interface ActivityResponse {
  items: DashboardActivity[];
}

export function useDashboardActivity() {
  const { token, loading: authLoading } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const { ok, data } = await apiFetch<ActivityResponse>('/api/dashboard/activity?limit=12');
      if (ok && Array.isArray(data.items)) setItems(data.items);
      else if (!silent) setItems([]);
    } catch {
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return;
    void load();
  }, [authLoading, token, load, location.key]);

  return {
    items,
    loading,
    formatTime: formatNotificationTime,
    refresh: load,
  };
}
