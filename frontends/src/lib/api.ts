const port =
  typeof localStorage !== 'undefined' && localStorage.getItem('API_PORT')
    ? localStorage.getItem('API_PORT')
    : import.meta.env.VITE_API_PORT || '3001';

export const API_BASE = `http://localhost:${port}`;

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return true;
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('user_token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
  return { ok: res.ok, status: res.status, data };
}
