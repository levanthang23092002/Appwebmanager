import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import {
  formatNotificationTime,
  NOTIFICATION_ICONS,
  type AppNotification,
} from '../../lib/notifications';

function NotificationItem({ item, onNavigate }: { item: AppNotification; onNavigate: () => void }) {
  return (
    <Link to={item.href} className="notif-item" onClick={onNavigate}>
      <span className={`notif-item__icon notif-item__icon--${item.kind}`}>
        <i className={`bx ${NOTIFICATION_ICONS[item.kind]}`} />
      </span>
      <span className="notif-item__body">
        <strong className="notif-item__title">{item.title}</strong>
        <span className="notif-item__message">{item.message}</span>
        <span className="notif-item__time">{formatNotificationTime(item.createdAt)}</span>
      </span>
      <i className="bx bx-chevron-right notif-item__arrow" />
    </Link>
  );
}

export function NotificationDropdown() {
  const { items, count, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const badgeLabel = count > 9 ? '9+' : String(count);

  return (
    <div className="notif-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`icon-btn notification-btn${open ? ' notification-btn--active' : ''}`}
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bx bx-bell" />
        {count > 0 && <span className="badge">{badgeLabel}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Danh sách thông báo">
          <div className="notif-panel__head">
            <h4>Thông báo</h4>
            {count > 0 && <span className="notif-panel__count">{count} việc cần xử lý</span>}
          </div>

          <div className="notif-panel__body">
            {loading && items.length === 0 ? (
              <p className="notif-empty">Đang tải...</p>
            ) : items.length === 0 ? (
              <p className="notif-empty">
                <i className="bx bx-check-circle" />
                Không có việc cần xử lý
              </p>
            ) : (
              items.map((item) => (
                <NotificationItem key={item.id} item={item} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
