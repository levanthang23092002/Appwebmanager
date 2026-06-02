import { TASK_STATUS, type TaskAction } from '../../lib/taskMaps';
import type { TaskCardView } from '../../hooks/useTasksPage';
import type { TaskScope } from '../../lib/taskScope';

interface Props {
  card: TaskCardView;
  taskScope: TaskScope;
  currentUserId: number;
  actionLoading: boolean;
  onAction: (taskId: number, action: TaskAction) => void;
  onReason: (taskId: number, action: 'reject' | 'reject_review') => void;
}

export function TaskWorkflowButtons({
  card,
  taskScope,
  currentUserId,
  actionLoading,
  onAction,
  onReason,
}: Props) {
  const isAssignee = card.assigneeId === currentUserId;
  const isAssigner = card.assignerId === currentUserId;
  const disabled = actionLoading;

  const btn = (label: string, action: TaskAction, variant: 'primary' | 'outline' | 'danger' = 'primary') => (
    <button
      key={action}
      type="button"
      className={`btn btn-sm ${variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-outline' : 'btn-outline'}`}
      style={
        variant === 'danger'
          ? { color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: 12, padding: '4px 10px' }
          : { fontSize: 12, padding: '4px 10px' }
      }
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onAction(card.id, action);
      }}
    >
      {label}
    </button>
  );

  if (card.rawStatus === TASK_STATUS.PENDING_ACCEPTANCE && isAssignee && taskScope === 'received') {
    return (
      <div className="task-workflow-actions" onClick={(e) => e.stopPropagation()}>
        {btn('Nhận việc', 'accept')}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onReason(card.id, 'reject');
          }}
        >
          Từ chối
        </button>
      </div>
    );
  }

  if (isAssignee && taskScope === 'received') {
    if (card.rawStatus === TASK_STATUS.TODO) {
      return (
        <div className="task-workflow-actions" onClick={(e) => e.stopPropagation()}>
          {btn('Bắt đầu làm', 'start')}
        </div>
      );
    }
    if (card.rawStatus === TASK_STATUS.IN_PROGRESS) {
      return (
        <div className="task-workflow-actions" onClick={(e) => e.stopPropagation()}>
          {btn('Nộp review', 'submit')}
        </div>
      );
    }
  }

  if (isAssigner && taskScope === 'assigned' && card.rawStatus === TASK_STATUS.REVIEW) {
    return (
      <div className="task-workflow-actions" onClick={(e) => e.stopPropagation()}>
        {btn('Chấp nhận', 'approve')}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onReason(card.id, 'reject_review');
          }}
        >
          Từ chối + lý do
        </button>
      </div>
    );
  }

  if (card.rejectReason && (card.rawStatus === TASK_STATUS.REJECTED_BY_ASSIGNEE || card.rawStatus === TASK_STATUS.IN_PROGRESS)) {
    return <p className="task-reject-reason">Lý do: {card.rejectReason}</p>;
  }

  return null;
}
