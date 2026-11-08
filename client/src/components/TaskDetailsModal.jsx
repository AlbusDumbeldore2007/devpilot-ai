import { CalendarDays, CheckCircle2, Clock, FolderKanban, ListTodo, Pencil, Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { PriorityBadge, StatusBadge } from './Badge.jsx';
import { formatDate, formatDateTime, getDeadlineMeta, isOverdue } from '../utils/format.js';

export default function TaskDetailsModal({ task, onClose, onEdit, onDelete, onStatusChange }) {
  if (!task) return null;

  const projectName = typeof task.project === 'object' ? task.project?.name : 'Project';
  const overdue = isOverdue(task.dueDate, task.status);
  const deadline = getDeadlineMeta(task.dueDate);

  return (
    <Modal
      open={Boolean(task)}
      onClose={onClose}
      title="Task details"
      subtitle={projectName}
      icon={ListTodo}
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--danger-text" onClick={() => onDelete?.(task)}>
            <Trash2 size={15} /> Delete
          </button>
          <div className="modal__footer-spacer" />
          {task.status !== 'Completed' && (
            <button className="btn btn--ghost" onClick={() => onStatusChange?.(task, 'Completed')}>
              <CheckCircle2 size={15} /> Mark complete
            </button>
          )}
          <button className="btn btn--primary" onClick={() => onEdit?.(task)}>
            <Pencil size={15} /> Edit task
          </button>
        </>
      }
    >
      <div className="task-details">
        <div className="task-details__badges">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {overdue && <span className="badge badge--danger">Overdue</span>}
        </div>

        <h3 className="task-details__title">{task.title}</h3>
        <p className="task-details__description">{task.description || 'No description was added to this task.'}</p>

        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-item__icon">
              <FolderKanban size={15} />
            </span>
            <div>
              <span>Project</span>
              <p>{projectName}</p>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-item__icon">
              <CalendarDays size={15} />
            </span>
            <div>
              <span>Due date</span>
              <p className={overdue ? 'text-danger' : ''}>{formatDate(task.dueDate)}</p>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-item__icon">
              <Clock size={15} />
            </span>
            <div>
              <span>Created</span>
              <p>{formatDateTime(task.createdAt)}</p>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-item__icon">
              <Clock size={15} />
            </span>
            <div>
              <span>Last updated</span>
              <p>{formatDateTime(task.updatedAt)}</p>
            </div>
          </div>
        </div>

        <p className={`deadline deadline--${overdue ? 'danger' : deadline.tone} task-details__deadline`}>
          <CalendarDays size={13} /> {deadline.label}
        </p>
      </div>
    </Modal>
  );
}
