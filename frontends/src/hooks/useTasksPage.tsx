import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useServerEvents } from './useServerEvents';
import { useAuth } from '../lib/auth';
import type { TaskScope } from '../lib/taskScope';
import { TASK_SCOPE_PAGE_TITLES } from '../lib/taskScope';
import {
  KANBAN_TO_STATUS,
  STATUS_TO_KANBAN,
  TASK_STATUS,
  priorityCode,
  priorityLabel,
  statusLabel,
  type TaskAction,
} from '../lib/taskMaps';
import type { TaskItem, User } from '../lib/types';

export type ViewMode = 'kanban' | 'list' | 'calendar';

export interface TaskCardView {
  id: number;
  title: string;
  description: string;
  rawStatus: string;
  status: string;
  kanbanColumn: string | null;
  statusLabel: string;
  rejectReason: string;
  priority: string;
  priorityLabel: string;
  deadline: string;
  deadlineLabel: string;
  assigneeId: number;
  assignerId: number;
  assigneeName: string;
  assignerName: string;
  assigneeAvatar: string;
  createdAt: string;
  createdAtLabel: string;
  completedAtLabel: string;
  isOverdue: boolean;
  done: boolean;
}

export interface TaskFilterState {
  query: string;
  assigneeId: string;
  assignerId: string;
  priority: string;
  /** '' = tất cả tháng */
  month: string;
  /** '' = tất cả năm */
  year: string;
}

function getTaskPeriodDate(task: TaskCardView): Date | null {
  const iso = task.deadline || task.createdAt;
  if (!iso) return null;
  const date = task.deadline ? new Date(`${task.deadline}T00:00:00`) : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function currentPeriodFilter(): Pick<TaskFilterState, 'month' | 'year'> {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  };
}

