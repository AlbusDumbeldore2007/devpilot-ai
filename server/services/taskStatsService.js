import { prisma } from '../config/prisma.js';
import { buildTaskStats, progressFromStats } from '../utils/domain.js';

/**
 * One GROUP BY supplies task counters for many projects, avoiding N+1
 * queries when rendering the dashboard, project grid or agent summaries.
 */
export async function getTaskStatsForProjects(projectIds = []) {
  if (!projectIds.length) return new Map();

  const rows = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });

  const map = new Map();
  for (const id of projectIds) {
    map.set(id, { total: 0, completed: 0, inProgress: 0, todo: 0 });
  }
  for (const row of rows) {
    const entry = map.get(row.projectId) || { total: 0, completed: 0, inProgress: 0, todo: 0 };
    const count = row._count._all;
    entry.total += count;
    if (row.status === 'COMPLETED') entry.completed += count;
    else if (row.status === 'IN_PROGRESS') entry.inProgress += count;
    else entry.todo += count;
    map.set(row.projectId, entry);
  }
  return map;
}

export function withTaskProgress(project, statsMap) {
  const stats = statsMap.get(project.id) || { total: 0, completed: 0, inProgress: 0, todo: 0 };
  return { ...project, taskStats: stats, progress: progressFromStats(stats) };
}

export function statsForTasks(tasks) {
  const stats = buildTaskStats(tasks);
  return { ...stats, progress: progressFromStats(stats) };
}
