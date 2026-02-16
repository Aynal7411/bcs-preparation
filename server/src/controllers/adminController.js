import crypto from 'crypto';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import JobCircular from '../models/JobCircular.js';
import UploadHistory from '../models/UploadHistory.js';
import User from '../models/User.js';
import { QUESTION_UPLOAD_MAX_FILE_SIZE_BYTES } from '../services/uploadService.js';

const MAX_UPLOAD_ROW_COUNT = 1000;
const UPLOAD_PREVIEW_TTL_MS = 15 * 60 * 1000;
const PREVIEW_SAMPLE_SIZE = 5;
const DUPLICATE_ROWS_RESPONSE_LIMIT = 50;
const uploadPreviewStore = new Map();

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function normalizeRecordStatus(recordStatus) {
  const normalized = String(recordStatus || 'active').trim().toLowerCase();
  if (!['active', 'deleted', 'all'].includes(normalized)) {
    throw badRequest('recordStatus must be one of: active, deleted, all');
  }
  return normalized;
}

function hasValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }

  return false;
}

function normalizeQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw badRequest('Question list must be a non-empty array');
  }

  return rawQuestions.map((question, index) => {
    const serial = index + 1;
    const questionText = String(question?.questionText || '').trim();
    const optionsSource = Array.isArray(question?.options)
      ? question.options
      : String(question?.options || '')
          .split(/[|;]/)
          .map((item) => item.trim())
          .filter(Boolean);
    const options = optionsSource.map((item) => String(item).trim()).filter(Boolean);
    const correctOptionIndex = Number.parseInt(String(question?.correctOptionIndex ?? ''), 10);
    const explanation = String(question?.explanation || '').trim();

    if (!questionText) {
      throw badRequest(`Question ${serial}: questionText is required`);
    }

    if (options.length < 2) {
      throw badRequest(`Question ${serial}: at least two options are required`);
    }

    if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      throw badRequest(
        `Question ${serial}: correctOptionIndex must be between 0 and ${Math.max(0, options.length - 1)}`
      );
    }

    return {
      questionText,
      options,
      correctOptionIndex,
      explanation
    };
  });
}

function enforceQuestionRowLimit(questions) {
  if (questions.length > MAX_UPLOAD_ROW_COUNT) {
    throw badRequest(`Upload row limit exceeded. Maximum ${MAX_UPLOAD_ROW_COUNT} rows are allowed per import`);
  }
}

function parseCsvLine(line) {
  const values = [];
  let token = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        token += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(token.trim());
      token = '';
      continue;
    }

    token += char;
  }

  values.push(token.trim());
  return values;
}

function parseCsvQuestions(csvText) {
  const lines = csvText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw badRequest('CSV must include a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const questionTextIndex = headers.indexOf('questiontext');
  const optionsIndex = headers.indexOf('options');
  const correctOptionIndexIndex = headers.indexOf('correctoptionindex');
  const explanationIndex = headers.indexOf('explanation');

  if (questionTextIndex < 0 || optionsIndex < 0 || correctOptionIndexIndex < 0) {
    throw badRequest('CSV header must include questionText, options, and correctOptionIndex columns');
  }

  const questions = [];
  for (let i = 1; i < lines.length; i += 1) {
    const columns = parseCsvLine(lines[i]);
    if (columns.every((column) => column === '')) {
      continue;
    }

    questions.push({
      questionText: columns[questionTextIndex] || '',
      options: (columns[optionsIndex] || '').split('|').map((item) => item.trim()).filter(Boolean),
      correctOptionIndex: columns[correctOptionIndexIndex],
      explanation: explanationIndex >= 0 ? columns[explanationIndex] || '' : ''
    });
  }

  return questions;
}

function parseQuestionFile({ originalName, mimetype, buffer }) {
  const filename = String(originalName || '').toLowerCase();
  const type = String(mimetype || '').toLowerCase();
  const text = buffer.toString('utf8');

  if (!text.trim()) {
    throw badRequest('Uploaded file is empty');
  }

  const isJson = filename.endsWith('.json') || type.includes('application/json') || type.includes('text/json');
  const isCsv = filename.endsWith('.csv') || type.includes('text/csv');

  if (isJson) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw badRequest('Invalid JSON file');
    }
    const rawQuestions = Array.isArray(parsed) ? parsed : parsed?.questions;
    const normalized = normalizeQuestions(rawQuestions);
    enforceQuestionRowLimit(normalized);
    return normalized;
  }

  if (isCsv) {
    const rawQuestions = parseCsvQuestions(text);
    const normalized = normalizeQuestions(rawQuestions);
    enforceQuestionRowLimit(normalized);
    return normalized;
  }

  throw badRequest('Unsupported file format. Upload .json or .csv');
}

