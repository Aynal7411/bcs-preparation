import crypto from 'crypto';
import { validationResult } from 'express-validator';
import Payment from '../models/Payment.js';
import { initializePayment } from '../services/paymentService.js';

function hasValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }

  return false;
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function createOrder(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const amount = Number(req.body.amount);
    const method = req.body.method || 'sslcommerz';
    const type = req.body.type || 'one_time';

    const orderId = newId('ord');
    const invoiceId = newId('inv');

    const gatewayPayload = await initializePayment({ amount, invoiceId, method });

    const payment = await Payment.create({
      user: req.user.id,
      orderId,
      invoiceId,
      gateway: gatewayPayload.gateway,
      method,
      type,
      amount,
      currency: req.body.currency || 'BDT',
      status: 'created',
      paymentUrl: gatewayPayload.paymentUrl,
      metadata: req.body.metadata || null
    });

    return res.status(201).json({
      message: 'Order created successfully',
      order: {
        orderId: payment.orderId,
        invoiceId: payment.invoiceId,
        gateway: payment.gateway,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentUrl: payment.paymentUrl,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const { orderId, transactionId } = req.body;

    const payment = await Payment.findOne({ orderId, user: req.user.id });
    if (!payment) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const status = req.body.status || 'paid';
    if (!['paid', 'failed', 'active'].includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    payment.status = status;
    payment.transactionId = transactionId || payment.transactionId || newId('txn');
    payment.verifiedAt = new Date();

    if (status === 'paid' || status === 'active') {
      payment.paidAt = new Date();
    }

    await payment.save();

    return res.json({
      message: 'Payment verified successfully',
      payment: {
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
        verifiedAt: payment.verifiedAt,
        paidAt: payment.paidAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPaymentHistory(req, res, next) {
  try {
    const history = await Payment.find({ user: req.user.id }).sort({ createdAt: -1 });

    return res.json(
      history.map((payment) => ({
        id: payment._id,
        orderId: payment.orderId,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        currency: payment.currency,
        type: payment.type,
        status: payment.status,
        gateway: payment.gateway,
        method: payment.method,
        transactionId: payment.transactionId,
        plan: payment.plan,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        cancelledAt: payment.cancelledAt
      }))
    );
  } catch (error) {
    return next(error);
  }
}

export async function subscribeToPlan(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const { planId, planName, interval = 'monthly', amount, method = 'sslcommerz' } = req.body;

    const orderId = newId('sub_ord');
    const invoiceId = newId('sub_inv');
    const chargeAmount = Number(amount);

    const gatewayPayload = await initializePayment({ amount: chargeAmount, invoiceId, method });

    const payment = await Payment.create({
      user: req.user.id,
      orderId,
      invoiceId,
      gateway: gatewayPayload.gateway,
      method,
      type: 'subscription',
      amount: chargeAmount,
      currency: req.body.currency || 'BDT',
      status: 'created',
      paymentUrl: gatewayPayload.paymentUrl,
      plan: {
        id: planId,
        name: planName,
        interval,
        price: chargeAmount
      },
      metadata: req.body.metadata || null
    });

    return res.status(201).json({
      message: 'Subscription order created successfully',
      subscription: {
        orderId: payment.orderId,
        invoiceId: payment.invoiceId,
        status: payment.status,
        plan: payment.plan,
        amount: payment.amount,
        currency: payment.currency,
        paymentUrl: payment.paymentUrl
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    const activeSubscription = await Payment.findOne({
      user: req.user.id,
      type: 'subscription',
      status: { $in: ['active', 'paid', 'created'] }
    }).sort({ createdAt: -1 });

    if (!activeSubscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    activeSubscription.status = 'cancelled';
    activeSubscription.cancelledAt = new Date();
    await activeSubscription.save();

    return res.json({
      message: 'Subscription cancelled successfully',
      subscription: {
        orderId: activeSubscription.orderId,
        plan: activeSubscription.plan,
        status: activeSubscription.status,
        cancelledAt: activeSubscription.cancelledAt
      }
    });
  } catch (error) {
    return next(error);
  }
}
