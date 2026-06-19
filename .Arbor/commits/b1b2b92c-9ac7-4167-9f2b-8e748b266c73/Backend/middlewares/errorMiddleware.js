import { ERROR_CODES, AppError } from './responseEnvelope.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || [];

  // Mongoose validation error handling
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
  }

  // Mongoose duplicate key error (Cast or unique index)
  if (err.code === 11000) {
    statusCode = 409;
    code = ERROR_CODES.SLOT_CONFLICT;
    message = 'Resource conflict or duplicate key error';
    details = [
      {
        message: 'A resource with these values already exists.',
        keyValue: err.keyValue,
      },
    ];
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = ERROR_CODES.BAD_REQUEST;
    message = `Invalid format for field ${err.path}`;
    details = [
      {
        field: err.path,
        message: `Value '${err.value}' is not valid`,
      },
    ];
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};
