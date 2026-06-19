import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['Admin', 'Teacher', 'Student'],
      required: [true, 'Please specify a role'],
    },
    subjectsTaught: {
      type: [String],
      default: undefined,
      // Only applicable for Teachers
      validate: {
        validator: function (val) {
          if (this.role === 'Teacher') {
            return Array.isArray(val);
          }
          return true;
        },
        message: 'subjectsTaught is only applicable for Teachers',
      },
    },
    semester: {
      type: Number,
      // Only applicable for Students
      validate: {
        validator: function (val) {
          if (this.role === 'Student') {
            return val !== undefined && val !== null;
          }
          return true;
        },
        message: 'semester is required for Students',
      },
    },
    division: {
      type: String,
      trim: true,
      // Only applicable for Students
      validate: {
        validator: function (val) {
          if (this.role === 'Student') {
            return !!val;
          }
          return true;
        },
        message: 'division is required for Students',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
