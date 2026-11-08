import { z } from 'zod';
import { PROJECT_STATUSES, TASK_STATUSES, TASK_PRIORITIES, DIFFICULTIES, ROLES } from './constants.js';
import { sanitizeText, sanitizeMultiline, sanitizeEmail, sanitizeFilename } from './sanitize.js';
import { validatePlan } from './planValidator.js';

const text = (min, max) =>
  z.string().transform(sanitizeText).pipe(z.string().min(min, `Must be at least ${min} characters.`).max(max, `Must be at most ${max} characters.`));

const optionalText = (max) => z.string().max(max).transform(sanitizeMultiline).optional();

const optionalId = z.string().trim().min(4).max(64).optional().nullable();

const optionalDate = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') return null;
    return value instanceof Date ? value : new Date(value);
  },
  z.date({ invalid_type_error: 'Invalid date.' }).nullable()
);

const technologies = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',');
    return value;
  },
  z.array(z.string().transform(sanitizeText).pipe(z.string().min(1).max(60))).max(30)
);

const optionalTechnologies = technologies.optional();

const projectBase = z.object({
  name: text(2, 120),
  description: z.string().max(2000).transform(sanitizeMultiline).optional(),
  technologies: optionalTechnologies,
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: optionalDate.optional(),
  deadline: optionalDate.optional(),
  teamId: optionalId,
});

export const projectCreateSchema = projectBase.superRefine((value, ctx) => {
  if (value.startDate && value.deadline && value.deadline < value.startDate) {
    ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline must be later than the start date.' });
  }
});

export const projectUpdateSchema = projectBase.partial().superRefine((value, ctx) => {
  if (value.startDate && value.deadline && value.deadline < value.startDate) {
    ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline must be later than the start date.' });
  }
});

const taskBase = z.object({
  title: text(2, 160),
  description: z.string().max(3000).transform(sanitizeMultiline).optional(),
  projectId: z.string().trim().min(4).max(64),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: optionalDate.optional(),
  assigneeId: optionalId,
});

export const taskCreateSchema = taskBase;
export const taskUpdateSchema = taskBase.partial();

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().transform(sanitizeMultiline).pipe(z.string().min(1).max(6000)),
      })
    )
    .min(1)
    .max(30),
  idea: z.string().max(4000).transform(sanitizeMultiline).optional(),
  conversationId: optionalId,
  teamId: optionalId,
});

export const planRequestSchema = z.object({
  idea: z.string().transform(sanitizeMultiline).pipe(z.string().min(10, 'Describe your project idea in at least 10 characters.').max(4000)),
  difficulty: z.enum(DIFFICULTIES).optional().nullable(),
  teamId: optionalId,
});

const savePlanBase = z.object({
  startDate: optionalDate.optional(),
  deadline: optionalDate.optional(),
  teamId: optionalId,
});

export const teamCreateSchema = z.object({
  name: text(2, 80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,60}$/, 'Slug may contain lowercase letters, numbers and hyphens only.')
    .optional(),
  memberIds: z.array(z.string().trim().min(4).max(64)).max(50).optional(),
});

export const teamMemberSchema = z.object({
  userId: z.string().trim().min(4).max(64),
  teamRole: z.enum(['MEMBER', 'LEAD']).optional(),
});

export const agentRunSchema = z.object({
  goal: z.string().transform(sanitizeMultiline).pipe(z.string().min(5, 'Describe the goal in at least 5 characters.').max(4000)),
  teamId: z.string().trim().min(4).max(64),
  projectId: optionalId,
  conversationId: optionalId,
});

export const agentActionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
});

export const knowledgeSearchSchema = z.object({
  query: z.string().transform(sanitizeText).pipe(z.string().min(2).max(500)),
  teamId: z.string().trim().min(4).max(64),
  topK: z.coerce.number().int().min(1).max(10).optional(),
});

export const uploadMetaSchema = z.object({
  teamId: z.string().trim().min(4).max(64),
  title: z.string().max(160).transform(sanitizeText).optional(),
  tags: z.preprocess(
    (value) => (typeof value === 'string' ? value.split(',').map((tag) => tag.trim()).filter(Boolean) : value),
    z.array(z.string().max(40)).max(20).optional()
  ),
});

export const registerSchema = z.object({
  name: text(2, 80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254).transform(sanitizeEmail),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter.')
    .regex(/[0-9]/, 'Password must contain a number.'),
  role: z.enum(['DEVELOPER', 'MANAGER']).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').transform(sanitizeEmail),
  password: z.string().min(1, 'Password is required.').max(128),
});

