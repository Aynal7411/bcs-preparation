import { Router } from 'express';
import { createJob, getLatestJobs } from '../controllers/jobController.js';
import { adminGuard, authGuard } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getLatestJobs);
router.post('/', authGuard, adminGuard, createJob);

export default router;
