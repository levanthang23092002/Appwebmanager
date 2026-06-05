import { DailyReportForm, ReportDetailCard } from '../components/reports/ReportPanels';
import { ReportsAdminPanel, ReportsMonthList } from '../components/reports/ReportsAdminPanel';
import { useReportsPage } from '../hooks/useReportsPage';

export function ReportsPage() {
  const rep = useReportsPage();
  const showMyView = rep.viewTab === 'mine';
  const isOwnView = !rep.isViewingOther;

  return (
    <div className="content-wrapper reports-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Báo cáo cuối ngày</h2>
          <p className="rep-page-subtitle">
            Nộp tóm tắt công việc hàng ngày · Admin theo dõi và xem lịch sử theo ngày, tháng
          </p>
        </div>
        {rep.isAdmin && (
          <div className="rep-view-tabs">
            <button
              type="button"
              className={`rep-view-tab${rep.viewTab === 'mine' ? ' active' : ''}`}
              onClick={() => {
                rep.setViewTab('mine');
                rep.resetToMyReports();
              }}
            >
              Của tôi
            </button>
            <button
              type="button"
              className={`rep-view-tab${rep.viewTab === 'team' ? ' active' : ''}`}
              onClick={() => rep.setViewTab('team')}
            >
              Quản lý
            </button>
          </div>
        )}
      </div>

      {rep.viewTab === 'team' && rep.isAdmin && (
        <ReportsAdminPanel
          rows={rep.teamRows}
          loading={rep.teamLoading}
          filter={rep.adminFilter}
          onFilterChange={rep.setAdminFilter}
          overview={rep.teamOverview}
          onViewMember={rep.openMemberReports}
        />
      )}

      {showMyView && (
        <>
          {rep.isViewingOther && (
            <div className="rep-viewing-banner">
              <span>
                Đang xem báo cáo: <strong>{rep.activeUserName}</strong>
              </span>
              <button type="button" className="btn btn-outline btn-sm" onClick={rep.resetToMyReports}>
                Về báo cáo của tôi
              </button>
            </div>
          )}

          {isOwnView && (
            <section className="rep-today-section">
              <DailyReportForm
                report={rep.todayReport}
                loading={rep.loadingToday}
                saving={rep.saving}
                onSaveDraft={(data) => void rep.saveReport({ ...data, submit: false })}
                onSubmit={(data) => void rep.saveReport({ ...data, submit: true })}
              />
            </section>
          )}

          <section className="rep-history-section">
            <h3 className="rep-section-title">
              <i className="bx bx-history" aria-hidden />
              {rep.isViewingOther ? `Lịch sử — ${rep.activeUserName}` : 'Lịch sử báo cáo'}
            </h3>
            <div className="rep-history-layout">
              <ReportsMonthList
                reports={rep.monthReports}
                selectedId={rep.selectedReportId}
                loading={rep.loadingMonth}
                monthLabel={rep.monthLabel}
                onSelect={rep.setSelectedReportId}
                onPrevMonth={() => rep.shiftMonth(-1)}
                onNextMonth={() => rep.shiftMonth(1)}
              />
              <ReportDetailCard report={rep.selectedReport} loading={rep.loadingMonth} sticky />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
