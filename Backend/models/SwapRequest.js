import mongoose from 'mongoose';

const swapRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please specify the sender teacher'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please specify the receiver teacher'],
    },
    originalSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterTimetable',
      required: [true, 'Please specify the original slot to swap'],
    },
    targetSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterTimetable',
      required: [true, 'Please specify the target slot to swap with'],
    },
    date: {
      type: Date,
      required: [true, 'Please specify the date of the swap'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    isPermanent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SwapRequest = mongoose.model('SwapRequest', swapRequestSchema);

export default SwapRequest;
