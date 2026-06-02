import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { NotificationsResponse } from '../lib/notifications';
import { useServerEvents } from './useServerEvents';

export function useNotifications() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationsResponse['items']>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const { ok, data } = await apiFetch<NotificationsResponse>('/api/notifications');
      if (ok) {
        setItems(data.items);
      }
    } catch {
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load({ silent: false });
  }, [load]);

  useServerEvents({
    token,
    path: '/api/notifications/events',
    eventName: 'notifications',
    pollMs: 0,
    onEvent: () => {
      void loadRef.current({ silent: true });
    },
  });

  return { items, count: items.length, loading, refresh: load };
}
