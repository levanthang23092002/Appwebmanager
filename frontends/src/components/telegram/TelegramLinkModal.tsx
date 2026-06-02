import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface TelegramLinkModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'prepare' | 'open_bot' | 'waiting' | 'linked' | 'error';

export function TelegramLinkModal({ open, onClose }: TelegramLinkModalProps) {
  const { user, login, token } = useAuth();
  const [step, setStep] = useState<Step>('prepare');
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkLinked = useCallback(async () => {
    const { ok, data } = await apiFetch<{
      linked?: boolean;
      telegram?: string | null;
      pending?: boolean;
    }>('/api/users/me/telegram-sync', { method: 'POST' });

    if (ok && data.linked && data.telegram && token && user) {
      login(token, { ...user, telegram: data.telegram });
      setStep('linked');
      stopPoll();
      setTimeout(onClose, 1500);
      return true;
    }
    return false;
  }, [login, onClose, stopPoll, token, user]);

  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(() => {
      void checkLinked();
    }, 2000);
    void checkLinked();
  }, [checkLinked, stopPoll]);

  const beginLink = useCallback(async () => {
    setErrorMsg('');
    setStep('prepare');

    const { ok, data } = await apiFetch<{
      botUrl?: string;
      botUsername?: string;
      error?: string;
    }>('/api/users/me/telegram-begin', { method: 'POST' });

    if (!ok || !data.botUrl) {
      setStep('error');
      setErrorMsg(
        data.error ||
          'Không tạo được phiên liên kết. Chạy lại: cd backend && npm run db:push && npm run dev'
      );
      return;
    }

    setBotUrl(data.botUrl);
    setBotUsername(data.botUsername || null);
    setStep('open_bot');
  }, []);

  const openTelegram = useCallback(() => {
    if (!botUrl) return;
    window.open(botUrl, '_blank', 'noopener,noreferrer');
    setStep('waiting');
    startPoll();
  }, [botUrl, startPoll]);

  useEffect(() => {
    if (!open) {
      stopPoll();
      setStep('prepare');
      setBotUrl(null);
      setBotUsername(null);
      setErrorMsg('');
      return;
    }
    void beginLink();
    return stopPoll;
  }, [open, beginLink, stopPoll]);

  if (!open) return null;

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i className="bx bxl-telegram" style={{ color: '#229ED9', marginRight: 8 }} />
            Liên kết Telegram
          </h3>
          <button type="button" className="close-modal" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {step === 'linked' ? (
            <div style={{ textAlign: 'center' }}>
              <i className="bx bx-check-circle" style={{ fontSize: 48, color: 'var(--success)' }} />
              <p style={{ marginTop: 12, fontWeight: 600 }}>Đã lưu Telegram ID vào tài khoản!</p>
            </div>
          ) : step === 'error' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: 16, lineHeight: 1.5 }}>{errorMsg}</p>
              <button type="button" className="btn btn-primary" onClick={() => void beginLink()}>
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--slate-600)', marginBottom: 16, lineHeight: 1.5 }}>
                Hệ thống lưu <strong>Chat ID</strong> Telegram vào user của bạn — dùng để gửi thông báo
                task. Không cần copy ID hay nhập tay.
              </p>

              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
                <li>
                  {step === 'prepare' ? (
                    <span>Đang chuẩn bị...</span>
                  ) : (
                    <span style={{ color: 'var(--success)' }}>Sẵn sàng</span>
                  )}
                </li>
                <li>
                  Mở bot{botUsername ? ` @${botUsername}` : ''} từ nút bên dưới
                </li>
                <li>
                  Trong Telegram bấm <strong>Start</strong> (một lần)
                </li>
              </ol>

              {step === 'waiting' && (
                <div
                  style={{
                    marginTop: 20,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    color: 'var(--slate-600)',
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid var(--slate-200)',
                      borderTopColor: '#229ED9',
                      animation: 'tg-spin 0.7s linear infinite',
                      flexShrink: 0,
                    }}
                  />
                  Đang chờ Telegram gửi ID về server...
                </div>
              )}

              {botUrl && step !== 'prepare' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}
                  onClick={openTelegram}
                  disabled={step === 'waiting'}
                >
                  <i className="bx bxl-telegram" style={{ marginRight: 8 }} />
                  {step === 'waiting' ? 'Đã mở — bấm Start trên Telegram' : 'Mở Telegram & bấm Start'}
                </button>
              )}
            </>
          )}
        </div>

        {step !== 'linked' && (
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Để sau
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes tg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
