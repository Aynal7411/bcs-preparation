/**
 * CORS Configuration
 * Restricts cross-origin requests to authorized domains
 */

import { env } from './env.js';

export function getCorsOptions() {
  const isProduction = env.nodeEnv === 'production';

  return {
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (env.clientUrls && env.clientUrls.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow all origins for easier testing
      if (!isProduction) {
        console.warn(`⚠️  Allowing CORS for origin: ${origin} (development mode)`);
        return callback(null, true);
      }

      // In production, reject unknown origins
      const error = new Error(`CORS policy: origin '${origin}' is not allowed`);
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  };
}
