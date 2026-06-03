import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type WifiRow = {
  id: number;
  ssid: string;
  label: string | null;
  active: boolean;
};

export function AttendanceWifiManage() {
  const [items, setItems] = useState<WifiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ssid, setSsid] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiFetch<{ items: WifiRow[] }>('/api/attendance/wifi?manage=1');
      if (ok) setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addWifi = async () => {
    const name = ssid.trim();
    if (!name) return;
    setSaving(true);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>('/api/attendance/wifi', {
        method: 'POST',
        body: JSON.stringify({ ssid: name, label: label.trim() || name }),
      });
      if (!ok) {
        alert(data.error || 'Không thêm được');
        return;
      }
      setSsid('');
      setLabel('');
      await load();
      window.dispatchEvent(new Event('attendance-wifi-updated'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: WifiRow) => {
    const { ok, data } = await apiFetch<{ error?: string }>(`/api/attendance/wifi/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !row.active }),
    });
    if (!ok) {
      alert(data.error || 'Không cập nhật được');
      return;
    }
    await load();
    window.dispatchEvent(new Event('attendance-wifi-updated'));
  };

  const remove = async (row: WifiRow) => {
    if (!confirm(`Xóa WiFi "${row.ssid}"?`)) return;
    const { ok, data } = await apiFetch<{ error?: string }>(`/api/attendance/wifi/${row.id}`, {
      method: 'DELETE',
    });
    if (!ok) {
      alert(data.error || 'Không xóa được');
      return;
    }
    await load();
    window.dispatchEvent(new Event('attendance-wifi-updated'));
  };

  return (
    <div className="card att-wifi-manage">
      <div className="att-wifi-manage__head">
        <div>
          <h3>
            <i className="bx bx-wifi" aria-hidden />
            WiFi công ty
          </h3>
          <p className="att-wifi-manage__hint">
            Có ít nhất một WiFi đang bật thì nhân viên được chấm công.
          </p>
        </div>
        <span className="att-wifi-manage__count">{items.filter((i) => i.active).length} active</span>
      </div>

      <div className="att-wifi-manage__form">
        <input
          className="form-input"
          placeholder="Tên WiFi (SSID)"
          value={ssid}
          onChange={(e) => setSsid(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWifi()}
        />
        <input
          className="form-input"
          placeholder="Ghi chú"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={addWifi}>
          <i className="bx bx-plus" />
          {saving ? '...' : 'Thêm'}
        </button>
      </div>

      {loading && <p className="att-wifi-manage__msg">Đang tải...</p>}
      {!loading && items.length === 0 && (
        <p className="att-wifi-manage__msg">Chưa có WiFi — thêm ít nhất một mạng.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="att-wifi-manage__chips">
          {items.map((row) => (
            <li
              key={row.id}
              className={`att-wifi-chip${row.active ? '' : ' att-wifi-chip--off'}`}
            >
              <i className="bx bx-wifi" aria-hidden />
              <span className="att-wifi-chip__name">{row.ssid}</span>
              {row.label && row.label !== row.ssid && (
                <span className="att-wifi-chip__note">{row.label}</span>
              )}
              <div className="att-wifi-chip__actions">
                <button
                  type="button"
                  className="att-wifi-chip__btn"
                  title={row.active ? 'Tắt' : 'Bật'}
                  onClick={() => toggleActive(row)}
                >
                  {row.active ? 'Tắt' : 'Bật'}
                </button>
                <button
                  type="button"
                  className="att-wifi-chip__btn att-wifi-chip__btn--danger"
                  title="Xóa"
                  onClick={() => remove(row)}
                >
                  <i className="bx bx-trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
