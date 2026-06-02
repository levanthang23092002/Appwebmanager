import { useEffect, useRef } from 'react';
import { API_BASE, isTokenExpired } from '../lib/api';

type Options = {
  token: string | null;
  path: string;
  eventName: string;
  onEvent: () => void;
  /** Poll định kỳ (ms) khi tab đang mở; 0 = tắt (chỉ dùng SSE). */
  pollMs?: number;
};

export function useServerEvents({
  token,
  path,
  eventName,
  onEvent,
  pollMs = 0,
}: Options) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token || isTokenExpired(token) || typeof EventSource === 'undefined') return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;
    let retryDelay = 1_000;

    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      onEventRef.current();
    };

    const connect = () => {
      if (disposed) return;
      source?.close();
      source = new EventSource(`${API_BASE}${path}?token=${encodeURIComponent(token)}`);

      source.addEventListener(eventName, () => {
        retryDelay = 1_000;
        refresh();
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (disposed) return;
        reconnectTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };
    };

    connect();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refresh();
      if (!source || source.readyState === EventSource.CLOSED) {
        retryDelay = 1_000;
        connect();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);

    if (pollMs > 0) {
      pollTimer = setInterval(refresh, pollMs);
    }

    return () => {
      disposed = true;
      source?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, path, eventName, pollMs]);
}
