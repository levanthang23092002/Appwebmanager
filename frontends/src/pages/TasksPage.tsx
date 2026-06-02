import { Navigate, NavLink, useParams } from 'react-router-dom';
import { KanbanColumn } from '../components/tasks/KanbanColumn';
import { TaskKanbanCard } from '../components/tasks/TaskKanbanCard';
import { useTasksPage } from '../hooks/useTasksPage';
import { useAuth } from '../lib/auth';
import {
  parseTaskScope,
  TASK_SCOPE_HINTS,
  taskNavItems,
  type TaskScope,
} from '../lib/taskScope';
import type { UserRole } from '../lib/types';

const columns = [
  { id: 'todo', title: 'Cần làm', dot: 'slate-dot' },
  { id: 'inprogress', title: 'Đang thực hiện', dot: 'indigo-dot' },
  { id: 'review', title: 'Đang review', dot: 'purple-dot' },
  { id: 'done', title: 'Hoàn thành', dot: 'green-dot' },
] as const;

function badgeClass(label: string) {
  if (label === 'Cao') return 'badge-high';
  if (label === 'Thấp') return 'badge-low';
  return 'badge-medium';
}

function statusPillClass(columnId: string) {
  if (columnId === 'done') return 'task-status-pill--done';
  if (columnId === 'review') return 'task-status-pill--review';
  if (columnId === 'inprogress') return 'task-status-pill--progress';
  return 'task-status-pill--todo';
}

