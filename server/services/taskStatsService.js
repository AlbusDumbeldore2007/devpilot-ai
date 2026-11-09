import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { buildTaskStats, progressFromStats } from '../utils/domain.js';

/**
 * One aggregation supplies task counters for many projects, avoiding N+1
 * queries when rendering the dashboard or project grid.
 *
 * Projects/Tasks live in MongoDB (Mongoose models), so stats must be
 * computed with a Mongo aggregation — not Prisma/Postgres, whose tables
 * are a separate relational store and do not hold these documents.
 * Keys are normalized to strings because callers pass Mongo ObjectIds
 * (`project._id`) while lean documents may carry either `_id` or `id`.
 */
export async function getTaskStatsForProjects(projectIds = []) {
  const ids = [...new Set(projectIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();

  const rows = await Task.aggregate([
    { $match: { project: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const map = new Map();
  for (const id of ids) {
    map.set(id, { total: 0, completed: 0, inProgress: 0, todo: 0 });
  }
  for (const row of rows) {
    const projectId = String(row._id.project);
    const entry = map.get(projectId) || { total: 0, completed: 0, inProgress: 0, todo: 0 };
    entry.total += row.count;
    if (row._id.status === 'Completed') entry.completed += row.count;
    else if (row._id.status === 'In Progress') entry.inProgress += row.count;
    else entry.todo += row.count;
    map.set(projectId, entry);
  }
  return map;
}

export function withTaskProgress(project, statsMap) {
  const key = String(project._id ?? project.id);
  const stats = statsMap.get(key) || { total: 0, completed: 0, inProgress: 0, todo: 0 };
  return { ...project, taskStats: stats, progress: progressFromStats(stats) };
}

export function statsForTasks(tasks) {
  const stats = buildTaskStats(tasks);
  return { ...stats, progress: progressFromStats(stats) };
}
