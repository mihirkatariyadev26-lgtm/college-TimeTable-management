import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lecture-scheduler';

const seedUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing users just in case
    await User.deleteMany({});
    console.log('Cleared existing users.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const admin = new User({
      name: 'System Admin',
      email: 'admin@college.edu',
      password: hashedPassword,
      role: 'Admin',
      phone: '1234567890',
    });

    const teacher = new User({
      name: 'Dr. Jane Smith',
      email: 'jane.smith@college.edu',
      password: hashedPassword,
      role: 'Teacher',
      phone: '0987654321',
      subjectsTaught: ['Mathematics', 'Physics']
    });

    const student = new User({
      name: 'John Doe',
      email: 'john.doe@student.college.edu',
      password: hashedPassword,
      role: 'Student',
      phone: '1112223333',
      semester: 4,
      division: 'A'
    });

    await admin.save();
    await teacher.save();
    await student.save();

    console.log('Successfully seeded users!');
    console.log('\n--- Demo Credentials ---');
    console.log('Admin:   admin@college.edu / password123');
    console.log('Teacher: jane.smith@college.edu / password123');
    console.log('Student: john.doe@student.college.edu / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
