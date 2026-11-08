import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requirePostgres } from '../middleware/validate.js';
import { prisma } from '../config/prisma.js';

const router = Router();

router.get('/health', requirePostgres, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { postgres: true } });
}));

export default router;