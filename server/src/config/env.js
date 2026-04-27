import dotenv from 'dotenv';
import { validateEnv as validateEnvironment } from './validateEnv.js';

dotenv.config();

function parseClientUrls() {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';
  const parsed = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (parsed.length > 0) {
    return parsed;
  }

  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  return isDev ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : [];
}

const clientUrls = parseClientUrls();
const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = nodeEnv === 'development';

export const env = {
  nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || (isDev ? 'mongodb://127.0.0.1:27017/job_prep' : undefined),
  clientUrl: clientUrls[0] || undefined,
  clientUrls,
  adminEmail: process.env.ADMIN_EMAIL || undefined,
  adminPassword: process.env.ADMIN_PASSWORD || undefined,
  jwtSecret: process.env.JWT_SECRET || (isDev ? 'dev-secret-key-change-in-production' : undefined),
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  refreshJwtSecret: process.env.REFRESH_JWT_SECRET || process.env.JWT_SECRET || (isDev ? 'dev-refresh-secret-change-in-production' : undefined),
  refreshJwtExpire: process.env.REFRESH_JWT_EXPIRE || '30d',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || undefined,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || undefined,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || undefined
};

// Validate environment variables
validateEnvironment(env);
