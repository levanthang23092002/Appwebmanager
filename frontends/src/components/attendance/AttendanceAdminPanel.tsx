import { getUserAvatarUrl } from '../../lib/avatar';
import { statusClass, statusLabel } from '../../lib/attendance/stats';
import type { TeamMemberRow } from '../../lib/attendance/types';

interface Props {
  rows: TeamMemberRow[];
  loading: boolean;
  filter: string;
  onFilterChange: (v: string) => void;
  overview: {
    total: number;
    checked: number;
    working: number;
    late: number;
    present: number;
    absent: number;
  };
  formatTime: (iso?: string) => string;
  onViewMember: (id: number) => void;
}

export function AttendanceAdminPanel({
  rows,
  loading,
  filter,
  onFilterChange,
  overview,
  formatTime,
  onViewMember,
}: Props) {
  return (
    <div className="att-admin">
      <div className="att-stat-strip att-stat-strip--admin">
        <div className="att-stat-chip">
          <i className="bx bx-group" aria-hidden />
          <span className="att-stat-chip__label">Nhân viên</span>
          <strong>{overview.total}</strong>
        </div>
        <div className="att-stat-chip att-stat-chip--present">
          <i className="bx bx-check-circle" aria-hidden />
          <span className="att-stat-chip__label">Đã chấm</span>
          <strong>{overview.checked}</strong>
        </div>
        <div className="att-stat-chip att-stat-chip--working">
          <i className="bx bx-loader-circle" aria-hidden />
          <span className="att-stat-chip__label">Đang làm</span>
          <strong>{overview.working}</strong>
        </div>
        <div className="att-stat-chip att-stat-chip--late">
          <i className="bx bx-time-five" aria-hidden />
          <span className="att-stat-chip__label">Muộn</span>
          <strong>{overview.late}</strong>
        </div>
        <div className="att-stat-chip att-stat-chip--absent">
          <i className="bx bx-x-circle" aria-hidden />
          <span className="att-stat-chip__label">Chưa chấm</span>
          <strong>{overview.absent}</strong>
        </div>
      </div>

      <div className="card att-admin-table-card">
        <div className="att-admin-table-header">
          <h3>
            <i className="bx bx-list-ul" aria-hidden />
            Tình hình chấm công
          </h3>
          <div className="att-admin-search-wrap">
            <i className="bx bx-search" aria-hidden />
            <input
              className="form-input att-admin-search"
              type="search"
              placeholder="Tìm tên, email..."
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive att-admin-table-wrap">
          <table className="task-table att-admin-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Hôm nay</th>
                <th>Vào</th>
                <th>Ra</th>
                <th>Tháng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="att-admin-table__empty">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="att-admin-table__empty">
                    Không có nhân viên phù hợp.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.user.id}>
                    <td>
                      <div className="att-admin-user">
                        <img
                          src={getUserAvatarUrl(row.user.name, row.user.avatar)}
                          alt=""
                          className="att-admin-user__avatar"
                        />
                        <div className="att-admin-user__text">
                          <strong>{row.user.name}</strong>
                          <span>{row.user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={statusClass(row.todayStatus)}>
                        {statusLabel(row.todayStatus)}
                      </span>
                    </td>
                    <td className="att-admin-table__time">{formatTime(row.todayCheckIn)}</td>
                    <td className="att-admin-table__time">{formatTime(row.todayCheckOut)}</td>
                    <td>
                      <span className="att-month-pills">
                        <span className="att-month-pill att-month-pill--ok">{row.monthPresent}</span>
                        <span className="att-month-pill att-month-pill--late">{row.monthLate}</span>
                        <span className="att-month-pill att-month-pill--absent">{row.monthAbsent}</span>
                        <span className="att-month-pill att-month-pill--muted">/{row.monthWorkdays}</span>
                      </span>
                    </td>
                    <td className="att-admin-table__action">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onViewMember(row.user.id)}
                      >
                        Lịch
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
