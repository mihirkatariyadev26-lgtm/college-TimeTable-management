import mongoose from 'mongoose';
import User from './models/User.js';
import connectDB from './config/db.js';

const seedUsers = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected for seeding...');

    const demoUsers = [
      {
        name: 'System Admin',
        email: 'admin@college.edu',
        password: 'password123',
        role: 'Admin',
      },
      {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@college.edu',
        password: 'password123',
        role: 'Teacher',
        subjectsTaught: ['Mathematics', 'Physics'],
      },
      {
        name: 'John Doe',
        email: 'john.doe@student.college.edu',
        password: 'password123',
        role: 'Student',
        semester: 4,
        division: 'A',
      },
    ];

    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`Kept existing user: ${userData.email}`);
        continue;
      }

      await new User(userData).save();
      console.log(`Created user: ${userData.email}`);
    }

    console.log('Successfully seeded users!');
    console.log('\n--- Demo Credentials ---');
    console.log('Admin:   admin@college.edu / password123');
    console.log('Teacher: jane.smith@college.edu / password123');
    console.log('Student: john.doe@student.college.edu / password123');
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedUsers();
