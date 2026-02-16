import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins/softDeletePlugin.js';

const examQuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2,
        message: 'Each question must contain at least two options'
      },
      required: true
    },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, trim: true }
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['BCS', 'Primary', 'NTRCA', 'Bank', 'Others'],
      required: true
    },
    totalMarks: { type: Number, default: 100 },
    durationMinutes: { type: Number, default: 60 },
    examDate: { type: Date, required: true },
    isFeatured: { type: Boolean, default: false },
    enrolledStudents: { type: Number, default: 0 },
    questions: { type: [examQuestionSchema], default: [] }
  },
  { timestamps: true }
);

examSchema.plugin(softDeletePlugin);

examSchema.index({ isDeleted: 1, createdAt: -1 });
examSchema.index({ isDeleted: 1, category: 1, createdAt: -1 });
examSchema.index({ isDeleted: 1, isFeatured: 1, examDate: 1 });

export default mongoose.model('Exam', examSchema);
