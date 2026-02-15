import { Router } from 'express';
import { body } from 'express-validator';
import {
  createExam,
  getExamDetails,
  getExamLeaderboard,
  getExamQuestions,
  getFeaturedExams,
  getMyResults,
  getResultDetails,
  listExams,
  startExam,
  submitExam
} from '../controllers/examController.js';
import { adminGuard, authGuard } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', listExams);
router.get('/featured', getFeaturedExams);
router.get('/results', authGuard, getMyResults);
router.get('/result/:id', authGuard, getResultDetails);
router.get('/leaderboard/:id', getExamLeaderboard);
router.get('/:id/questions', getExamQuestions);
router.get('/:id', getExamDetails);

router.post('/start/:id', authGuard, startExam);
router.post(
  '/submit/:id',
  authGuard,
  [
    body('answers').isArray(),
    body('answers.*.questionId').isString().trim().notEmpty(),
    body('answers.*.selectedOptionIndex').isInt({ min: 0 })
  ],
  submitExam
);
router.post('/', authGuard, adminGuard, createExam);

export default router;
