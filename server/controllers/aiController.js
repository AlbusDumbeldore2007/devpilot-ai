import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateProjectPlan, generateChatReply } from '../services/aiService.js';
import { DEFAULT_TASK_STATUS } from '../utils/constants.js';

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/**
 * POST /api/ai/generate-plan
 * Builds a structured prompt, calls the LLM, validates the JSON, and returns
 * a preview. Nothing is persisted until the user explicitly saves the plan.
 */
export const generatePlanHandler = asyncHandler(async (req, res) => {
  const { idea, difficulty } = req.body;
  const { plan, meta } = await generateProjectPlan({ idea, difficulty });

  res.status(200).json({
    success: true,
    message: 'Plan generated successfully. Review and save it when ready.',
    data: plan,
    meta,
  });
});

/** POST /api/ai/chat — multi-turn developer assistant. */
export const chatHandler = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  const { reply, meta } = await generateChatReply(messages);

  res.status(200).json({
    success: true,
    data: { role: 'assistant', content: reply },
    meta,
  });
});

/**
 * POST /api/ai/agent — multi-step AI agent with function calling.
 * The agent receives a user goal, calls the LLM with tool definitions,
 * executes tool calls, and iterates until the goal is achieved or max steps reached.
 */
export const agentHandler = asyncHandler(async (req, res) => {
  const { goal, difficulty } = req.body;
  const result = await runMultiStepAgent({ goal, difficulty });
  
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
  const { plan, startDate, deadline } = req.body;

  const start = startDate ? new Date(startDate) : new Date();
  const estimatedTotalDays = plan.phases.reduce(
    (sum, phase) => sum + phase.tasks.reduce((phaseSum, task) => phaseSum + task.estimatedDays, 0),
    0
  );
  const projectDeadline = deadline ? new Date(deadline) : addDays(start, Math.max(estimatedTotalDays, 1));

  const project = await Project.create({
    name: plan.projectTitle,
    description: plan.description,
    technologies: plan.technologies,
    status: 'Planning',
    startDate: start,
    deadline: projectDeadline,
  });

  const taskDocuments = [];
  let cursor = new Date(start);

  plan.phases.forEach((phase) => {
    phase.tasks.forEach((task) => {
      cursor = addDays(cursor, task.estimatedDays);
      taskDocuments.push({
        title: task.title,
        description: task.description || `Phase: ${phase.name}`,
        project: project._id,
        priority: task.priority,
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
    // Roll back the project (the model hook also removes any partial tasks).
    await Project.findByIdAndDelete(project._id).catch(() => {});
    throw new ApiError(500, `Could not save the plan: ${error.message}`);
  }
});
