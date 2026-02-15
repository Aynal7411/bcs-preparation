import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authGuard } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', authGuard, getDashboardStats);

export default router;
