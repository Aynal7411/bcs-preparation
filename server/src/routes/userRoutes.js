import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAchievements,
  getLearningProgress,
  getProfile,
  getUserStats,
  updateProfile,
  uploadProfileImage
} from '../controllers/userController.js';
import { authGuard } from '../middleware/authMiddleware.js';
import { upload } from '../services/uploadService.js';

const router = Router();

router.use(authGuard);

router.get('/profile', getProfile);
router.put(
  '/profile',
  [
    body('name').optional().isString().trim().notEmpty(),
    body('phone').optional().isString().trim().isLength({ min: 6, max: 20 }),
    body('bio').optional().isString().trim().isLength({ max: 300 }),
    body('examTargets').optional().isArray()
  ],
  updateProfile
);

router.get('/stats', getUserStats);
router.get('/progress', getLearningProgress);
router.get('/achievements', getAchievements);
router.post('/upload-image', upload.single('image'), uploadProfileImage);

export default router;
