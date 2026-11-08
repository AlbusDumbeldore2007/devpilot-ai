import Task from '../models/Task.js';

/**
 * One aggregation supplies task counters for many projects, avoiding N+1
 * queries when rendering the dashboard or project grid.
 */
export async function getTaskStatsForProjects(projectIds = []) {
  if (!projectIds.length) return new Map();

  const rows = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
        todo: { $sum: { $cond: [{ $eq: ['$status', 'To Do'] }, 1, 0] } },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row]));
}

export function withTaskProgress(project, statsMap) {
  const stats = statsMap.get(project._id.toString()) || {
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
  };
  const progress = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  return {
    ...project,
    taskStats: {
      total: stats.total,
      completed: stats.completed,
      inProgress: stats.inProgress,
      todo: stats.todo,
    },
    progress,
  };
}
