import type { CalendarCell } from '../../lib/attendance/calendar';
import { parseDateKey } from '../../lib/attendance/calendar';
import { formatAttendanceTime, statusClass, statusLabel } from '../../lib/attendance/stats';
import type { DaySummary } from '../../lib/attendance/types';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface Props {
  monthLabel: string;
  cells: CalendarCell[];
  summaries: Map<string, DaySummary>;
  selectedDate: string;
  todayKey: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function AttendanceCalendar({
  monthLabel,
  cells,
  summaries,
  selectedDate,
  todayKey,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: Props) {
  return (
    <div className="card att-calendar-card">
      <div className="att-calendar-toolbar">
        <button type="button" className="btn btn-outline att-cal-nav" onClick={onPrevMonth} aria-label="Tháng trước">
          <i className="bx bx-chevron-left" />
        </button>
        <h3>{monthLabel}</h3>
        <button type="button" className="btn btn-outline att-cal-nav" onClick={onNextMonth} aria-label="Tháng sau">
          <i className="bx bx-chevron-right" />
        </button>
        <button type="button" className="btn btn-outline att-cal-today" onClick={onToday}>
          Hôm nay
        </button>
      </div>

      <div className="att-cal-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="att-cal-grid">
        {cells.map((cell, idx) => {
          if (!cell.date || cell.day == null) {
            return <div key={`empty-${idx}`} className="att-cal-cell att-cal-cell--empty" />;
          }

          const summary = summaries.get(cell.date);
          const status = summary?.status ?? 'absent';
          const isFuture = cell.date > todayKey;
          const showStatus = !isFuture && !cell.isWeekend;
          const isSelected = cell.date === selectedDate;
          const hasAttendance = !!summary?.checkIn;
          const title = hasAttendance
            ? `${statusLabel(status)} · Vào ${formatAttendanceTime(summary?.checkIn)} · Ra ${formatAttendanceTime(summary?.checkOut)}`
            : showStatus
              ? statusLabel(status)
              : undefined;

          return (
            <button
              key={cell.date}
              type="button"
              title={title}
              className={[
                'att-cal-cell',
                hasAttendance ? 'att-cal-cell--has-times' : '',
                cell.isToday ? 'att-cal-cell--today' : '',
                cell.isWeekend ? 'att-cal-cell--weekend' : '',
                isSelected ? 'att-cal-cell--selected' : '',
                showStatus ? statusClass(status) : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(cell.date!)}
            >
              <span className="att-cal-cell__day">{cell.day}</span>
              {hasAttendance && (
                <span className="att-cal-cell__times">
                  <span className="att-cal-cell__time">
                    <em>Vào</em> {formatAttendanceTime(summary?.checkIn)}
                  </span>
                  <span className="att-cal-cell__time">
                    <em>Ra</em>{' '}
                    {summary?.checkOut ? formatAttendanceTime(summary.checkOut) : '—'}
                  </span>
                </span>
              )}
              {showStatus && !hasAttendance && (
                <span className="att-cal-cell__dot" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="att-cal-legend">
        <span>
          <i className="att-legend-dot att-status--present" /> Đúng giờ
        </span>
        <span>
          <i className="att-legend-dot att-status--late" /> Muộn
        </span>
        <span>
          <i className="att-legend-dot att-status--working" /> Đang làm
        </span>
        <span>
          <i className="att-legend-dot att-status--absent" /> Vắng
        </span>
      </div>
    </div>
  );
}

interface DayDetailProps {
  summary: DaySummary | null;
  dateKey: string;
  formatTime: (iso?: string) => string;
}

export function AttendanceDayDetail({ summary, dateKey, formatTime }: DayDetailProps) {
  const date = parseDateKey(dateKey);
  const title = date
    ? date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : dateKey;

  if (!summary) return null;

  return (
    <div className="card att-day-detail">
      <h4>{title}</h4>
      <div className={`att-day-detail__status ${statusClass(summary.status)}`}>
        {statusLabel(summary.status)}
      </div>
      <dl className="att-day-detail__list">
        <div>
          <dt>Giờ vào</dt>
          <dd>{formatTime(summary.checkIn)}</dd>
        </div>
        <div>
          <dt>Giờ ra</dt>
          <dd>{formatTime(summary.checkOut)}</dd>
        </div>
      </dl>
      {summary.status === 'absent' && !summary.checkIn && (
        <p className="att-day-detail__empty">Không có dữ liệu chấm công trong ngày này.</p>
      )}
    </div>
  );
}
