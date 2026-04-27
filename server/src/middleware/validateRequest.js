/**
 * Validation middleware
 * Catches validation errors from express-validator and passes to error handler
 */

import { validationResult } from 'express-validator';
import { ValidationErrorArray } from '../utils/customErrors.js';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return next(new ValidationErrorArray(errors.array()));
  }
  
  next();
}

/**
 * Extract validated data from request
 */
export function getValidatedData(req, fields) {
  const data = {};
  fields.forEach(field => {
    if (req.body.hasOwnProperty(field)) {
      data[field] = req.body[field];
    }
  });
  return data;
}
