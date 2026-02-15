import { Router } from 'express';
import { body, oneOf } from 'express-validator';
import { authGuard } from '../middleware/authMiddleware.js';
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

const identifierValidation = oneOf([body('email').isEmail(), body('phone').isString().trim().notEmpty()]);

router.post(
  '/register',
  [body('name').isString().trim().notEmpty(), body('password').isLength({ min: 6 }), identifierValidation],
  register
);

// OTP verification disabled: registration now creates user directly.
// router.post('/verify-otp', [identifierValidation, body('otp').isLength({ min: 4, max: 8 })], verifyOtp);

router.post('/login', [identifierValidation, body('password').notEmpty()], login);
router.post('/admin-login', [identifierValidation, body('password').notEmpty()], adminLogin);

router.post('/google-login', [body('email').isEmail(), body('name').isString().trim().notEmpty()], googleLogin);

router.post('/refresh-token', refreshToken);

router.post('/forgot-password', [body('email').isEmail()], forgotPassword);

router.post('/reset-password', [body('token').isString().trim().notEmpty(), body('password').isLength({ min: 6 })], resetPassword);

router.get('/logout', logout);
router.post('/logout', logout);
router.get('/me', authGuard, me);

export default router;
