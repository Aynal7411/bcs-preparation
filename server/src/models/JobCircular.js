import mongoose from 'mongoose';

const jobCircularSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    organization: { type: String, required: true },
    category: {
      type: String,
      enum: ['BCS', 'Primary', 'NTRCA', 'Bank', 'Govt', 'Private'],
      required: true
    },
    deadline: { type: Date, required: true },
    detailsUrl: { type: String },
    isPublished: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('JobCircular', jobCircularSchema);
