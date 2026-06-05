import { useEffect, useState } from 'react';
import type { DailyReport } from '../../lib/reports/types';
import { formatReportDate, formatReportDateTime, reportStatusClass, reportStatusLabel } from '../../lib/reports/types';

interface Props {
  report: DailyReport | null;
  loading?: boolean;
  sticky?: boolean;
}

export function ReportDetailCard({ report, loading, sticky }: Props) {
  if (loading) {
    return (
      <div className={`card rep-detail-card${sticky ? ' rep-detail-card--sticky' : ''}`}>
        <div className="rep-detail-card__inner">
          <p className="rep-form-loading">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`card rep-detail-card${sticky ? ' rep-detail-card--sticky' : ''}`}>
        <div className="rep-detail-card__inner">
          <div className="rep-empty-state">
            <i className="bx bx-file-blank" aria-hidden />
            <p>Chọn một báo cáo trong danh sách để xem chi tiết.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card rep-detail-card${sticky ? ' rep-detail-card--sticky' : ''}`}>
      <div className="rep-detail-card__inner">
        <div className="rep-detail-head">
          <div>
            <h3>{report.userName || 'Báo cáo'}</h3>
            <span className="rep-detail-date">{formatReportDate(report.date)}</span>
          </div>
          <span className={reportStatusClass(report.status)}>{reportStatusLabel(report.status)}</span>
        </div>

        {report.submittedAt && (
          <p className="rep-detail-meta">
            <i className="bx bx-time-five" aria-hidden />
            Nộp lúc {formatReportDateTime(report.submittedAt)}
          </p>
        )}

        <div className="rep-detail-blocks">
          <div className="rep-detail-block rep-detail-block--primary">
            <h4>
              <i className="bx bx-check-double" aria-hidden />
              Việc đã làm hôm nay
            </h4>
            <p>{report.content || '—'}</p>
          </div>

          {report.planNext && (
            <div className="rep-detail-block rep-detail-block--plan">
              <h4>
                <i className="bx bx-calendar-event" aria-hidden />
                Kế hoạch ngày mai
              </h4>
              <p>{report.planNext}</p>
            </div>
          )}

          {report.blockers && (
            <div className="rep-detail-block rep-detail-block--warn">
              <h4>
                <i className="bx bx-error-circle" aria-hidden />
                Khó khăn / cần hỗ trợ
              </h4>
              <p>{report.blockers}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FormProps {
  report: DailyReport | null;
  loading: boolean;
  saving: boolean;
  onSaveDraft: (data: { content: string; planNext: string; blockers: string }) => void;
  onSubmit: (data: { content: string; planNext: string; blockers: string }) => void;
}

export function DailyReportForm({
  report,
  loading,
  saving,
  onSaveDraft,
  onSubmit,
}: FormProps) {
  const [content, setContent] = useState('');
  const [planNext, setPlanNext] = useState('');
  const [blockers, setBlockers] = useState('');
  const submitted = report?.status === 'SUBMITTED';

  useEffect(() => {
    setContent(report?.content ?? '');
    setPlanNext(report?.planNext ?? '');
    setBlockers(report?.blockers ?? '');
  }, [report]);

  const payload = () => ({ content, planNext, blockers });

  return (
    <div className="card rep-form-card">
      <div className="rep-form-card__inner">
        <div className="rep-form-head">
          <h3>
            <i className="bx bx-notepad" aria-hidden />
            Báo cáo hôm nay
          </h3>
          {report && (
            <span className={reportStatusClass(report.status)}>
              {reportStatusLabel(report.status)}
            </span>
          )}
        </div>

        {loading && <p className="rep-form-loading">Đang tải...</p>}

        {!loading && submitted && (
          <div className="rep-form-submitted">
            <i className="bx bx-check-circle" aria-hidden />
            <div>
              <strong>Đã nộp báo cáo hôm nay</strong>
              {report?.submittedAt && <span>Nộp lúc {formatReportDateTime(report.submittedAt)}</span>}
            </div>
          </div>
        )}

        {!loading && !submitted && (
          <>
            <div className="rep-form-grid">
              <label className="rep-form-field rep-form-field--full">
                <span className="rep-form-field__label">
                  <i className="bx bx-edit" aria-hidden />
                  Việc đã làm hôm nay <span className="rep-required">*</span>
                </span>
                <textarea
                  className="form-input rep-form-textarea"
                  rows={5}
                  placeholder="Tóm tắt công việc đã hoàn thành trong ngày..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
              <label className="rep-form-field">
                <span className="rep-form-field__label">
                  <i className="bx bx-calendar-plus" aria-hidden />
                  Kế hoạch ngày mai
                </span>
                <textarea
                  className="form-input rep-form-textarea"
                  rows={4}
                  placeholder="Dự kiến công việc ngày mai..."
                  value={planNext}
                  onChange={(e) => setPlanNext(e.target.value)}
                />
              </label>
              <label className="rep-form-field">
                <span className="rep-form-field__label">
                  <i className="bx bx-help-circle" aria-hidden />
                  Khó khăn / cần hỗ trợ
                </span>
                <textarea
                  className="form-input rep-form-textarea"
                  rows={4}
                  placeholder="Vấn đề cần admin/manager hỗ trợ..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                />
              </label>
            </div>
            <div className="rep-form-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving}
                onClick={() => onSaveDraft(payload())}
              >
                <i className="bx bx-save" />
                Lưu nháp
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving || !content.trim()}
                onClick={() => onSubmit(payload())}
              >
                <i className="bx bx-send" />
                {saving ? 'Đang gửi...' : 'Nộp báo cáo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
