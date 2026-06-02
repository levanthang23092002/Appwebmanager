import { useCallback, useEffect, useRef, useState } from 'react';
import { TelegramLinkModal } from '../components/telegram/TelegramLinkModal';
import { apiFetch } from '../lib/api';
import { roleLabel, useAuth } from '../lib/auth';
import { getUserAvatarUrl } from '../lib/avatar';
import type { AuthUser, UserRole, UserStatus } from '../lib/types';

interface Profile extends AuthUser {
  createdAt?: string;
}

type PageMode = 'view' | 'edit';

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã duyệt',
  LOCKED: 'Đã khóa',
};

function statusBadgeClass(status: UserStatus): string {
  if (status === 'APPROVED') return 'settings-badge--approved';
  if (status === 'LOCKED') return 'settings-badge--locked';
  return 'settings-badge--pending';
}

function resetFormFromProfile(
  data: Profile,
  setters: {
    setName: (v: string) => void;
    setEmail: (v: string) => void;
    setAvatar: (v: string) => void;
    setCurrentPassword: (v: string) => void;
    setNewPassword: (v: string) => void;
    setConfirmPassword: (v: string) => void;
  }
) {
  setters.setName(data.name);
  setters.setEmail(data.email);
  setters.setAvatar(data.avatar?.trim() || '');
  setters.setCurrentPassword('');
  setters.setNewPassword('');
  setters.setConfirmPassword('');
}

