import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError, ERROR_CODES } from './responseEnvelope.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Not authorized, token missing', 401));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key_for_development');
      
      // Get user from the token, excluding password
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'User associated with token not found', 401));
      }

      req.user = user;
      next();
    } catch (err) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Not authorized, token invalid or expired', 401));
    }
  } catch (error) {
    next(error);
  }
};

export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          ERROR_CODES.FORBIDDEN,
          `Role '${req.user.role}' is not authorized to access this resource`,
          403
        )
      );
    }
    next();
  };
};
