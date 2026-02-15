import { Router } from 'express';
import { body } from 'express-validator';
import {
  bookmarkQuestion,
  getBookmarkedQuestions,
  getQuestions,
  getRandomQuestions,
  removeBookmark,
  startPracticeSession
} from '../controllers/questionController.js';
import { authGuard } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getQuestions);
router.get('/random', getRandomQuestions);
router.post(
  '/practice',
  authGuard,
  [
    body('count').optional().isInt({ min: 1, max: 50 }),
    body('category').optional().isString().trim().notEmpty(),
    body('examId').optional().isMongoId()
  ],
  startPracticeSession
);
router.post('/bookmark/:id', authGuard, [body('examId').optional().isMongoId()], bookmarkQuestion);
router.delete('/bookmark/:id', authGuard, removeBookmark);
router.get('/bookmarks', authGuard, getBookmarkedQuestions);

export default router;
