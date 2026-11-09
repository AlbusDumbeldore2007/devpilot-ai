import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';
import { validateBody, validateObjectIdParam, requireDatabase } from '../middleware/validate.js';
import { validateTaskPayload } from '../utils/validators.js';
import { optionalAuth } from '../middleware/auth.js';
import { requireRole, requireDeveloper, requireManager, requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.use(requireDatabase);
// Populate req.user when a session token/cookie is present so RBAC can
// enforce roles; anonymous workspace requests are allowed (see rbac.js).
router.use(optionalAuth);

/**
 * GET /api/tasks - List tasks.
 * Any authenticated user can view tasks.
 */
router
  .route('/')
  .get(getTasks) // 200
  .post(
    requireDeveloper,
    validateBody(validateTaskPayload),
    createTask // 201 / 400 / 403 (developer can create)
  );

router
  .route('/:id')
  .get(validateObjectIdParam('id'), getTask) // 200 / 400 / 404
  .all(requireRole('ADMIN', 'MANAGER', 'DEVELOPER')) // protect all below
  .put(validateBody(validateTaskPayload, { partial: true }), updateTask) // 200 / 400 / 403
  .delete(requireAdmin, deleteTask); // 200 / 403 (only admin can delete tasks)

export default router;