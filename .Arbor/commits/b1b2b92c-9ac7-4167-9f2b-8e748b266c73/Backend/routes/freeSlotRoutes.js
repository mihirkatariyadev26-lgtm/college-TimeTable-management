import express from 'express';
import {
  declareFreeSlot,
  getFreeSlots,
  claimFreeSlot,
  revokeFreeSlot,
} from '../controllers/freeSlotController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. POST /api/free-slots/declare (Protected: Teachers Only)
router.post('/declare', protect, checkRole('Teacher'), declareFreeSlot);

// 2. GET /api/free-slots (Protected: Teachers and Admins)
router.get('/', protect, checkRole('Teacher', 'Admin'), getFreeSlots);

// 3. POST /api/free-slots/:exceptionId/claim (Protected: Teachers Only)
router.post('/:exceptionId/claim', protect, checkRole('Teacher'), claimFreeSlot);

// 4. DELETE /api/free-slots/:exceptionId/revoke (Protected: Teachers Only)
router.delete('/:exceptionId/revoke', protect, checkRole('Teacher'), revokeFreeSlot);

export default router;
