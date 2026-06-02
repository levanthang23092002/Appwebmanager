import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kpiColor } from '../lib/taskKpi';
import type { EmployeeCard, User, UserRole, UserStatus } from '../lib/types';

const roleMap: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

const statusMap: Record<UserStatus, { label: string; color: string }> = {
  PENDING: { label: 'Đang chờ duyệt', color: '#f59e0b' },
  APPROVED: { label: 'Đã duyệt', color: '#10b981' },
  LOCKED: { label: 'Đã khóa', color: '#ef4444' },
};

function formatSalary(amount: number) {
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

function formatJoinDate(isoDate: string) {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('vi-VN');
}

function kpiSummary(emp: EmployeeCard) {
  if (!emp.kpiHasScore) return 'Chưa có CV hết hạn';
  return `${emp.kpiOnTime}/${emp.kpiExpired} đúng hạn`;
}

function TelegramLinkStatus({ linked }: { linked: boolean }) {
  return (
    <span className={`hr-telegram-status${linked ? ' is-linked' : ''}`}>
      <span className="hr-telegram-status__dot" aria-hidden />
      {linked ? 'Đã liên kết' : 'Chưa liên kết'}
    </span>
  );
}

function HrProfileField({
  icon,
  label,
  required,
  editable,
  children,
}: {
  icon: string;
  label: string;
  required?: boolean;
  editable?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`hr-profile-field${editable ? ' hr-profile-field--editable' : ''}`}>
      <div className="hr-profile-field__label">
        <i className={`bx ${icon}`} aria-hidden />
        <span>
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
      </div>
      <div className="hr-profile-field__control">{children}</div>
    </div>
  );
}

type PanelMode = 'view' | 'edit';

