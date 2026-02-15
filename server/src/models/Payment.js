import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    gateway: { type: String, default: 'sslcommerz' },
    method: { type: String, default: 'sslcommerz' },
    type: { type: String, enum: ['one_time', 'subscription'], default: 'one_time' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT' },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'active', 'cancelled'],
      default: 'created',
      index: true
    },
    paymentUrl: { type: String },
    transactionId: { type: String },
    plan: {
      id: { type: String },
      name: { type: String },
      interval: { type: String },
      price: { type: Number, min: 0 }
    },
    paidAt: { type: Date },
    verifiedAt: { type: Date },
    cancelledAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
