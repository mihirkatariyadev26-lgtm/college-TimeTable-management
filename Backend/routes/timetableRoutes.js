import express from 'express';
import {
  createTimetableSlot,
  viewTimetable,
  getTeacherTimetable,
  updateTimetableSlot,
  deleteTimetableSlot,
} from '../controllers/timetableController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. POST /api/timetable/create (Protected: Admin Only)
router.post('/create', protect, checkRole('Admin'), createTimetableSlot);

// 2. GET /api/timetable/view (Protected: All Authenticated Users)
router.get('/view', protect, viewTimetable);

// 3. GET /api/timetable/teacher/:teacherId (Protected: Teachers & Admins Only)
router.get('/teacher/:teacherId', protect, checkRole('Teacher', 'Admin'), getTeacherTimetable);

// 4. PUT /api/timetable/update/:id (Protected: Admin Only)
router.put('/update/:id', protect, checkRole('Admin'), updateTimetableSlot);

// 5. DELETE /api/timetable/delete/:id (Protected: Admin Only)
router.delete('/delete/:id', protect, checkRole('Admin'), deleteTimetableSlot);

export default router;
