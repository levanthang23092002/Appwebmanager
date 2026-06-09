import { AttendanceAdminPanel } from '../components/attendance/AttendanceAdminPanel';
import {
  AttendanceCalendar,
  AttendanceDayDetail,
} from '../components/attendance/AttendanceCalendar';
import { AttendanceClockCard } from '../components/attendance/AttendanceClockCard';
import { useAttendancePage } from '../hooks/useAttendancePage';

export function AttendancePage() {
  const att = useAttendancePage();
  const showMyView = att.viewTab === 'mine';
  const isOwnCalendar = !att.isViewingOther;

  return (
    <div className="content-wrapper attendance-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Chấm công</h2>
          <p className="att-page-subtitle">
            Chấm vào/ra khi ở mạng công ty · Xem lịch đi làm trên calendar
          </p>
        </div>
        {att.isAdmin && (
          <div className="att-view-tabs">
            <button
              type="button"
              className={`att-view-tab${att.viewTab === 'mine' ? ' active' : ''}`}
              onClick={() => {
                att.setViewTab('mine');
                att.resetToMyCalendar();
              }}
            >
              Của tôi
            </button>
            <button
              type="button"
              className={`att-view-tab${att.viewTab === 'team' ? ' active' : ''}`}
              onClick={() => att.setViewTab('team')}
            >
              Quản lý nhân viên
            </button>
          </div>
        )}
      </div>

      {att.viewTab === 'team' && att.isAdmin && (
        <section className="att-admin-panel">
          <AttendanceAdminPanel
            rows={att.teamRows}
            loading={att.teamLoading}
            filter={att.adminFilter}
            onFilterChange={att.setAdminFilter}
            overview={att.teamOverview}
            formatTime={att.formatAttendanceTime}
            onViewMember={att.openMemberCalendar}
          />
        </section>
      )}

      {showMyView && (
        <>
          {att.isViewingOther && (
            <div className="att-viewing-banner">
              <span>
                Đang xem lịch: <strong>{att.activeUserName}</strong>
              </span>
              <button type="button" className="btn btn-outline btn-sm" onClick={att.resetToMyCalendar}>
                Về lịch của tôi
              </button>
            </div>
          )}

          {isOwnCalendar && (
            <section className="att-today-panel">
              <div className="att-stat-strip">
                <div className="att-stat-chip att-stat-chip--present">
                  <i className="bx bx-check-circle" aria-hidden />
                  <span className="att-stat-chip__label">Đúng giờ</span>
                  <strong>{att.myMonthStats.present}</strong>
                </div>
                <div className="att-stat-chip att-stat-chip--late">
                  <i className="bx bx-time-five" aria-hidden />
                  <span className="att-stat-chip__label">Muộn</span>
                  <strong>{att.myMonthStats.late}</strong>
                </div>
                <div className="att-stat-chip att-stat-chip--absent">
                  <i className="bx bx-x-circle" aria-hidden />
                  <span className="att-stat-chip__label">Vắng</span>
                  <strong>{att.myMonthStats.absent}</strong>
                </div>
              </div>

              <AttendanceClockCard
                todayRecord={att.todayRecord}
                canCheckIn={att.canCheckIn}
                canCheckOut={att.canCheckOut}
                loading={att.clockLoading}
                wifiConfigured={att.wifiConfigured}
                workHoursLabel={att.workHoursLabel}
                onCheckIn={att.clockIn}
                onCheckOut={att.clockOut}
              />
            </section>
          )}

          <div className="att-calendar-layout">
            <AttendanceCalendar
              monthLabel={att.monthLabel}
              cells={att.calendarCells}
              summaries={att.monthSummaries}
              selectedDate={att.selectedDate}
              todayKey={att.todayKey}
              onSelectDate={att.setSelectedDate}
              onPrevMonth={() => att.shiftMonth(-1)}
              onNextMonth={() => att.shiftMonth(1)}
              onToday={att.goToday}
            />
            <AttendanceDayDetail
              summary={att.selectedSummary}
              dateKey={att.selectedDate}
              formatTime={att.formatAttendanceTime}
            />
          </div>
        </>
      )}
    </div>
  );
}
