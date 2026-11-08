import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireDatabase } from '../middleware/validate.js';

const router = Router();

router.get('/stats', requireDatabase, getDashboardStats); // 200 / 503

export default router;
