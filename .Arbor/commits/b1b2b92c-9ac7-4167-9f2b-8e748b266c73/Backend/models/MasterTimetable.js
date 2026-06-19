import mongoose from 'mongoose';

const masterTimetableSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: [true, 'Please specify a day of the week'],
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please specify a teacher'],
    },
    subject: {
      type: String,
      required: [true, 'Please specify a subject'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent double booking of slot for a semester/division
masterTimetableSchema.index({ dayOfWeek: 1, slotNumber: 1, semester: 1, division: 1 }, { unique: true });

// Compound index to prevent double booking of slot for a teacher
masterTimetableSchema.index({ dayOfWeek: 1, slotNumber: 1, teacherId: 1 }, { unique: true });

const MasterTimetable = mongoose.model('MasterTimetable', masterTimetableSchema);

export default MasterTimetable;
