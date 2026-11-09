import { DIFFICULTIES, TASK_PRIORITIES } from './constants.js';

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const matchEnum = (value, allowed, fallback = undefined) => {
  if (typeof value !== 'string') return fallback;
  return allowed.find((option) => option.toLowerCase() === value.trim().toLowerCase()) ?? fallback;
};

const toPositiveInt = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(60, Math.max(1, Math.round(parsed)));
};

/**
 * STRUCTURED OUTPUT VALIDATION
 * The LLM is asked for JSON, but model output can never be trusted blindly.
 * This function normalises casing/numbers and returns a predictable shape,
 * or a list of human-readable errors that become a 502 response.
 */
export function validatePlan(plan) {
  const errors = [];

  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { errors: ['AI response is not a JSON object.'], plan: null };
  }

  const projectTitle = cleanText(plan.projectTitle);
  if (projectTitle.length < 3) errors.push('projectTitle is missing or too short.');
  else if (projectTitle.length > 120) errors.push('projectTitle cannot exceed 120 characters.');

  const description = cleanText(plan.description);
  if (description.length < 10) errors.push('description is missing or too short.');
  else if (description.length > 2000) errors.push('description cannot exceed 2000 characters.');

  const technologies = Array.isArray(plan.technologies)
    ? [...new Set(plan.technologies.map((item) => String(item).trim()).filter(Boolean))].slice(0, 30)
    : [];

  const difficulty = matchEnum(plan.difficulty, DIFFICULTIES, 'Medium');
  const phases = Array.isArray(plan.phases) ? plan.phases : [];

  if (phases.length === 0) errors.push('At least one development phase is required.');
  if (phases.length > 8) errors.push('A plan cannot contain more than 8 phases.');

  const normalizedPhases = [];
  let totalTasks = 0;

  phases.slice(0, 8).forEach((phase, phaseIndex) => {
    const phaseName = cleanText(phase?.name);
    if (phaseName.length < 2) {
      errors.push(`Phase ${phaseIndex + 1} is missing a name.`);
      return;
    }

    const rawTasks = Array.isArray(phase.tasks) ? phase.tasks : [];
    if (rawTasks.length === 0) {
      errors.push(`Phase "${phaseName}" must contain at least one task.`);
      return;
    }
    if (rawTasks.length > 15) {
      errors.push(`Phase "${phaseName}" cannot contain more than 15 tasks.`);
      return;
    }

    const tasks = rawTasks
      .slice(0, 15)
      .map((task, taskIndex) => {
        const title = cleanText(task?.title);
        if (title.length < 2) {
          errors.push(`Phase "${phaseName}" task ${taskIndex + 1} is missing a title.`);
          return null;
        }

        const priority = matchEnum(task?.priority, TASK_PRIORITIES, 'Medium');
        const taskDifficulty = matchEnum(task?.difficulty, DIFFICULTIES, difficulty);
        const estimatedDays = toPositiveInt(task?.estimatedDays, 1);

        totalTasks += 1;

        return {
          title: title.slice(0, 160),
          description: cleanText(task?.description).slice(0, 3000),
          priority,
          difficulty: taskDifficulty,
          estimatedDays,
        };
      })
      .filter(Boolean);

    if (tasks.length > 0) normalizedPhases.push({ name: phaseName.slice(0, 120), tasks });
  });

  if (totalTasks === 0) errors.push('The plan does not contain any valid tasks.');
  if (totalTasks > 60) errors.push('A plan cannot contain more than 60 tasks.');

  if (errors.length > 0) return { errors, plan: null };

  return {
    errors: [],
    plan: {
      projectTitle,
      description,
      technologies,
      difficulty,
      phases: normalizedPhases,
    },
  };
}
