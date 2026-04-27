/**
 * Exam and question validation schemas
 */

import { body, param } from 'express-validator';

const validateObjectId = (value) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

export const createExamValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('totalQuestions')
    .isInt({ min: 1, max: 200 })
    .withMessage('Total questions must be between 1 and 200'),
  body('duration')
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  body('passingScore')
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100'),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean')
];

export const submitExamValidation = [
  param('examId')
    .custom(validateObjectId),
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers must be a non-empty array'),
  body('timeTaken')
    .isInt({ min: 0 })
    .withMessage('Time taken must be a non-negative integer')
];

export const createQuestionValidation = [
  body('text')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Question text must be between 5 and 2000 characters'),
  body('type')
    .isIn(['multiple_choice', 'true_false', 'short_answer'])
    .withMessage('Invalid question type'),
  body('options')
    .if(() => body('type').getValue() === 'multiple_choice')
    .isArray({ min: 2, max: 6 })
    .withMessage('Multiple choice questions must have 2-6 options'),
  body('correctAnswer')
    .notEmpty()
    .withMessage('Correct answer is required'),
  body('explanation')
    .trim()
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Explanation must not exceed 1000 characters'),
  body('examId')
    .custom(validateObjectId)
];

export const bookmarkQuestionValidation = [
  param('questionId')
    .custom(validateObjectId)
];
