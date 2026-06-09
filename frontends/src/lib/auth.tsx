import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { isTokenExpired, setOnUnauthorized } from './api';
import type { AuthUser, UserRole } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  canAccess: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN = 'user_token';
const STORAGE_USER = 'user_info';

function parseUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_TOKEN);
    if (!stored || isTokenExpired(stored)) {
      if (stored) {
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_USER);
      }
      return null;
    }
    return stored;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(STORAGE_TOKEN);
    if (!stored || isTokenExpired(stored)) return null;
    return parseUser(localStorage.getItem(STORAGE_USER));
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_TOKEN);
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
    }
    setLoading(false);
  }, []);

  useLayoutEffect(() => {
    setOnUnauthorized(() => {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      setToken(null);
      setUser(null);
      navigate('/login');
    });
    return () => setOnUnauthorized(null);
  }, [navigate]);

  const login = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem(STORAGE_TOKEN, t);
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const canAccess = useCallback(
    (path: string) => {
      if (!user) return false;
      const role = user.role as UserRole;
      if (path === '/system') return role === 'admin';
      if (role === 'admin') return true;
      if (role === 'manager' && path === '/hr') return false;
      if (role === 'staff' && path === '/hr') return false;
      return true;
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, token, loading, login, logout, canAccess }),
    [user, token, loading, login, logout, canAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: 'Quản trị',
    manager: 'Quản lý',
    staff: 'Nhân viên',
  };
  return map[role] || role;
}
