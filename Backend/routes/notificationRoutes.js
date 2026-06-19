import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. GET /api/notifications (Protected: All Users)
router.get('/', protect, getNotifications);

// 2. PATCH|PUT /api/notifications/read-all - MUST sit before :id/read
router.patch('/read-all', protect, markAllAsRead);
router.put('/read-all', protect, markAllAsRead);

// 3. PATCH|PUT /api/notifications/:id/read
router.patch('/:id/read', protect, markAsRead);
router.put('/:id/read', protect, markAsRead);

export default router;
