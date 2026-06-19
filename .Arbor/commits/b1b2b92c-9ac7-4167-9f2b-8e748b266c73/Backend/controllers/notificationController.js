import Notification from '../models/Notification.js';
import { sendSuccess, AppError, ERROR_CODES } from '../middlewares/responseEnvelope.js';

/**
 * 1. GET /api/notifications (Protected: All Users)
 * Returns a paginated, role-scoped list of notification alerts.
 */
export const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Scoping notifications based on User Role & profile metadata
    if (req.user.role === 'Student') {
      filter.$or = [
        { recipientId: req.user.id },
        {
          role: { $in: ['Student', 'All'] },
          semester: req.user.semester,
          division: req.user.division,
        },
      ];
    } else if (req.user.role === 'Teacher') {
      filter.$or = [
        { recipientId: req.user.id },
        { role: { $in: ['Teacher', 'All'] } },
      ];
    }
    // Admin role doesn't filter, sees all notifications

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);

    // Count unread notifications for the bell badge
    const unreadFilter = { ...filter, isRead: false };
    const unreadCount = await Notification.countDocuments(unreadFilter);

    const meta = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      unreadCount,
    };

    return sendSuccess(res, notifications, 'Notifications loaded successfully', 200, meta);
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. PATCH /api/notifications/:id/read (Protected)
 * Marks a specific notification as read.
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Notification not found', 404));
    }

    // Security Check: Make sure the notification actually belongs to or is visible to this user
    if (notification.recipientId && notification.recipientId.toString() !== req.user.id.toString()) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'Unauthorized to modify this notification', 403));
    }

    notification.isRead = true;
    await notification.save();

    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. PATCH /api/notifications/read-all (Protected)
 * Marks all notifications visible/applicable to the active user as read.
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const filter = { isRead: false };

    if (req.user.role === 'Student') {
      filter.$or = [
        { recipientId: req.user.id },
        {
          role: { $in: ['Student', 'All'] },
          semester: req.user.semester,
          division: req.user.division,
        },
      ];
    } else if (req.user.role === 'Teacher') {
      filter.$or = [
        { recipientId: req.user.id },
        { role: { $in: ['Teacher', 'All'] } },
      ];
    } else if (req.user.role === 'Admin') {
      // Admin marks all as read
    }

    const result = await Notification.updateMany(filter, { $set: { isRead: true } });

    return sendSuccess(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
  } catch (error) {
    return next(error);
  }
};
