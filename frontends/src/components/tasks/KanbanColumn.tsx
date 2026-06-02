import { useCallback, useEffect, useRef, useState } from 'react';
import { canDragTask, TaskKanbanCard } from './TaskKanbanCard';
import type { TaskCardView } from '../../hooks/useTasksPage';
import type { TaskAction } from '../../lib/taskMaps';
import type { TaskScope } from '../../lib/taskScope';

const PAGE_SIZE = 30;

type ColumnDef = {
  id: string;
  title: string;
  dot: string;
};

interface KanbanColumnProps {
  col: ColumnDef;
  cards: TaskCardView[];
  taskScope: TaskScope;
  currentUserId: number;
  actionLoading: boolean;
  onEdit: (card: TaskCardView) => void;
  onAction: (taskId: number, action: TaskAction) => void;
  onReason: (taskId: number, action: 'reject' | 'reject_review') => void;
  onDropTask: (taskId: number, columnId: string) => void;
}

export function KanbanColumn({
  col,
  cards,
  taskScope,
  currentUserId,
  actionLoading,
  onEdit,
  onAction,
  onReason,
  onDropTask,
}: KanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [scrollState, setScrollState] = useState({ canScroll: false, atTop: true, atBottom: true });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [col.id, cards.length]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight > el.clientHeight + 4;
    const atTop = el.scrollTop <= 4;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setScrollState({ canScroll, atTop, atBottom });
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, visibleCount, cards.length]);

  const visibleCards = cards.slice(0, visibleCount);
  const remaining = cards.length - visibleCards.length;
  const manyCards = cards.length > PAGE_SIZE;

  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="kanban-column">
      <div className="column-header">
        <div className="col-title">
          <div className={`dot ${col.dot}`} /> {col.title}
        </div>
        <span className={`col-count${cards.length >= 50 ? ' col-count--many' : ''}`}>
          {cards.length}
        </span>
      </div>

      {cards.length > 8 && (
        <p className="kanban-column-hint">
          <i className="bx bx-mouse" aria-hidden />
          Cuộn trong cột để xem tất cả
        </p>
      )}

      <div
        className={`kanban-column-scroll-wrap${scrollState.canScroll ? ' is-scrollable' : ''}${scrollState.atTop ? ' at-top' : ''}${scrollState.atBottom ? ' at-bottom' : ''}`}
      >
        <div
          ref={scrollRef}
          className="column-content"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = Number(e.dataTransfer.getData('taskId'));
            if (id) onDropTask(id, col.id);
          }}
        >
          {cards.length === 0 && <p className="kanban-column-empty">Chưa có việc</p>}
          {visibleCards.map((card) => (
            <TaskKanbanCard
              key={card.id}
              card={card}
              taskScope={taskScope}
              currentUserId={currentUserId}
              actionLoading={actionLoading}
              onEdit={onEdit}
              onAction={onAction}
              onReason={onReason}
              draggable={canDragTask(card, currentUserId)}
              onDragStart={(e) => e.dataTransfer.setData('taskId', String(card.id))}
            />
          ))}
          {remaining > 0 && (
            <button
              type="button"
              className="kanban-load-more"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              Xem thêm {remaining} việc
            </button>
          )}
        </div>
      </div>

      {manyCards && scrollState.canScroll && (
        <div className="kanban-column-jump">
          <button type="button" className="kanban-jump-btn" onClick={scrollToTop} title="Lên đầu">
            <i className="bx bx-up-arrow-alt" />
          </button>
          <button type="button" className="kanban-jump-btn" onClick={scrollToBottom} title="Xuống cuối">
            <i className="bx bx-down-arrow-alt" />
          </button>
        </div>
      )}
    </div>
  );
}
