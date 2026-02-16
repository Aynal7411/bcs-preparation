import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { sendEmail } from '../services/emailService.js';
import { generateToken, generateRefreshToken } from '../utils/generateToken.js';

const resetTokenStore = new Map();
const fixedAdminEmail = env.adminEmail?.trim().toLowerCase();

function isReservedAdminEmail(email) {
  return Boolean(email) && email === fixedAdminEmail;
}

function setAuthCookies(res, payload) {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : undefined;
}

function normalizePhone(phone) {
  return phone ? phone.trim() : undefined;
}

function buildUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage || null
  };
}

function buildIdentifierQuery(email, phone) {
  const clauses = [];

  if (email) {
    clauses.push({ email });
  }

  if (phone) {
    clauses.push({ phone });
  }

  if (clauses.length === 0) {
    return null;
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

async function sendPasswordResetEmail({ email, resetLink }) {
  try {
    await sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 15 minutes.</p>`
    });
    return true;
  } catch (error) {
    console.warn(`Password reset email delivery failed for ${email}: ${error.message}`);
    return false;
  }
}

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, examTargets = [] } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (isReservedAdminEmail(normalizedEmail)) {
      return res.status(403).json({ message: 'This email is reserved for admin login' });
    }

    const existingQuery = buildIdentifierQuery(normalizedEmail, normalizedPhone);
    const existing = await User.findOne(existingQuery);

    if (existing) {
      return res.status(409).json({ message: 'Email or phone already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashed,
      examTargets
    });

    setAuthCookies(res, { id: user._id, role: user.role, email: user.email });

    return res.status(201).json({
      user: buildUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyOtp(req, res, next) {
  return res.status(410).json({ message: 'OTP verification is disabled. Registration is now direct.' });
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    const user = await User.findOne(buildIdentifierQuery(normalizedEmail, normalizedPhone));
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    setAuthCookies(res, { id: user._id, role: user.role, email: user.email });

    return res.json({
      user: buildUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function adminLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!fixedAdminEmail || !env.adminPassword) {
      return res.status(500).json({ message: 'Admin credentials are not configured' });
    }

    const isFixedAdminIdentity = normalizedEmail === fixedAdminEmail;
    const isFixedAdminPassword = password === env.adminPassword;

    if (!isFixedAdminIdentity || !isFixedAdminPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    let user = await User.findOne({ email: fixedAdminEmail });

    if (!user) {
      const hashed = await bcrypt.hash(env.adminPassword, 10);
      user = await User.create({
        name: 'Admin',
        email: fixedAdminEmail,
        password: hashed,
        role: 'admin',
        phone: normalizedPhone
      });
    } else {
      const updates = {};
      if (user.role !== 'admin') {
        updates.role = 'admin';
      }

      const passwordMatches = await bcrypt.compare(env.adminPassword, user.password);
      if (!passwordMatches) {
        updates.password = await bcrypt.hash(env.adminPassword, 10);
      }

      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true, runValidators: true });
      }
    }

    setAuthCookies(res, { id: user._id, role: user.role, email: user.email });

    return res.json({
      user: buildUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (isReservedAdminEmail(normalizedEmail)) {
      return res.status(403).json({ message: 'This email is reserved for admin login' });
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      user = await User.create({ name, email: normalizedEmail, password: hashed, role: 'student' });
    }

    setAuthCookies(res, { id: user._id, role: user.role, email: user.email });

    return res.json({ user: buildUserResponse(user) });
  } catch (error) {
    return next(error);
  }
}

export function refreshToken(req, res) {
  const tokenFromCookie = req.cookies.refreshToken;
  const tokenFromBody = req.body?.refreshToken;
  const incomingToken = tokenFromCookie || tokenFromBody;

  if (!incomingToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    const payload = jwt.verify(incomingToken, env.refreshJwtSecret || env.jwtSecret);
    const newAccessToken = generateToken({ id: payload.id, role: payload.role, email: payload.email });

    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ message: 'Token refreshed' });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ message: 'If that account exists, a reset link has been sent' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    resetTokenStore.set(tokenHash, {
      userId: user._id.toString(),
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    const resetLink = `${env.clientUrl}/reset-password?token=${rawToken}`;
    const delivered = await sendPasswordResetEmail({ email: normalizedEmail, resetLink });

    const response = { message: 'If that account exists, a reset link has been sent' };

    if (env.nodeEnv !== 'production') {
      response.resetToken = rawToken;
      response.resetLink = resetLink;
      response.emailDelivery = delivered;
    }

    return res.json(response);
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRecord = resetTokenStore.get(tokenHash);

    if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user) {
      resetTokenStore.delete(tokenHash);
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    resetTokenStore.delete(tokenHash);

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    return next(error);
  }
}

export function logout(req, res) {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out' });
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    return next(error);
  }
}
