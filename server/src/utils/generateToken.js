import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function generateToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpire });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, env.refreshJwtSecret || env.jwtSecret, {
    expiresIn: env.refreshJwtExpire || '30d'
  });
}
