import { useAffiliatePage } from '../hooks/useAffiliatePage';
import { formatOriginalMoney } from '../lib/currency';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function FinancePage() {
  const {
    tab,
    setTab,
    isTeamViewer,
    isAdmin,
    networks,
    accounts,
    revenues,
    loading,
    saving,
    error,
    stats,
    accountModalOpen,
    setAccountModalOpen,
    revenueModalOpen,
    setRevenueModalOpen,
    accountForm,
    setAccountForm,
    revenueForm,
    setRevenueForm,
    networkForm,
    setNetworkForm,
    revealedPasswords,
    revealPassword,
    saveAccount,
    saveRevenue,
    saveNetwork,
    toggleNetwork,
    filteredRevenueAccounts,
    displayCurrency,
    setDisplayCurrency,
    openRevenueModal,
  } = useAffiliatePage();

  const statCards = [
    { label: 'Tổng doanh thu', value: stats.totalRevenue },
    { label: 'Tổng số order', value: stats.totalOrders },
    { label: 'Account đang dùng', value: stats.activeAccounts },
    { label: 'TB / đơn', value: stats.avgPerOrder },
  ];

  return (
    <div className="content-wrapper finance-page">
      <div className="page-header page-header-finance">
        <h2 className="page-title">Affiliate & Doanh thu</h2>
        <div className="page-header-finance__actions">
          <button
            type="button"
            className={`btn btn-outline${tab === 'mine' ? ' active' : ''}`}
            onClick={() => setTab('mine')}
          >
            Của tôi
          </button>
          {isTeamViewer && (
            <button
              type="button"
              className={`btn btn-outline${tab === 'team' ? ' active' : ''}`}
              onClick={() => setTab('team')}
            >
              Toàn team
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className={`btn btn-outline${tab === 'networks' ? ' active' : ''}`}
              onClick={() => setTab('networks')}
            >
              Networks
            </button>
          )}
          {tab !== 'networks' && (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setAccountModalOpen(true)}
              >
                <i className="bx bx-user-plus" /> Thêm account
              </button>
              <select
                className="btn btn-outline"
                style={{ appearance: 'auto', cursor: 'pointer' }}
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as typeof displayCurrency)}
                aria-label="Đơn vị hiển thị"
              >
                <option value="USD">USD ($)</option>
                <option value="VND">VND (₫)</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openRevenueModal}
              >
                <i className="bx bx-plus" /> Nhập doanh thu
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 14 }}>{error}</p>
      )}

      {tab !== 'networks' && (
        <>
          <div className="stats-grid grid-4-cols">
            {statCards.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-details">
                  <p>{s.label}</p>
                  <h3>{loading ? '…' : s.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="finance-table-section" style={{ marginTop: 24 }}>
            <div className="chart-card finance-table-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                className="card-header finance-table-header"
                style={{
                  padding: 24,
                  marginBottom: 0,
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <h3>Account affiliate</h3>
              </div>
              <div className="table-responsive">
                <table className="task-table finance-table">
                  <thead>
                    <tr>
                      {tab === 'team' && <th>Nhân viên</th>}
                      <th>Network</th>
                      <th>Tên account</th>
                      <th>Email đăng nhập</th>
                      <th>Mật khẩu</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={tab === 'team' ? 6 : 5}>Đang tải…</td>
                      </tr>
                    ) : accounts.length === 0 ? (
                      <tr>
                        <td colSpan={tab === 'team' ? 6 : 5}>Chưa có account — bấm Thêm account</td>
                      </tr>
                    ) : (
                      accounts.map((acc) => (
                        <tr key={acc.id}>
                          {tab === 'team' && <td>{acc.owner.name}</td>}
                          <td>{acc.network.name}</td>
                          <td className="font-bold">{acc.name}</td>
                          <td>{acc.loginEmail}</td>
                          <td>
                            {acc.hasPassword ? (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => revealPassword(acc.id)}
                              >
                                <i className={`bx ${revealedPasswords[acc.id] ? 'bx-hide' : 'bx-show'}`} />{' '}
                                {revealedPasswords[acc.id] || '••••••'}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{acc.note || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="finance-table-section" style={{ marginTop: 24 }}>
            <div className="chart-card finance-table-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                className="card-header finance-table-header"
                style={{
                  padding: 24,
                  marginBottom: 0,
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <h3>Lịch sử doanh thu</h3>
              </div>
              <div className="table-responsive">
                <table className="task-table finance-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      {tab === 'team' && <th>Nhân viên</th>}
                      <th>Network</th>
                      <th>Account</th>
                      <th>Cửa hàng</th>
                      <th>Số order</th>
                      <th>Số tiền</th>
                      <th>Nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={tab === 'team' ? 8 : 7}>Đang tải…</td>
                      </tr>
                    ) : revenues.length === 0 ? (
                      <tr>
                        <td colSpan={tab === 'team' ? 8 : 7}>Chưa có doanh thu</td>
                      </tr>
                    ) : (
                      revenues.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.revenueDate)}</td>
                          {tab === 'team' && <td>{row.createdBy.name}</td>}
                          <td>{row.network.name}</td>
                          <td>{row.account.name}</td>
                          <td>{row.storeDomain || '—'}</td>
                          <td>{row.orderCount ?? '—'}</td>
                          <td className="font-bold text-success">
                            {formatOriginalMoney(row.amount, row.currency)}
                            {row.usdVndRate ? (
                              <small style={{ display: 'block', color: 'var(--slate-500)', fontWeight: 400 }}>
                                1 USD = {row.usdVndRate.toLocaleString('vi-VN')} ₫
                              </small>
                            ) : null}
                          </td>
                          <td>
                            <span className="status-pill purple-bg">
                              {row.source === 'MANUAL' ? 'Nhập tay' : row.source}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'networks' && isAdmin && (
        <div className="finance-table-section">
          <div className="chart-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Thêm network</h3>
            <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
              <input
                className="form-input"
                placeholder="Tên (vd: Impact, Shopify Collab)"
                value={networkForm.name}
                onChange={(e) => setNetworkForm((f) => ({ ...f, name: e.target.value }))}
              />
              <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
                Mã network tự sinh từ tên (vd: &quot;Shopify Collab&quot; →{' '}
                <code>shopify_collab</code>). Hiện chỉ nhập tay — API tích hợp sau.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={saveNetwork}
              >
                Lưu network
              </button>
            </div>
          </div>
          <div className="chart-card finance-table-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="task-table finance-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Mã</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {networks.map((n) => (
                    <tr key={n.id}>
                      <td>{n.name}</td>
                      <td>
                        <code>{n.code}</code>
                      </td>
                      <td>
                        <span className={`status-pill ${n.active ? 'green-bg' : 'slate-bg'}`}>
                          {n.active ? 'Bật' : 'Tắt'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => toggleNetwork(n)}
                        >
                          {n.active ? 'Tắt' : 'Bật'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Account modal */}
      <div className={`modal-overlay${accountModalOpen ? ' active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Thêm account affiliate</h3>
            <button type="button" className="close-modal" onClick={() => setAccountModalOpen(false)}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Network *</label>
              <select
                className="form-input"
                value={accountForm.networkId}
                onChange={(e) => setAccountForm((f) => ({ ...f, networkId: e.target.value }))}
              >
                <option value="">— Chọn network —</option>
                {networks
                  .filter((n) => n.active)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tên account *</label>
              <input
                className="form-input"
                value={accountForm.name}
                onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="collab-an-01"
              />
            </div>
            <div className="form-group">
              <label>Email đăng nhập *</label>
              <input
                className="form-input"
                type="email"
                value={accountForm.loginEmail}
                onChange={(e) => setAccountForm((f) => ({ ...f, loginEmail: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu *</label>
              <input
                className="form-input"
                type="password"
                value={accountForm.password}
                onChange={(e) => setAccountForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Link dashboard</label>
              <input
                className="form-input"
                value={accountForm.dashboardUrl}
                onChange={(e) => setAccountForm((f) => ({ ...f, dashboardUrl: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Ghi chú</label>
              <input
                className="form-input"
                value={accountForm.note}
                onChange={(e) => setAccountForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setAccountModalOpen(false)}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={saveAccount}>
              Lưu account
            </button>
          </div>
        </div>
      </div>

      {/* Revenue modal */}
      <div className={`modal-overlay${revenueModalOpen ? ' active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Nhập doanh thu</h3>
            <button type="button" className="close-modal" onClick={() => setRevenueModalOpen(false)}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Network *</label>
              <select
                className="form-input"
                value={revenueForm.networkId}
                onChange={(e) =>
                  setRevenueForm((f) => ({
                    ...f,
                    networkId: e.target.value,
                    accountId: '',
                  }))
                }
              >
                <option value="">— Chọn network —</option>
                {networks
                  .filter((n) => n.active)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Account *</label>
              <select
                className="form-input"
                value={revenueForm.accountId}
                onChange={(e) => setRevenueForm((f) => ({ ...f, accountId: e.target.value }))}
                disabled={!revenueForm.networkId}
              >
                <option value="">— Chọn account —</option>
                {filteredRevenueAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {tab === 'team' ? `${a.name} (${a.owner.name})` : a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Tiền tệ *</label>
                <select
                  className="form-input"
                  value={revenueForm.currency}
                  onChange={(e) => setRevenueForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (₫)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tỉ giá (1 USD = ? VND) *</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  value={revenueForm.usdVndRate}
                  onChange={(e) =>
                    setRevenueForm((f) => ({
                      ...f,
                      usdVndRate: e.target.value.replace(/[^\d]/g, ''),
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label>Số tiền ({revenueForm.currency}) *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step={revenueForm.currency === 'USD' ? '0.01' : '1'}
                value={revenueForm.amount}
                onChange={(e) => setRevenueForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Số lượng order</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={revenueForm.orderCount}
                onChange={(e) => setRevenueForm((f) => ({ ...f, orderCount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Ngày doanh thu *</label>
              <input
                className="form-input"
                type="date"
                value={revenueForm.revenueDate}
                onChange={(e) => setRevenueForm((f) => ({ ...f, revenueDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Cửa hàng / website</label>
              <input
                className="form-input"
                value={revenueForm.storeDomain}
                onChange={(e) => setRevenueForm((f) => ({ ...f, storeDomain: e.target.value }))}
                placeholder="abc-fashion.myshopify.com (để trống = tổng account)"
              />
            </div>
            <div className="form-group">
              <label>Ghi chú</label>
              <input
                className="form-input"
                value={revenueForm.note}
                onChange={(e) => setRevenueForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setRevenueModalOpen(false)}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={saveRevenue}>
              Lưu & báo admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
