import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, loading, canAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--slate-500)',
        }}
      >
        Đang tải...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.status && user.status !== 'APPROVED') {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
