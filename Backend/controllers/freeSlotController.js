import ScheduleException from '../models/ScheduleException.js';
import MasterTimetable from '../models/MasterTimetable.js';
import Notification from '../models/Notification.js';
import { emitToRoom } from '../config/socket.js';
import { sendSuccess, AppError, ERROR_CODES } from '../middlewares/responseEnvelope.js';

/**
 * Helper to check if a teacher is busy during a specific slot on a date
 */
const isTeacherBusy = async (teacherId, date, slotNumber) => {
  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(queryDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Get day of the week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[queryDate.getUTCDay()];

  // Check exceptions on this date and slotNumber
  const exception = await ScheduleException.findOne({
    date: { $gte: startOfDay, $lte: endOfDay },
    slotNumber,
  });

  if (exception) {
    if (!exception.isFreeLecture && exception.assignedTeacherId && exception.assignedTeacherId.toString() === teacherId.toString()) {
      return true; // Teacher is teaching an override class
    }
    if (exception.originalTeacherId.toString() === teacherId.toString()) {
      return false; // Teacher is free because their original slot is exception-handled
    }
  }

  // Check baseline MasterTimetable
  const baselineSlot = await MasterTimetable.findOne({
    dayOfWeek,
    slotNumber,
    teacherId,
  });

  return !!baselineSlot;
};

/**
 * 1. POST /api/free-slots/declare (Protected: Teachers Only)
 */
export const declareFreeSlot = async (req, res, next) => {
  try {
    const { masterSlotId, date } = req.body;
    const teacherId = req.user.id;

    if (!masterSlotId || !date) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'masterSlotId and date are required', 400));
    }

    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid date format. Use YYYY-MM-DD.', 400));
    }

    const masterSlot = await MasterTimetable.findById(masterSlotId);
    if (!masterSlot) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Master slot not found', 404));
    }

    // Verify slot ownership
    if (masterSlot.teacherId.toString() !== teacherId.toString()) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'You cannot declare a slot free that is not assigned to you', 403));
    }

    // Check if exception already exists for this slot and date
    const startOfDay = new Date(queryDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingException = await ScheduleException.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      slotNumber: masterSlot.slotNumber,
      semester: masterSlot.semester,
      division: masterSlot.division,
    });

    if (existingException) {
      return next(new AppError(ERROR_CODES.SLOT_CONFLICT, 'A schedule exception already exists for this slot on this date', 409));
    }

    const exception = await ScheduleException.create({
      date: queryDate,
      slotNumber: masterSlot.slotNumber,
      semester: masterSlot.semester,
      division: masterSlot.division,
      originalTeacherId: teacherId,
      assignedTeacherId: null,
      subject: masterSlot.subject,
      isFreeLecture: true,
    });

    // Create database notification for faculty members
    const notif = await Notification.create({
      type: 'FREE_SLOT_AVAILABLE',
      message: `A new free slot is available for grabs on ${date} (Semester ${masterSlot.semester} Division ${masterSlot.division}, Slot ${masterSlot.slotNumber}).`,
      role: 'Teacher',
    });

    // Emit socket notification to the faculty room
    emitToRoom('room:faculty', 'notification:new', notif);

    // Notify students
    const studentNotif = await Notification.create({
      type: 'LECTURE_DECLARED_FREE',
      message: `Your lecture on ${date} for Slot ${masterSlot.slotNumber} (${masterSlot.subject}) has been declared free.`,
      role: 'Student',
      semester: masterSlot.semester,
      division: masterSlot.division,
    });
    emitToRoom(`room:sem_${masterSlot.semester}_div_${masterSlot.division}`, 'notification:new', studentNotif);

    return sendSuccess(res, exception, 'Lecture slot declared free successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. GET /api/free-slots (Protected: Teachers and Admins)
 */
export const getFreeSlots = async (req, res, next) => {
  try {
    const { date, semester, division } = req.query;
    const filter = {
      isFreeLecture: true,
      assignedTeacherId: null,
    };

    if (date) {
      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        return next(new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid date format', 400));
      }
      const startOfDay = new Date(queryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(queryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (semester) filter.semester = Number(semester);
    if (division) filter.division = division;

    const freeSlots = await ScheduleException.find(filter)
      .populate('originalTeacherId', 'name email')
      .sort({ date: 1, slotNumber: 1 });

    return sendSuccess(res, freeSlots, 'Free slots marketplace loaded successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. POST /api/free-slots/:exceptionId/claim (Protected: Teachers Only)
 */
export const claimFreeSlot = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;
    const teacherId = req.user.id;

    const exception = await ScheduleException.findById(exceptionId);
    if (!exception) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Free slot exception not found', 404));
    }

    if (!exception.isFreeLecture || exception.assignedTeacherId !== null) {
      return next(new AppError(ERROR_CODES.BAD_REQUEST, 'This slot has already been claimed or is not available', 400));
    }

    // Check if the claiming teacher is busy during this slot on this date
    const busy = await isTeacherBusy(teacherId, exception.date, exception.slotNumber);
    if (busy) {
      return next(
        new AppError(
          ERROR_CODES.SLOT_CONFLICT,
          `You are already busy during slot ${exception.slotNumber} on this date`,
          409
        )
      );
    }

    exception.assignedTeacherId = teacherId;
    exception.isFreeLecture = false;
    await exception.save();

    // Notify students that the free slot has been taken
    const studentNotif = await Notification.create({
      type: 'LECTURE_ASSIGNED',
      message: `Your free slot on ${new Date(exception.date).toISOString().split('T')[0]} for Slot ${exception.slotNumber} has been taken by ${req.user.name}.`,
      role: 'Student',
      semester: exception.semester,
      division: exception.division,
    });
    emitToRoom(`room:sem_${exception.semester}_div_${exception.division}`, 'notification:new', studentNotif);

    const populatedException = await ScheduleException.findById(exception._id)
      .populate('originalTeacherId assignedTeacherId', 'name email');

    return sendSuccess(res, populatedException, 'Free slot claimed successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * 4. DELETE /api/free-slots/:exceptionId/revoke (Protected: Teachers Only)
 */
export const revokeFreeSlot = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;
    const teacherId = req.user.id;

    const exception = await ScheduleException.findById(exceptionId);
    if (!exception) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Free slot exception not found', 404));
    }

    // Security: Only original teacher can revoke
    if (exception.originalTeacherId.toString() !== teacherId.toString()) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'You can only revoke your own free slot declarations', 403));
    }

    // Check if already claimed
    if (exception.assignedTeacherId !== null) {
      return next(
        new AppError(
          ERROR_CODES.BAD_REQUEST,
          'Cannot revoke this free slot declaration because another teacher has already claimed it',
          400
        )
      );
    }

    await ScheduleException.findByIdAndDelete(exceptionId);

    return sendSuccess(res, null, 'Absence declaration canceled and slot successfully reclaimed');
  } catch (error) {
    return next(error);
  }
};
