import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { TASK_STATUSES, TASK_PRIORITIES } from '../utils/constants.js';
import { getTaskStatsForProjects, withTaskProgress } from '../services/taskStatsService.js';

/**
 * GET /api/dashboard/stats
 * Every value is derived from MongoDB — no hardcoded demo statistics.
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalProjects, totalTasks, completedTasks, inProgressTasks, pendingTasks] = await Promise.all([
    Project.countDocuments(),
    Task.countDocuments(),
    Task.countDocuments({ status: 'Completed' }),
    Task.countDocuments({ status: 'In Progress' }),
    Task.countDocuments({ status: 'To Do' }),
  ]);

  const [statusRows, priorityRows, recentProjects, recentTasks, upcomingTasks] = await Promise.all([
    Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Project.find().sort({ createdAt: -1 }).limit(4).lean(),
    Task.find().sort({ createdAt: -1 }).limit(6).populate('project', 'name status').lean(),
    Task.find({ status: { $ne: 'Completed' }, dueDate: { $ne: null } })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('project', 'name')
      .lean(),
  ]);

  const projectStats = await getTaskStatsForProjects(recentProjects.map((project) => project._id));

  const statusMap = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));
  const priorityMap = Object.fromEntries(priorityRows.map((row) => [row._id, row.count]));

  const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const now = new Date();
  const overdueTasks = await Task.countDocuments({
    status: { $ne: 'Completed' },
    dueDate: { $ne: null, $lt: now },
  });

  res.status(200).json({
    success: true,
    data: {
      totals: {
        projects: totalProjects,
        tasks: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completionPercentage,
      },
      statusDistribution: TASK_STATUSES.map((status) => ({ status, count: statusMap[status] || 0 })),
      priorityDistribution: TASK_PRIORITIES.map((priority) => ({ priority, count: priorityMap[priority] || 0 })),
      recentProjects: recentProjects.map((project) => withTaskProgress(project, projectStats)),
      recentTasks,
      upcomingTasks,
      generatedAt: new Date().toISOString(),
    },
  });
});
