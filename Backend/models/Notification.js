import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Optional if it's a broadcast to a role, semester, or division
      required: false,
    },
    type: {
      type: String,
      required: [true, 'Please specify the notification type'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Please specify the notification message'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['Admin', 'Teacher', 'Student', 'All'],
      default: 'All',
    },
    semester: {
      type: Number,
      required: false,
    },
    division: {
      type: String,
      trim: true,
      required: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
