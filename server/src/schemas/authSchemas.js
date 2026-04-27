/**
 * Authentication validation schemas
 */

import { body } from 'express-validator';
import User from '../models/User.js';

const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const validatePassword = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter');

const validateName = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');

const validatePhone = body('phone')
  .trim()
  .optional()
  .matches(/^[\d+\-\s()]{10,}$/)
  .withMessage('Please provide a valid phone number');

export const registerValidation = [
  validateName,
  validateEmail,
  validatePassword,
  body('phone').trim().optional(),
  body('examTargets')
    .optional()
    .isArray()
    .withMessage('examTargets must be an array')
];

export const loginValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .withMessage('Please provide a valid phone number'),
  body()
    .custom((value, { req }) => {
      const hasEmail = req.body.email;
      const hasPhone = req.body.phone;
      if (!hasEmail && !hasPhone) {
        throw new Error('Either email or phone is required');
      }
      return true;
    }),
  validatePassword
];

export const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  validatePassword
];

export const forgotPasswordValidation = [
  validateEmail
];

export const updateProfileValidation = [
  validateName.optional(),
  body('phone')
    .trim()
    .optional()
    .matches(/^[\d+\-\s()]{10,}$/)
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .trim()
    .optional()
    .isLength({ max: 300 })
    .withMessage('Bio must not exceed 300 characters'),
  body('examTargets')
    .optional()
    .isArray()
    .withMessage('examTargets must be an array')
];
