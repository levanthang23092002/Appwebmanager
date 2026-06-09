import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSystemSettings } from '../lib/systemSettings';
import type { AuthUser } from '../lib/types';

export function LoginPage() {
  const { login, token } = useAuth();
  const { logoUrl, settings } = useSystemSettings();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));

    try {
      const { ok, data } = await apiFetch<{ token?: string; user?: AuthUser; error?: string }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );
      if (ok && data.token && data.user) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error || 'Đăng nhập thất bại');
      }
    } catch {
      setError(
        `Lỗi kết nối Backend. Kiểm tra server đang chạy (cổng ${import.meta.env.VITE_API_PORT || '3001'}).`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo-block">
          <img src={logoUrl} alt={settings.appName} className="logo-img" />
        </div>
        <h1 className="auth-title">Chào mừng trở lại</h1>
        <p className="auth-subtitle">Đăng nhập vào Hệ thống Quản trị {settings.appName}</p>

        {error && <p className="auth-msg-error">{error}</p>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email doanh nghiệp</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="admin@eaglerise.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            <i className={`bx ${loading ? 'bx-loader-alt bx-spin' : 'bx-log-in-circle'}`} />
            {loading ? 'Đang tải...' : 'Đăng nhập'}
          </button>
        </form>

        <Link to="/register" className="auth-link">
          Chưa có tài khoản? <span>Đăng ký ngay</span>
        </Link>
      </div>
    </div>
  );
}
