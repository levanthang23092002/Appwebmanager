import { useCallback, useEffect, useRef, useState } from 'react';
import { AttendanceSettingsManage } from '../components/attendance/AttendanceSettingsManage';
import { AttendanceWifiManage } from '../components/attendance/AttendanceWifiManage';
import { apiFetch } from '../lib/api';
import { DEFAULT_USD_VND_RATE } from '../lib/currency';
import { DEFAULT_APP_NAME, useSystemSettings, type SystemSettings } from '../lib/systemSettings';

type SystemTab = 'branding' | 'exchange' | 'attendance';

function resizeLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 320;
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
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid image'));
    };
    img.src = url;
  });
}

export function SystemPage() {
  const { settings, logoUrl, refresh } = useSystemSettings();
  const [tab, setTab] = useState<SystemTab>('branding');
  const [rate, setRate] = useState(String(DEFAULT_USD_VND_RATE));
  const [appName, setAppName] = useState(DEFAULT_APP_NAME);
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const logoFileRef = useRef<HTMLInputElement>(null);

  const applySettings = useCallback((data: SystemSettings) => {
    setRate(String(data.usdVndRate));
    setAppName(data.appName);
    setLogo(data.logo);
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [applySettings, settings]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    const usdVndRate = parseFloat(rate.replace(/,/g, ''));
    if (!Number.isFinite(usdVndRate) || usdVndRate <= 0) {
      setError('Tỉ giá phải lớn hơn 0');
      setSaving(false);
      return;
    }
    if (!appName.trim()) {
      setError('Tên hệ thống không được để trống');
      setSaving(false);
      return;
    }

    try {
      const { ok, data } = await apiFetch<SystemSettings & { error?: string }>(
        '/api/system/settings',
        {
          method: 'PATCH',
          body: JSON.stringify({
            usdVndRate,
            appName: appName.trim(),
            logo,
          }),
        }
      );
      if (!ok) {
        setError(data.error || 'Không lưu được');
        return;
      }
      applySettings(data);
      setMessage('Đã lưu cấu hình hệ thống');
      await refresh();
      window.dispatchEvent(new Event('system-settings-updated'));
      window.dispatchEvent(new Event('finance-settings-updated'));
    } catch {
      setError('Không lưu được cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const dataUrl = await resizeLogoFile(file);
      setLogo(dataUrl);
    } catch {
      setError('Không đọc được file ảnh');
    }
    e.target.value = '';
  };

  const previewLogo = logo?.trim() || logoUrl;

  return (
    <div className="content-wrapper system-page">
      <div className="page-header page-header-finance">
        <div>
          <h2 className="page-title">Hệ thống</h2>
          <p className="system-page__desc">
            Cấu hình thương hiệu, tỉ giá, chấm công và thông số dùng chung
          </p>
        </div>
        {tab !== 'attendance' && (
          <div className="page-header-finance__actions">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        )}
      </div>

      {message && <p className="system-page__alert system-page__alert--ok">{message}</p>}
      {error && <p className="system-page__alert system-page__alert--err">{error}</p>}

      <div className="system-tabs">
        <button
          type="button"
          className={`system-tab${tab === 'branding' ? ' active' : ''}`}
          onClick={() => setTab('branding')}
        >
          <i className="bx bx-image" /> Thương hiệu
        </button>
        <button
          type="button"
          className={`system-tab${tab === 'exchange' ? ' active' : ''}`}
          onClick={() => setTab('exchange')}
        >
          <i className="bx bx-dollar-circle" /> Tỉ giá
        </button>
        <button
          type="button"
          className={`system-tab${tab === 'attendance' ? ' active' : ''}`}
          onClick={() => setTab('attendance')}
        >
          <i className="bx bx-time-five" /> Chấm công
        </button>
      </div>

      {tab === 'branding' && (
        <section className="system-panel">
          <header className="system-panel__head">
            <h3>Logo & tên hệ thống</h3>
            <p>Hiển thị trên sidebar, trang đăng nhập và toàn bộ ứng dụng</p>
          </header>
          <div className="system-branding">
            <div className="system-branding__preview">
              <span className="system-branding__label">Xem trước</span>
              <img src={previewLogo} alt={appName} className="system-branding__logo" />
              <strong>{appName || DEFAULT_APP_NAME}</strong>
            </div>
            <div className="system-branding__form">
              <div className="form-group">
                <label className="form-label">Tên hệ thống</label>
                <input
                  className="form-input"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Eagle Rise"
                  maxLength={80}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Logo</label>
                <div className="system-branding__logo-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => logoFileRef.current?.click()}
                  >
                    <i className="bx bx-upload" /> Tải logo mới
                  </button>
                  {logo && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setLogo(null)}
                    >
                      Dùng logo mặc định
                    </button>
                  )}
                </div>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="system-branding__file-input"
                  onChange={onLogoFile}
                />
                <p className="system-panel__hint">PNG/JPG, khuyến nghị nền trong suốt, tối đa ~320px</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'exchange' && (
        <section className="system-panel">
          <header className="system-panel__head">
            <h3>Tỉ giá USD / VND</h3>
            <p>
              Tỉ giá mặc định khi nhập chi phí hoặc doanh thu mới. Mỗi bản ghi vẫn lưu tỉ giá riêng —
              đổi ở đây không ảnh hưởng dữ liệu cũ.
            </p>
          </header>
          <div className="system-exchange">
            <div className="form-group" style={{ maxWidth: 320 }}>
              <label className="form-label">1 USD = ? VND</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="27000"
              />
            </div>
            <p className="system-panel__hint">
              Ví dụ: nhập <strong>27000</strong> nghĩa là 1 USD = 27.000 VND
            </p>
          </div>
        </section>
      )}

      {tab === 'attendance' && (
        <section className="system-attendance">
          <div className="att-admin-config-row">
            <AttendanceSettingsManage />
            <AttendanceWifiManage />
          </div>
        </section>
      )}
    </div>
  );
}
