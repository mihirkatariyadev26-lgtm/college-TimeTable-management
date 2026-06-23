import MasterTimetable from "../models/MasterTimetable.js";
import ScheduleException from "../models/ScheduleException.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { emitToRoom } from "../config/socket.js";
import {
  sendSuccess,
  AppError,
  ERROR_CODES,
} from "../middlewares/responseEnvelope.js";

/**
 * 1. POST /api/timetable/create (Protected: Admin Only)
 */
export const createTimetableSlot = async (req, res, next) => {
  try {
    const { dayOfWeek, slotNumber, semester, division, teacherId, subject } =
      req.body;

    // Validate input fields
    if (
      !dayOfWeek ||
      !slotNumber ||
      !semester ||
      !division ||
      !teacherId ||
      !subject
    ) {
      return next(
        new AppError(ERROR_CODES.BAD_REQUEST, "All fields are required", 400),
      );
    }

    if (slotNumber < 1 || slotNumber > 8) {
      return next(
        new AppError(
          ERROR_CODES.BAD_REQUEST,
          "Slot number must be between 1 and 8",
          400,
        ),
      );
    }

    // Check if teacher exists and has the correct role
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "Teacher") {
      return next(
        new AppError(
          ERROR_CODES.BAD_REQUEST,
          "Invalid teacherId provided",
          400,
        ),
      );
    }

    // Check if the semester/division already has a slot assigned at this time
    const classConflict = await MasterTimetable.findOne({
      dayOfWeek,
      slotNumber,
      semester,
      division,
    });
    if (classConflict) {
      return next(
        new AppError(
          ERROR_CODES.SLOT_CONFLICT,
          `Slot ${slotNumber} on ${dayOfWeek} is already scheduled for Semester ${semester} Division ${division}`,
          409,
        ),
      );
    }

    // Check if the teacher is already busy at this time
    const teacherConflict = await MasterTimetable.findOne({
      dayOfWeek,
      slotNumber,
      teacherId,
    });
    if (teacherConflict) {
      return next(
        new AppError(
          ERROR_CODES.SLOT_CONFLICT,
          `Teacher '${teacher.name}' is already assigned to another class during slot ${slotNumber} on ${dayOfWeek}`,
          409,
        ),
      );
    }

    const newSlot = await MasterTimetable.create({
      dayOfWeek,
      slotNumber,
      semester,
      division,
      teacherId,
      subject,
    });

    const populatedSlot = await MasterTimetable.findById(newSlot._id).populate(
      "teacherId",
      "name email",
    );

    // Create notification in DB
    const notif = await Notification.create({
      type: "TIMETABLE_UPDATED",
      message: `A new baseline slot has been scheduled for Semester ${semester} Division ${division}: ${subject} (Teacher: ${populatedSlot.teacherId.name})`,
      role: "Student",
      semester,
      division,
    });

    // Emit socket notification to student room
    emitToRoom(
      `room:sem_${semester}_div_${division}`,
      "notification:new",
      notif,
    );

    return sendSuccess(
      res,
      populatedSlot,
      "Master weekly slot created successfully",
      201,
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. GET /api/timetable/view (Protected: All Authenticated Users)
 */
export const viewTimetable = async (req, res, next) => {
  try {
    const { date, semester, division } = req.query;

    if (!date || !semester || !division) {
      return next(
        new AppError(
          ERROR_CODES.BAD_REQUEST,
          "Query parameters (date, semester, division) are required",
          400,
        ),
      );
    }

    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      return next(
        new AppError(
          ERROR_CODES.BAD_REQUEST,
          "Invalid date format provided. Use YYYY-MM-DD.",
          400,
        ),
      );
    }

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = days[queryDate.getUTCDay()];

    if (dayOfWeek === "Sunday") {
      // Return a blank timetable schedule for Sunday
      const blankTimetable = Array.from({ length: 8 }, (_, i) => ({
        slotNumber: i + 1,
        isFreeLecture: true,
        subject: "Holiday",
        message: "No lectures scheduled on Sundays",
      }));
      return sendSuccess(res, blankTimetable, "Sunday timetable (Holiday)");
    }

    // Query baseline weekly slots
    const masterSlots = await MasterTimetable.find({
      dayOfWeek,
      semester: Number(semester),
      division,
    }).populate("teacherId", "name email");

    // Query ScheduleExceptions for this date
    const startOfDay = new Date(queryDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const exceptions = await ScheduleException.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      semester: Number(semester),
      division,
    }).populate("originalTeacherId assignedTeacherId", "name email");

    // Build unified ordered array of 8 slots
    const unifiedSchedule = [];

    for (let slotNum = 1; slotNum <= 8; slotNum++) {
      // Look for exception first
      const exception = exceptions.find((e) => e.slotNumber === slotNum);

      if (exception) {
        if (exception.isFreeLecture) {
          unifiedSchedule.push({
            slotNumber: slotNum,
            isFreeLecture: true,
            subject: "Free Lecture",
            teacher: null,
          });
        } else {
          unifiedSchedule.push({
            _id: exception._id,
            slotNumber: slotNum,
            isFreeLecture: false,
            subject: exception.subject,
            teacher: exception.assignedTeacherId,
            isExceptionOverride: true,
            originalTeacher: exception.originalTeacherId,
          });
        }
      } else {
        // Fallback to baseline weekly slot
        const masterSlot = masterSlots.find((s) => s.slotNumber === slotNum);
        if (masterSlot) {
          unifiedSchedule.push({
            _id: masterSlot._id,
            slotNumber: slotNum,
            isFreeLecture: false,
            subject: masterSlot.subject,
            teacher: masterSlot.teacherId,
          });
        } else {
          // No lecture scheduled
          unifiedSchedule.push({
            slotNumber: slotNum,
            isFreeLecture: true,
            subject: "No Lecture",
            teacher: null,
          });
        }
      }
    }

    return sendSuccess(
      res,
      unifiedSchedule,
      `Timetable for Semester ${semester} Division ${division} on ${date} (${dayOfWeek})`,
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. GET /api/timetable/teacher/:teacherId (Protected: Teachers & Admins Only)
 */
export const getTeacherTimetable = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    // Check if the user is authorized to view this teacher's timetable
    // Admins can view anyone. Teachers can view their own.
    if (req.user.role === "Teacher" && req.user.id !== teacherId) {
      return next(
        new AppError(
          ERROR_CODES.FORBIDDEN,
          "You can only view your own personalized schedule",
          403,
        ),
      );
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "Teacher") {
      return next(
        new AppError(ERROR_CODES.NOT_FOUND, "Teacher not found", 404),
      );
    }

    const masterSlots = await MasterTimetable.find({ teacherId }).sort({
      dayOfWeek: 1,
      slotNumber: 1,
    });

    // Format weekly calendar layout (Grouped by day of week)
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const weeklySchedule = {};

    daysOfWeek.forEach((day) => {
      weeklySchedule[day] = [];
    });

    masterSlots.forEach((slot) => {
      weeklySchedule[slot.dayOfWeek].push({
        _id: slot._id,
        slotNumber: slot.slotNumber,
        semester: slot.semester,
        division: slot.division,
        subject: slot.subject,
      });
    });

    const data = {
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        subjectsTaught: teacher.subjectsTaught,
      },
      weeklySchedule,
    };

    return sendSuccess(
      res,
      data,
      `Personalized weekly timetable for ${teacher.name}`,
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * 4. PUT /api/timetable/update/:id (Protected: Admin Only)
 */
export const updateTimetableSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, slotNumber, semester, division, teacherId, subject } =
      req.body;

    const slotToUpdate = await MasterTimetable.findById(id);
    if (!slotToUpdate) {
      return next(
        new AppError(ERROR_CODES.NOT_FOUND, "Timetable slot not found", 404),
      );
    }

    if (dayOfWeek || slotNumber || semester || division) {
      const checkDay = dayOfWeek || slotToUpdate.dayOfWeek;
      const checkSlot = slotNumber || slotToUpdate.slotNumber;
      const checkSem = semester || slotToUpdate.semester;
      const checkDiv = division || slotToUpdate.division;

      const classConflict = await MasterTimetable.findOne({
        _id: { $ne: id },
        dayOfWeek: checkDay,
        slotNumber: checkSlot,
        semester: checkSem,
        division: checkDiv,
      });

      if (classConflict) {
        return next(
          new AppError(
            ERROR_CODES.SLOT_CONFLICT,
            `Slot ${checkSlot} on ${checkDay} is already scheduled for Semester ${checkSem} Division ${checkDiv}`,
            409,
          ),
        );
      }
    }

    if (dayOfWeek || slotNumber || teacherId) {
      const checkDay = dayOfWeek || slotToUpdate.dayOfWeek;
      const checkSlot = slotNumber || slotToUpdate.slotNumber;
      const checkTeacher = teacherId || slotToUpdate.teacherId;

      const teacherConflict = await MasterTimetable.findOne({
        _id: { $ne: id },
        dayOfWeek: checkDay,
        slotNumber: checkSlot,
        teacherId: checkTeacher,
      });

      if (teacherConflict) {
        const teacher = await User.findById(checkTeacher);
        return next(
          new AppError(
            ERROR_CODES.SLOT_CONFLICT,
            `Teacher '${teacher?.name || "selected"}' is already assigned to another class during slot ${checkSlot} on ${checkDay}`,
            409,
          ),
        );
      }
    }

    const updatedSlot = await MasterTimetable.findByIdAndUpdate(
      id,
      { dayOfWeek, slotNumber, semester, division, teacherId, subject },
      { new: true, runValidators: true },
    ).populate("teacherId", "name email");

    // Emit socket notification to student room about the change
    const notif = await Notification.create({
      type: "TIMETABLE_UPDATED",
      message: `The baseline timetable for Semester ${updatedSlot.semester} Division ${updatedSlot.division} has been updated.`,
      role: "Student",
      semester: updatedSlot.semester,
      division: updatedSlot.division,
    });
    emitToRoom(
      `room:sem_${updatedSlot.semester}_div_${updatedSlot.division}`,
      "notification:new",
      notif,
    );

    return sendSuccess(
      res,
      updatedSlot,
      "Master weekly slot updated successfully",
      200,
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * 5. DELETE /api/timetable/delete/:id (Protected: Admin Only)
 */
export const deleteTimetableSlot = async (req, res, next) => {
  try {
    const { id } = req.params;

    const slotToDelete = await MasterTimetable.findById(id);
    if (!slotToDelete) {
      return next(
        new AppError(ERROR_CODES.NOT_FOUND, "Timetable slot not found", 404),
      );
    }

    await slotToDelete.deleteOne();

    const notif = await Notification.create({
      type: "TIMETABLE_UPDATED",
      message: `A slot for Semester ${slotToDelete.semester} Division ${slotToDelete.division} has been removed from the baseline timetable.`,
      role: "Student",
      semester: slotToDelete.semester,
      division: slotToDelete.division,
    });
    emitToRoom(
      `room:sem_${slotToDelete.semester}_div_${slotToDelete.division}`,
      "notification:new",
      notif,
    );

    return sendSuccess(
      res,
      null,
      "Master weekly slot deleted successfully",
      200,
    );
  } catch (error) {
    return next(error);
  }
};
