import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lecture-scheduler';

const fixUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for fixing...');

    // Drop users and re-create them properly (without double-hashing)
    await User.deleteMany({});
    
    // Do NOT hash manually here because User schema pre-save hook will hash it
    const admin = new User({
      name: 'System Admin',
      email: 'admin@college.edu',
      password: 'password123',
      role: 'Admin',
      phone: '1234567890',
    });

    const teacher = new User({
      name: 'Dr. Jane Smith',
      email: 'jane.smith@college.edu',
      password: 'password123',
      role: 'Teacher',
      phone: '0987654321',
      subjectsTaught: ['Mathematics', 'Physics']
    });

    const student = new User({
      name: 'John Doe',
      email: 'john.doe@student.college.edu',
      password: 'password123',
      role: 'Student',
      phone: '1112223333',
      semester: 4,
      division: 'A'
    });

    await admin.save();
    await teacher.save();
    await student.save();

    console.log('Successfully fixed users!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing users:', error);
    process.exit(1);
  }
};

fixUsers();
