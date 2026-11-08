import { Router } from 'express';
import { generatePlanHandler, chatHandler, savePlanHandler, agentHandler } from '../controllers/aiController.js';
import { validateBody, requireDatabase } from '../middleware/validate.js';
import {
  validatePlanRequestPayload,
  validateChatPayload,
  validateSavePlanPayload,
} from '../utils/validators.js';

const router = Router();

// Generation/chat do not need MongoDB — only saving a plan does.
router.post('/generate-plan', validateBody(validatePlanRequestPayload), generatePlanHandler); // 200 / 400 / 502 / 503
router.post('/chat', validateBody(validateChatPayload), chatHandler); // 200 / 400 / 502 / 503
router.post('/save-plan', requireDatabase, validateBody(validateSavePlanPayload), savePlanHandler); // 201 / 400 / 500 / 503
router.post('/agent', requireDatabase, validateBody(validatePlanRequestPayload), agentHandler); // multi-step agent

export default router;