function formatDeadline(d?: string | null) {
  if (!d) return { iso: '', label: '—' };
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return { iso: '', label: '—' };
  const m = date.getMonth() + 1;
  return {
    iso: d.split('T')[0],
    label: `${date.getDate()} Th${m}`,
  };
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function avatarUrl(name: string, url?: string | null) {
  return (
    url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`
  );
}

/** Giao mới nhất lên trước (theo thời điểm tạo/giao việc). */
function sortByAssignedNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function useTasksPage(taskScope: TaskScope) {
  const { token, user: currentUser } = useAuth();
  const pageTitle = TASK_SCOPE_PAGE_TITLES[taskScope];

  const [view, setView] = useState<ViewMode>('kanban');
  const [tasks, setTasks] = useState<TaskCardView[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Trung bình');
  const [assigneeId, setAssigneeId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [reasonModal, setReasonModal] = useState<{
    taskId: number;
    action: 'reject' | 'reject_review';
  } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilterState>(() => ({
    query: '',
    assigneeId: '',
    assignerId: '',
    priority: '',
    ...currentPeriodFilter(),
  }));

  const mapTask = useCallback((t: TaskItem): TaskCardView => {
    const raw = String(t.status);
    const kanbanColumn = STATUS_TO_KANBAN[raw] || null;
    const dl = formatDeadline(t.deadline);
    const done = raw === TASK_STATUS.DONE;
    const overdue =
      !done &&
      !!dl.iso &&
      new Date(`${dl.iso}T23:59:59`).getTime() < Date.now();
    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      rawStatus: raw,
      status: kanbanColumn || raw,
      kanbanColumn,
      statusLabel: statusLabel(raw),
      rejectReason: t.rejectReason || '',
      priority: t.priority,
      priorityLabel: priorityLabel(String(t.priority)),
      deadline: dl.iso,
      deadlineLabel: done ? 'Xong' : dl.label,
      assigneeId: t.assigneeId ?? t.assignee?.id ?? 0,
      assignerId: t.assignerId ?? t.assigner?.id ?? 0,
      assigneeName: t.assignee?.name || '—',
      assignerName: t.assigner?.name || '—',
      assigneeAvatar: avatarUrl(t.assignee?.name || 'U', t.assignee?.avatar),
      createdAt: t.createdAt || '',
      createdAtLabel: formatDateTime(t.createdAt),
      completedAtLabel: done ? formatDateTime(t.updatedAt) : '—',
      isOverdue: overdue,
      done,
    };
  }, []);

  const loadUsers = useCallback(async () => {
    const { ok, data } = await apiFetch<User[]>('/api/users');
    if (ok && Array.isArray(data)) {
      setUsers(data.filter((u) => u.status === 'APPROVED' || !u.status));
    }
  }, []);

  const tasksRef = useRef<TaskCardView[]>([]);
  tasksRef.current = tasks;

  const loadTasks = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      try {
        const { ok, data, status } = await apiFetch<TaskItem[]>(
          `/api/tasks?scope=${taskScope}`
        );
        if (!ok) {
          if (status === 401) throw new Error('unauthorized');
          throw new Error('fetch failed');
        }
        setLoadError(false);
        setTasks(data.map(mapTask));
      } catch {
        if (!silent || tasksRef.current.length === 0) {
          setLoadError(true);
          setTasks([]);
        }
      }
    },
    [mapTask, taskScope]
  );

  /** Lần đầu vào tab / đổi scope */
  useEffect(() => {
    void loadUsers();
    void loadTasks({ silent: false });
  }, [loadUsers, loadTasks]);

  /** Realtime: SSE + tự reconnect khi mất kết nối */
  useServerEvents({
    token,
    path: '/api/tasks/events',
    eventName: 'tasks',
    pollMs: 0,
    onEvent: () => {
      void loadTasks({ silent: true });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setPriority('Trung bình');
    setDeadline('');
    setAssigneeId(users[0] ? String(users[0].id) : '');
    setModalOpen(true);
  };

  const openEdit = (card: TaskCardView) => {
    setEditingId(card.id);
    setTitle(card.title);
    setDescription(card.description);
    setPriority(card.priorityLabel);
    setDeadline(card.deadline);
    setAssigneeId(String(card.assigneeId || ''));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const saveTask = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên công việc!');
      return;
    }
    if (!assigneeId) {
      alert('Vui lòng chọn người nhận việc!');
      return;
    }
    if (!deadline.trim()) {
      alert('Vui lòng chọn ngày hết hạn!');
      return;
    }
    if (!editingId && !currentUser?.id) {
      alert('Bạn cần đăng nhập để tạo công việc.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { ok } = await apiFetch(`/api/tasks/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            priority: priorityCode(priority),
            deadline,
            assigneeId: parseInt(assigneeId, 10),
          }),
        });
        if (!ok) throw new Error('update failed');
      } else {
        const { ok } = await apiFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            priority: priorityCode(priority),
            deadline,
            assigneeId: parseInt(assigneeId, 10),
            assignerId: currentUser!.id,
          }),
        });
        if (!ok) throw new Error('create failed');
      }
      await loadTasks({ silent: true });
      closeModal();
    } catch {
      alert('Không lưu được công việc. Kiểm tra backend và dữ liệu form.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!editingId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
      const { ok } = await apiFetch(`/api/tasks/${editingId}`, { method: 'DELETE' });
      if (ok) {
        await loadTasks({ silent: true });
        closeModal();
      } else {
        alert('Không xóa được công việc');
      }
    } catch {
      alert('Mất kết nối máy chủ');
    }
  };

  const runTaskAction = async (
    taskId: number,
    action: TaskAction,
    reason?: string
  ) => {
    setActionLoading(true);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>(
        `/api/tasks/${taskId}/action`,
        {
          method: 'POST',
          body: JSON.stringify({ action, reason }),
        }
      );
      if (!ok) {
        alert(data.error || 'Thao tác thất bại');
        return;
      }
      await loadTasks({ silent: true });
      setReasonModal(null);
      setReasonText('');
    } catch {
      alert('Mất kết nối máy chủ');
    } finally {
      setActionLoading(false);
    }
  };

  const openReasonModal = (taskId: number, action: 'reject' | 'reject_review') => {
    setReasonModal({ taskId, action });
    setReasonText('');
  };

  const submitReasonModal = () => {
    if (!reasonModal) return;
    if (!reasonText.trim()) {
      alert('Vui lòng nhập lý do!');
      return;
    }
    void runTaskAction(reasonModal.taskId, reasonModal.action, reasonText.trim());
  };

  const moveTask = async (taskId: number, newKanban: string) => {
    const card = tasks.find((t) => t.id === taskId);
    if (!card?.kanbanColumn) return;
    const status = KANBAN_TO_STATUS[newKanban];
    if (!status) return;
    try {
      const { ok, data } = await apiFetch<{ error?: string }>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!ok) {
        alert(data.error || 'Không thể chuyển cột');
        return;
      }
      await loadTasks({ silent: true });
    } catch {
      void loadTasks({ silent: true });
    }
  };

  const currentUserId = currentUser?.id ?? 0;

  const assignerOptions = useMemo(() => {
    const map = new Map<number, string>();
    tasks.forEach((t) => {
      if (t.assignerId > 0) map.set(t.assignerId, t.assignerName);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [tasks]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    tasks.forEach((t) => {
      const d = getTaskPeriodDate(t);
      if (d) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const monthNum = filters.month ? parseInt(filters.month, 10) : null;
    const yearNum = filters.year ? parseInt(filters.year, 10) : null;

    return sortByAssignedNewest(
      tasks.filter((t) => {
      if (filters.assigneeId && String(t.assigneeId) !== filters.assigneeId) return false;
      if (filters.assignerId && String(t.assignerId) !== filters.assignerId) return false;
      if (filters.priority && t.priority !== filters.priority) return false;

      if (monthNum || yearNum) {
        const periodDate = getTaskPeriodDate(t);
        if (!periodDate) return false;
        if (yearNum && periodDate.getFullYear() !== yearNum) return false;
        if (monthNum && periodDate.getMonth() + 1 !== monthNum) return false;
      }

      if (q) {
        const text = `${t.title} ${t.description} ${t.assigneeName} ${t.assignerName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    })
    );
  }, [filters, tasks]);

  return {
    taskScope,
    pageTitle,
    view,
    setView,
    tasks,
    filteredTasks,
    filters,
    setFilters,
    clearFilters: () =>
      setFilters({
        query: '',
        assigneeId: '',
        assignerId: '',
        priority: '',
        ...currentPeriodFilter(),
      }),
    hasActiveFilters: (() => {
      const { month: defaultMonth, year: defaultYear } = currentPeriodFilter();
      return (
        !!filters.query.trim() ||
        !!filters.assigneeId ||
        !!filters.assignerId ||
        !!filters.priority ||
        filters.month !== defaultMonth ||
        filters.year !== defaultYear
      );
    })(),
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
    closeReasonModal: () => setReasonModal(null),
    actionLoading,
    tasksByColumn: (col: string) =>
      filteredTasks.filter((t) => t.kanbanColumn === col),
    pendingTasks: filteredTasks.filter((t) => t.rawStatus === TASK_STATUS.PENDING_ACCEPTANCE),
    rejectedTasks: filteredTasks.filter((t) => t.rawStatus === TASK_STATUS.REJECTED_BY_ASSIGNEE),
    currentUserId,
  };
}
