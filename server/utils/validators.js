import mongoose from 'mongoose';
import {
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  DIFFICULTIES,
} from './constants.js';
import { validatePlan } from './planValidator.js';

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);

const matchEnum = (value, allowed) => {
  if (typeof value !== 'string') return undefined;
  return allowed.find((option) => option.toLowerCase() === value.trim().toLowerCase());
};

const normalizeTechnologies = (value) => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))].slice(0, 30);
};

const parseOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Project payload validator + sanitiser.
 * Returns `{ values, errors }` so the validation middleware can either
 * reject the request with 400 or forward clean data to the controller.
 */
export function validateProjectPayload(body, { partial = false } = {}) {
  const errors = [];
  if (!isPlainObject(body)) {
    return { values: {}, errors: ['Request body must be a JSON object.'] };
  }

  const values = {};

  if (!partial || body.name !== undefined) {
    const name = cleanString(body.name);
    if (typeof name !== 'string' || name.length < 2) {
      errors.push('Project name must be at least 2 characters.');
    } else if (name.length > 120) {
      errors.push('Project name cannot exceed 120 characters.');
    } else {
      values.name = name;
    }
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.push('Description must be a string.');
    } else {
      const description = cleanString(body.description ?? '');
      if (description.length > 2000) errors.push('Description cannot exceed 2000 characters.');
      else values.description = description;
    }
  }

  if (body.technologies !== undefined) {
    if (!Array.isArray(body.technologies) && typeof body.technologies !== 'string') {
      errors.push('Technologies must be an array of strings.');
    } else {
      values.technologies = normalizeTechnologies(body.technologies);
    }
  }

  if (body.status !== undefined) {
    if (!PROJECT_STATUSES.includes(body.status)) {
      errors.push(`Status must be one of: ${PROJECT_STATUSES.join(', ')}.`);
    } else {
      values.status = body.status;
    }
  }

  if (body.startDate !== undefined) {
    const startDate = parseOptionalDate(body.startDate);
    if (startDate === undefined) errors.push('Start date is invalid.');
    else values.startDate = startDate;
  }

  if (body.deadline !== undefined) {
    const deadline = parseOptionalDate(body.deadline);
    if (deadline === undefined) errors.push('Deadline is invalid.');
    else values.deadline = deadline;
  }

  if (values.startDate && values.deadline && values.deadline < values.startDate) {
    errors.push('Deadline must be later than the start date.');
  }

  return { values, errors };
}

/** Task payload validator + sanitiser. */
export function validateTaskPayload(body, { partial = false } = {}) {
  const errors = [];
  if (!isPlainObject(body)) {
    return { values: {}, errors: ['Request body must be a JSON object.'] };
  }

  const values = {};

  if (!partial || body.title !== undefined) {
    const title = cleanString(body.title);
    if (typeof title !== 'string' || title.length < 2) {
      errors.push('Task title must be at least 2 characters.');
    } else if (title.length > 160) {
      errors.push('Task title cannot exceed 160 characters.');
    } else {
      values.title = title;
    }
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.push('Task description must be a string.');
    } else {
      const description = cleanString(body.description ?? '');
      if (description.length > 3000) errors.push('Task description cannot exceed 3000 characters.');
      else values.description = description;
    }
  }

  if (!partial || body.project !== undefined) {
    if (!mongoose.isValidObjectId(body.project)) {
      errors.push('A valid project id is required.');
    } else {
      values.project = body.project;
    }
  }

  if (body.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(body.priority)) {
      errors.push(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`);
    } else {
      values.priority = body.priority;
    }
  }

  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) {
      errors.push(`Status must be one of: ${TASK_STATUSES.join(', ')}.`);
    } else {
      values.status = body.status;
    }
  }

  if (body.dueDate !== undefined) {
    const dueDate = parseOptionalDate(body.dueDate);
    if (dueDate === undefined) errors.push('Due date is invalid.');
    else values.dueDate = dueDate;
  }

  return { values, errors };
}

/** AI chat request validation. */
export function validateChatPayload(body) {
  const errors = [];
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (messages.length === 0) errors.push('At least one chat message is required.');
  if (messages.length > 30) errors.push('Conversation cannot exceed 30 messages.');

  const cleanMessages = [];
  messages.forEach((message, index) => {
    if (!message || !['user', 'assistant'].includes(message.role)) {
      errors.push(`Message ${index + 1} must have role "user" or "assistant".`);
      return;
    }
    const content = cleanString(message.content);
    if (typeof content !== 'string' || content.length === 0) {
      errors.push(`Message ${index + 1} content cannot be empty.`);
      return;
    }
    if (content.length > 6000) {
      errors.push(`Message ${index + 1} is too long (max 6000 characters).`);
      return;
    }
    cleanMessages.push({ role: message.role, content });
  });

  if (typeof body?.idea === 'string' && body.idea.length > 4000) {
    errors.push('Project idea is too long (max 4000 characters).');
  }

  return { values: { messages: cleanMessages, idea: body?.idea }, errors };
}

/** AI plan generation request (idea + optional difficulty). */
export function validatePlanRequestPayload(body) {
  const errors = [];
  const idea = cleanString(body?.idea);

  if (typeof idea !== 'string' || idea.length < 10) {
    errors.push('Describe your project idea in at least 10 characters.');
  } else if (idea.length > 4000) {
    errors.push('Project idea is too long (max 4000 characters).');
  }

  let difficulty = null;
  if (body?.difficulty !== undefined && body?.difficulty !== null && body?.difficulty !== '') {
    difficulty = matchEnum(body.difficulty, DIFFICULTIES);
    if (!difficulty) {
      errors.push(`Difficulty must be one of: ${DIFFICULTIES.join(', ')}.`);
    }
  }

  return { values: { idea, difficulty }, errors };
}

/** Saving a (possibly user-edited) AI plan to MongoDB. */
export function validateSavePlanPayload(body) {
  const errors = [];
  const { plan, errors: planErrors } = validatePlan(body?.plan);

  if (planErrors.length > 0) {
    errors.push(...planErrors.map((error) => `plan: ${error}`));
  }

  const rawStart = body?.startDate;
  let startDate = null;
  if (rawStart !== undefined && rawStart !== null && rawStart !== '') {
    startDate = parseOptionalDate(rawStart);
    if (startDate === undefined) errors.push('Start date is invalid.');
  }

  const rawDeadline = body?.deadline;
  let deadline = null;
  if (rawDeadline !== undefined && rawDeadline !== null && rawDeadline !== '') {
    deadline = parseOptionalDate(rawDeadline);
    if (deadline === undefined) errors.push('Deadline is invalid.');
  }

  if (startDate && deadline && deadline < startDate) {
    errors.push('Deadline must be later than the start date.');
  }

  return { values: { plan, startDate, deadline }, errors };
}

/** Validates a Mongo ObjectId route param. */
export function isValidObjectId(value) {
  return mongoose.isValidObjectId(value);
}
