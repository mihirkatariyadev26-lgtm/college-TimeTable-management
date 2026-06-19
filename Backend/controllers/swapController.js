import mongoose from 'mongoose';
import SwapRequest from '../models/SwapRequest.js';
import MasterTimetable from '../models/MasterTimetable.js';
import ScheduleException from '../models/ScheduleException.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { emitToRoom } from '../config/socket.js';
import { sendSuccess, AppError, ERROR_CODES } from '../middlewares/responseEnvelope.js';

/**
 * Helper to check if a teacher is occupied during a specific slot on a date
 */
const isTeacherBusy = async (teacherId, date, slotNumber, dayOfWeek) => {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Check exceptions on this date and slotNumber
  const exception = await ScheduleException.findOne({
    date: { $gte: startOfDay, $lte: endOfDay },
    slotNumber,
  });

  if (exception) {
    // If there is an exception for this slot on this date:
    // Is the teacher assigned to it?
    if (!exception.isFreeLecture && exception.assignedTeacherId.toString() === teacherId.toString()) {
      return exception._id; // Teacher is teaching this exception class
    }
    // Was this teacher the original teacher, and is now reassigned/free?
    if (exception.originalTeacherId.toString() === teacherId.toString()) {
      return false; // Teacher is free because their original slot is override-assigned to someone else
    }
  }

  // If no exception override for this slot, check baseline MasterTimetable
  const baselineSlot = await MasterTimetable.findOne({
    dayOfWeek,
    slotNumber,
    teacherId,
  });

  return baselineSlot ? baselineSlot._id : false;
};

/**
 * 1. POST /api/swaps (Protected: Teachers Only)
 */
