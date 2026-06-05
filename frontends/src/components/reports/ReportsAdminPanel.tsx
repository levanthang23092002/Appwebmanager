import { getUserAvatarUrl } from '../../lib/avatar';
import type { DailyReport, TeamMemberReportRow } from '../../lib/reports/types';
import { formatReportDate, reportStatusClass, reportStatusLabel } from '../../lib/reports/types';

interface Props {
  rows: TeamMemberReportRow[];
  loading: boolean;
  filter: string;
  onFilterChange: (v: string) => void;
  overview: {
    total: number;
    submittedToday: number;
    missingToday: number;
    monthSubmitted: number;
  };
  onViewMember: (id: number) => void;
}

export function ReportsAdminPanel({
  rows,
  loading,
  filter,
  onFilterChange,
  overview,
  onViewMember,
}: Props) {
  return (
    <div className="rep-admin">
      <div className="rep-stat-strip">
        <div className="rep-stat-chip">
          <i className="bx bx-group" aria-hidden />
          <span className="rep-stat-chip__label">Nhân viên</span>
          <strong>{overview.total}</strong>
        </div>
        <div className="rep-stat-chip rep-stat-chip--ok">
          <i className="bx bx-check-circle" aria-hidden />
          <span className="rep-stat-chip__label">Đã nộp hôm nay</span>
          <strong>{overview.submittedToday}</strong>
        </div>
        <div className="rep-stat-chip rep-stat-chip--warn">
          <i className="bx bx-error-circle" aria-hidden />
          <span className="rep-stat-chip__label">Chưa nộp hôm nay</span>
          <strong>{overview.missingToday}</strong>
        </div>
        <div className="rep-stat-chip rep-stat-chip--muted">
          <i className="bx bx-calendar" aria-hidden />
          <span className="rep-stat-chip__label">Đã nộp tháng này</span>
          <strong>{overview.monthSubmitted}</strong>
        </div>
      </div>

      <div className="card rep-admin-table-card">
        <div className="rep-admin-table-header">
          <h3>
            <i className="bx bx-list-ul" aria-hidden />
            Tình hình nộp báo cáo
          </h3>
          <div className="rep-admin-search-wrap">
            <i className="bx bx-search" aria-hidden />
            <input
              className="form-input rep-admin-search"
              type="search"
              placeholder="Tìm tên, email..."
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive rep-admin-table-wrap">
          <table className="task-table rep-admin-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Hôm nay</th>
                <th>Tháng này</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="rep-admin-table__empty">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="rep-admin-table__empty">
                    Không có nhân viên phù hợp.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.user.id}>
                    <td>
                      <div className="rep-admin-user">
                        <img
                          src={getUserAvatarUrl(row.user.name, row.user.avatar)}
                          alt=""
                          className="rep-admin-user__avatar"
                        />
                        <div className="rep-admin-user__text">
                          <strong>{row.user.name}</strong>
                          <span>{row.user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          row.todaySubmitted ? 'rep-pill rep-pill--ok' : 'rep-pill rep-pill--warn'
                        }
                      >
                        {row.todaySubmitted ? 'Đã nộp' : 'Chưa nộp'}
                      </span>
                    </td>
                    <td>
                      <span className="rep-month-count">{row.monthSubmitted} báo cáo</span>
                    </td>
                    <td className="rep-admin-table__action">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onViewMember(row.user.id)}
                      >
                        Xem lịch sử
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="rep-admin-mobile-list">
          {loading && <p className="rep-list-empty">Đang tải...</p>}
          {!loading && rows.length === 0 && (
            <p className="rep-list-empty">Không có nhân viên phù hợp.</p>
          )}
          {!loading &&
            rows.map((row) => (
              <article key={row.user.id} className="rep-admin-mobile-card">
                <div className="rep-admin-mobile-card__head">
                  <div className="rep-admin-user">
                    <img
                      src={getUserAvatarUrl(row.user.name, row.user.avatar)}
                      alt=""
                      className="rep-admin-user__avatar"
                    />
                    <div className="rep-admin-user__text">
                      <strong>{row.user.name}</strong>
                      <span>{row.user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="rep-admin-mobile-card__meta">
                  <span
                    className={
                      row.todaySubmitted ? 'rep-pill rep-pill--ok' : 'rep-pill rep-pill--warn'
                    }
                  >
                    {row.todaySubmitted ? 'Đã nộp hôm nay' : 'Chưa nộp hôm nay'}
                  </span>
                  <span className="rep-month-count">{row.monthSubmitted} báo cáo tháng này</span>
                </div>
                <div className="rep-admin-mobile-card__action">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onViewMember(row.user.id)}
                  >
                    <i className="bx bx-history" />
                    Xem lịch sử
                  </button>
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}

interface ListProps {
  reports: DailyReport[];
  selectedId: number | null;
  loading: boolean;
  monthLabel: string;
  onSelect: (id: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function ReportsMonthList({
  reports,
  selectedId,
  loading,
  monthLabel,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: ListProps) {
  return (
    <div className="card rep-list-card">
      <div className="rep-list-card__inner">
        <div className="rep-list-toolbar">
          <button
            type="button"
            className="btn btn-outline rep-cal-nav"
            onClick={onPrevMonth}
            aria-label="Tháng trước"
          >
            <i className="bx bx-chevron-left" />
          </button>
          <h3>{monthLabel}</h3>
          <button
            type="button"
            className="btn btn-outline rep-cal-nav"
            onClick={onNextMonth}
            aria-label="Tháng sau"
          >
            <i className="bx bx-chevron-right" />
          </button>
        </div>

        {loading && <p className="rep-list-empty">Đang tải...</p>}
        {!loading && reports.length === 0 && (
          <div className="rep-empty-state">
            <i className="bx bx-calendar-x" aria-hidden />
            <p>Chưa có báo cáo trong tháng này.</p>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <ul className="rep-list">
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  className={`rep-list-item${selectedId === report.id ? ' is-selected' : ''}`}
                  onClick={() => onSelect(report.id)}
                >
                  <div className="rep-list-item__top">
                    <span className="rep-list-item__date">{formatReportDate(report.date)}</span>
                    <span className={reportStatusClass(report.status)}>
                      {reportStatusLabel(report.status)}
                    </span>
                  </div>
                  <span className="rep-list-item__preview">
                    {report.content || 'Không có nội dung'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
