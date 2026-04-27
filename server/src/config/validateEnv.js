/**
 * Environment variable validation
 * Ensures all required secrets and configurations are present in production
 */

export function validateEnv(env) {
  const errors = [];

  // Critical secrets that should NEVER have defaults in production
  if (env.nodeEnv === 'production') {
    if (!env.jwtSecret || env.jwtSecret === 'replace-with-strong-secret') {
      errors.push('JWT_SECRET must be set in production and cannot be the default value');
    }
    if (!env.refreshJwtSecret || env.refreshJwtSecret === 'replace-with-strong-secret') {
      errors.push('REFRESH_JWT_SECRET must be set in production and cannot be the default value');
    }
    if (!env.mongodbUri || env.mongodbUri.includes('127.0.0.1')) {
      errors.push('MONGODB_URI must point to a remote database in production');
    }
    if (!env.adminEmail || !env.adminPassword) {
      errors.push('ADMIN_EMAIL and ADMIN_PASSWORD must be set in production');
    }
  }

  // Validate secret strength (minimum 32 characters for JWTs)
  if (env.jwtSecret && env.jwtSecret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long (consider using a strong random string)');
  }
  if (env.refreshJwtSecret && env.refreshJwtSecret.length < 32) {
    errors.push('REFRESH_JWT_SECRET should be at least 32 characters long (consider using a strong random string)');
  }

  // Validate mongo connection string format
  if (env.mongodbUri && !env.mongodbUri.startsWith('mongodb')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Validate token expiry format
  if (env.jwtExpire && !['1d', '7d', '30d', '90d'].includes(env.jwtExpire)) {
    errors.push('JWT_EXPIRE should be in format like "7d", "24h", etc.');
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Errors:\n');
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error('\n');
    if (env.nodeEnv === 'production') {
      throw new Error(`Environment validation failed. Please fix ${errors.length} issue(s).`);
    }
  }

  return errors.length === 0;
}
