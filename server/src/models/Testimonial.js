import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    examName: { type: String, required: true },
    message: { type: String, required: true },
    rankOrResult: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('Testimonial', testimonialSchema);