function normalizeUploadMode(mode) {
  const normalized = String(mode || 'append').trim().toLowerCase();
  if (!['append', 'replace'].includes(normalized)) {
    throw badRequest('mode must be either append or replace');
  }
  return normalized;
}

function normalizeDuplicateHandling(duplicateHandling) {
  const normalized = String(duplicateHandling || 'skip').trim().toLowerCase();
  if (!['skip', 'allow'].includes(normalized)) {
    throw badRequest('duplicateHandling must be either skip or allow');
  }
  return normalized;
}

function questionTextKey(questionText) {
  return String(questionText || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function analyzeDuplicateQuestions({ questions, existingQuestions, mode }) {
  const existingKeys =
    mode === 'append'
      ? new Set((existingQuestions || []).map((item) => questionTextKey(item?.questionText)).filter(Boolean))
      : new Set();

  const seenInBatch = new Map();
  const duplicateIndexes = new Set();
  const duplicateRowMap = new Map();
  let duplicateWithinFileCount = 0;
  let duplicateExistingCount = 0;

  const markDuplicate = (index, reason, firstRowNumber = null) => {
    duplicateIndexes.add(index);
    const rowNumber = index + 1;
    const existing = duplicateRowMap.get(index) || {
      rowNumber,
      questionText: questions[index]?.questionText || '',
      reasons: []
    };
    if (!existing.reasons.includes(reason)) {
      existing.reasons.push(reason);
    }
    if (firstRowNumber && !existing.firstRowNumber) {
      existing.firstRowNumber = firstRowNumber;
    }
    duplicateRowMap.set(index, existing);
  };

  questions.forEach((question, index) => {
    const key = questionTextKey(question.questionText);
    if (!key) {
      return;
    }

    const firstSeenIndex = seenInBatch.get(key);
    if (firstSeenIndex !== undefined) {
      duplicateWithinFileCount += 1;
      markDuplicate(index, 'within-file', firstSeenIndex + 1);
    } else {
      seenInBatch.set(key, index);
    }

    if (existingKeys.has(key)) {
      duplicateExistingCount += 1;
      markDuplicate(index, 'existing-exam');
    }
  });

  const duplicateRows = Array.from(duplicateRowMap.values()).sort((a, b) => a.rowNumber - b.rowNumber);

  return {
    duplicateIndexes,
    duplicateRows,
    duplicateWithinFileCount,
    duplicateExistingCount
  };
}

function selectImportQuestions(questions, duplicateIndexes, duplicateHandling) {
  if (duplicateHandling === 'allow') {
    return questions;
  }
  return questions.filter((_, index) => !duplicateIndexes.has(index));
}

function buildSampleQuestions(questions) {
  return questions.slice(0, PREVIEW_SAMPLE_SIZE).map((question, index) => ({
    rowNumber: index + 1,
    questionText: question.questionText,
    optionCount: question.options.length,
    correctOptionIndex: question.correctOptionIndex
  }));
}

function cleanupExpiredPreviews() {
  const now = Date.now();
  for (const [previewId, preview] of uploadPreviewStore.entries()) {
    if (preview.expiresAtMs <= now) {
      uploadPreviewStore.delete(previewId);
    }
  }
}

function createPreviewId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function getPreviewById(previewId, adminId) {
  cleanupExpiredPreviews();

  const preview = uploadPreviewStore.get(previewId);
  if (!preview) {
    throw notFound('Upload preview not found or expired. Please upload and preview again');
  }

  if (String(preview.adminId) !== String(adminId)) {
    const error = new Error('This upload preview belongs to another admin account');
    error.statusCode = 403;
    throw error;
  }

  return preview;
}

async function buildUploadContext({ examId, mode, file }) {
  if (!file) {
    throw badRequest('Question file is required (field: file)');
  }

  if (file.size > QUESTION_UPLOAD_MAX_FILE_SIZE_BYTES) {
    throw badRequest(
      `File size exceeds limit. Maximum allowed is ${Math.floor(QUESTION_UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB`
    );
  }

  const questions = parseQuestionFile({
    originalName: file.originalname,
    mimetype: file.mimetype,
    buffer: file.buffer
  });

  const exam = await Exam.findById(examId).select('_id title questions');
  if (!exam) {
    throw badRequest('Exam not found');
  }

  const duplicateSummary = analyzeDuplicateQuestions({
    questions,
    existingQuestions: exam.questions,
    mode
  });

  return { exam, questions, duplicateSummary };
}

async function createUploadHistoryEntry({
  uploaderId,
  examId,
  fileName,
  mode,
  duplicateHandling,
  totalRows,
  importedCount,
  duplicateWithinFileCount,
  duplicateExistingCount,
  previewId
}) {
  await UploadHistory.create({
    uploader: uploaderId,
    exam: examId,
    fileName,
    mode,
    duplicateHandling,
    totalRows,
    importedCount,
    skippedDuplicateCount: Math.max(totalRows - importedCount, 0),
    duplicateWithinFileCount,
    duplicateExistingCount,
    previewId
  });
}

function buildPreviewResponse(preview) {
  const duplicateIndexSet = new Set(preview.duplicateIndexes);
  const importableCount = preview.questions.filter((_, index) => !duplicateIndexSet.has(index)).length;

  return {
    previewId: preview.previewId,
    fileName: preview.fileName,
    mode: preview.mode,
    exam: {
      id: preview.examId,
      title: preview.examTitle
    },
    expiresAt: new Date(preview.expiresAtMs).toISOString(),
    limits: {
      maxFileSizeBytes: QUESTION_UPLOAD_MAX_FILE_SIZE_BYTES,
      maxRows: MAX_UPLOAD_ROW_COUNT
    },
    counts: {
      totalRows: preview.questions.length,
      importableCount,
      duplicateRows: preview.duplicateIndexes.length,
      duplicateWithinFileCount: preview.duplicateWithinFileCount,
      duplicateExistingCount: preview.duplicateExistingCount
    },
    duplicateRows: preview.duplicateRows.slice(0, DUPLICATE_ROWS_RESPONSE_LIMIT),
    sampleQuestions: buildSampleQuestions(preview.questions)
  };
}

async function importQuestionsToExam({ examId, mode, questions }) {
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw badRequest('Exam not found');
  }

  if (mode === 'replace') {
    exam.questions = questions;
  } else {
    exam.questions.push(...questions);
  }

  await exam.save();
  return exam;
}

export async function getAdminDashboard(req, res, next) {
  try {
    const [
      totalUsers,
      totalExams,
      totalQuestionsAgg,
      totalJobs,
      submittedResults,
      avgScoreAgg,
      recentUsers,
      recentResults
    ] = await Promise.all([
      User.countDocuments(),
      Exam.countDocuments(),
      Exam.aggregate([{ $project: { questionCount: { $size: '$questions' } } }, { $group: { _id: null, total: { $sum: '$questionCount' } } }]),
      JobCircular.countDocuments({ isPublished: true }),
      ExamResult.countDocuments({ status: 'submitted' }),
      ExamResult.aggregate([{ $match: { status: 'submitted' } }, { $group: { _id: null, avgScore: { $avg: '$score' } } }]),
      User.find().select('-password').sort({ createdAt: -1 }).limit(5),
      ExamResult.find({ status: 'submitted' }).populate('user', 'name').populate('exam', 'title').sort({ submittedAt: -1 }).limit(5)
    ]);

    return res.json({
      totals: {
        users: totalUsers,
        exams: totalExams,
        questions: totalQuestionsAgg[0]?.total || 0,
        activeJobs: totalJobs,
        submissions: submittedResults
      },
      performance: {
        averageScore: Number((avgScoreAgg[0]?.avgScore || 0).toFixed(2))
      },
      recentUsers,
      recentSubmissions: recentResults.map((item) => ({
        id: item._id,
        user: item.user,
        exam: item.exam,
        score: item.score,
        percentage: item.percentage,
        submittedAt: item.submittedAt
      }))
    });
  } catch (error) {
    return next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const exam = await Exam.create(req.body);
    return res.status(201).json(exam);
  } catch (error) {
    return next(error);
  }
}

export async function updateExam(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid exam id' });
    }

    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    return res.json(exam);
  } catch (error) {
    return next(error);
  }
}

