import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export function isAdmin(user) {
  return user?.role === 'ADMIN';
}

export async function getAccessibleTeamIds(user) {
  if (!user) return [];
  if (isAdmin(user)) {
    const teams = await prisma.team.findMany({ select: { id: true } });
    return teams.map((team) => team.id);
  }
  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });
  return memberships.map((membership) => membership.teamId);
}

export async function getAccessibleTeamFilter(user) {
  if (isAdmin(user)) return {};
  const ids = await getAccessibleTeamIds(user);
  return { teamId: { in: ids } };
}

export async function canAccessTeam(user, teamId) {
  if (!user || !teamId) return false;
  if (isAdmin(user)) return true;
  if (!teamId) return false;
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function assertTeamAccess(user, teamId, { write = false } = {}) {
  if (!user) throw new ApiError(401, 'Authentication required.', undefined, 'AUTH_REQUIRED');
  const allowed = await canAccessTeam(user, teamId);
  if (!allowed) {
    throw new ApiError(403, 'You do not have access to this team.', undefined, 'TEAM_FORBIDDEN');
  }
  if (write && !['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new ApiError(403, 'Managers and admins can modify projects. Developers can manage tasks.', undefined, 'FORBIDDEN_ROLE');
  }
  return true;
}

export async function canAccessProject(user, projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, teamId: true } });
  if (!project) return { project: null, allowed: false };
  return { project, allowed: await canAccessTeam(user, project.teamId) };
}

export async function assertProjectAccess(user, projectId, { write = false } = {}) {
  const { project, allowed } = await canAccessProject(user, projectId);
  if (!project) throw ApiError.notFound('Project not found.');
  if (!allowed) throw new ApiError(403, 'You do not have access to this project.', undefined, 'PROJECT_FORBIDDEN');
  if (write && !['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new ApiError(403, 'Managers and admins can modify projects.', undefined, 'FORBIDDEN_ROLE');
  }
  return project;
}

export async function assertTeamMembership(user, teamId) {
  return assertTeamAccess(user, teamId);
}
