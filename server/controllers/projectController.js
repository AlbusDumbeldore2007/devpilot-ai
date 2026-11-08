import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { PROJECT_STATUSES } from '../utils/constants.js';
import { escapeRegex, parseSort } from '../utils/query.js';
import { getTaskStatsForProjects, withTaskProgress } from '../services/taskStatsService.js';

const PROJECT_SORTS = {
  createdAt: 'createdAt',
  name: 'name',
  deadline: 'deadline',
  status: 'status',
};

/**
 * GET /api/projects
 * Supports ?search= &status= &sort= and attaches aggregated task progress.
 */
export const getProjects = asyncHandler(async (req, res) => {
  const { search = '', status = '', sort = '-createdAt' } = req.query;
  const filter = {};

  if (status) {
    if (!PROJECT_STATUSES.includes(status)) {
      throw ApiError.badRequest(`Invalid status filter. Use one of: ${PROJECT_STATUSES.join(', ')}.`);
    }
    filter.status = status;
  }

  const term = String(search).trim().slice(0, 80);
  if (term) {
    const regex = new RegExp(escapeRegex(term), 'i');
    filter.$or = [{ name: regex }, { description: regex }, { technologies: regex }];
  }

  const projects = await Project.find(filter)
    .sort(parseSort(sort, PROJECT_SORTS, { createdAt: -1 }))
    .lean();

  const statsMap = await getTaskStatsForProjects(projects.map((project) => project._id));
  const data = projects.map((project) => withTaskProgress(project, statsMap));

  res.status(200).json({ success: true, count: data.length, data });
});

/** GET /api/projects/:id — project plus its tasks and progress. */
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  if (!project) throw ApiError.notFound('Project not found.');

  const tasks = await Task.find({ project: project._id }).sort({ status: 1, dueDate: 1, createdAt: -1 }).lean();

  const completed = tasks.filter((task) => task.status === 'Completed').length;
  const progress = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  res.status(200).json({
    success: true,
    data: {
      ...project,
      tasks,
      taskStats: {
        total: tasks.length,
        completed,
        inProgress: tasks.filter((task) => task.status === 'In Progress').length,
        todo: tasks.filter((task) => task.status === 'To Do').length,
      },
      progress,
    },
  });
});

/** POST /api/projects */
export const createProject = asyncHandler(async (req, res) => {
  const project = await Project.create(req.body);
  res.status(201).json({
    success: true,
    message: 'Project created successfully.',
    data: { ...project.toObject(), taskStats: { total: 0, completed: 0, inProgress: 0, todo: 0 }, progress: 0 },
  });
});

/** PUT /api/projects/:id */
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!project) throw ApiError.notFound('Project not found.');

  const statsMap = await getTaskStatsForProjects([project._id]);
  res.status(200).json({
    success: true,
    message: 'Project updated successfully.',
    data: withTaskProgress(project, statsMap),
  });
});

/**
 * DELETE /api/projects/:id
 * The Project model's findOneAndDelete hook cascades task deletion, so no
 * orphaned tasks remain in MongoDB.
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) throw ApiError.notFound('Project not found.');

  res.status(200).json({
    success: true,
    message: 'Project and all associated tasks were deleted.',
    data: { id: project._id },
  });
});
