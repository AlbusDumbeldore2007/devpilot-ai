import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { validateBody, validateObjectIdParam, requireDatabase, requirePostgres } from '../middleware/validate.js';
import { validateProjectPayload } from '../utils/validators.js';
import { optionalAuth } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { requireRole, requireDeveloper, requireManager, requireAdmin } from '../middleware/rbac.js';
import { prisma } from '../config/prisma.js';

const router = Router();

// All project routes require a healthy MongoDB connection.
router.use(requireDatabase);
// Populate req.user when a session token/cookie is present so RBAC can
// enforce roles; anonymous workspace requests are allowed (see rbac.js).
router.use(optionalAuth);

/**
 * GET /api/projects - List projects.
 * Any authenticated user can view projects.
 */
router
  .route('/')
  .get(getProjects) // 200
  .post(
    requireDeveloper,
    validateBody(validateProjectPayload),
    createProject // 201 / 400 / 403
  );

/** Prisma-based SQL routes for PostgreSQL relational features.
 * Registered BEFORE '/:id' so '/sql/...' is not captured as an :id param. */
router.use('/sql', requirePostgres);

router
  .route('/sql/projects')
  .get(asyncHandler(async (req, res) => {
    const projects = await prisma.$queryRaw`
      SELECT 
        p.id, p.name, p.description, p.status, p."createdAt", p."deadline",
        t.name AS "teamName",
        u.name AS "creatorName"
      FROM project p
      LEFT JOIN team t ON p."teamId" = t.id
      LEFT JOIN "user" u ON p."createdById" = u.id
      ORDER BY p."createdAt" DESC
    `;
    res.json({ success: true, count: projects.length, data: projects });
  }));

router
  .route('/sql/projects/:id')
  .get(validateObjectIdParam('id'), asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        team: true,
        createdBy: true,
        technologies: true,
      },
    });
    if (!project) throw ApiError.notFound('Project not found.');
    res.json({ success: true, data: project });
  }));

router
  .route('/:id')
  .get(validateObjectIdParam('id'), getProject) // 200 / 400 / 404
  .all(requireRole('ADMIN', 'MANAGER', 'DEVELOPER')) // protect all below
  .put(validateBody(validateProjectPayload, { partial: true }), updateProject) // 200 / 400 / 403
  .delete(requireAdmin, deleteProject); // 200 / 403 (only admin can delete projects)

export default router;