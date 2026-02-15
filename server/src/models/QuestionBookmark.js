import mongoose from 'mongoose';

const questionBookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }
  },
  { timestamps: true }
);

questionBookmarkSchema.index({ user: 1, questionId: 1 }, { unique: true });

export default mongoose.model('QuestionBookmark', questionBookmarkSchema);
