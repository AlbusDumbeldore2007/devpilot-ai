import { Router } from 'express';
import { getTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import { validateBody, validateObjectIdParam, requireDatabase } from '../middleware/validate.js';
import { validateTaskPayload } from '../utils/validators.js';

const router = Router();

router.use(requireDatabase);

router
  .route('/')
  .get(getTasks) // 200
  .post(validateBody(validateTaskPayload), createTask); // 201 / 400 / 404

router
  .route('/:id')
  .get(validateObjectIdParam('id'), getTask) // 200 / 400 / 404
  .put(validateObjectIdParam('id'), validateBody(validateTaskPayload, { partial: true }), updateTask) // 200 / 400 / 404
  .delete(validateObjectIdParam('id'), deleteTask); // 200 / 400 / 404

export default router;
