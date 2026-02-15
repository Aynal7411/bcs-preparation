import { Router } from 'express';
import { getHomeSummary } from '../controllers/homeController.js';

const router = Router();

router.get('/summary', getHomeSummary);

export default router;
