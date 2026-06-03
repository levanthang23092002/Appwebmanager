import { formatAttendanceTime } from '../../lib/attendance/stats';
import type { AttendanceRecord } from '../../lib/attendance/types';

interface Props {
  todayRecord?: AttendanceRecord;
  canCheckIn: boolean;
  canCheckOut: boolean;
  loading: boolean;
  wifiConfigured: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export function AttendanceClockCard({
  todayRecord,
  canCheckIn,
  canCheckOut,
  loading,
  wifiConfigured,
  onCheckIn,
  onCheckOut,
}: Props) {
  const completed = !!todayRecord?.checkIn && !!todayRecord?.checkOut;
  const pendingOut = !!todayRecord?.checkIn && !todayRecord?.checkOut;

  return (
    <div className="card att-clock-card">
      <div className="att-clock-main">
        <div className="att-clock-head">
          <h3>
            <i className="bx bx-calendar-check" aria-hidden />
            Hôm nay
          </h3>
          <span className={`att-network-pill${wifiConfigured ? ' is-ok' : ''}`}>
            <i className={`bx ${wifiConfigured ? 'bx-wifi' : 'bx-wifi-off'}`} aria-hidden />
            {wifiConfigured ? 'WiFi công ty' : 'Chưa cấu hình'}
          </span>
        </div>

        <div className="att-clock-times">
          <div className="att-clock-time att-clock-time--in">
            <span className="att-clock-time__label">
              <i className="bx bx-log-in-circle" aria-hidden /> Vào
            </span>
            <strong>{formatAttendanceTime(todayRecord?.checkIn)}</strong>
          </div>
          <div className="att-clock-time att-clock-time--out">
            <span className="att-clock-time__label">
              <i className="bx bx-log-out-circle" aria-hidden /> Ra
            </span>
            <strong>{formatAttendanceTime(todayRecord?.checkOut)}</strong>
          </div>
        </div>

        <div className="att-clock-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm att-btn-checkin"
            disabled={!canCheckIn || loading}
            onClick={onCheckIn}
          >
            <i className="bx bx-log-in-circle" />
            {loading ? '...' : 'Chấm vào'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm att-btn-checkout"
            disabled={!canCheckOut || loading}
            onClick={onCheckOut}
          >
            <i className="bx bx-log-out-circle" />
            Chấm ra
          </button>
        </div>
      </div>

      {pendingOut && (
        <p className="att-clock-note att-clock-note--warn">
          <i className="bx bx-error-circle" aria-hidden />
          Đã chấm vào — nhớ chấm ra trước khi về
        </p>
      )}
      {!wifiConfigured && (
        <p className="att-clock-note">
          <i className="bx bx-info-circle" aria-hidden />
          Admin chưa cấu hình WiFi công ty — không thể chấm công
        </p>
      )}
      {completed && (
        <p className="att-clock-note att-clock-note--ok">
          <i className="bx bx-check-circle" aria-hidden />
          Đã hoàn tất chấm công hôm nay
        </p>
      )}
    </div>
  );
}
