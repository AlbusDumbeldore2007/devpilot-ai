import { CalendarDays, Check, CheckCircle2, FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './Badge.jsx';
import { getDeadlineMeta, isOverdue } from '../utils/format.js';

const slug = (value) => String(value).toLowerCase().replace(/\s+/g, '-');

/**
 * Reusable task card with two layouts:
 * - `card`: Kanban column card (draggable)
 * - `row`: compact list row used in project details and list view
 */
export default function TaskCard({
  task,
  variant = 'card',
  draggable = false,
  onDragStart,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  const deadline = getDeadlineMeta(task.dueDate);
  const projectName = typeof task.project === 'object' ? task.project?.name : null;
  const completed = task.status === 'Completed';

  const stop = (event) => event.stopPropagation();
  const open = () => onOpen?.(task);

  if (variant === 'row') {
    return (
      <article
        className={`task-row ${completed ? 'is-completed' : ''} ${overdue ? 'is-overdue' : ''}`}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter') open();
        }}
        role="button"
        tabIndex={0}
      >
        <button
          className={`task-check ${completed ? 'is-checked' : ''}`}
          onClick={(event) => {
            stop(event);
            onStatusChange?.(task, completed ? 'To Do' : 'Completed');
          }}
          aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
          title={completed ? 'Mark as to do' : 'Mark as completed'}
        >
          {completed ? <CheckCircle2 size={19} /> : <span className="task-check__circle" />}
        </button>

        <div className="task-row__body">
          <p className="task-row__title">{task.title}</p>
          {projectName && (
            <span className="task-row__project">
              <FolderKanban size={12} /> {projectName}
            </span>
          )}
        </div>

        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />

        <span className={`deadline deadline--${overdue ? 'danger' : deadline.tone}`}>
          <CalendarDays size={13} />
          {deadline.label}
        </span>

        <div className="task-row__actions">
          <button
            className="icon-btn icon-btn--sm"
            onClick={(event) => {
              stop(event);
              onEdit?.(task);
            }}
            aria-label={`Edit ${task.title}`}
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            onClick={(event) => {
              stop(event);
              onDelete?.(task);
            }}
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`task-card task-card--${slug(task.status)} ${overdue ? 'is-overdue' : ''} ${completed ? 'is-completed' : ''}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task._id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart?.(task, event);
      }}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="task-card__top">
        <span className="task-card__status-dot" />
        <p className="task-card__title">{task.title}</p>
        <div className="task-card__actions">
          <button
            className="icon-btn icon-btn--sm"
            onClick={(event) => {
              stop(event);
              onEdit?.(task);
            }}
            aria-label={`Edit ${task.title}`}
            title="Edit task"
          >
            <Pencil size={13} />
          </button>
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            onClick={(event) => {
              stop(event);
              onDelete?.(task);
            }}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {task.description && <p className="task-card__description">{task.description}</p>}

      {projectName && (
        <span className="task-card__project">
          <FolderKanban size={12} /> {projectName}
        </span>
      )}

      <div className="task-card__footer">
        <PriorityBadge priority={task.priority} />
        <span className={`deadline deadline--${overdue ? 'danger' : deadline.tone}`}>
          <CalendarDays size={12} />
          {deadline.label}
        </span>
        {!completed && (
          <button
            className="task-card__complete"
            onClick={(event) => {
              stop(event);
              onStatusChange?.(task, 'Completed');
            }}
            aria-label={`Mark ${task.title} completed`}
            title="Mark completed"
          >
            <Check size={13} />
          </button>
        )}
      </div>
    </article>
  );
}
