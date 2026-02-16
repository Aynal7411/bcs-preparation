import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/job_prep',
  clientUrl: process.env.CLIENT_URL || 'https://bcs-prep.netlify.app',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@jobprep.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  jwtSecret: process.env.JWT_SECRET || 'replace-with-strong-secret',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  refreshJwtSecret: process.env.REFRESH_JWT_SECRET || process.env.JWT_SECRET || 'replace-with-strong-secret',
  refreshJwtExpire: process.env.REFRESH_JWT_EXPIRE || '30d',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
};