export async function deleteExam(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid exam id' });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    exam.isDeleted = true;
    exam.deletedAt = new Date();
    exam.deletedBy = req.user.id;
    await exam.save();

    return res.json({ message: 'Exam archived successfully' });
  } catch (error) {
    return next(error);
  }
}

export async function restoreExam(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid exam id' });
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      {
        $set: { isDeleted: false, deletedAt: null, deletedBy: null }
      },
      { new: true }
    ).setOptions({ includeDeleted: true });

    if (!exam) {
      return res.status(404).json({ message: 'Archived exam not found' });
    }

    return res.json({ message: 'Exam restored successfully', exam });
  } catch (error) {
    return next(error);
  }
}

export async function bulkUploadQuestions(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const { examId, questions, mode = 'append' } = req.body;
    const normalizedQuestions = normalizeQuestions(questions);
    enforceQuestionRowLimit(normalizedQuestions);
    const exam = await importQuestionsToExam({ examId, mode, questions: normalizedQuestions });

    return res.status(201).json({
      message: `Questions ${mode === 'replace' ? 'replaced' : 'uploaded'} successfully`,
      totalQuestions: exam.questions.length
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadQuestionFile(req, res, next) {
  try {
    const examId = String(req.body.examId || '');
    const mode = normalizeUploadMode(req.body.mode);
    const duplicateHandling = normalizeDuplicateHandling(req.body.duplicateHandling);

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw badRequest('Valid examId is required');
    }

    const { questions, duplicateSummary } = await buildUploadContext({
      examId,
      mode,
      file: req.file
    });

    const selectedQuestions = selectImportQuestions(questions, duplicateSummary.duplicateIndexes, duplicateHandling);
    const updatedExam = await importQuestionsToExam({ examId, mode, questions: selectedQuestions });

    await createUploadHistoryEntry({
      uploaderId: req.user.id,
      examId,
      fileName: req.file.originalname || 'upload-file',
      mode,
      duplicateHandling,
      totalRows: questions.length,
      importedCount: selectedQuestions.length,
      duplicateWithinFileCount: duplicateSummary.duplicateWithinFileCount,
      duplicateExistingCount: duplicateSummary.duplicateExistingCount,
      previewId: null
    });

    return res.status(201).json({
      message: `File imported successfully (${selectedQuestions.length}/${questions.length} questions, mode: ${mode})`,
      fileName: req.file.originalname,
      mode,
      duplicateHandling,
      importedCount: selectedQuestions.length,
      totalRows: questions.length,
      skippedDuplicateCount: Math.max(questions.length - selectedQuestions.length, 0),
      duplicateWithinFileCount: duplicateSummary.duplicateWithinFileCount,
      duplicateExistingCount: duplicateSummary.duplicateExistingCount,
      totalQuestions: updatedExam.questions.length
    });
  } catch (error) {
    return next(error);
  }
}

export async function previewQuestionFileUpload(req, res, next) {
  try {
    const examId = String(req.body.examId || '');
    const mode = normalizeUploadMode(req.body.mode);

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw badRequest('Valid examId is required');
    }

    const { exam, questions, duplicateSummary } = await buildUploadContext({
      examId,
      mode,
      file: req.file
    });

    cleanupExpiredPreviews();

    const previewId = createPreviewId();
    const expiresAtMs = Date.now() + UPLOAD_PREVIEW_TTL_MS;

    const preview = {
      previewId,
      adminId: req.user.id,
      examId: String(exam._id),
      examTitle: exam.title,
      fileName: req.file.originalname || 'upload-file',
      mode,
      questions,
      duplicateIndexes: Array.from(duplicateSummary.duplicateIndexes),
      duplicateRows: duplicateSummary.duplicateRows,
      duplicateWithinFileCount: duplicateSummary.duplicateWithinFileCount,
      duplicateExistingCount: duplicateSummary.duplicateExistingCount,
      createdAtMs: Date.now(),
      expiresAtMs
    };

    uploadPreviewStore.set(previewId, preview);

    return res.status(201).json({
      message: 'Preview generated. Review duplicates before final import',
      preview: buildPreviewResponse(preview)
    });
  } catch (error) {
    return next(error);
  }
}

export async function commitQuestionFileUpload(req, res, next) {
  try {
    const previewId = String(req.body.previewId || '').trim();
    const duplicateHandling = normalizeDuplicateHandling(req.body.duplicateHandling);

    if (!previewId) {
      throw badRequest('previewId is required');
    }

    const preview = getPreviewById(previewId, req.user.id);
    const duplicateIndexSet = new Set(preview.duplicateIndexes);
    const selectedQuestions = selectImportQuestions(preview.questions, duplicateIndexSet, duplicateHandling);
    const exam = await importQuestionsToExam({
      examId: preview.examId,
      mode: preview.mode,
      questions: selectedQuestions
    });

    await createUploadHistoryEntry({
      uploaderId: req.user.id,
      examId: preview.examId,
      fileName: preview.fileName,
      mode: preview.mode,
      duplicateHandling,
      totalRows: preview.questions.length,
      importedCount: selectedQuestions.length,
      duplicateWithinFileCount: preview.duplicateWithinFileCount,
      duplicateExistingCount: preview.duplicateExistingCount,
      previewId
    });

    uploadPreviewStore.delete(previewId);

    return res.status(201).json({
      message: 'Preview import committed successfully',
      fileName: preview.fileName,
      mode: preview.mode,
      duplicateHandling,
      importedCount: selectedQuestions.length,
      totalRows: preview.questions.length,
      skippedDuplicateCount: Math.max(preview.questions.length - selectedQuestions.length, 0),
      duplicateWithinFileCount: preview.duplicateWithinFileCount,
      duplicateExistingCount: preview.duplicateExistingCount,
      totalQuestions: exam.questions.length
    });
  } catch (error) {
    return next(error);
  }
}

export async function getQuestionUploadHistory(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.examId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.examId)) {
        throw badRequest('Invalid examId');
      }
      filter.exam = req.query.examId;
    }

    const [history, total] = await Promise.all([
      UploadHistory.find(filter)
        .populate('uploader', 'name email')
        .populate('exam', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UploadHistory.countDocuments(filter)
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      history: history.map((item) => ({
        id: item._id,
        fileName: item.fileName,
        mode: item.mode,
        duplicateHandling: item.duplicateHandling,
        totalRows: item.totalRows,
        importedCount: item.importedCount,
        skippedDuplicateCount: item.skippedDuplicateCount,
        duplicateWithinFileCount: item.duplicateWithinFileCount,
        duplicateExistingCount: item.duplicateExistingCount,
        uploadedAt: item.createdAt,
        uploader: item.uploader
          ? {
              id: item.uploader._id,
              name: item.uploader.name,
              email: item.uploader.email
            }
          : null,
        exam: item.exam
          ? {
              id: item.exam._id,
              title: item.exam.title
            }
          : null
      }))
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    const recordStatus = normalizeRecordStatus(req.query.recordStatus);
    const includeDeleted = recordStatus !== 'active';

    if (recordStatus === 'deleted') {
      filter.isDeleted = true;
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const usersQuery = User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalQuery = User.countDocuments(filter);

    if (includeDeleted) {
      usersQuery.setOptions({ includeDeleted: true });
      totalQuery.setOptions({ includeDeleted: true });
    }

    const [users, total] = await Promise.all([usersQuery, totalQuery]);

    return res.json({
      page,
      limit,
      recordStatus,
      total,
      totalPages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const existing = await User.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, phone, bio, role, examTargets } = req.body;

    if (email && email.toLowerCase() !== existing.email) {
      const dup = await User.findOne({ email: email.toLowerCase(), _id: { $ne: existing._id } });
      if (dup) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      existing.email = email.toLowerCase();
    }

    if (name !== undefined) existing.name = name;
    if (phone !== undefined) existing.phone = phone;
    if (bio !== undefined) existing.bio = bio;
    if (role !== undefined) existing.role = role;
    if (examTargets !== undefined) existing.examTargets = examTargets;

    await existing.save();

    return res.json({
      message: 'User updated successfully',
      user: {
        id: existing._id,
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        bio: existing.bio,
        role: existing.role,
        examTargets: existing.examTargets,
        isDeleted: existing.isDeleted,
        deletedAt: existing.deletedAt,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ message: 'You cannot archive your own admin account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user.id;
    await user.save();

    return res.json({ message: 'User archived successfully' });
  } catch (error) {
    return next(error);
  }
}

export async function restoreUser(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
      { new: true }
    )
      .setOptions({ includeDeleted: true })
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Archived user not found' });
    }

    return res.json({
      message: 'User restored successfully',
      user
    });
  } catch (error) {
    return next(error);
  }
}

export async function getReports(req, res, next) {
  try {
    const [submissionsByDay, examPerformance, userRoleBreakdown, topUsers] = await Promise.all([
      ExamResult.aggregate([
        { $match: { status: 'submitted', submittedAt: { $ne: null } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } }, submissions: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      ExamResult.aggregate([
        { $match: { status: 'submitted' } },
        {
          $group: {
            _id: '$exam',
            submissions: { $sum: 1 },
            avgScore: { $avg: '$score' },
            avgPercentage: { $avg: '$percentage' },
            maxScore: { $max: '$score' }
          }
        },
        { $sort: { submissions: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'exams',
            localField: '_id',
            foreignField: '_id',
            as: 'exam'
          }
        },
        { $unwind: '$exam' },
        { $match: { 'exam.isDeleted': { $ne: true } } },
        {
          $project: {
            _id: 0,
            examId: '$exam._id',
            examTitle: '$exam.title',
            submissions: 1,
            avgScore: { $round: ['$avgScore', 2] },
            avgPercentage: { $round: ['$avgPercentage', 2] },
            maxScore: 1
          }
        }
      ]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      ExamResult.aggregate([
        { $match: { status: 'submitted' } },
        {
          $group: {
            _id: '$user',
            totalSubmissions: { $sum: 1 },
            avgPercentage: { $avg: '$percentage' }
          }
        },
        { $sort: { totalSubmissions: -1, avgPercentage: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.isDeleted': { $ne: true } } },
        {
          $project: {
            _id: 0,
            userId: '$user._id',
            name: '$user.name',
            email: '$user.email',
            totalSubmissions: 1,
            avgPercentage: { $round: ['$avgPercentage', 2] }
          }
        }
      ])
    ]);

    return res.json({
      generatedAt: new Date().toISOString(),
      submissionsByDay,
      examPerformance,
      userRoleBreakdown,
      topUsers
    });
  } catch (error) {
    return next(error);
  }
}
