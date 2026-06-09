import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TelegramLinkModal } from '../telegram/TelegramLinkModal';
import { apiFetch } from '../../lib/api';
import { getUserAvatarUrl } from '../../lib/avatar';
import { roleLabel, useAuth } from '../../lib/auth';
import { useSystemSettings } from '../../lib/systemSettings';
import { TasksNavGroup } from './TasksNavGroup';

const mainNav = [
  { to: '/', label: 'Tổng quan', icon: 'bx-grid-alt', end: true },
  { to: '/finance', label: 'Affiliate (Doanh thu)', icon: 'bx-link', end: false },
  { to: '/reports', label: 'Báo cáo ngày', icon: 'bx-notepad', end: false },
];

const manageNav = [
  { to: '/costs', label: 'Chi phí', icon: 'bx-wallet', end: false },
  { to: '/attendance', label: 'Chấm công', icon: 'bx-time-five', end: false },
  { to: '/hr', label: 'Nhân sự', icon: 'bx-user-pin', end: false },
  { to: '/system', label: 'Hệ thống', icon: 'bx-cog', end: false },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavItem({
  to,
  label,
  icon,
  end,
  onClose,
}: {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  onClose: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
    >
      <span className="menu-item-link-inner">
        <i className={`bx ${icon}`} />
        <span>{label}</span>
      </span>
    </NavLink>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, token, login, logout, canAccess } = useAuth();
  const { logoUrl, settings } = useSystemSettings();
  const showManage =
    canAccess('/costs') || canAccess('/attendance') || canAccess('/hr') || canAccess('/system');
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const needsTelegram = !!user && !user.telegram?.trim();

  useEffect(() => {
    if (!token || !user) return;
    apiFetch<{ telegram?: string | null; avatar?: string | null; name?: string }>(
      '/api/users/me'
    ).then(({ ok, data }) => {
      if (!ok) return;
      const tg = data.telegram?.trim() || null;
      const av = data.avatar?.trim() || null;
      if (
        tg !== (user.telegram?.trim() || null) ||
        av !== (user.avatar?.trim() || null) ||
        (data.name && data.name !== user.name)
      ) {
        login(token, { ...user, telegram: tg, avatar: av, name: data.name || user.name });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync telegram once per session
  }, [token]);

  return (
    <aside id="sidebar" className={`sidebar${open ? ' active' : ''}`}>
      <div className="sidebar-header">
        <button
          type="button"
          className="close-btn-mobile"
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <i className="bx bx-x" />
        </button>
        <div className="logo sidebar-logo">
          <NavLink to="/" onClick={onClose} className="logo-link sidebar-logo-link">
            <img
              src={logoUrl}
              alt={settings.appName}
              className="logo-img sidebar-logo-img"
            />
          </NavLink>
        </div>
      </div>

      <div className="sidebar-menu">
        <p className="menu-label">Chính</p>
        {mainNav.map(
          (item) =>
            canAccess(item.to) && (
              <NavItem key={item.to} {...item} onClose={onClose} />
            )
        )}
        <TasksNavGroup onClose={onClose} />

        {showManage && (
          <>
            <p className="menu-label">Quản lý</p>
            {manageNav.map(
              (item) =>
                canAccess(item.to) && (
                  <NavItem key={item.to} {...item} onClose={onClose} />
                )
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        {needsTelegram && (
          <button
            type="button"
            className="sidebar-telegram-link"
            onClick={() => setTelegramModalOpen(true)}
          >
            <i className="bx bxl-telegram" />
            Liên kết Telegram
          </button>
        )}
        {user && (
          <div className="sidebar-user-row">
            <div className="sidebar-user-info">
              <img
                src={getUserAvatarUrl(user.name, user.avatar)}
                alt=""
                className="sidebar-user-avatar"
              />
              <div className="sidebar-user-text">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-role">{roleLabel(user.role)}</div>
              </div>
            </div>
            <div className="sidebar-user-actions">
              <NavLink
                to="/settings"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-settings-icon-btn${isActive ? ' active' : ''}`
                }
                aria-label="Cài đặt"
                title="Cài đặt"
              >
                <i className="bx bx-cog" />
              </NavLink>
              <button
                type="button"
                className="sidebar-logout-icon-btn"
                onClick={logout}
                aria-label="Đăng xuất"
                title="Đăng xuất"
              >
                <i className="bx bx-log-out" />
              </button>
            </div>
          </div>
        )}
      </div>

      <TelegramLinkModal
        open={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
      />
    </aside>
  );
}