function TaskScopeTabs({
  role,
}: {
  role: UserRole;
}) {
  const items = taskNavItems(role);
  return (
    <nav className="tasks-scope-tabs" aria-label="Chuyển tab công việc">
      {items.map((item) => (
        <NavLink
          key={item.scope}
          to={item.to}
          className={({ isActive }) =>
            `tasks-scope-tab${isActive ? ' tasks-scope-tab--active' : ''}`
          }
          end
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function TasksPageContent({ taskScope }: { taskScope: TaskScope }) {
  const { user } = useAuth();
  const scopeHint = TASK_SCOPE_HINTS[taskScope];
  const {
    pageTitle,
    view,
    setView,
    tasks,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    assignerOptions,
    yearOptions,
    users,
    loadError,
    modalOpen,
    editingId,
    saving,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    assigneeId,
    setAssigneeId,
    deadline,
    setDeadline,
    openCreate,
    openEdit,
    closeModal,
    saveTask,
    deleteTask,
    moveTask,
    runTaskAction,
    openReasonModal,
    reasonModal,
    reasonText,
    setReasonText,
    submitReasonModal,
    closeReasonModal,
    actionLoading,
    tasksByColumn,
    pendingTasks,
    rejectedTasks,
    currentUserId,
    filteredTasks,
  } = useTasksPage(taskScope);

  return (
    <div className="content-wrapper tasks-page">
      <div className="page-header tasks-page-header">
        <div>
          <h2 className="page-title">{pageTitle}</h2>
          <p className="tasks-scope-hint">{scopeHint}</p>
        </div>
        <div className="task-actions">
          <div className="view-toggles">
            {(['kanban', 'list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`view-btn${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}
                title={v}
              >
                <i
                  className={`bx ${
                    v === 'kanban' ? 'bx-columns' : v === 'list' ? 'bx-list-ul' : 'bx-calendar'
                  }`}
                />
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="bx bx-plus" /> Thêm việc nhanh
          </button>
        </div>
      </div>

      {user && <TaskScopeTabs role={user.role} />}

      <div className="tasks-filters">
        <div className="tasks-filters__row">
          <label className="tasks-filter">
            <span>Tìm kiếm</span>
            <input
              className="form-input"
              value={filters.query}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, query: e.target.value }))
              }
              placeholder="Tiêu đề, mô tả, người giao/nhận..."
            />
          </label>
          <label className="tasks-filter tasks-filter--period">
            <span>Thời gian</span>
            <div className="tasks-period-inputs">
              <select
                className="form-input"
                value={filters.month}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, month: e.target.value }))
                }
                aria-label="Lọc theo tháng"
              >
                <option value="">Tất cả tháng</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                className="form-input"
                value={filters.year}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, year: e.target.value }))
                }
                aria-label="Lọc theo năm"
              >
                <option value="">Tất cả năm</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="tasks-filter">
            <span>Ưu tiên</span>
            <select
              className="form-input"
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
            >
              <option value="">Tất cả</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
            </select>
          </label>
          <label className="tasks-filter">
            <span>Người nhận</span>
            <select
              className="form-input"
              value={filters.assigneeId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))
              }
            >
              <option value="">Tất cả</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="tasks-filter">
            <span>Người giao</span>
            <select
              className="form-input"
              value={filters.assignerId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, assignerId: e.target.value }))
              }
            >
              <option value="">Tất cả</option>
              {assignerOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="tasks-filters__meta">
          <span>
            Hiển thị <strong>{filteredTasks.length}</strong> / {tasks.length} công việc
          </span>
          {hasActiveFilters && (
            <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="tasks-load-error">
          Không tải được công việc từ API. Hãy đăng nhập lại, chạy backend và{' '}
          <code>npm run db:push</code>.
        </div>
      )}

      <div className="view-container">
        {view === 'kanban' && pendingTasks.length > 0 && (
          <div className="tasks-pending-panel">
            <h3 className="tasks-pending-panel__title">
              {taskScope === 'received'
                ? `Chờ bạn xác nhận (${pendingTasks.length})`
                : `Chờ người nhận xác nhận (${pendingTasks.length})`}
            </h3>
            <div className="tasks-pending-grid">
              {pendingTasks.map((card) => (
                <TaskKanbanCard
                  key={card.id}
                  card={card}
                  taskScope={taskScope}
                  currentUserId={currentUserId}
                  actionLoading={actionLoading}
                  onEdit={openEdit}
                  onAction={runTaskAction}
                  onReason={openReasonModal}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {view === 'kanban' && rejectedTasks.length > 0 && taskScope === 'assigned' && (
          <p className="tasks-rejected-hint">
            {rejectedTasks.length} task bị từ chối bởi người nhận
          </p>
        )}

        {view === 'kanban' && (
          <div className="task-view active">
            <div className="kanban-board">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  cards={tasksByColumn(col.id)}
                  taskScope={taskScope}
                  currentUserId={currentUserId}
                  actionLoading={actionLoading}
                  onEdit={openEdit}
                  onAction={runTaskAction}
                  onReason={openReasonModal}
                  onDropTask={moveTask}
                />
              ))}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="list-board task-view active">
            <p className="tasks-list-summary">
              {columns.reduce((n, col) => n + tasksByColumn(col.id).length, 0)} công việc
            </p>
            <div className="table-responsive tasks-list-scroll">
              <table className="task-table task-table--dense">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Người giao</th>
                    <th>Người nhận</th>
                    <th>Ưu tiên</th>
                    <th>Hạn</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.flatMap((col) =>
                    tasksByColumn(col.id).map((card) => (
                      <tr
                        key={card.id}
                        className={`tasks-list-row${card.isOverdue ? ' tasks-list-row--overdue' : ''}${card.done ? ' tasks-list-row--done' : ''}`}
                        onClick={() => openEdit(card)}
                      >
                        <td data-label="Tiêu đề">
                          <span className="tasks-list-title" title={card.title}>
                            {card.title}
                          </span>
                          {card.description && (
                            <span className="tasks-list-desc" title={card.description}>
                              {card.description}
                            </span>
                          )}
                        </td>
                        <td data-label="Người giao">{card.assignerName}</td>
                        <td data-label="Người nhận">{card.assigneeName}</td>
                        <td data-label="Ưu tiên">
                          <span className={`badge ${badgeClass(card.priorityLabel)}`}>
                            {card.priorityLabel}
                          </span>
                        </td>
                        <td data-label="Hạn">
                          <span className={card.isOverdue ? 'text-danger' : undefined}>
                            {card.deadlineLabel}
                          </span>
                        </td>
                        <td data-label="Trạng thái">
                          <span className={`task-status-pill ${statusPillClass(col.id)}`}>
                            {col.title}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="calendar-board task-view active">
            <div className="calendar-header">
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Lịch công việc</h3>
            </div>
            <p style={{ color: 'var(--slate-500)', fontSize: 14 }}>
              {tasksByColumn('todo').length +
                tasksByColumn('inprogress').length +
                tasksByColumn('review').length +
                tasksByColumn('done').length}{' '}
              công việc trong tab này.
            </p>
          </div>
        )}
      </div>

      <div className={`modal-overlay${reasonModal ? ' active' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <h3>
              {reasonModal?.action === 'reject'
                ? 'Từ chối nhận task'
                : 'Từ chối bản nộp'}
            </h3>
            <button type="button" className="close-modal" onClick={closeReasonModal}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <label className="form-group">
              Lý do <span className="text-danger">*</span>
              <textarea
                className="form-input"
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                style={{ marginTop: 8, resize: 'vertical' }}
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={closeReasonModal}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitReasonModal}
              disabled={actionLoading}
              style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay${modalOpen ? ' active' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 520 }}>
          <div className="modal-header">
            <h3>{editingId ? 'Chỉnh sửa công việc' : 'Thêm việc nhanh'}</h3>
            <button type="button" className="close-modal" onClick={closeModal}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>
                Tên công việc <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Thiết kế trang chủ..."
              />
            </div>
            <div className="form-group">
              <label>Độ ưu tiên</label>
              <select
                className="form-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Thấp">Thấp</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Cao">Cao</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label>
                  Người nhận việc <span className="text-danger">*</span>
                </label>
                <select
                  className="form-input"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  required
                >
                  <option value="">— Chọn —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group half">
                <label>
                  Ngày hết hạn <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Mô tả chi tiết</label>
              <textarea
                className="form-input"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Yêu cầu, link tài liệu, ghi chú triển khai..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="modal-footer">
            {editingId && (
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  marginRight: 'auto',
                  color: 'var(--danger)',
                  borderColor: 'var(--danger)',
                }}
                onClick={deleteTask}
              >
                Xóa
              </button>
            )}
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveTask}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TasksPage() {
  const { scope: scopeParam } = useParams<{ scope: string }>();
  const { user } = useAuth();
  const scope = parseTaskScope(scopeParam);

  if (!scope) {
    return <Navigate to="/tasks/assigned" replace />;
  }
  if (scope === 'all' && user?.role !== 'admin') {
    return <Navigate to="/tasks/assigned" replace />;
  }

  return <TasksPageContent key={scope} taskScope={scope} />;
}
