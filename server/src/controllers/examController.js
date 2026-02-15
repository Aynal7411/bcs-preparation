import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';

function getValidationErrorResponse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }

  return false;
}

function toQuestionPayload(question, includeCorrect = false) {
  const base = {
    id: question._id,
    questionText: question.questionText,
    options: question.options,
    explanation: question.explanation || ''
  };

  if (includeCorrect) {
    base.correctOptionIndex = question.correctOptionIndex;
  }

  return base;
}

export async function getFeaturedExams(req, res, next) {
  try {
    const exams = await Exam.find({ isFeatured: true }).sort({ examDate: 1 }).limit(10);
    return res.json(exams);
  } catch (error) {
    return next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    if (getValidationErrorResponse(req, res)) {
      return;
    }

    const exam = await Exam.create(req.body);
    return res.status(201).json(exam);
  } catch (error) {
    return next(error);
  }
}

export async function listExams(req, res, next) {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    return res.json(exams);
  } catch (error) {
    return next(error);
  }
}

export async function getExamDetails(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    return res.json({
      id: exam._id,
      title: exam.title,
      category: exam.category,
      totalMarks: exam.totalMarks,
      durationMinutes: exam.durationMinutes,
      examDate: exam.examDate,
      isFeatured: exam.isFeatured,
      enrolledStudents: exam.enrolledStudents,
      questionCount: exam.questions.length,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExamQuestions(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    return res.json({
      examId: exam._id,
      title: exam.title,
      totalQuestions: exam.questions.length,
      questions: exam.questions.map((q) => toQuestionPayload(q, false))
    });
  } catch (error) {
    return next(error);
  }
}

export async function startExam(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const existing = await ExamResult.findOne({
      exam: exam._id,
      user: req.user.id,
      status: 'in_progress'
    });

    if (existing) {
      return res.json({
        message: 'Exam already started',
        resultId: existing._id,
        startedAt: existing.startedAt,
        status: existing.status
      });
    }

    const result = await ExamResult.create({
      exam: exam._id,
      user: req.user.id,
      status: 'in_progress',
      startedAt: new Date(),
      totalQuestions: exam.questions.length
    });

    await Exam.updateOne({ _id: exam._id }, { $inc: { enrolledStudents: 1 } });

    return res.status(201).json({
      message: 'Exam started successfully',
      resultId: result._id,
      startedAt: result.startedAt,
      status: result.status
    });
  } catch (error) {
    return next(error);
  }
}

export async function submitExam(req, res, next) {
  try {
    if (getValidationErrorResponse(req, res)) {
      return;
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const { answers = [] } = req.body;

    const inProgressResult = await ExamResult.findOne({
      exam: exam._id,
      user: req.user.id,
      status: 'in_progress'
    }).sort({ createdAt: -1 });

    if (!inProgressResult) {
      return res.status(400).json({ message: 'No active exam session found. Start the exam first.' });
    }

    const questionMap = new Map(exam.questions.map((q) => [String(q._id), q]));

    const evaluatedAnswers = [];
    let correctAnswers = 0;

    for (const answer of answers) {
      const question = questionMap.get(String(answer.questionId));
      if (!question) {
        continue;
      }

      const selectedOptionIndex = Number(answer.selectedOptionIndex);
      const isCorrect = selectedOptionIndex === question.correctOptionIndex;
      if (isCorrect) {
        correctAnswers += 1;
      }

      evaluatedAnswers.push({
        questionId: question._id,
        selectedOptionIndex,
        isCorrect
      });
    }

    const attemptedQuestions = evaluatedAnswers.length;
    const totalQuestions = exam.questions.length;
    const percentage = totalQuestions === 0 ? 0 : Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
    const score = Number(((percentage / 100) * exam.totalMarks).toFixed(2));
    const submittedAt = new Date();

    const timeTakenSeconds = Math.max(
      0,
      Math.floor((submittedAt.getTime() - new Date(inProgressResult.startedAt).getTime()) / 1000)
    );

    inProgressResult.answers = evaluatedAnswers;
    inProgressResult.status = 'submitted';
    inProgressResult.submittedAt = submittedAt;
    inProgressResult.totalQuestions = totalQuestions;
    inProgressResult.attemptedQuestions = attemptedQuestions;
    inProgressResult.correctAnswers = correctAnswers;
    inProgressResult.score = score;
    inProgressResult.percentage = percentage;
    inProgressResult.timeTakenSeconds = timeTakenSeconds;

    await inProgressResult.save();

    return res.json({
      message: 'Exam submitted successfully',
      result: {
        id: inProgressResult._id,
        examId: exam._id,
        status: inProgressResult.status,
        totalQuestions,
        attemptedQuestions,
        correctAnswers,
        score,
        percentage,
        timeTakenSeconds,
        submittedAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyResults(req, res, next) {
  try {
    const results = await ExamResult.find({ user: req.user.id, status: 'submitted' })
      .populate('exam', 'title category totalMarks examDate')
      .sort({ submittedAt: -1 });

    return res.json(
      results.map((result) => ({
        id: result._id,
        exam: result.exam,
        attemptedQuestions: result.attemptedQuestions,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        score: result.score,
        percentage: result.percentage,
        timeTakenSeconds: result.timeTakenSeconds,
        submittedAt: result.submittedAt
      }))
    );
  } catch (error) {
    return next(error);
  }
}

export async function getResultDetails(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid result id' });
    }

    const result = await ExamResult.findOne({ _id: req.params.id, user: req.user.id }).populate('exam');

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    const examQuestionMap = new Map((result.exam?.questions || []).map((q) => [String(q._id), q]));

    const answerDetails = result.answers.map((answer) => {
      const question = examQuestionMap.get(String(answer.questionId));
      return {
        questionId: answer.questionId,
        questionText: question?.questionText,
        options: question?.options || [],
        selectedOptionIndex: answer.selectedOptionIndex,
        correctOptionIndex: question?.correctOptionIndex,
        isCorrect: answer.isCorrect,
        explanation: question?.explanation || ''
      };
    });

    return res.json({
      id: result._id,
      status: result.status,
      exam: {
        id: result.exam?._id,
        title: result.exam?.title,
        category: result.exam?.category,
        totalMarks: result.exam?.totalMarks,
        durationMinutes: result.exam?.durationMinutes,
        examDate: result.exam?.examDate
      },
      attemptedQuestions: result.attemptedQuestions,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      score: result.score,
      percentage: result.percentage,
      timeTakenSeconds: result.timeTakenSeconds,
      startedAt: result.startedAt,
      submittedAt: result.submittedAt,
      answers: answerDetails
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExamLeaderboard(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.id).select('title category totalMarks');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const leaderboard = await ExamResult.find({ exam: req.params.id, status: 'submitted' })
      .populate('user', 'name')
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .limit(50);

    return res.json({
      exam,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        resultId: entry._id,
        userId: entry.user?._id,
        name: entry.user?.name || 'Unknown',
        score: entry.score,
        percentage: entry.percentage,
        correctAnswers: entry.correctAnswers,
        totalQuestions: entry.totalQuestions,
        timeTakenSeconds: entry.timeTakenSeconds,
        submittedAt: entry.submittedAt
      }))
    });
  } catch (error) {
    return next(error);
  }
}
