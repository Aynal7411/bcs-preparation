import { Router } from 'express';
import { body } from 'express-validator';
import {
  cancelSubscription,
  createOrder,
  getPaymentHistory,
  subscribeToPlan,
  verifyPayment
} from '../controllers/paymentController.js';
import { authGuard } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authGuard);

router.post(
  '/create-order',
  [
    body('amount').isFloat({ min: 0.01 }),
    body('method').optional().isIn(['sslcommerz', 'bkash']),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('type').optional().isIn(['one_time', 'subscription'])
  ],
  createOrder
);

router.post('/verify', [body('orderId').isString().trim().notEmpty(), body('transactionId').optional().isString()], verifyPayment);
router.get('/history', getPaymentHistory);

router.post(
  '/subscription',
  [
    body('planId').isString().trim().notEmpty(),
    body('planName').isString().trim().notEmpty(),
    body('interval').optional().isIn(['monthly', 'quarterly', 'yearly']),
    body('amount').isFloat({ min: 0.01 }),
    body('method').optional().isIn(['sslcommerz', 'bkash']),
    body('currency').optional().isString().isLength({ min: 3, max: 3 })
  ],
  subscribeToPlan
);

router.post('/cancel-subscription', cancelSubscription);

export default router;
