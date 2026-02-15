import JobCircular from '../models/JobCircular.js';

export async function getLatestJobs(req, res, next) {
  try {
    const jobs = await JobCircular.find({ isPublished: true }).sort({ createdAt: -1 }).limit(20);
    return res.json(jobs);
  } catch (error) {
    return next(error);
  }
}

export async function createJob(req, res, next) {
  try {
    const job = await JobCircular.create(req.body);
    return res.status(201).json(job);
  } catch (error) {
    return next(error);
  }
}
