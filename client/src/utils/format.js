/** Small formatting helpers shared across pages. */

export const classNames = (...classes) => classes.filter(Boolean).join(' ');

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatShortDate(value) {
  return formatDate(value, { year: undefined });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(value) {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Midnight-normalised differences avoid "due in 0 days" rounding bugs. */
function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysUntil(value) {
  if (!value) return null;
  const target = startOfDay(new Date(value));
  const today = startOfDay(new Date());
  return Math.round((target - today) / 86400000);
}

export function getDeadlineMeta(value) {
  if (!value) return { label: 'No due date', tone: 'neutral' };
  const days = daysUntil(value);
  if (Number.isNaN(days)) return { label: 'No due date', tone: 'neutral' };
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger' };
  if (days === 0) return { label: 'Due today', tone: 'warning' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'warning' };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'accent' };
  return { label: formatShortDate(value), tone: 'neutral' };
}

export function isOverdue(value, status) {
  if (!value || status === 'Completed') return false;
  const days = daysUntil(value);
  return days !== null && days < 0;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const TECH_COLORS = [
  'violet',
  'blue',
  'cyan',
  'green',
  'amber',
  'rose',
];

export function techColor(tech = '') {
  const hash = [...tech].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TECH_COLORS[hash % TECH_COLORS.length];
}

export const priorityShort = {
  Low: 'Low',
  Medium: 'Med',
  High: 'High',
  Critical: 'Crit',
};

/** Convert a date value to the YYYY-MM-DD format used by <input type="date">. */
export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayInput() {
  return toDateInput(new Date());
}

export function addDaysToInput(dateString, days) {
  const date = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}