export const githubRepoSchema = z.object({
  owner: z.string().trim().regex(/^[A-Za-z0-9_.-]{1,100}$/, 'Invalid GitHub owner.'),
  repo: z.string().trim().regex(/^[A-Za-z0-9_.-]{1,100}$/, 'Invalid GitHub repository name.'),
});

export const razorpayOrderSchema = z.object({
  amount: z.coerce.number().int().min(100, 'Minimum amount is 100 paise.').max(5_000_000, 'Maximum test amount is ₹50,000.'),
  projectId: optionalId,
  notes: z.record(z.string(), z.string().max(200)).optional(),
});

export const razorpayVerifySchema = z.object({
  orderId: z.string().trim().min(4).max(120),
  paymentId: z.string().trim().min(4).max(120),
  signature: z.string().trim().min(10).max(256),
});

export const evalRunSchema = z.object({
  caseIds: z.array(z.string().trim().min(4).max(64)).max(50).optional(),
});

export const usageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  teamId: optionalId,
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const formatIssues = (issues) =>
  issues.map((issue) => {
    const path = issue.path?.length ? issue.path.join('.') : 'body';
    return `${path}: ${issue.message}`;
  });

export function parseWith(schema, value) {
  const result = schema.safeParse(value ?? {});
  if (result.success) return { values: result.data, errors: [] };
  return { values: {}, errors: formatIssues(result.error.issues) };
}

/* ── Adapters preserving the existing `{ values, errors }` middleware contract ── */

export function validateProjectPayload(body = {}, { partial = false } = {}) {
  return parseWith(partial ? projectUpdateSchema : projectCreateSchema, body);
}

export function validateTaskPayload(body = {}, { partial = false } = {}) {
  const normalized = {
    ...body,
    projectId: body.projectId ?? body.project,
  };
  delete normalized.project;
  return parseWith(partial ? taskUpdateSchema : taskCreateSchema, normalized);
}

export function validateChatPayload(body = {}) {
  return parseWith(chatSchema, body);
}

export function validatePlanRequestPayload(body = {}) {
  return parseWith(planRequestSchema, body);
}

export function validateSavePlanPayload(body = {}) {
  const errors = [];
  const { plan, errors: planErrors } = validatePlan(body?.plan);
  if (planErrors.length > 0) errors.push(...planErrors.map((error) => `plan: ${error}`));

  const dates = parseWith(savePlanBase, {
    startDate: body?.startDate,
    deadline: body?.deadline,
    teamId: body?.teamId,
  });
  if (dates.errors.length) errors.push(...dates.errors);
  if (dates.values.startDate && dates.values.deadline && dates.values.deadline < dates.values.startDate) {
    errors.push('deadline: Deadline must be later than the start date.');
  }

  return {
    values: { plan, startDate: dates.values.startDate || null, deadline: dates.values.deadline || null, teamId: dates.values.teamId || null },
    errors,
  };
}

export function validateTeamCreate(body = {}) {
  return parseWith(teamCreateSchema, body);
}

export function validateAgentRun(body = {}) {
  return parseWith(agentRunSchema, body);
}

export function validateKnowledgeSearch(body = {}) {
  return parseWith(knowledgeSearchSchema, body);
}

export function validateUploadMeta(body = {}) {
  return parseWith(uploadMetaSchema, body);
}

export const validateRegister = (body = {}) => parseWith(registerSchema, body);
export const validateLogin = (body = {}) => parseWith(loginSchema, body);
export const validateGithubRepo = (body = {}) => parseWith(githubRepoSchema, body);
export const validateRazorpayOrder = (body = {}) => parseWith(razorpayOrderSchema, body);
export const validateRazorpayVerify = (body = {}) => parseWith(razorpayVerifySchema, body);
export const validateEvalRun = (body = {}) => parseWith(evalRunSchema, body);
export const validateUsageQuery = (body = {}) => parseWith(usageQuerySchema, body);
export const validatePagination = (body = {}) => parseWith(paginationSchema, body);
export const validateTeamMember = (body = {}) => parseWith(teamMemberSchema, body);
export const validateAgentAction = (body = {}) => parseWith(agentActionSchema, body);

/** Validates a Prisma cuid/uuid-style identifier route param. */
export const isPrismaId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(value);

export { sanitizeFilename };
