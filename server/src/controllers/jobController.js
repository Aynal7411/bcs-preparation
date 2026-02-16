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

export async function updateJob(req, res, next) {
  try {
    const job = await JobCircular.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json(job);
  } catch (error) {
    return next(error);
  }
}

export async function deleteJob(req, res, next) {
  try {
    const job = await JobCircular.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

export async function getJobById(req, res, next) {
  try {
    const job = await JobCircular.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json(job);
  } catch (error) {
    return next(error);
  }
}

export async function getAllJobs(req, res, next) {
  try {
    const jobs = await JobCircular.find().sort({ createdAt: -1 });
    return res.json(jobs);
  } catch (error) {
    return next(error);
  }
}

export async function getPublishedJobs(req, res, next) {
  try {
    const jobs = await JobCircular.find({ isPublished: true }).sort({ createdAt: -1 });
    return res.json(jobs);
  } catch (error) {
    return next(error);
  }
}

export async function toggleJobPublish(req, res, next) {
  try {
    const job = await JobCircular.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    job.isPublished = !job.isPublished;
    await job.save();
    return res.json(job);
  } catch (error) {
    return next(error);
  }
}


