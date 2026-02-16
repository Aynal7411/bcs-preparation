import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionIndex: { type: Number, required: true, min: 0 },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: false }
);

const examResultSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', index: true },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    answers: { type: [answerSchema], default: [] },
    totalQuestions: { type: Number, default: 0 },
    attemptedQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 }
  },
  { timestamps: true }
);

examResultSchema.index({ exam: 1, user: 1, status: 1 });
examResultSchema.index({ user: 1, status: 1, submittedAt: -1 });
examResultSchema.index({ exam: 1, status: 1, score: -1, timeTakenSeconds: 1, submittedAt: 1 });
examResultSchema.index({ status: 1, submittedAt: 1 });

export default mongoose.model('ExamResult', examResultSchema);