export function SettingsPage() {
  const { user, token, login } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<PageMode>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    const { ok, data } = await apiFetch<Profile & { error?: string }>('/api/users/me');
    if (!ok) {
      setError(data.error || 'Không tải được thông tin');
      setLoading(false);
      return;
    }
    setProfile(data);
    resetFormFromProfile(data, {
      setName,
      setEmail,
      setAvatar,
      setCurrentPassword,
      setNewPassword,
      setConfirmPassword,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const enterEditMode = () => {
    if (profile) {
      resetFormFromProfile(profile, {
        setName,
        setEmail,
        setAvatar,
        setCurrentPassword,
        setNewPassword,
        setConfirmPassword,
      });
    }
    setMessage('');
    setError('');
    setMode('edit');
  };

  const cancelEdit = () => {
    if (profile) {
      resetFormFromProfile(profile, {
        setName,
        setEmail,
        setAvatar,
        setCurrentPassword,
        setNewPassword,
        setConfirmPassword,
      });
    }
    setMessage('');
    setError('');
    setMode('view');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    setSaving(true);
    setMessage('');
    setError('');

    const body: Record<string, string> = {
      name: name.trim(),
      email: email.trim(),
      avatar: avatar.trim(),
    };

    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
      body.confirmPassword = confirmPassword;
    }

    const { ok, data } = await apiFetch<Profile & { error?: string }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!ok) {
      setError(data.error || 'Cập nhật thất bại');
      return;
    }

    setProfile(data);
    login(token, {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as UserRole,
      status: data.status,
      telegram: data.telegram ?? null,
      avatar: data.avatar ?? null,
    });
    resetFormFromProfile(data, {
      setName,
      setEmail,
      setAvatar,
      setCurrentPassword,
      setNewPassword,
      setConfirmPassword,
    });
    setMessage('Đã lưu thay đổi thành công');
    setMode('view');
  };

  const isEdit = mode === 'edit';
  const displayName = (isEdit ? name.trim() : profile?.name) || user?.name || '';
  const displayEmail = (isEdit ? email.trim() : profile?.email) || user?.email || '';
  const previewAvatar = getUserAvatarUrl(
    displayName || 'U',
    isEdit ? avatar || profile?.avatar : profile?.avatar
  );
  const telegramLinked = !!profile?.telegram?.trim();

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 256;
      let { width, height } = img;
      if (width > height && width > max) {
        height = Math.round((height * max) / width);
        width = max;
      } else if (height > max) {
        width = Math.round((width * max) / height);
        height = max;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      setAvatar(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="content-wrapper settings-page">
        <div className="settings-loading">
          <i className="bx bx-loader-alt" />
          <span>Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper settings-page">
      <div className="page-header settings-page-header">
        <div>
          <h2 className="page-title">Cài đặt tài khoản</h2>
          <p className="settings-page-desc">
            {isEdit ? 'Chỉnh sửa và bấm Lưu thay đổi' : 'Xem thông tin cá nhân và bảo mật'}
          </p>
        </div>
        <div className="settings-header-actions">
          {isEdit ? (
            <>
              <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                Hủy
              </button>
              <button
                type="submit"
                form="settings-form"
                className="btn btn-primary"
                disabled={saving}
              >
                <i className="bx bx-save" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={enterEditMode}>
              <i className="bx bx-edit-alt" />
              Cập nhật
            </button>
          )}
        </div>
      </div>

      {(message || error) && (
        <div className={`settings-alert${error ? ' settings-alert--error' : ' settings-alert--success'}`}>
          <i className={`bx ${error ? 'bx-error-circle' : 'bx-check-circle'}`} />
          {error || message}
        </div>
      )}

      <form id="settings-form" onSubmit={(e) => void handleSave(e)} className="settings-layout">
        <aside className="settings-hero">
          <div className="settings-hero__banner" />
          <div className="settings-hero__body">
            <div className="settings-hero__avatar-wrap">
              <img src={previewAvatar} alt="" className="settings-hero__avatar" />
              {isEdit && (
                <>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    className="settings-hero__file-input"
                    onChange={onAvatarFile}
                    aria-hidden
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    className="settings-hero__avatar-btn"
                    title="Đổi ảnh đại diện"
                    onClick={() => avatarFileRef.current?.click()}
                  >
                    <i className="bx bx-camera" />
                  </button>
                </>
              )}
            </div>
            <h3 className="settings-hero__name">{displayName}</h3>
            <p className="settings-hero__email">{displayEmail}</p>
            {profile && (
              <div className="settings-hero__badges">
                <span className="settings-badge settings-badge--role">{roleLabel(profile.role)}</span>
                <span className={`settings-badge ${statusBadgeClass(profile.status)}`}>
                  {STATUS_LABEL[profile.status]}
                </span>
              </div>
            )}
            {profile?.createdAt && (
              <p className="settings-hero__since">
                <i className="bx bx-calendar" />
                Tham gia {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
        </aside>

        <div className="settings-body">
          {isEdit && (
            <section className="settings-block">
              <header className="settings-block__head">
                <i className="bx bx-edit" />
                <h4>Chỉnh sửa thông tin</h4>
              </header>
              <div className="settings-block__content">
                <div className="settings-edit-grid">
                  <div className="form-group">
                    <label className="form-label">Họ và tên</label>
                    <input
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email đăng nhập</label>
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <p className="settings-hint-inline">
                  <i className="bx bx-camera" />
                  Bấm icon máy ảnh trên ảnh đại diện để chọn ảnh mới
                </p>
              </div>
            </section>
          )}

          {!isEdit && (
            <section className="settings-block">
              <header className="settings-block__head">
                <i className="bx bx-lock-alt" />
                <h4>Bảo mật</h4>
              </header>
              <div className="settings-block__content">
                <div className="settings-field settings-field--solo">
                  <span className="settings-field__icon">
                    <i className="bx bx-lock" />
                  </span>
                  <div>
                    <span className="settings-field__label">Mật khẩu</span>
                    <span className="settings-field__value settings-field__value--muted">
                      ••••••••
                    </span>
                  </div>
                </div>
                <p className="settings-hint-inline">
                  Bấm <strong>Cập nhật</strong> để đổi mật khẩu hoặc thông tin khác.
                </p>
              </div>
            </section>
          )}

          <section className="settings-block">
            <header className="settings-block__head">
              <i className="bx bxl-telegram" />
              <h4>Telegram</h4>
            </header>
            <div className="settings-block__content settings-telegram-row">
              <div className={`settings-telegram-status${telegramLinked ? ' is-linked' : ''}`}>
                <span className="settings-telegram-status__dot" />
                <div>
                  <strong>{telegramLinked ? 'Đã liên kết' : 'Chưa liên kết'}</strong>
                  <span>
                    {telegramLinked
                      ? 'Nhận thông báo task qua bot'
                      : 'Liên kết để nhận thông báo task'}
                  </span>
                </div>
              </div>
              {!telegramLinked && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setTelegramModalOpen(true)}
                >
                  <i className="bx bxl-telegram" />
                  Liên kết ngay
                </button>
              )}
            </div>
          </section>

          {isEdit && (
            <section className="settings-block">
              <header className="settings-block__head">
                <i className="bx bx-lock-alt" />
                <h4>Đổi mật khẩu</h4>
                <span className="settings-block__optional">Tùy chọn</span>
              </header>
              <div className="settings-block__content">
                <div className="settings-edit-grid settings-edit-grid--3">
                  <div className="form-group">
                    <label className="form-label">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      className="form-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu mới</label>
                    <input
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Xác nhận</label>
                    <input
                      type="password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Nhập lại"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </form>

      <TelegramLinkModal
        open={telegramModalOpen}
        onClose={() => {
          setTelegramModalOpen(false);
          void loadProfile();
        }}
      />
    </div>
  );
}
