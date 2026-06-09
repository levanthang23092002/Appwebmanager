import { useState } from 'react';
import {
  COST_TYPE_CUSTOM,
  COST_TYPES,
  formatCostAmount,
  useCostsPage,
  type CostRow,
} from '../hooks/useCostsPage';
import { formatOriginalMoney } from '../lib/currency';

function formatExchangeRate(rate: number) {
  return `1 USD = ${rate.toLocaleString('vi-VN')} ₫`;
}

function formatCostDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function costStatusMeta(row: CostRow) {
  const statusClass = row.approved ? 'green-bg' : row.canceled ? 'slate-bg' : 'purple-bg';
  const statusText = row.approved ? 'Đã duyệt' : row.canceled ? 'Đã hủy' : 'Chờ duyệt';
  const handlerName = row.approved ? row.approverName : row.canceled ? row.cancellerName : '—';
  return { statusClass, statusText, handlerName };
}

interface CostRowActionsProps {
  row: CostRow;
  userId?: number;
  isAdmin: boolean;
  actionLoading: number | null;
  onView: (row: CostRow) => void;
  onEdit: (row: CostRow) => void;
  onApprove: (id: number) => void;
  onDelete: (id: number) => void;
  layout?: 'table' | 'card';
}

function CostRowActions({
  row,
  userId,
  isAdmin,
  actionLoading,
  onView,
  onEdit,
  onApprove,
  onDelete,
  layout = 'table',
}: CostRowActionsProps) {
  const locked = row.approved || row.canceled;
  const canEdit = !locked && row.creatorId === userId;
  const wrapClass = layout === 'card' ? 'costs-row-actions costs-row-actions--card' : 'costs-row-actions';

  return (
    <div className={wrapClass}>
      <button type="button" className="btn btn-outline costs-action-btn" onClick={() => onView(row)}>
        <i className="bx bx-show" /> Xem
      </button>
      {!locked && (
        <>
          {canEdit && (
            <button
              type="button"
              className="btn btn-outline costs-action-btn"
              onClick={() => onEdit(row)}
              disabled={actionLoading === row.id}
            >
              <i className="bx bx-edit" /> Sửa
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary costs-action-btn"
              onClick={() => onApprove(row.id)}
              disabled={actionLoading === row.id}
            >
              <i className="bx bx-check" /> Duyệt
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="btn btn-outline costs-action-btn costs-action-btn--danger"
              onClick={() => onDelete(row.id)}
              disabled={actionLoading === row.id}
            >
              <i className="bx bx-x" /> Hủy
            </button>
          )}
          {!canEdit && !isAdmin && (
            <span className="costs-mobile-wait">Chờ duyệt</span>
          )}
        </>
      )}
    </div>
  );
}

function CostMobileCard(props: CostRowActionsProps) {
  const { row } = props;
  const { statusClass, statusText, handlerName } = costStatusMeta(row);

  return (
    <article className="costs-mobile-card">
      <div className="costs-mobile-card__head">
        <span className="costs-mobile-card__type">{row.type}</span>
        <span className={`status-pill ${statusClass}`}>{statusText}</span>
      </div>
      <div className="costs-mobile-card__amount">
        {formatOriginalMoney(row.amount, row.currency)}
      </div>
      <div className="costs-mobile-card__rate">{formatExchangeRate(row.usdVndRate)}</div>
      <div className="costs-mobile-card__meta">
        <span>
          <i className="bx bx-user" /> {row.creatorName}
        </span>
        <span>
          <i className="bx bx-check-shield" /> {handlerName}
        </span>
        {row.createdAt && (
          <span>
            <i className="bx bx-time-five" /> {formatCostDate(row.createdAt)}
          </span>
        )}
      </div>
      <CostRowActions {...props} layout="card" />
    </article>
  );
}

