import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { TASK_STATUSES, TASK_PRIORITIES } from '../utils/constants.js';
import { escapeRegex, parseSort } from '../utils/query.js';

const TASK_SORTS = {
  dueDate: 'dueDate',
  deadline: 'dueDate',
  createdAt: 'createdAt',
  title: 'title',
  priority: 'priority',
};

const PROJECT_POPULATE = { path: 'project', select: 'name status deadline' };

/**
 * GET /api/tasks
 * Filters: ?search= &status= &priority= &project= &sort=
 */
export const getTasks = asyncHandler(async (req, res) => {
  const { search = '', status = '', priority = '', project = '', sort = 'dueDate' } = req.query;
  const filter = {};

  if (status) {
    if (!TASK_STATUSES.includes(status)) {
      throw ApiError.badRequest(`Invalid status filter. Use one of: ${TASK_STATUSES.join(', ')}.`);
    }
    filter.status = status;
  }

  if (priority) {
    if (!TASK_PRIORITIES.includes(priority)) {
      throw ApiError.badRequest(`Invalid priority filter. Use one of: ${TASK_PRIORITIES.join(', ')}.`);
    }
    filter.priority = priority;
  }

  if (project) {
    if (!mongoose.isValidObjectId(project)) {
      throw ApiError.badRequest('Invalid project filter: expected a MongoDB ObjectId.');
    }
    filter.project = project;
  }

  const term = String(search).trim().slice(0, 80);
  if (term) {
    const regex = new RegExp(escapeRegex(term), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  // Soonest deadlines first; tasks without a deadline fall to the end.
  const sortSpec =
    sort === 'dueDate' || sort === 'deadline'
      ? { dueDate: 1, createdAt: -1 }
      : parseSort(sort, TASK_SORTS, { createdAt: -1 });

  const tasks = await Task.find(filter).sort(sortSpec).populate(PROJECT_POPULATE).lean();
  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

/** GET /api/tasks/:id */
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate(PROJECT_POPULATE).lean();
  if (!task) throw ApiError.notFound('Task not found.');
  res.status(200).json({ success: true, data: task });
});

/** POST /api/tasks — validates that the referenced project exists. */
export const createTask = asyncHandler(async (req, res) => {
  const projectExists = await Project.exists({ _id: req.body.project });
  if (!projectExists) throw ApiError.notFound('Project not found. A task must belong to an existing project.');

  const task = await Task.create(req.body);
  await task.populate(PROJECT_POPULATE);

  res.status(201).json({ success: true, message: 'Task created successfully.', data: task });
});

/** PUT /api/tasks/:id — also used to move tasks between Kanban columns. */
export const updateTask = asyncHandler(async (req, res) => {
  if (req.body.project) {
    const projectExists = await Project.exists({ _id: req.body.project });
    if (!projectExists) throw ApiError.notFound('Project not found.');
  }

  const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate(PROJECT_POPULATE);

  if (!task) throw ApiError.notFound('Task not found.');
  res.status(200).json({ success: true, message: 'Task updated successfully.', data: task });
});

/** DELETE /api/tasks/:id */
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) throw ApiError.notFound('Task not found.');
  res.status(200).json({ success: true, message: 'Task deleted successfully.', data: { id: task._id } });
});
