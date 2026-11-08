import { Router } from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { validateBody, validateObjectIdParam, requireDatabase } from '../middleware/validate.js';
import { validateProjectPayload } from '../utils/validators.js';

const router = Router();

// All project routes require a healthy database connection.
router.use(requireDatabase);

router
  .route('/')
  .get(getProjects) // 200
  .post(validateBody(validateProjectPayload), createProject); // 201 / 400

router
  .route('/:id')
  .get(validateObjectIdParam('id'), getProject) // 200 / 400 / 404
  .put(validateObjectIdParam('id'), validateBody(validateProjectPayload, { partial: true }), updateProject) // 200 / 400 / 404
  .delete(validateObjectIdParam('id'), deleteProject); // 200 / 400 / 404

export default router;
