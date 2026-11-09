
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  generateProjectPlan,
  generateChatReply,
  runMultiStepAgent,
} from '../services/aiService.js';
import { DEFAULT_TASK_STATUS } from '../utils/constants.js';

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/**
 * POST /api/ai/generate-plan
 * Generates a structured project plan using an LLM.
 */
export const generatePlanHandler = asyncHandler(async (req, res) => {
  const { idea, difficulty } = req.body;

  const { plan, meta } = await generateProjectPlan({
    idea,
    difficulty,
  });

  res.status(200).json({
    success: true,
    message: 'Plan generated successfully. Review and save it when ready.',
    data: plan,
    meta,
  });
});

/**
 * POST /api/ai/chat
 * Multi-turn developer AI assistant.
 */
export const chatHandler = asyncHandler(async (req, res) => {
  const { messages } = req.body;

  const { reply, meta } = await generateChatReply(messages);

  res.status(200).json({
    success: true,
    data: {
      role: 'assistant',
      content: reply,
    },
    meta,
  });
});

/**
 * POST /api/ai/agent
 * Multi-step AI agent with function calling.
 */
export const agentHandler = asyncHandler(async (req, res) => {
  const { goal, difficulty } = req.body;

  const result = await runMultiStepAgent({
    goal,
    difficulty,
  });

  res.status(200).json({
    success: true,
    message: 'Multi-step AI agent completed.',
    data: result.plan ? { plan: result.plan } : null,
    meta: {
      ...result.meta,
      stepsTaken: result.stepsTaken,
    },
    agentSteps: result.agentSteps,
  });
});

/**
 * POST /api/ai/save-plan
 * Saves a generated project plan and its tasks in MongoDB.
 */
export const savePlanHandler = asyncHandler(async (req, res) => {
  const { plan, startDate, deadline } = req.body;

  if (
    !plan ||
    !plan.projectTitle ||
    !Array.isArray(plan.phases) ||
    plan.phases.length === 0
  ) {
    throw new ApiError(400, 'A valid project plan with phases is required.');
  }

  const start = startDate ? new Date(startDate) : new Date();

  if (Number.isNaN(start.getTime())) {
    throw new ApiError(400, 'Invalid start date.');
  }

  const estimatedTotalDays = plan.phases.reduce(
    (sum, phase) =>
      sum +
      (Array.isArray(phase.tasks)
        ? phase.tasks.reduce(
            (phaseSum, task) =>
              phaseSum + Math.max(Number(task.estimatedDays) || 0, 0),
            0
          )
        : 0),
    0
  );

  const projectDeadline = deadline
    ? new Date(deadline)
    : addDays(start, Math.max(estimatedTotalDays, 1));

  if (Number.isNaN(projectDeadline.getTime())) {
    throw new ApiError(400, 'Invalid project deadline.');
  }

  const project = await Project.create({
    name: plan.projectTitle,
    description: plan.description || '',
    technologies: plan.technologies || [],
    status: 'Planning',
    startDate: start,
    deadline: projectDeadline,
  });

  const taskDocuments = [];
  let cursor = new Date(start);

  plan.phases.forEach((phase) => {
    if (!Array.isArray(phase.tasks)) return;

    phase.tasks.forEach((task) => {
      const estimatedDays = Math.max(
        Number(task.estimatedDays) || 1,
        1
      );

      cursor = addDays(cursor, estimatedDays);

      taskDocuments.push({
        title: task.title,
        description: task.description || `Phase: ${phase.name}`,
        project: project._id,
        priority: task.priority || 'Medium',
        status: DEFAULT_TASK_STATUS,
        dueDate: cursor,
      });
    });
  });

  try {
    const tasks = await Task.insertMany(taskDocuments);

    res.status(201).json({
      success: true,
      message: `Plan saved: 1 project and ${tasks.length} tasks created.`,
      data: {
        project: {
          ...project.toObject(),
          taskStats: {
            total: tasks.length,
            completed: 0,
            inProgress: 0,
            todo: tasks.length,
          },
          progress: 0,
        },
        tasks,
      },
    });
  } catch (error) {
    await Project.findByIdAndDelete(project._id).catch(() => {});

    throw new ApiError(
      500,
      `Could not save the plan: ${error.message}`
    );
  }
});

