import express from 'express';
import {
  createSwapRequest,
  respondToSwapRequest,
  getPendingSwaps,
  getSwapsHistory,
} from '../controllers/swapController.js';
import { protect, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. POST /api/swaps (Protected: Teachers Only)
router.post('/', protect, checkRole('Teacher'), createSwapRequest);

// 2. POST /api/swaps/:swapId/respond (Protected: Teachers Only)
router.post('/:swapId/respond', protect, checkRole('Teacher'), respondToSwapRequest);

// 3. GET /api/swaps/pending (Protected: Teachers and Admins Only)
router.get('/pending', protect, checkRole('Teacher', 'Admin'), getPendingSwaps);

// 4. GET /api/swaps/history (Protected: Teachers and Admins Only)
router.get('/history', protect, checkRole('Teacher', 'Admin'), getSwapsHistory);

export default router;
