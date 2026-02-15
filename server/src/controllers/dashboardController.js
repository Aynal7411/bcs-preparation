import Exam from '../models/Exam.js';
import JobCircular from '../models/JobCircular.js';
import User from '../models/User.js';

export async function getDashboardStats(req, res, next) {
  try {
    const [totalStudents, totalExams, newJobs] = await Promise.all([
      User.countDocuments(),
      Exam.countDocuments(),
      JobCircular.countDocuments({ isPublished: true })
    ]);

    const stats = {
      totalStudents,
      totalExams,
      passingRate: 78,
      todayTests: 124,
      activeMentors: 32,
      newJobs
    };

    return res.json(stats);
  } catch (error) {
    return next(error);
  }
}
