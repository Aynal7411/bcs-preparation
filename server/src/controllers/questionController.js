import crypto from 'crypto';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Exam from '../models/Exam.js';
import QuestionBookmark from '../models/QuestionBookmark.js';

function toQuestionView(exam, question, includeCorrectOption = false) {
  const payload = {
    id: question._id,
    examId: exam._id,
    examTitle: exam.title,
    category: exam.category,
    questionText: question.questionText,
    options: question.options,
    explanation: question.explanation || ''
  };

  if (includeCorrectOption) {
    payload.correctOptionIndex = question.correctOptionIndex;
  }

  return payload;
}

function parsePositiveInt(value, fallback, maxValue = 100) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
}

function hasValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }

  return false;
}

export async function getQuestions(req, res, next) {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const match = {};
    if (req.query.category) {
      match.category = req.query.category;
    }

    if (req.query.examId && mongoose.Types.ObjectId.isValid(req.query.examId)) {
      match._id = new mongoose.Types.ObjectId(req.query.examId);
    }

    const questionMatch = {};
    if (req.query.q) {
      questionMatch['questions.questionText'] = { $regex: req.query.q, $options: 'i' };
    }

    const basePipeline = [{ $match: match }, { $unwind: '$questions' }];

    if (Object.keys(questionMatch).length > 0) {
      basePipeline.push({ $match: questionMatch });
    }

    const [rows, totalResult] = await Promise.all([
      Exam.aggregate([
        ...basePipeline,
        { $sort: { updatedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            id: '$questions._id',
            examId: '$_id',
            examTitle: '$title',
            category: '$category',
            questionText: '$questions.questionText',
            options: '$questions.options',
            explanation: '$questions.explanation'
          }
        }
      ]),
      Exam.aggregate([...basePipeline, { $count: 'total' }])
    ]);

    const total = totalResult[0]?.total || 0;

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      questions: rows
    });
  } catch (error) {
    return next(error);
  }
}

export async function getRandomQuestions(req, res, next) {
  try {
    const count = parsePositiveInt(req.query.count, 10, 50);

    const match = {};
    if (req.query.category) {
      match.category = req.query.category;
    }

    if (req.query.examId && mongoose.Types.ObjectId.isValid(req.query.examId)) {
      match._id = new mongoose.Types.ObjectId(req.query.examId);
    }

    const rows = await Exam.aggregate([
      { $match: match },
      { $unwind: '$questions' },
      { $sample: { size: count } },
      {
        $project: {
          _id: 0,
          id: '$questions._id',
          examId: '$_id',
          examTitle: '$title',
          category: '$category',
          questionText: '$questions.questionText',
          options: '$questions.options',
          explanation: '$questions.explanation'
        }
      }
    ]);

    return res.json({ count: rows.length, questions: rows });
  } catch (error) {
    return next(error);
  }
}

export async function startPracticeSession(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const count = parsePositiveInt(req.body.count, 10, 50);
    const match = {};

    if (req.body.category) {
      match.category = req.body.category;
    }

    if (req.body.examId && mongoose.Types.ObjectId.isValid(req.body.examId)) {
      match._id = new mongoose.Types.ObjectId(req.body.examId);
    }

    const questions = await Exam.aggregate([
      { $match: match },
      { $unwind: '$questions' },
      { $sample: { size: count } },
      {
        $project: {
          _id: 0,
          id: '$questions._id',
          examId: '$_id',
          examTitle: '$title',
          category: '$category',
          questionText: '$questions.questionText',
          options: '$questions.options',
          explanation: '$questions.explanation'
        }
      }
    ]);

    return res.status(201).json({
      sessionId: crypto.randomUUID(),
      userId: req.user.id,
      startedAt: new Date().toISOString(),
      count: questions.length,
      questions
    });
  } catch (error) {
    return next(error);
  }
}

export async function bookmarkQuestion(req, res, next) {
  try {
    if (hasValidationErrors(req, res)) {
      return;
    }

    const questionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid question id' });
    }

    const examId = req.body?.examId;
    const examQuery =
      examId && mongoose.Types.ObjectId.isValid(examId)
        ? { _id: examId, 'questions._id': questionId }
        : { 'questions._id': questionId };

    const exam = await Exam.findOne(examQuery);
    if (!exam) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const bookmark = await QuestionBookmark.findOneAndUpdate(
      { user: req.user.id, questionId },
      { user: req.user.id, exam: exam._id, questionId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      message: 'Question bookmarked',
      bookmark: {
        id: bookmark._id,
        questionId: bookmark.questionId,
        examId: bookmark.exam
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function removeBookmark(req, res, next) {
  try {
    const questionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid question id' });
    }

    const deleted = await QuestionBookmark.findOneAndDelete({ user: req.user.id, questionId });

    if (!deleted) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    return res.json({ message: 'Bookmark removed' });
  } catch (error) {
    return next(error);
  }
}

export async function getBookmarkedQuestions(req, res, next) {
  try {
    const bookmarks = await QuestionBookmark.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();

    if (bookmarks.length === 0) {
      return res.json([]);
    }

    const examIds = [...new Set(bookmarks.map((b) => String(b.exam)))];
    const exams = await Exam.find({ _id: { $in: examIds } });
    const examMap = new Map(exams.map((exam) => [String(exam._id), exam]));

    const questions = bookmarks
      .map((bookmark) => {
        const exam = examMap.get(String(bookmark.exam));
        if (!exam) {
          return null;
        }

        const question = exam.questions.id(bookmark.questionId);
        if (!question) {
          return null;
        }

        return {
          bookmarkId: bookmark._id,
          bookmarkedAt: bookmark.createdAt,
          ...toQuestionView(exam, question, false)
        };
      })
      .filter(Boolean);

    return res.json(questions);
  } catch (error) {
    return next(error);
  }
}
