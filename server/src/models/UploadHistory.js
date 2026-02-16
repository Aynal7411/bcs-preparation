import mongoose from 'mongoose';

const uploadHistorySchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 260 },
    mode: { type: String, enum: ['append', 'replace'], required: true },
    duplicateHandling: { type: String, enum: ['skip', 'allow'], default: 'skip' },
    totalRows: { type: Number, required: true, min: 0 },
    importedCount: { type: Number, required: true, min: 0 },
    skippedDuplicateCount: { type: Number, required: true, min: 0, default: 0 },
    duplicateWithinFileCount: { type: Number, required: true, min: 0, default: 0 },
    duplicateExistingCount: { type: Number, required: true, min: 0, default: 0 },
    previewId: { type: String, trim: true }
  },
  { timestamps: true }
);

uploadHistorySchema.index({ createdAt: -1 });
uploadHistorySchema.index({ exam: 1, createdAt: -1 });
uploadHistorySchema.index({ uploader: 1, createdAt: -1 });

export default mongoose.model('UploadHistory', uploadHistorySchema);
