import { Router } from 'express';
import { authGuard } from '../middleware/authMiddleware.js';
import { authLimiter, passwordResetLimiter } from '../config/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  forgotPasswordValidation
} from '../schemas/authSchemas.js';
import {
  adminLogin,
  forgotPassword,
  googleLogin,
  login,
  logout,
  me,
  refreshToken,
  register,
  resetPassword
} from '../controllers/authController.js';

const router = Router();

router.post('/register', registerValidation, validateRequest, register);

router.post('/login', authLimiter, loginValidation, validateRequest, login);

router.post('/admin-login', authLimiter, loginValidation, validateRequest, adminLogin);

router.post('/google-login', validateRequest, googleLogin);

router.post('/refresh-token', refreshToken);

router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, validateRequest, forgotPassword);

router.post('/reset-password', resetPasswordValidation, validateRequest, resetPassword);

router.get('/logout', logout);
router.post('/logout', logout);
router.get('/me', authGuard, me);

export default router;
