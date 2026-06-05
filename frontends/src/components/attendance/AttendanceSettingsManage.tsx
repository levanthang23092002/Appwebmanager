import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  parseTimeInputValue,
  type AttendanceWorkHours,
  workHoursToTimeInputValue,
} from '../../lib/attendance/workHours';

export function AttendanceSettingsManage() {
  const [settings, setSettings] = useState<AttendanceWorkHours | null>(null);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const applySettings = useCallback((data: AttendanceWorkHours) => {
    setSettings(data);
    setWorkStart(workHoursToTimeInputValue(data.workStartHour, data.workStartMinute));
    setWorkEnd(workHoursToTimeInputValue(data.workEndHour, data.workEndMinute));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiFetch<AttendanceWorkHours>('/api/attendance/settings');
      if (ok) applySettings(data);
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const start = parseTimeInputValue(workStart);
    const end = parseTimeInputValue(workEnd);
    setSaving(true);
    try {
      const { ok, data } = await apiFetch<AttendanceWorkHours & { error?: string }>(
        '/api/attendance/settings',
        {
          method: 'PATCH',
          body: JSON.stringify({
            workStartHour: start.hour,
            workStartMinute: start.minute,
            workEndHour: end.hour,
            workEndMinute: end.minute,
          }),
        }
      );
      if (!ok) {
        alert(data.error || 'Không lưu được');
        return;
      }
      applySettings(data);
      window.dispatchEvent(new Event('attendance-settings-updated'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card att-settings-manage">
      <div className="att-settings-manage__head">
        <div>
          <h3>
            <i className="bx bx-time-five" aria-hidden />
            Giờ làm việc
          </h3>
          <p className="att-settings-manage__hint">
            Giờ vào: chấm sau mốc này tính muộn. Giờ ra: mốc kết thúc ca làm.
          </p>
        </div>
        {settings && (
          <span className="att-settings-manage__badge">
            {workStart} – {workEnd}
          </span>
        )}
      </div>

      <div className="att-settings-manage__form">
        <label className="att-settings-manage__field">
          <span>Giờ vào</span>
          <input
            className="form-input"
            type="time"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
            disabled={loading}
          />
        </label>
        <label className="att-settings-manage__field">
          <span>Giờ ra</span>
          <input
            className="form-input"
            type="time"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
            disabled={loading}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={loading || saving}
          onClick={save}
        >
          <i className="bx bx-save" />
          {saving ? '...' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}
