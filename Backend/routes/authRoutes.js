import express from 'express';
import {
  registerUser,
  bulkRegisterUsers,
  loginUser,
  getMe,
  listUsers,
  refreshToken,
  logoutUser,
  deleteUser,
} from '../controllers/authController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);

// Protected routes (Admin only)
router.post('/register',      protect, checkRole('Admin'), registerUser);
router.post('/register/bulk', protect, checkRole('Admin'), bulkRegisterUsers);
router.get('/users',          protect, checkRole('Admin'), listUsers);
router.delete('/user/:id',    protect, checkRole('Admin'), deleteUser);

// Protected routes (all authenticated)
router.get('/me',             protect, getMe);
router.post('/logout',        protect, logoutUser);

export default router;
