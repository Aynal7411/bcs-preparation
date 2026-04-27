import { env } from '../config/env.js';

/**
 * Central error handler middleware
 * Catches all errors and formats them consistently
 */
export function errorHandler(err, req, res, next) {
  const isDevelopment = env.nodeEnv === 'development';
  const requestId = req.id || generateRequestId();
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    // MongoDB cast errors
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = `Invalid ID format: ${err.value}`;
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid or expired token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // Log error
  logError({
    requestId,
    statusCode,
    errorCode,
    message,
    path: req.path,
    method: req.method,
    userId: req.user?.id || null,
    stack: isDevelopment ? err.stack : undefined,
    fullError: isDevelopment ? err : undefined
  });

  // Build error response
  const errorResponse = {
    success: false,
    errorCode,
    message,
    requestId,
    ...(isDevelopment && { stack: err.stack })
  };

  // Include validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    errorResponse.errors = err.errors.map(e => ({
      field: e.param || e.field,
      message: e.msg || e.message
    }));
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async route wrapper to catch errors and pass to error handler
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log errors with proper formatting
 */
function logError({ requestId, statusCode, errorCode, message, path, method, userId, stack, fullError }) {
  const timestamp = new Date().toISOString();
  const isServerError = statusCode >= 500;
  const logLevel = isServerError ? 'ERROR' : 'WARN';

  const logEntry = {
    timestamp,
    level: logLevel,
    requestId,
    method,
    path,
    statusCode,
    errorCode,
    message,
    userId,
    ...(stack && { stack }),
    ...(fullError && { error: fullError.toString() })
  };

  // Color code for terminal output (dev only)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const color = isServerError ? '\x1b[31m' : '\x1b[33m'; // Red for 5xx, Yellow for others
    const reset = '\x1b[0m';
    console.error(`${color}[${logLevel}] ${timestamp} (${requestId})${reset}`);
    console.error(`  ${method} ${path}`);
    console.error(`  Status: ${statusCode}, Code: ${errorCode}`);
    console.error(`  Message: ${message}`);
    if (userId) console.error(`  User: ${userId}`);
    if (stack) console.error(`  Stack: ${stack}`);
  } else {
    // Production: use JSON for logging services
    console.error(JSON.stringify(logEntry));
  }
}

/**
 * Express error handler for 404 routes (must be after all routes)
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    errorCode: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`,
    requestId: req.id || generateRequestId()
  });
}
