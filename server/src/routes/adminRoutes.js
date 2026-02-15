import { Router } from 'express';
import { body } from 'express-validator';
import {
  bulkUploadQuestions,
  createExam,
  deleteExam,
  getAdminDashboard,
  getReports,
  getUsers,
  uploadQuestionFile,
  updateExam,
  updateUser
} from '../controllers/adminController.js';
import { adminGuard, authGuard } from '../middleware/authMiddleware.js';
import { upload } from '../services/uploadService.js';

const router = Router();

router.use(authGuard, adminGuard);

router.get('/dashboard', getAdminDashboard);

router.post(
  '/exam',
  [
    body('title').isString().trim().notEmpty(),
    body('category').isIn(['BCS', 'Primary', 'NTRCA', 'Bank', 'Others']),
    body('examDate').isISO8601(),
    body('totalMarks').optional().isNumeric(),
    body('durationMinutes').optional().isInt({ min: 1 }),
    body('isFeatured').optional().isBoolean(),
    body('questions').optional().isArray()
  ],
  createExam
);

router.put(
  '/exam/:id',
  [
    body('title').optional().isString().trim().notEmpty(),
    body('category').optional().isIn(['BCS', 'Primary', 'NTRCA', 'Bank', 'Others']),
    body('examDate').optional().isISO8601(),
    body('totalMarks').optional().isNumeric(),
    body('durationMinutes').optional().isInt({ min: 1 }),
    body('isFeatured').optional().isBoolean(),
    body('questions').optional().isArray()
  ],
  updateExam
);

router.delete('/exam/:id', deleteExam);

router.post(
  '/question/bulk',
  [
    body('examId').isMongoId(),
    body('mode').optional().isIn(['append', 'replace']),
    body('questions').isArray({ min: 1 }),
    body('questions.*.questionText').isString().trim().notEmpty(),
    body('questions.*.options').isArray({ min: 2 }),
    body('questions.*.correctOptionIndex').isInt({ min: 0 }),
    body('questions.*.explanation').optional().isString()
  ],
  bulkUploadQuestions
);

router.post('/question/upload-file', upload.single('file'), uploadQuestionFile);

router.get('/users', getUsers);

router.put(
  '/users/:id',
  [
    body('name').optional().isString().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().isString().trim().isLength({ min: 6, max: 20 }),
    body('bio').optional().isString().trim().isLength({ max: 300 }),
    body('role').optional().isIn(['student', 'admin', 'instructor']),
    body('examTargets').optional().isArray()
  ],
  updateUser
);

router.get('/reports', getReports);

export default router;
