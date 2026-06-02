import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

export function RegisterPage() {
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    setError('');
    setSuccess('');
    setLoading(true);
    const form = new FormData(formEl);
    const payload = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      telegram: String(form.get('telegram') || '').trim() || undefined,
    };

    try {
      const { ok, data } = await apiFetch<{ message?: string; error?: string }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      if (ok) {
        setSuccess(
          data.message ||
            'Đăng ký thành công! Tài khoản đang chờ Admin duyệt trước khi đăng nhập.'
        );
        formEl.reset();
      } else {
        setError(data.error || 'Đăng ký thất bại');
      }
    } catch {
      setError('Lỗi kết nối Backend. Kiểm tra server đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: 450 }}>
        <div className="auth-logo-block">
          <img src={logoImg} alt="Eagle Rise — Nâng tầm khát vọng" className="logo-img" />
        </div>
        <h1 className="auth-title">Khởi tạo Tài khoản</h1>
        <p className="auth-subtitle">Gia nhập hệ sinh thái Eagle Rise</p>

        {error && <p className="auth-msg-error">{error}</p>}
        {success && <p className="auth-msg-success">{success}</p>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="name">Họ và Tên</label>
            <input id="name" name="name" type="text" placeholder="Nguyễn Văn A" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email doanh nghiệp</label>
            <input id="email" name="email" type="email" placeholder="email@eaglerise.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="telegram">
              Tài khoản Telegram{' '}
              <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>(không bắt buộc)</span>
            </label>
            <input
              id="telegram"
              name="telegram"
              type="text"
              placeholder="@username hoặc số điện thoại"
            />
          </div>
          <p className="auth-hint">
            Sau khi đăng ký, tài khoản ở trạng thái <strong>Đang chờ duyệt</strong>. Admin phê
            duyệt xong mới đăng nhập được.
          </p>
          <button type="submit" className="auth-btn" disabled={loading}>
            <i className={`bx ${loading ? 'bx-loader-alt bx-spin' : 'bx-user-plus'}`} />
            {loading ? 'Đang gửi...' : 'Đăng ký Tài khoản'}
          </button>
        </form>

        <Link to="/login" className="auth-link">
          Đã có tài khoản? <span>Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}
