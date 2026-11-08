/** Shared domain constants — the single source of truth for enums. */
export const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed', 'On Hold'];
export const TASK_STATUSES = ['To Do', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/** Prompt injection defense patterns — used by the AI service to detect
 * and strip potential injection sequences from user-supplied prompt text. */
export const PROMPT_INJECTION_PATTERNS = [
  /<(script|iframe|body|html|meta)/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /data:\s*[a-z]/i,
];

/** Check a string for prompt injection patterns. */
export function detectPromptInjection(text) {
  if (typeof text !== 'string') return false;
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/** Sanitize prompt text by removing potential injection sequences. */
export function sanitizePrompt(text) {
  if (typeof text !== 'string') return text;
  let sanitized = text;
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  // Remove HTML/JS injection patterns
  PROMPT_INJECTION_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });
  return sanitized.trim();
}

/** DB project/status/task enums. */
export const DB_PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];
export const DB_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
export const DB_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** Role labels. */
export const ROLES = ['ADMIN', 'MANAGER', 'DEVELOPER'];
export const ROLE_LABELS = { ADMIN: 'Admin', MANAGER: 'Manager', DEVELOPER: 'Developer' };

/** Default values. */
export const DEFAULT_PROJECT_STATUS = 'Planning';
export const DEFAULT_TASK_STATUS = 'To Do';
export const DEFAULT_PRIORITY = 'Medium';

/** Agent tool names. */
export const AGENT_TOOL_NAMES = [
  'createTask',
  'getProjectTasks',
  'updateTaskStatus',
  'searchKnowledgeBase',
  'getProjectProgress',
];

/** Tools that trigger authorization checks for destructive actions. */
export const DESTRUCTIVE_AGENT_TOOLS = ['createTask', 'updateTaskStatus'];