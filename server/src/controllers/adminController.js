import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import JobCircular from '../models/JobCircular.js';
import User from '../models/User.js';

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
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
    return normalizeQuestions(rawQuestions);
  }

  if (isCsv) {
    const rawQuestions = parseCsvQuestions(text);
    return normalizeQuestions(rawQuestions);
  }

  throw badRequest('Unsupported file format. Upload .json or .csv');
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

    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await ExamResult.deleteMany({ exam: req.params.id });

    return res.json({ message: 'Exam deleted successfully' });
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
    const mode = String(req.body.mode || 'append');

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw badRequest('Valid examId is required');
    }

    if (!['append', 'replace'].includes(mode)) {
      throw badRequest('mode must be either append or replace');
    }

    if (!req.file) {
      throw badRequest('Question file is required (field: file)');
    }

    const questions = parseQuestionFile({
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer
    });

    const exam = await importQuestionsToExam({ examId, mode, questions });

    return res.status(201).json({
      message: `File imported successfully (${questions.length} questions, mode: ${mode})`,
      importedCount: questions.length,
      totalQuestions: exam.questions.length,
      fileName: req.file.originalname
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

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    return res.json({
      page,
      limit,
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
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt
      }
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