export function HrPage() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<EmployeeCard | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('view');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editStatus, setEditStatus] = useState<UserStatus>('PENDING');
  const [editAvatar, setEditAvatar] = useState('');
  const [editSalary, setEditSalary] = useState('0');

  const loadEmployees = useCallback(async () => {
    try {
      const { ok, data } = await apiFetch<User[]>('/api/users');
      if (!ok) throw new Error('fetch failed');
      setLoadError(false);
      setEmployees(
        data.map((dbUser) => ({
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          status: (dbUser.status || 'PENDING') as UserStatus,
          telegramLinked: !!dbUser.telegram?.trim(),
          joinDate: dbUser.createdAt || '',
          salary: dbUser.salary ?? 0,
          kpi: dbUser.taskKpi?.percent ?? 0,
          kpiOnTime: dbUser.taskKpi?.onTime ?? 0,
          kpiExpired: dbUser.taskKpi?.expired ?? 0,
          kpiNotExpired: dbUser.taskKpi?.notExpired ?? 0,
          kpiHasScore: dbUser.taskKpi?.hasScore ?? false,
          avatar:
            dbUser.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.name)}&background=random&color=fff`,
        }))
      );
    } catch {
      setLoadError(true);
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const totalSalary = employees.reduce((s, e) => s + e.salary, 0);
  const avgSalary =
    employees.length > 0 ? Math.round(totalSalary / employees.length) : 0;
  const approvedCount = employees.filter((e) => e.status === 'APPROVED').length;
  const pendingCount = employees.filter((e) => e.status === 'PENDING').length;
  const kpiScored = employees.filter((e) => e.kpiHasScore);
  const avgKpi =
    kpiScored.length > 0
      ? Math.round(kpiScored.reduce((s, e) => s + e.kpi, 0) / kpiScored.length)
      : null;

  const resetEditForm = (emp: EmployeeCard) => {
    setEditRole(emp.role);
    setEditStatus(emp.status);
    setEditAvatar(emp.avatar);
    setEditSalary(String(emp.salary || 0));
  };

  const openPanel = (emp: EmployeeCard) => {
    setSelected(emp);
    resetEditForm(emp);
    setPanelMode('view');
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setPanelMode('view');
    setSelected(null);
  };

  const enterEditMode = () => {
    if (selected) resetEditForm(selected);
    setPanelMode('edit');
  };

  const cancelEditMode = () => {
    if (selected) resetEditForm(selected);
    setPanelMode('view');
  };

  const isAdmin = currentUser?.role === 'admin';

  const parseEditSalary = () => parseFloat(editSalary) || 0;

  const validateSalaryForApproval = () => {
    if (parseEditSalary() > 0) return true;
    alert('Vui lòng nhập lương tháng (lớn hơn 0) trước khi duyệt tài khoản.');
    return false;
  };

  const updateUser = async () => {
    if (!selected) return;
    if (editStatus === 'APPROVED' && !validateSalaryForApproval()) return;
    try {
      const { ok, data } = await apiFetch<{ error?: string }>(`/api/users/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
          salary: parseEditSalary(),
          avatar: editAvatar.trim() || null,
        }),
      });
      if (ok) {
        alert('Cập nhật nhân sự thành công!');
        await loadEmployees();
        closePanel();
      } else {
        alert(data.error || 'Lỗi khi cập nhật');
      }
    } catch {
      alert('Mất kết nối máy chủ');
    }
  };

  const approveAccount = async () => {
    if (!selected || !validateSalaryForApproval()) return;
    try {
      const { ok, data } = await apiFetch<{ error?: string }>(`/api/users/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'APPROVED',
          salary: parseEditSalary(),
          role: editRole,
          avatar: editAvatar.trim() || null,
        }),
      });
      if (ok) {
        alert('Đã duyệt tài khoản và gán lương thành công!');
        loadEmployees();
        closePanel();
      } else {
        alert(data.error || 'Không thể duyệt tài khoản');
      }
    } catch {
      alert('Mất kết nối máy chủ');
    }
  };

  const quickSetStatus = async (status: UserStatus) => {
    if (!selected) return;
    try {
      const { ok } = await apiFetch(`/api/users/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (ok) {
        loadEmployees();
        closePanel();
      } else alert('Không thể đổi trạng thái');
    } catch {
      alert('Mất kết nối máy chủ');
    }
  };

  const onAddEmployee = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!isAdmin) {
      alert('Chỉ Admin mới có quyền tạo nhân sự mới!');
      return;
    }
    const fd = new FormData(form);
    const name = String(fd.get('name')).trim();
    const email = String(fd.get('email')).trim();
    const role = String(fd.get('role')) as UserRole;
    const salary = parseFloat(String(fd.get('salary'))) || 0;
    const avatarRaw = String(fd.get('avatar') || '').trim();
    if (!name || !email) {
      alert('Vui lòng điền đủ Tên và Email!');
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password: 'password123',
          role,
          status: 'APPROVED',
          salary,
          avatar: avatarRaw || undefined,
        }),
      });
      if (ok) {
        alert(`Đã thêm nhân sự. Đăng nhập: ${email} / password123`);
        form.reset();
        setModalOpen(false);
        await loadEmployees();
      } else {
        alert(data.error || 'Đăng ký thất bại');
      }
    } catch {
      alert('Máy chủ không rảnh hoặc mất kết nối');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="content-wrapper">
        <div className="page-header">
          <h2 className="page-title">Danh sách Nhân sự</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline">
              <i className="bx bx-export" /> Xuất Data
            </button>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                <i className="bx bx-user-plus" /> Thêm Nhân Viên
              </button>
            )}
          </div>
        </div>

        <div className="hr-kpi-overview">
          <div className="hr-kpi-stat">
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--slate-500)' }}>
              Tổng Nhân Viên
            </div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{employees.length}</div>
          </div>
          <div className="hr-kpi-divider" aria-hidden />
          <div className="hr-kpi-stat">
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--slate-500)' }}>
              Tổng quỹ lương
            </div>
            <div
              style={{
                fontSize: 'var(--font-2xl)',
                fontWeight: 700,
                color: 'var(--primary)',
              }}
            >
              {formatSalary(totalSalary)}
            </div>
          </div>
          <div className="hr-kpi-divider" aria-hidden />
          <div className="hr-kpi-stat">
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--slate-500)' }}>
              KPI trung bình
            </div>
            <div
              style={{
                fontSize: 'var(--font-2xl)',
                fontWeight: 700,
                color: avgKpi != null ? kpiColor(avgKpi) : 'var(--slate-400)',
              }}
            >
              {avgKpi != null ? `${avgKpi}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
              CV hết hạn · hoàn thành đúng hạn
            </div>
          </div>
          <div className="hr-kpi-divider" aria-hidden />
          <div className="hr-kpi-stat">
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--slate-500)' }}>
              Lương trung bình
            </div>
            <div
              style={{
                fontSize: 'var(--font-2xl)',
                fontWeight: 700,
                color: 'var(--success)',
              }}
            >
              {formatSalary(avgSalary)}
            </div>
          </div>
          <div className="hr-kpi-divider" aria-hidden />
          <div className="hr-kpi-stat">
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--slate-500)' }}>
              Đã duyệt / Chờ duyệt
            </div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>
              <span style={{ color: 'var(--success)' }}>{approvedCount}</span>
              <span style={{ color: 'var(--slate-400)', fontSize: 'var(--font-lg)' }}> / </span>
              <span style={{ color: '#f59e0b' }}>{pendingCount}</span>
            </div>
          </div>
        </div>

        <div className="hr-grid">
          {loadError && (
            <div
              style={{
                gridColumn: '1/-1',
                textAlign: 'center',
                color: 'var(--danger)',
                padding: 40,
                background: 'rgba(239,68,68,0.1)',
                borderRadius: 12,
                border: '1px dashed var(--danger)',
              }}
            >
              <h3>⚠️ Mất kết nối Cơ sở dữ liệu</h3>
              <p>Hãy đảm bảo Next.js server đang chạy và API hoạt động bình thường.</p>
            </div>
          )}
          {!loadError &&
            employees.map((emp) => {
              const statusInfo = statusMap[emp.status] || statusMap.PENDING;
              return (
                <article
                  key={emp.id}
                  className="hr-card"
                  onClick={() => openPanel(emp)}
                  onKeyDown={(e) => e.key === 'Enter' && openPanel(emp)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`hr-card-accent hr-card-accent--${emp.role}`} aria-hidden />
                  <div className="hr-card-main">
                    <div className="hr-avatar-wrap">
                      <img src={emp.avatar} alt="" className="hr-avatar" />
                    </div>
                    <div className="hr-card-content">
                      <div className="hr-card-head">
                        <h4 className="hr-card-name">
                          <span className="hr-card-name__text">{emp.name}</span>
                          <span className="hr-card-id">#{emp.id}</span>
                        </h4>
                        {emp.kpiHasScore && (
                          <span
                            className="hr-card-kpi"
                            style={{ color: kpiColor(emp.kpi) }}
                            title={`KPI: ${kpiSummary(emp)}`}
                          >
                            {emp.kpi}%
                          </span>
                        )}
                      </div>
                      <p className="hr-card-email" title={emp.email}>
                        <i className="bx bx-envelope" />
                        <span>{emp.email}</span>
                      </p>
                      <div className="hr-badges">
                        <span className={`hr-role ${emp.role}`}>{roleMap[emp.role]}</span>
                        <span className={`hr-status-pill hr-status-pill--${emp.status.toLowerCase()}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hr-card-footer">
                    <span>Xem chi tiết</span>
                    <i className="bx bx-chevron-right" aria-hidden />
                  </div>
                </article>
              );
            })}
        </div>
      </div>

      <div
        className={`slide-over-overlay${panelOpen ? ' active' : ''}`}
        onClick={closePanel}
        role="presentation"
      />
      <div className={`slide-over-panel${panelOpen ? ' active' : ''}`}>
        <div className="slide-over-header">
          <div>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, margin: 0 }}>
              Hồ sơ nhân sự
            </h3>
            <p className="hr-panel-subtitle">
              {panelMode === 'edit' ? 'Chỉnh sửa thông tin nhân sự' : 'Xem thông tin nhân sự'}
            </p>
          </div>
          <div className="hr-panel-header-actions">
            {isAdmin && panelMode === 'view' && selected && (
              <button
                type="button"
                className="hr-panel-edit-btn"
                title="Cập nhật thông tin"
                aria-label="Cập nhật thông tin"
                onClick={enterEditMode}
              >
                <i className="bx bx-edit-alt" />
              </button>
            )}
            {isAdmin && panelMode === 'edit' && (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={cancelEditMode}>
                  Hủy
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={updateUser}>
                  <i className="bx bx-save" /> Lưu
                </button>
              </>
            )}
            <button type="button" className="close-slide" onClick={closePanel}>
              <i className="bx bx-x" style={{ fontSize: 24 }} />
            </button>
          </div>
        </div>
        <div className="slide-over-body">
          {selected && (() => {
            const isEditing = isAdmin && panelMode === 'edit';
            const displayRole = isEditing ? editRole : selected.role;
            const displayStatus = isEditing ? editStatus : selected.status;
            const statusInfo = statusMap[displayStatus] || statusMap.PENDING;

            return (
            <>
              <div className="hr-panel-hero">
                <img src={selected.avatar} alt="" className="hr-panel-hero__avatar" />
                <div className="hr-panel-hero__body">
                  <h3 className="hr-panel-hero__name">{selected.name}</h3>
                  <p className="hr-panel-hero__email">{selected.email}</p>
                  <div className="hr-panel-hero__badges">
                    <span className={`hr-role ${displayRole}`}>{roleMap[displayRole]}</span>
                    <span className={`hr-status-pill hr-status-pill--${displayStatus.toLowerCase()}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              {isEditing && displayStatus === 'PENDING' && (
                <div className="hr-pending-banner">
                  <i className="bx bx-info-circle" />
                  <span>
                    Tài khoản đang chờ duyệt. Nhập lương tháng rồi bấm <strong>Duyệt tài khoản</strong>.
                  </span>
                </div>
              )}

              <section className={`hr-detail-section${isEditing ? ' hr-detail-section--editing' : ''}`}>
                <header className="hr-detail-section__head">
                  <h4 className="hr-detail-section__title">Thông tin chi tiết</h4>
                  {isEditing && (
                    <span className="hr-detail-section__mode">
                      <i className="bx bx-edit-alt" /> Đang chỉnh sửa
                    </span>
                  )}
                </header>

                <div className="hr-profile-fields">
                  <HrProfileField
                    icon="bx-wallet"
                    label="Lương / tháng"
                    required={isEditing && displayStatus === 'PENDING'}
                    editable={isEditing}
                  >
                    {isEditing ? (
                      <input
                        id="hr-edit-salary"
                        type="number"
                        className="form-input hr-profile-input"
                        min={0}
                        step={1000}
                        value={editSalary}
                        onChange={(e) => setEditSalary(e.target.value)}
                        placeholder="Ví dụ: 15000000"
                      />
                    ) : (
                      <span className="hr-profile-value hr-profile-value--salary">
                        {formatSalary(selected.salary)}
                      </span>
                    )}
                  </HrProfileField>

                  <HrProfileField icon="bx-calendar" label="Ngày vào làm">
                    <span className="hr-profile-value">{formatJoinDate(selected.joinDate)}</span>
                  </HrProfileField>

                  <HrProfileField icon="bxl-telegram" label="Telegram">
                    <TelegramLinkStatus linked={selected.telegramLinked} />
                  </HrProfileField>

                  <HrProfileField icon="bx-shield-quarter" label="Quyền hệ thống" editable={isEditing}>
                    {isEditing ? (
                      <select
                        className="form-input hr-profile-input"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                      >
                        <option value="staff">Nhân viên (Staff)</option>
                        <option value="manager">Quản lý (Manager)</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                      </select>
                    ) : (
                      <span className={`hr-role ${selected.role}`}>{roleMap[selected.role]}</span>
                    )}
                  </HrProfileField>

                  <HrProfileField
                    icon="bx-user-check"
                    label="Trạng thái tài khoản"
                    editable={isEditing}
                  >
                    {isEditing ? (
                      <div className="hr-profile-status-edit">
                        <select
                          className="form-input hr-profile-input"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                        >
                          <option value="PENDING">Đang chờ duyệt</option>
                          <option value="APPROVED">Đã duyệt</option>
                          <option value="LOCKED">Đã khóa</option>
                        </select>
                        <div className="hr-profile-status-actions">
                          {displayStatus === 'PENDING' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={approveAccount}
                            >
                              <i className="bx bx-check" /> Duyệt tài khoản
                            </button>
                          )}
                          {displayStatus === 'LOCKED' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => quickSetStatus('APPROVED')}
                            >
                              <i className="bx bx-lock-open" /> Mở khóa
                            </button>
                          )}
                          {displayStatus !== 'LOCKED' && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm hr-btn-lock"
                              onClick={() => quickSetStatus('LOCKED')}
                            >
                              <i className="bx bx-lock" /> Khóa tài khoản
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span
                        className={`hr-status-pill hr-status-pill--${selected.status.toLowerCase()}`}
                      >
                        {statusInfo.label}
                      </span>
                    )}
                  </HrProfileField>
                </div>

                <div className="hr-kpi-block">
                  <header className="hr-kpi-block__head">
                    <span className="hr-kpi-block__title">
                      <i className="bx bx-trending-up" /> KPI công việc
                    </span>
                    <span
                      className="hr-kpi-block__score"
                      style={{
                        color: selected.kpiHasScore ? kpiColor(selected.kpi) : 'var(--slate-400)',
                      }}
                    >
                      {selected.kpiHasScore ? `${selected.kpi}%` : '—'}
                    </span>
                  </header>
                  <div className="hr-kpi-bar">
                    <div
                      className="hr-kpi-fill"
                      style={{ width: selected.kpiHasScore ? `${selected.kpi}%` : '0%' }}
                    />
                  </div>
                  <div className="hr-kpi-hint">{kpiSummary(selected)}</div>
                  <p className="hr-kpi-explainer hr-kpi-explainer--inline">
                    {selected.kpiHasScore
                      ? `${selected.kpiNotExpired > 0 ? `${selected.kpiNotExpired} CV còn hạn chưa tính. ` : ''}Chỉ tính CV đã hết hạn; hoàn thành đúng/trước deadline = đúng hạn.`
                      : 'Chưa có công việc quá hạn để tính KPI.'}
                  </p>
                </div>
              </section>

              {!isAdmin && (
                <p className="hr-panel-readonly-hint">
                  Chỉ Admin mới có thể chỉnh lương, quyền và trạng thái nhân sự.
                </p>
              )}
            </>
            );
          })()}
        </div>
      </div>

      <div className={`modal-overlay${modalOpen ? ' active' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 500 }}>
          <div className="modal-header">
            <h3>Thêm Nhân Viên Mới</h3>
            <button type="button" className="close-modal" onClick={() => setModalOpen(false)}>
              <i className="bx bx-x" />
            </button>
          </div>
          <form onSubmit={onAddEmployee}>
            <div className="modal-body">
              <div className="form-group">
                <label>
                  Họ và Tên <span className="text-danger">*</span>
                </label>
                <input name="name" className="form-input" placeholder="Ví dụ: Nguyễn Văn A" required />
              </div>
              <div className="form-group">
                <label>Địa chỉ Email</label>
                <input name="email" type="email" className="form-input" placeholder="nguyenvana@eaglerise.com" />
              </div>
              <div className="form-group">
                <label>
                  Vai trò (Phân quyền) <span className="text-danger">*</span>
                </label>
                <select name="role" className="form-input" defaultValue="staff">
                  <option value="staff">Staff (Nhân viên)</option>
                  <option value="manager">Manager (Quản lý cấp trung)</option>
                  <option value="admin">Admin (Quản trị hệ thống)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Lương tháng (VND)</label>
                <input
                  name="salary"
                  type="number"
                  className="form-input"
                  placeholder="Ví dụ: 15000000"
                  min={0}
                  step={1000}
                  defaultValue={0}
                />
              </div>
              <div className="form-group">
                <label>Ảnh đại diện (URL)</label>
                <input name="avatar" type="url" className="form-input" placeholder="https://... (Tùy chọn)" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang tải...' : 'Thêm Nhân viên'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