export function CostsPage() {
  const {
    user,
    rows,
    stats,
    timeFilter,
    setTimeFilter,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    filterCreatorId,
    setFilterCreatorId,
    filterType,
    setFilterType,
    creatorOptions,
    typeOptions,
    hasActiveFilters,
    showCustomDates,
    isAdmin,
    chartData,
    mainChartRef,
    donutRef,
    loading,
    saving,
    actionLoading,
    modalOpen,
    editingId,
    form,
    openCreate,
    openEdit,
    closeModal,
    updateForm,
    saveCost,
    approveCost,
    deleteCost,
    exportExcel,
    displayCurrency,
    setDisplayCurrency,
  } = useCostsPage();
  const [detailCost, setDetailCost] = useState<CostRow | null>(null);

  const groupLabel =
    chartData.groupMode === 'day'
      ? 'theo ngày'
      : chartData.groupMode === 'month'
        ? 'theo tháng'
        : 'theo năm';

  const statCards = [
    {
      label: 'Tổng chi phí',
      data: stats.total,
    },
    {
      label: 'Google Ads',
      data: stats.byType['Google Ads'],
    },
    {
      label: 'Bing Ads',
      data: stats.byType['Bing Ads'],
    },
    {
      label: 'Tài nguyên',
      data: stats.byType['Tài nguyên'],
    },
  ];

  const rowActionProps = {
    userId: user?.id,
    isAdmin,
    actionLoading,
    onView: setDetailCost,
    onEdit: openEdit,
    onApprove: approveCost,
    onDelete: deleteCost,
  };

  return (
    <div className="content-wrapper finance-page">
      <div className="page-header page-header-finance">
        <h2 className="page-title">Quản lý Chi phí</h2>
        <div className="page-header-finance__actions costs-header-actions">
          <div className="costs-filter-control">
            <i className="bx bx-dollar" />
            <select
              className="costs-time-filter"
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as typeof displayCurrency)}
              aria-label="Đơn vị hiển thị"
            >
              <option value="USD">USD ($)</option>
              <option value="VND">VND (₫)</option>
            </select>
          </div>
          <div className="costs-filter-control">
            <i className="bx bx-calendar" />
            <select
              className="costs-time-filter"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            >
              <option value="month">Tháng này</option>
              <option value="lastMonth">Tháng trước</option>
              <option value="year">Năm này</option>
              <option value="custom">Tùy chỉnh...</option>
            </select>
          </div>
          <div className="costs-filter-control">
            <i className="bx bx-purchase-tag" />
            <select
              className="costs-time-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Lọc theo loại chi phí"
            >
              <option value="">Tất cả loại</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          {isAdmin && creatorOptions.length > 0 && (
            <div className="costs-filter-control">
              <i className="bx bx-user" />
              <select
                className="costs-time-filter"
                value={filterCreatorId}
                onChange={(e) => setFilterCreatorId(e.target.value)}
                aria-label="Lọc theo người thêm"
              >
                <option value="">Tất cả người thêm</option>
                {creatorOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showCustomDates && (
            <div className="finance-custom-dates">
              <input
                type="date"
                className="date-input"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span style={{ color: 'var(--slate-400)' }}>-</span>
              <input
                type="date"
                className="date-input"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
          <button type="button" className="btn btn-primary costs-add-btn" onClick={openCreate}>
            <i className="bx bx-plus" /> Thêm chi phí
          </button>
        </div>
      </div>

      <div className="stats-grid grid-4-cols costs-stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card costs-stat-card">
            <div className="stat-header costs-stat-header" style={{ marginBottom: 8 }}>
              <div className="stat-details">
                <p>{s.label}</p>
                <h3 title={formatCostAmount(s.data.total, displayCurrency)}>
                  {formatCostAmount(s.data.total, displayCurrency)}
                </h3>
                <div className="costs-stat-breakdown">
                  <span>
                    Đã duyệt:{' '}
                    <strong title={formatCostAmount(s.data.approved, displayCurrency)}>
                      {formatCostAmount(s.data.approved, displayCurrency)}
                    </strong>
                    <em>{s.data.approvedCount} khoản</em>
                  </span>
                  <span>
                    Chưa duyệt:{' '}
                    <strong title={formatCostAmount(s.data.pending, displayCurrency)}>
                      {formatCostAmount(s.data.pending, displayCurrency)}
                    </strong>
                    <em>{s.data.pendingCount} khoản</em>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-2cols">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3>Thống kê chi phí {groupLabel}</h3>
              <p style={{ color: 'var(--slate-500)', fontSize: 13, marginTop: 4 }}>
                {chartData.rangeText}
              </p>
            </div>
          </div>
          <div ref={mainChartRef} className="finance-chart-host" />
        </div>
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3>Tỉ trọng loại chi phí</h3>
              <p style={{ color: 'var(--slate-500)', fontSize: 13, marginTop: 4 }}>
                Chỉ tính khoản đã duyệt
              </p>
            </div>
          </div>
          <div ref={donutRef} className="finance-chart-host finance-chart-host--donut" />
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
            <h3>Danh sách chi phí</h3>
            <div className="table-actions">
              <button type="button" className="btn btn-outline" onClick={exportExcel}>
                <i className="bx bx-download" /> Xuất Excel
              </button>
            </div>
          </div>

          <div className="table-responsive costs-desktop-table">
            <table className="task-table finance-table">
              <thead>
                <tr>
                  <th>Loại chi phí</th>
                  <th>Số tiền</th>
                  <th>Tỉ giá</th>
                  <th>Người thêm</th>
                  <th>Người xử lý</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7}>Đang tải chi phí...</td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      {hasActiveFilters
                        ? 'Không có chi phí phù hợp bộ lọc đã chọn.'
                        : 'Không có chi phí trong khoảng thời gian này.'}
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((row) => {
                    const { statusClass, statusText, handlerName } = costStatusMeta(row);

                    return (
                      <tr key={row.id}>
                        <td>{row.type}</td>
                        <td className="font-bold text-danger">
                          {formatOriginalMoney(row.amount, row.currency)}
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}>
                          {formatExchangeRate(row.usdVndRate)}
                        </td>
                        <td>{row.creatorName}</td>
                        <td>{handlerName}</td>
                        <td>
                          <span className={`status-pill ${statusClass}`}>{statusText}</span>
                        </td>
                        <td>
                          <CostRowActions row={row} {...rowActionProps} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="costs-mobile-list">
            {loading && <p className="costs-mobile-empty">Đang tải chi phí...</p>}
            {!loading && rows.length === 0 && (
              <p className="costs-mobile-empty">
                {hasActiveFilters
                  ? 'Không có chi phí phù hợp bộ lọc đã chọn.'
                  : 'Không có chi phí trong khoảng thời gian này.'}
              </p>
            )}
            {!loading && rows.map((row) => <CostMobileCard key={row.id} row={row} {...rowActionProps} />)}
          </div>
        </div>
      </div>

      <div className={`modal-overlay${modalOpen ? ' active' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <h3>{editingId ? 'Sửa chi phí' : 'Thêm chi phí'}</h3>
            <button type="button" className="close-modal" onClick={closeModal}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Loại chi phí <span className="text-danger">*</span>
              </label>
              <select
                className="form-input"
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              >
                <option value="">Chọn loại chi phí</option>
                {COST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value={COST_TYPE_CUSTOM}>Tùy chỉnh...</option>
              </select>
              {form.type === COST_TYPE_CUSTOM && (
                <input
                  className="form-input"
                  type="text"
                  value={form.customType}
                  onChange={(e) => updateForm('customType', e.target.value)}
                  placeholder="Nhập loại chi phí (ví dụ: Hosting, Domain...)"
                  style={{ marginTop: 10 }}
                  maxLength={120}
                />
              )}
            </div>

            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group half">
                <label>
                  Tiền tệ <span className="text-danger">*</span>
                </label>
                <select
                  className="form-input"
                  value={form.currency}
                  onChange={(e) => updateForm('currency', e.target.value)}
                >
                  <option value="VND">VND (₫)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="form-group half">
                <label>
                  Tỉ giá (1 USD = ? VND) <span className="text-danger">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  value={form.usdVndRate}
                  onChange={(e) => updateForm('usdVndRate', e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="27000"
                />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group half">
                <label>
                  Ngày chi phí <span className="text-danger">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={form.costDate}
                  onChange={(e) => updateForm('costDate', e.target.value)}
                />
              </div>
              <div className="form-group half">
                <label>
                  Số tiền ({form.currency}) <span className="text-danger">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => updateForm('amount', e.target.value)}
                  placeholder={form.currency === 'USD' ? 'Ví dụ: 1,250.50' : 'Ví dụ: 100,000,000'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Mô tả</label>
              <textarea
                className="form-input"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Ghi chú thêm nếu có"
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={saveCost} disabled={saving}>
              {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm chi phí'}
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay${detailCost ? ' active' : ''}`}>
        <div className="modal-content cost-detail-modal">
          <div className="modal-header cost-detail-modal__header">
            <div>
              <h3>Chi tiết chi phí</h3>
              <p>Xem thông tin khoản chi và trạng thái xử lý</p>
            </div>
            <button type="button" className="close-modal" onClick={() => setDetailCost(null)}>
              <i className="bx bx-x" />
            </button>
          </div>
          {detailCost && (
            <div className="modal-body cost-detail-body">
              <div className="cost-detail-hero">
                <div>
                  <span>Số tiền</span>
                  <strong>{formatOriginalMoney(detailCost.amount, detailCost.currency)}</strong>
                  <small style={{ display: 'block', marginTop: 4, color: 'var(--slate-500)' }}>
                    Tỉ giá: 1 USD = {detailCost.usdVndRate.toLocaleString('vi-VN')} VND
                  </small>
                </div>
                <span
                  className={`status-pill ${
                    detailCost.approved ? 'green-bg' : detailCost.canceled ? 'slate-bg' : 'purple-bg'
                  }`}
                >
                  {detailCost.approved ? 'Đã duyệt' : detailCost.canceled ? 'Đã hủy' : 'Chờ duyệt'}
                </span>
              </div>

              <div className="cost-detail-grid">
                <div>
                  <span>Loại chi phí</span>
                  <strong>{detailCost.type}</strong>
                </div>
                <div>
                  <span>Ngày tạo</span>
                  <strong>{formatCostDate(detailCost.createdAt)}</strong>
                </div>
                <div>
                  <span>Người thêm</span>
                  <strong>{detailCost.creatorName}</strong>
                </div>
                <div>
                  <span>Người xử lý</span>
                  <strong>
                    {detailCost.approved
                      ? detailCost.approverName
                      : detailCost.canceled
                        ? detailCost.cancellerName
                        : 'Chưa xử lý'}
                  </strong>
                </div>
              </div>

              <div className="cost-detail-note">
                <span>Mô tả</span>
                <p>{detailCost.description || 'Không có mô tả.'}</p>
              </div>
            </div>
          )}
          <div className="modal-footer cost-detail-footer">
            <button type="button" className="btn btn-primary" onClick={() => setDetailCost(null)}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
