import { Link } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import { getUserAvatarUrl } from '../../lib/avatar';
import { useAuth, roleLabel } from '../../lib/auth';

interface TopbarProps {
  searchPlaceholder?: string;
  onMenuClick: () => void;
}

export function Topbar({
  searchPlaceholder = 'Tìm kiếm nhanh...',
  onMenuClick,
}: TopbarProps) {
  const { user } = useAuth();
  const name = user?.name || 'Admin User';
  const role = user?.role ? roleLabel(user.role) : 'Quản lý';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="toggle-btn"
          id="toggleBtn"
          onClick={onMenuClick}
          aria-label="Mở menu"
        >
          <i className="bx bx-menu" />
        </button>
        <div className="search-bar">
          <i className="bx bx-search" />
          <input type="text" placeholder={searchPlaceholder} />
        </div>
      </div>

      <div className="topbar-right">
        <button type="button" className="icon-btn search-mobile-btn" aria-label="Tìm kiếm">
          <i className="bx bx-search" />
        </button>
        <NotificationDropdown />
        <Link to="/settings" className="profile" title="Cài đặt tài khoản">
          <img
            src={getUserAvatarUrl(name, user?.avatar)}
            alt="User"
            className="profile-img"
          />
          <div className="profile-info">
            <h4 className="truncate">{name}</h4>
            <span>{role}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
