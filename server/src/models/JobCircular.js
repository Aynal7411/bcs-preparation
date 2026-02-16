import mongoose from 'mongoose';

export const JOB_CATEGORIES = ['BCS', 'Primary', 'NTRCA', 'Bank', 'Govt', 'Private', 'Others'];

function isValidHttpUrl(value) {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

const jobCircularSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 180 },
    organization: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    category: {
      type: String,
      enum: JOB_CATEGORIES,
      required: true
    },
    deadline: { type: Date, required: true, index: true },
    detailsUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      validate: {
        validator: isValidHttpUrl,
        message: 'detailsUrl must be a valid http/https URL'
      }
    },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    isPublished: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

jobCircularSchema.index({ isPublished: 1, createdAt: -1 });

export default mongoose.model('JobCircular', jobCircularSchema);
