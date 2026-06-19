import mongoose from 'mongoose';

const scheduleExceptionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Please specify a date for the exception'],
    },
    slotNumber: {
      type: Number,
      required: [true, 'Please specify a slot number'],
      min: [1, 'Slot number must be between 1 and 8'],
      max: [8, 'Slot number must be between 1 and 8'],
    },
    semester: {
      type: Number,
      required: [true, 'Please specify a semester'],
    },
    division: {
      type: String,
      required: [true, 'Please specify a division'],
      trim: true,
    },
    originalTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please specify the original teacher'],
    },
    assignedTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // If it is a free lecture, assignedTeacherId can be null
      required: function () {
        return !this.isFreeLecture;
      },
    },
    subject: {
      type: String,
      // If it is a free lecture, subject might not be relevant, but we can store it or keep it optional
      required: function () {
        return !this.isFreeLecture;
      },
      trim: true,
    },
    isFreeLecture: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick queries by date
scheduleExceptionSchema.index({ date: 1, slotNumber: 1, semester: 1, division: 1 }, { unique: true });

const ScheduleException = mongoose.model('ScheduleException', scheduleExceptionSchema);

export default ScheduleException;
