import { Router } from 'express';
import { createJob, getLatestJobs } from '../controllers/jobController.js';
import { adminGuard, authGuard } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getLatestJobs);
router.post('/', authGuard, adminGuard, createJob);
router.get('/all', authGuard, adminGuard, getAllJobs);
router.get('/published', getPublishedJobs);
router.get('/:id', getJobById);
router.put('/:id', authGuard, adminGuard, updateJob);
router.delete('/:id', authGuard, adminGuard, deleteJob);
router.put('/:id/publish', authGuard, adminGuard, toggleJobPublish);

export default router;
