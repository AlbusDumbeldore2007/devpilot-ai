import {
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  ROLE_LABELS,
  DB_PROJECT_STATUSES,
  DB_TASK_STATUSES,
  DB_TASK_PRIORITIES,
} from './constants.js';

const toMap = (labels, values) => Object.fromEntries(labels.map((label, index) => [label, values[index]]));
const reverse = (map) => Object.fromEntries(Object.entries(map).map(([label, value]) => [value, label]));

export const PROJECT_STATUS_TO_DB = toMap(PROJECT_STATUSES, DB_PROJECT_STATUSES);
export const TASK_STATUS_TO_DB = toMap(TASK_STATUSES, DB_TASK_STATUSES);
export const TASK_PRIORITY_TO_DB = toMap(TASK_PRIORITIES, DB_TASK_PRIORITIES);

export const PROJECT_STATUS_FROM_DB = reverse(PROJECT_STATUS_TO_DB);
export const TASK_STATUS_FROM_DB = reverse(TASK_STATUS_TO_DB);
export const TASK_PRIORITY_FROM_DB = reverse(TASK_PRIORITY_TO_DB);

export const projectStatusToDb = (label) => PROJECT_STATUS_TO_DB[label] || 'PLANNING';
export const projectStatusFromDb = (value) => PROJECT_STATUS_FROM_DB[value] || 'Planning';
export const taskStatusToDb = (label) => TASK_STATUS_TO_DB[label] || 'TODO';
export const taskStatusFromDb = (value) => TASK_STATUS_FROM_DB[value] || 'To Do';
export const taskPriorityToDb = (label) => TASK_PRIORITY_TO_DB[label] || 'MEDIUM';
export const taskPriorityFromDb = (value) => TASK_PRIORITY_FROM_DB[value] || 'Medium';

export const roleLabel = (role) => ROLE_LABELS[role] || 'Developer';

export function serializeUser(user) {
  if (!user) return null;
  return {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: roleLabel(user.role),
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
  };
}

export function serializeTeam(team, extra = {}) {
  if (!team) return null;
  return {
    _id: team.id,
    id: team.id,
    name: team.name,
    slug: team.slug,
    owner: team.owner ? serializeUser(team.owner) : undefined,
    ownerId: team.ownerId,
    members: team.members?.map((member) => ({
      id: member.id,
      teamRole: member.teamRole,
      user: serializeUser(member.user || member),
    })),
    memberCount: team._count?.members ?? team.members?.length ?? extra.memberCount,
    projectCount: team._count?.projects ?? extra.projectCount,
    createdAt: team.createdAt,
    ...extra,
  };
}

export function buildTaskStats(tasks = []) {
  const stats = { total: tasks.length, completed: 0, inProgress: 0, todo: 0 };
  for (const task of tasks) {
    const status = task.status || task;
    if (status === 'COMPLETED' || status === 'Completed') stats.completed += 1;
    else if (status === 'IN_PROGRESS' || status === 'In Progress') stats.inProgress += 1;
    else stats.todo += 1;
  }
  return stats;
}

export function statsFromCounts({ total = 0, completed = 0, inProgress = 0, todo = 0 } = {}) {
  return { total, completed, inProgress, todo };
}

export function progressFromStats(stats) {
  return stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);
}

export function serializeProject(project, stats = null) {
  if (!project) return null;
  const taskStats = stats || buildTaskStats(project.tasks || []);
  return {
    _id: project.id,
    id: project.id,
    name: project.name,
    description: project.description,
    technologies: (project.technologies || []).map((item) => (typeof item === 'string' ? item : item.name)),
    status: projectStatusFromDb(project.status),
    statusCode: project.status,
    startDate: project.startDate,
    deadline: project.deadline,
    teamId: project.teamId,
    team: project.team ? { _id: project.team.id, id: project.team.id, name: project.team.name, slug: project.team.slug } : undefined,
    createdBy: project.createdBy ? serializeUser(project.createdBy) : undefined,
    taskStats,
    progress: progressFromStats(taskStats),
    tasks: project.tasks ? project.tasks.map(serializeTask) : undefined,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function serializeTask(task) {
  if (!task) return null;
  const project = task.project;
  return {
    _id: task.id,
    id: task.id,
    title: task.title,
    description: task.description,
    project: project
      ? {
          _id: project.id,
          id: project.id,
          name: project.name,
          status: projectStatusFromDb(project.status),
          deadline: project.deadline,
        }
      : task.projectId,
    projectId: task.projectId,
    priority: taskPriorityFromDb(task.priority),
    priorityCode: task.priority,
    status: taskStatusFromDb(task.status),
    statusCode: task.status,
    dueDate: task.dueDate,
    assignee: task.assignee ? serializeUser(task.assignee) : null,
    assigneeId: task.assigneeId,
    createdBy: task.createdBy ? serializeUser(task.createdBy) : undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
