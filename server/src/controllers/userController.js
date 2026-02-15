import { validationResult } from 'express-validator';
import Exam from '../models/Exam.js';
import JobCircular from '../models/JobCircular.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { uploadToCloudinary } from '../services/uploadService.js';

function mapPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    bio: user.bio,
    examTargets: user.examTargets,
    role: user.role,
    profileImage: user.profileImage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function profileCompletion(user) {
  const checks = [
    Boolean(user.name),
    Boolean(user.phone),
    Boolean(user.bio),
    Array.isArray(user.examTargets) && user.examTargets.length > 0,
    Boolean(user.profileImage?.url)
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

function stableProgressValue(seed) {
  const chars = [...seed];
  const sum = chars.reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 25 + (sum % 66);
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(mapPublicUser(user));
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, phone, bio, examTargets } = req.body;

    if (name !== undefined) {
      user.name = name;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (bio !== undefined) {
      user.bio = bio;
    }

    if (examTargets !== undefined) {
      user.examTargets = examTargets;
    }

    await user.save();

    return res.json({
      message: 'Profile updated successfully',
      profile: mapPublicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUserStats(req, res, next) {
  try {
    const [user, totalExams, activeJobs] = await Promise.all([
      User.findById(req.user.id).select('-password'),
      Exam.countDocuments(),
      JobCircular.countDocuments({ isPublished: true })
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const joinedDaysAgo = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    return res.json({
      examsTargeted: user.examTargets.length,
      profileCompletion: profileCompletion(user),
      availableExams: totalExams,
      activeJobCirculars: activeJobs,
      joinedDaysAgo
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLearningProgress(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targets = user.examTargets || [];
    const progressByTarget = targets.map((target) => ({
      target,
      progressPercent: stableProgressValue(`${user._id}-${target}`)
    }));

    const overallProgress =
      progressByTarget.length === 0
        ? 0
        : Math.round(progressByTarget.reduce((acc, item) => acc + item.progressPercent, 0) / progressByTarget.length);

    return res.json({
      overallProgress,
      progressByTarget,
      streakDays: Math.min(30, Math.max(0, Math.floor(overallProgress / 4)))
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAchievements(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const completion = profileCompletion(user);
    const targetsCount = user.examTargets.length;

    const achievements = [
      {
        key: 'profile-starter',
        title: 'Profile Starter',
        description: 'Added basic account information',
        unlocked: completion >= 40
      },
      {
        key: 'focused-learner',
        title: 'Focused Learner',
        description: 'Selected at least one exam target',
        unlocked: targetsCount >= 1
      },
      {
        key: 'exam-hunter',
        title: 'Exam Hunter',
        description: 'Tracking three or more exam targets',
        unlocked: targetsCount >= 3
      },
      {
        key: 'identity-complete',
        title: 'Identity Complete',
        description: 'Uploaded a profile image and completed profile',
        unlocked: completion >= 100
      }
    ];

    return res.json({
      totalUnlocked: achievements.filter((a) => a.unlocked).length,
      achievements
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadProfileImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required (field name: image)' });
    }

    if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
      return res.status(400).json({ message: 'Cloudinary is not configured' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, 'job-prep/profile-images');

    user.profileImage = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      uploadedAt: new Date()
    };

    await user.save();

    return res.json({
      message: 'Profile image uploaded successfully',
      profileImage: user.profileImage
    });
  } catch (error) {
    return next(error);
  }
}
