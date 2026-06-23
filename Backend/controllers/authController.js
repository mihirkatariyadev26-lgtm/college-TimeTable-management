import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendSuccess, AppError, ERROR_CODES } from '../middlewares/responseEnvelope.js';

// Helper to generate access tokens (short-lived)
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      semester: user.semester,
      division: user.division,
    },
    process.env.JWT_SECRET || 'default_secret_key_for_development',
    { expiresIn: '7d' }
  );
};

// Helper to generate refresh tokens (long-lived)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_for_development',
    { expiresIn: '7d' }
  );
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, subjectsTaught, semester, division } = req.body;

    // Email duplication check
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError(ERROR_CODES.SLOT_CONFLICT, 'Email is already registered', 400));
    }

    // Role-specific manual validation
    if (role === 'Teacher') {
      if (!subjectsTaught || !Array.isArray(subjectsTaught) || subjectsTaught.length === 0) {
        return next(
          new AppError(
            ERROR_CODES.VALIDATION_ERROR,
            'subjectsTaught is required and must be a non-empty array for Teachers',
            400
          )
        );
      }
    } else if (role === 'Student') {
      if (semester === undefined || semester === null || !division) {
        return next(
          new AppError(
            ERROR_CODES.VALIDATION_ERROR,
            'semester and division are required for Students',
            400
          )
        );
      }
    }

    // Create the user (password is auto-hashed in schema pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
      subjectsTaught,
      semester,
      division,
    });

    const data = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subjectsTaught: user.subjectsTaught,
      semester: user.semester,
      division: user.division,
    };

    return sendSuccess(res, data, 'User registered successfully', 201);
  } catch (error) {
    return next(error);
  }
};

export const bulkRegisterUsers = async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return next(new AppError(ERROR_CODES.VALIDATION_ERROR, '`users` must be a non-empty array', 400));
    }

    const successCount = [];
    const failedRows   = [];

    for (let i = 0; i < users.length; i++) {
      const row = users[i];
      const rowNum = i + 1;
      const { name, email, password, role, subjectsTaught, semester, division } = row;

      // ── Required base fields ──────────────────────────────────
      if (!name || !email || !password || !role) {
        failedRows.push({ row: rowNum, email: email ?? '—', reason: 'Missing required field(s): name, email, password, or role' });
        continue;
      }

      if (!['Admin', 'Teacher', 'Student'].includes(role)) {
        failedRows.push({ row: rowNum, email, reason: `Invalid role "${role}". Must be Admin, Teacher, or Student` });
        continue;
      }

      // ── Role-specific validation ──────────────────────────────
      if (role === 'Teacher') {
        const subjects = typeof subjectsTaught === 'string'
          ? subjectsTaught.split(';').map(s => s.trim()).filter(Boolean)
          : subjectsTaught;
        if (!Array.isArray(subjects) || subjects.length === 0) {
          failedRows.push({ row: rowNum, email, reason: 'Teachers require a non-empty subjectsTaught list' });
          continue;
        }
        row.subjectsTaught = subjects;
      }

      if (role === 'Student') {
        const sem = parseInt(semester, 10);
        if (!Number.isFinite(sem) || !division) {
          failedRows.push({ row: rowNum, email, reason: 'Students require a valid numeric semester and a division' });
          continue;
        }
        row.semester = sem;
      }

      // ── Duplicate check ───────────────────────────────────────
      try {
        const existing = await User.findOne({ email });
        if (existing) {
          failedRows.push({ row: rowNum, email, reason: 'Email is already registered' });
          continue;
        }

        await User.create({
          name: row.name,
          email: row.email,
          password: row.password,
          role: row.role,
          subjectsTaught: row.subjectsTaught,
          semester: row.semester,
          division: row.division,
        });

        successCount.push(email);
      } catch (err) {
        // Catch Mongoose validation or duplicate key errors per-row
        const reason = err.code === 11000
          ? 'Email is already registered (duplicate key)'
          : (err.message ?? 'Unknown error during user creation');
        failedRows.push({ row: rowNum, email, reason });
      }
    }

    // Always 200 — partial success is still a valid response so the admin
    // can inspect the summary table and fix only the failed rows.
    return res.status(200).json({
      success: true,
      message: `Bulk registration complete. ${successCount.length} succeeded, ${failedRows.length} failed.`,
      data: {
        totalSubmitted: users.length,
        successCount:   successCount.length,
        failedRows,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Please provide email and password', 400));
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return next(new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', 401));
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const data = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester,
        division: user.division,
      },
      accessToken,
      refreshToken,
    };

    return sendSuccess(res, data, 'Login successful');
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    // req.user is already populated by protect middleware, but we return fresh data from db
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404));
    }
    return sendSuccess(res, user, 'User profile fetched successfully');
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Refresh token is required', 400));
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_for_development'
      );

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'User associated with token not found', 401));
      }

      const newAccessToken = generateAccessToken(user);

      return sendSuccess(res, { accessToken: newAccessToken }, 'Access token refreshed successfully');
    } catch (err) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired refresh token', 401));
    }
  } catch (error) {
    return next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ name: 1 });
    return sendSuccess(res, users, 'Users fetched successfully');
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    // For stateless JWT, client deletes the token.
    // We can also blacklist or send a success response instructing token deletion.
    return sendSuccess(res, null, 'Logged out successfully. Please delete your tokens.');
  } catch (error) {
    return next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'You cannot delete your own account', 400));
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404));
    }

    await userToDelete.deleteOne();

    return sendSuccess(res, null, 'User deleted successfully', 200);
  } catch (error) {
    return next(error);
  }
};
