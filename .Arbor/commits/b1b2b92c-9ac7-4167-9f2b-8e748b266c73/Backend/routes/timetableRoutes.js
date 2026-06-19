import express from 'express';
import {
  createTimetableSlot,
  viewTimetable,
  getTeacherTimetable,
} from '../controllers/timetableController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. POST /api/timetable/create (Protected: Admin Only)
router.post('/create', protect, checkRole('Admin'), createTimetableSlot);

// 2. GET /api/timetable/view (Protected: All Authenticated Users)
router.get('/view', protect, viewTimetable);

// 3. GET /api/timetable/teacher/:teacherId (Protected: Teachers & Admins Only)
router.get('/teacher/:teacherId', protect, checkRole('Teacher', 'Admin'), getTeacherTimetable);

export default router;
