/**
 * Request ID middleware
 * Adds unique request ID to each request for tracing
 */

export function requestIdMiddleware(req, res, next) {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}
