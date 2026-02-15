import Exam from '../models/Exam.js';
import JobCircular from '../models/JobCircular.js';
import Testimonial from '../models/Testimonial.js';
import User from '../models/User.js';

export async function getHomeSummary(req, res, next) {
  try {
    const [totalStudents, totalExams, featuredExams, jobs, testimonials] = await Promise.all([
      User.countDocuments(),
      Exam.countDocuments(),
      Exam.find({ isFeatured: true }).sort({ examDate: 1 }).limit(8),
      JobCircular.find({ isPublished: true }).sort({ createdAt: -1 }).limit(10),
      Testimonial.find().sort({ createdAt: -1 }).limit(6)
    ]);

    return res.json({
      hero: {
        totalStudents,
        totalExams,
        passingRate: 78
      },
      featuredExams,
      jobs,
      testimonials
    });
  } catch (error) {
    return next(error);
  }
}
