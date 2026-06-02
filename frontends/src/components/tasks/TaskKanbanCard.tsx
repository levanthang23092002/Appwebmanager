import { TaskWorkflowButtons } from './TaskWorkflowButtons';
import { TASK_STATUS, type TaskAction } from '../../lib/taskMaps';
import type { TaskCardView } from '../../hooks/useTasksPage';
import type { TaskScope } from '../../lib/taskScope';

function badgeClass(label: string) {
  if (label === 'Cao') return 'badge-high';
  if (label === 'Thấp') return 'badge-low';
  return 'badge-medium';
}

export interface TaskKanbanCardProps {
  card: TaskCardView;
  taskScope: TaskScope;
  currentUserId: number;
  actionLoading: boolean;
  onEdit: (card: TaskCardView) => void;
  onAction: (taskId: number, action: TaskAction) => void;
  onReason: (taskId: number, action: 'reject' | 'reject_review') => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
}

export function TaskKanbanCard({
  card,
  taskScope,
  currentUserId,
  actionLoading,
  onEdit,
  onAction,
  onReason,
  draggable = false,
  onDragStart,
  compact = false,
}: TaskKanbanCardProps) {
  return (
    <article
      className={`task-card${card.done ? ' task-card--done' : ''}${card.isOverdue ? ' task-card--overdue' : ''}${compact ? ' task-card--compact' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="task-card__top">
        <div className="card-labels">
          {card.rawStatus === TASK_STATUS.PENDING_ACCEPTANCE && (
            <span className="badge badge-medium">{card.statusLabel}</span>
          )}
          <span className={`badge ${badgeClass(card.priorityLabel)}`}>{card.priorityLabel}</span>
          {card.isOverdue && <span className="badge badge-high">Trễ hạn</span>}
          {card.done && <span className="badge task-card__done-badge">Xong</span>}
        </div>
        <button
          type="button"
          className="edit-task-btn"
          title="Chỉnh sửa"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(card);
          }}
        >
          <i className="bx bx-edit" />
        </button>
      </div>

      <h4 className="card-title">{card.title}</h4>

      {card.description && !compact && (
        <p className="task-card-desc" title={card.description}>
          {card.description}
        </p>
      )}

      <p className="task-card-meta">
        <i className="bx bx-user" aria-hidden />
        <span>
          {card.assignerName}
          <i className="bx bx-right-arrow-alt task-card-meta__arrow" aria-hidden />
          {card.assigneeName}
        </span>
      </p>

      <TaskWorkflowButtons
        card={card}
        taskScope={taskScope}
        currentUserId={currentUserId}
        actionLoading={actionLoading}
        onAction={onAction}
        onReason={onReason}
      />

      <div className="card-footer">
        <div className={`card-date${card.done ? ' status-done' : ''}`}>
          <i className={`bx ${card.done ? 'bx-check-circle' : 'bx-time-five'}`} />
          <span>{card.deadlineLabel}</span>
        </div>
        <div className="card-assignee" title={card.assigneeName}>
          <img src={card.assigneeAvatar} alt="" />
        </div>
      </div>
    </article>
  );
}

export function canDragTask(card: TaskCardView, currentUserId: number) {
  return (
    !!card.kanbanColumn &&
    card.assigneeId === currentUserId &&
    card.rawStatus !== TASK_STATUS.REVIEW
  );
}
