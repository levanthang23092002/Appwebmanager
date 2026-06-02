import { useState } from 'react';
import { TelegramLinkModal } from '../telegram/TelegramLinkModal';
import { useAuth } from '../../lib/auth';

/** Banner trên Dashboard — mở modal liên kết tự động */
export function TelegramLinkBanner() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!user || user.telegram?.trim()) return null;

  return (
    <>
      <div
        className="telegram-link-banner"
        style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 12,
          border: '1px solid rgba(34, 158, 217, 0.35)',
          background: 'rgba(34, 158, 217, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="bx bxl-telegram" style={{ fontSize: 28, color: '#229ED9' }} />
          <div>
            <div style={{ fontWeight: 700 }}>Chưa liên kết Telegram</div>
            <div style={{ fontSize: 13, color: 'var(--slate-600)' }}>
              Mở bot từ app → bấm Start — tự lưu Telegram ID vào tài khoản
            </div>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          Liên kết ngay
        </button>
      </div>
      <TelegramLinkModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
