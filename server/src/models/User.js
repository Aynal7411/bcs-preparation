import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins/softDeletePlugin.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 300 },
    examTargets: { type: [String], default: [] },
    role: { type: String, enum: ['student', 'admin', 'instructor'], default: 'student' },
    profileImage: {
      url: { type: String },
      publicId: { type: String },
      uploadedAt: { type: Date }
    }
  },
  { timestamps: true }
);

userSchema.plugin(softDeletePlugin);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } }
  }
);
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: { $ne: true },
      phone: { $exists: true, $type: 'string', $nin: ['', null] }
    }
  }
);
userSchema.index({ isDeleted: 1, role: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });

export default mongoose.model('User', userSchema);
