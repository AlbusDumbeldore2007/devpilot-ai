import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';

const statusClass = (status) => `status-${String(status).toLowerCase().replace(/\s+/g, '-')}`;
const priorityClass = (priority) => `priority-${String(priority).toLowerCase()}`;

export function StatusBadge({ status, withDot = true }) {
  return (
    <span className={`badge badge--status ${statusClass(status)}`}>
      {withDot && <i className="badge__dot" />}
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, withIcon = true }) {
  const Icon = priority === 'Critical' ? AlertTriangle : priority === 'High' ? ArrowUp : priority === 'Low' ? ArrowDown : Minus;
  return (
    <span className={`badge badge--priority ${priorityClass(priority)}`}>
      {withIcon && <Icon size={11} strokeWidth={2.4} />}
      {priority}
    </span>
  );
}

export function DifficultyBadge({ difficulty }) {
  const tone = String(difficulty).toLowerCase();
  return <span className={`badge badge--difficulty difficulty-${tone}`}>{difficulty}</span>;
}

export function TechChip({ children }) {
  return <span className="tech-chip">{children}</span>;
}
