import { useRef } from 'react';
import { useFinancePage } from '../hooks/useFinancePage';

export function FinancePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    timeFilter,
    showCustomDates,
    stats,
    rows,
    importOpen,
    setImportOpen,
    sheetOpen,
    setSheetOpen,
    showAddNet,
    setShowAddNet,
    customNetName,
    setCustomNetName,
    networks,
    sheetUrl,
    setSheetUrl,
    syncing,
    sparkRefs,
    mainChartRef,
    donutRef,
    onTimeFilterChange,
    applyTimeFilter,
    saveCustomNetwork,
    syncGoogleSheet,
    handleSyncClick,
    exportExcel,
  } = useFinancePage();

  const statCards = [
    { label: 'Tổng doanh thu', value: stats.revenue, trend: stats.trends[0], trendClass: stats.trendClasses[0], ref: sparkRefs.revenue },
    { label: 'Lợi nhuận ròng', value: stats.profit, trend: stats.trends[1], trendClass: stats.trendClasses[1], ref: sparkRefs.profit },
    { label: 'Tổng chi phí', value: stats.cost, trend: stats.trends[2], trendClass: stats.trendClasses[2], ref: sparkRefs.cost },
    { label: 'Chiến dịch chạy', value: stats.campaigns, trend: stats.trends[3], trendClass: stats.trendClasses[3], ref: sparkRefs.campaign },
  ];

  return (
    <div className="content-wrapper finance-page">
      <div className="page-header page-header-finance">
        <h2 className="page-title">Tài chính & Affiliate</h2>
        <div className="page-header-finance__actions">
          <select
            className="btn btn-outline finance-time-filter"
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value)}
          >
            <option value="month">Tháng này</option>
            <option value="day">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
            <option value="week">Tuần này</option>
            <option value="year">Năm nay</option>
            <option value="custom">Tùy chỉnh...</option>
          </select>
          {showCustomDates && (
            <div id="customDateWrap2" className="finance-custom-dates">
              <input type="date" />
              <span style={{ color: 'var(--slate-400)' }}>-</span>
              <input type="date" />
              <button
                type="button"
                className="finance-custom-dates__apply"
                onClick={() => applyTimeFilter('custom')}
                aria-label="Áp dụng khoảng ngày"
              >
                <i className="bx bx-check" style={{ fontSize: 20 }} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid grid-4-cols">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card spark-card">
            <div className="stat-header" style={{ marginBottom: 8 }}>
              <div className="stat-details">
                <p>{s.label}</p>
                <h3>{s.value}</h3>
              </div>
              <span className={`trend ${s.trendClass}`}>
                <i className={`bx bx-trending-${s.trendClass === 'positive' ? 'up' : 'down'}`} />{' '}
                {s.trend}
              </span>
            </div>
            <div ref={s.ref} id={`chart-${s.label}`} />
          </div>
        ))}
      </div>

      <div className="charts-2cols">
        <div className="chart-card">
          <div className="card-header">
            <h3>Phân tích Doanh Thu vs Chi Phí</h3>
          </div>
          <div ref={mainChartRef} id="mainAreaChart" className="finance-chart-host" />
        </div>
        <div className="chart-card">
          <div className="card-header">
            <h3>Tỉ trọng Nguồn Doanh thu</h3>
          </div>
          <div
            ref={donutRef}
            id="sourceDonutChart"
            className="finance-chart-host finance-chart-host--donut"
          />
        </div>
      </div>

      <div className="finance-table-section">
        <div className="chart-card finance-table-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card-header finance-table-header"
            style={{
              padding: 24,
              marginBottom: 0,
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <h3>Theo dõi chiến dịch Affiliate</h3>
            <div className="table-actions">
              <div className="date-filter">
                <input type="date" className="date-input" defaultValue="2026-04-01" />
                <span style={{ color: 'var(--slate-400)' }}>-</span>
                <input type="date" className="date-input" defaultValue="2026-04-30" />
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setImportOpen(true)}>
                <i className="bx bx-import" /> Import dữ liệu
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleSyncClick}
                disabled={syncing}
                style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
              >
                <i className={`bx ${syncing ? 'bx-loader-alt bx-spin' : 'bx-refresh'}`} /> Đồng bộ
                Sheets
              </button>
              <button type="button" className="btn btn-outline" onClick={exportExcel}>
                <i className="bx bx-download" /> Xuất Excel
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="task-table finance-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Nguồn (Source)</th>
                  <th>Số click</th>
                  <th>Chuyển đổi (Conversion)</th>
                  <th>Hoa hồng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      <div className="td-flex">
                        {row.sourceIcon}
                        {row.source}
                      </div>
                    </td>
                    <td>{row.clicks}</td>
                    <td>{row.conversion}</td>
                    <td className="font-bold text-success">{row.commission}</td>
                    <td>
                      <span className={`status-pill ${row.statusClass}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <div className={`modal-overlay${importOpen ? ' active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Thêm / Import dữ liệu Affiliate</h3>
            <button type="button" className="close-modal" onClick={() => setImportOpen(false)}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>
                Danh sách Nguồn (Networks) <span className="text-danger">*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-input" style={{ flex: 1 }} defaultValue={networks[0]}>
                  {networks.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddNet((v) => !v)}>
                  <i className="bx bx-plus" /> Thêm
                </button>
              </div>
            </div>

            {showAddNet && (
              <div
                style={{
                  display: 'block',
                  background: 'var(--slate-50)',
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 15,
                  border: '1px dashed var(--slate-300)',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 14 }}>
                  Tạo nguồn Network mới
                </div>
                <input
                  type="text"
                  placeholder="Tên Network (gõ đúng y chang CSV...)"
                  className="form-input"
                  style={{ width: '100%', marginBottom: 12 }}
                  value={customNetName}
                  onChange={(e) => setCustomNetName(e.target.value)}
                />
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 12,
                    color: 'var(--slate-500)',
                  }}
                >
                  Chọn hình ảnh Logo cho Network này
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ marginBottom: 12, fontSize: 13, width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 16px', fontSize: 13 }}
                    onClick={() => saveCustomNetwork(fileInputRef.current?.files?.[0] ?? null)}
                  >
                    Lưu Nguồn Của Tôi
                  </button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: 25 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <label>Đồng bộ Real-time CSV (Local)</label>
                <span className="status-pill green-bg">
                  <i className="bx bx-radio-circle-marked bx-burst" /> Đang kết nối file
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--slate-500)',
                  lineHeight: 1.5,
                  padding: 12,
                  background: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 6,
                }}
              >
                Hệ thống đang tự quét file <code>Sample_Affiliate_Data.csv</code> và tự động update
                số liệu mà không cần dán tay. Nếu tên nguồn trong CSV trùng với Nguồn bạn vừa thêm,
                nó sẽ tự hiện Logo của bạn.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setImportOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Google Sheet Config Modal */}
      <div className={`modal-overlay${sheetOpen ? ' active' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 500 }}>
          <div className="modal-header">
            <h3>Cài đặt Đồng bộ Google Sheets</h3>
            <button type="button" className="close-modal" onClick={() => setSheetOpen(false)}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label style={{ fontWeight: 500 }}>
                Đường link Published CSV <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                style={{
                  padding: 10,
                  width: '100%',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 6,
                  marginTop: 8,
                  boxSizing: 'border-box',
                }}
                placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              />
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--slate-500)',
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                Vui lòng mở Google Sheets &gt; <b>Tệp (File)</b> &gt; <b>Chia sẻ (Share)</b> &gt;{' '}
                <b>Xuất bản lên web (Publish to web)</b> &gt; Chọn định dạng <b>CSV</b> và Copy link
                dán vào đây.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setSheetOpen(false)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--success)' }}
              onClick={() => syncGoogleSheet(sheetUrl)}
              disabled={syncing}
            >
              Lưu & Tải dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
