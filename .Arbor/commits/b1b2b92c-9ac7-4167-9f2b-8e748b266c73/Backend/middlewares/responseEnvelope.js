/**
 * Standard Success Response Format
 * { success: true, message: String, data: Object/Array, meta: Object }
 */
export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = undefined) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

/**
 * Standard Error Keys Pre-populated
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  SLOT_CONFLICT: 'SLOT_CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};

/**
 * Custom AppError class to capture standardized api exceptions
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = []) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware to decorate res object with utility helpers (optional, but highly useful)
export const responseFormatterMiddleware = (req, res, next) => {
  res.success = (data, message, meta) => sendSuccess(res, data, message, 200, meta);
  res.created = (data, message, meta) => sendSuccess(res, data, message, 201, meta);
  next();
};
