import { Router } from 'express';
import { body } from 'express-validator';
import {
  bulkUploadQuestions,
  commitQuestionFileUpload,
  createExam,
  deleteExam,
  getAdminDashboard,
  getQuestionUploadHistory,
  getReports,
  getUsers,
  previewQuestionFileUpload,
  uploadQuestionFile,
  updateExam,
  updateUser
} from '../controllers/adminController.js';
import { adminGuard, authGuard } from '../middleware/authMiddleware.js';
import { QUESTION_UPLOAD_MAX_FILE_SIZE_BYTES, questionUpload } from '../services/uploadService.js';

const router = Router();

router.use(authGuard, adminGuard);

function questionFileUploadMiddleware(req, res, next) {
  questionUpload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `File size exceeds limit. Maximum allowed is ${Math.floor(
          QUESTION_UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024)
        )}MB`
      });
    }

    return next(error);
  });
}

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

router.post('/question/upload-file', questionFileUploadMiddleware, uploadQuestionFile);
router.post('/question/upload-preview', questionFileUploadMiddleware, previewQuestionFileUpload);
router.post('/question/upload-commit', commitQuestionFileUpload);
router.get('/question/upload-history', getQuestionUploadHistory);

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