export const createSwapRequest = async (req, res, next) => {
  try {
    const { receiverId, originalSlotId, targetSlotId, date, isPermanent } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !originalSlotId || !targetSlotId || !date) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Missing required fields: receiverId, originalSlotId, targetSlotId, date', 400));
    }

    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid date format provided. Use YYYY-MM-DD.', 400));
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[queryDate.getUTCDay()];

    if (dayOfWeek === 'Sunday') {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Cannot swap classes on Sundays', 400));
    }

    // Fetch baseline slots
    const senderSlot = await MasterTimetable.findById(originalSlotId);
    const receiverSlot = await MasterTimetable.findById(targetSlotId);

    if (!senderSlot) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Sender slot not found in Master Timetable', 404));
    }
    if (!receiverSlot) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Receiver slot not found in Master Timetable', 404));
    }

    // Security: Check if originalSlotId belongs to sender, and targetSlotId belongs to receiver
    if (senderSlot.teacherId.toString() !== senderId.toString()) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'You can only swap your own slots', 403));
    }
    if (receiverSlot.teacherId.toString() !== receiverId.toString()) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'The target slot does not belong to the selected receiver', 400));
    }

    // a. Receiver Clash Check (Hard Block)
    const isReceiverOccupied = await isTeacherBusy(receiverId, queryDate, senderSlot.slotNumber, dayOfWeek);
    if (isReceiverOccupied) {
      return next(
        new AppError(
          'RECEIVER_SLOT_CONFLICT',
          'The receiver is already occupied with another lecture during your original slot number',
          409
        )
      );
    }

    // b. Domino Check (Soft Warning)
    const senderOccupiedSlotId = await isTeacherBusy(senderId, queryDate, receiverSlot.slotNumber, dayOfWeek);
    const validationMatrix = [];
    if (senderOccupiedSlotId) {
      validationMatrix.push({
        type: 'DOMINO_WARNING',
        message: `Warning: You (Sender) are already occupied during the receiver's target slot number (${receiverSlot.slotNumber}) on this date. Accepting this swap will cause a clash for you.`,
        conflictingSlotId: senderOccupiedSlotId
      });
    }

    // Save SwapRequest in Pending state
    const swap = await SwapRequest.create({
      senderId,
      receiverId,
      originalSlotId,
      targetSlotId,
      date: queryDate,
      status: 'Pending',
      isPermanent: isPermanent || false,
    });

    const populatedSwap = await SwapRequest.findById(swap._id)
      .populate('senderId receiverId', 'name email')
      .populate('originalSlotId targetSlotId');

    // Create database notification for receiver
    const notif = await Notification.create({
      recipientId: receiverId,
      type: 'SWAP_REQUEST_RECEIVED',
      message: `You have received a new swap request from ${req.user.name} for date ${date}.`,
      role: 'Teacher',
    });

    // Emit socket notification directly to the receiver's private room
    emitToRoom(`room:user_${receiverId}`, 'notification:new', notif);

    return sendSuccess(
      res,
      {
        swap: populatedSwap,
        validationMatrix,
      },
      'Swap request initiated successfully'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. POST /api/swaps/:swapId/respond (Protected: Teachers Only)
 */
export const respondToSwapRequest = async (req, res, next) => {
  try {
    const { swapId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Status must be either Approved or Rejected', 400));
    }

    const swap = await SwapRequest.findById(swapId);
    if (!swap) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Swap request not found', 404));
    }

    // Security: Only the receiver teacher can accept or reject the swap
    if (swap.receiverId.toString() !== userId.toString()) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'Only the designated receiver can respond to this request', 403));
    }

    if (swap.status !== 'Pending') {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'This swap request has already been processed', 400));
    }

    if (status === 'Rejected') {
      swap.status = 'Rejected';
      await swap.save();
      return sendSuccess(res, swap, 'Swap request rejected successfully');
    }

    // Process Approved swap
    swap.status = 'Approved';
    await swap.save();

    // Fetch baseline slot details
    const senderSlot = await MasterTimetable.findById(swap.originalSlotId);
    const receiverSlot = await MasterTimetable.findById(swap.targetSlotId);

    if (!senderSlot || !receiverSlot) {
      // Revert swap status if slots are missing
      swap.status = 'Pending';
      await swap.save();
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Associated master slots could not be located during approval', 404));
    }

    if (swap.isPermanent) {
      // Permanent swap: Modify MasterTimetable directly
      const tempTeacherId = senderSlot.teacherId;
      const tempSubject = senderSlot.subject;

      senderSlot.teacherId = receiverSlot.teacherId;
      senderSlot.subject = receiverSlot.subject;
      await senderSlot.save();

      receiverSlot.teacherId = tempTeacherId;
      receiverSlot.subject = tempSubject;
      await receiverSlot.save();
    } else {
      // Temporary swap: Create exceptions for the specific date
      // Insert exception 1: Receiver takes over Sender's slot
      await ScheduleException.create({
        date: swap.date,
        slotNumber: senderSlot.slotNumber,
        semester: senderSlot.semester,
        division: senderSlot.division,
        originalTeacherId: swap.senderId,
        assignedTeacherId: swap.receiverId,
        subject: senderSlot.subject,
        isFreeLecture: false,
      });

      // Insert exception 2: Sender takes over Receiver's slot
      await ScheduleException.create({
        date: swap.date,
        slotNumber: receiverSlot.slotNumber,
        semester: receiverSlot.semester,
        division: receiverSlot.division,
        originalTeacherId: swap.receiverId,
        assignedTeacherId: swap.senderId,
        subject: receiverSlot.subject,
        isFreeLecture: false,
      });
    }

    const updatedSwap = await SwapRequest.findById(swapId)
      .populate('senderId receiverId', 'name email')
      .populate('originalSlotId targetSlotId');

    // Notify students of senderSlot's division
    const senderStudentNotif = await Notification.create({
      type: swap.isPermanent ? 'TIMETABLE_UPDATED' : 'LECTURE_SWAPPED',
      message: swap.isPermanent 
        ? `Your master timetable has been permanently updated. Your lecture on ${senderSlot.dayOfWeek} for Slot ${senderSlot.slotNumber} will now be taken by another teacher.`
        : `Your lecture on ${new Date(swap.date).toISOString().split('T')[0]} for Slot ${senderSlot.slotNumber} (${senderSlot.subject}) will now be taken by another teacher.`,
      role: 'Student',
      semester: senderSlot.semester,
      division: senderSlot.division,
    });
    emitToRoom(`room:sem_${senderSlot.semester}_div_${senderSlot.division}`, 'notification:new', senderStudentNotif);

    // Notify students of receiverSlot's division
    const receiverStudentNotif = await Notification.create({
      type: swap.isPermanent ? 'TIMETABLE_UPDATED' : 'LECTURE_SWAPPED',
      message: swap.isPermanent
        ? `Your master timetable has been permanently updated. Your lecture on ${receiverSlot.dayOfWeek} for Slot ${receiverSlot.slotNumber} will now be taken by another teacher.`
        : `Your lecture on ${new Date(swap.date).toISOString().split('T')[0]} for Slot ${receiverSlot.slotNumber} (${receiverSlot.subject}) will now be taken by another teacher.`,
      role: 'Student',
      semester: receiverSlot.semester,
      division: receiverSlot.division,
    });
    emitToRoom(`room:sem_${receiverSlot.semester}_div_${receiverSlot.division}`, 'notification:new', receiverStudentNotif);

    return sendSuccess(res, updatedSwap, 'Swap request approved and schedule exceptions successfully created');
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. GET /api/swaps/pending (Protected: Teachers and Admins)
 */
export const getPendingSwaps = async (req, res, next) => {
  try {
    const filter = { status: 'Pending' };

    // If user is a Teacher, only fetch their incoming/outgoing requests
    if (req.user.role === 'Teacher') {
      filter.$or = [{ senderId: req.user.id }, { receiverId: req.user.id }];
    }

    const pendingRequests = await SwapRequest.find(filter)
      .populate('senderId receiverId', 'name email')
      .populate('originalSlotId targetSlotId')
      .sort({ createdAt: -1 });

    return sendSuccess(res, pendingRequests, 'Pending swap requests retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * 4. GET /api/swaps/history (Protected: Teachers and Admins)
 */
export const getSwapsHistory = async (req, res, next) => {
  try {
    const filter = { status: { $ne: 'Pending' } };

    // If user is a Teacher, only fetch their history
    if (req.user.role === 'Teacher') {
      filter.$or = [{ senderId: req.user.id }, { receiverId: req.user.id }];
    }

    const historyRequests = await SwapRequest.find(filter)
      .populate('senderId receiverId', 'name email')
      .populate('originalSlotId targetSlotId')
      .sort({ updatedAt: -1 });

    return sendSuccess(res, historyRequests, 'Historical swap requests retrieved successfully');
  } catch (error) {
    return next(error);
  }
};
