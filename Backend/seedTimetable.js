/**
 * seedTimetable.js
 * Populates the MasterTimetable collection with a realistic
 * sample schedule for Semester 4 / Division A.
 *
 * Run once:  node seedTimetable.js
 */

import mongoose from 'mongoose';
import User from './models/User.js';
import MasterTimetable from './models/MasterTimetable.js';
import connectDB from './config/db.js';

// ── Slot time map (for reference only, not stored) ────────────
const SLOT_TIMES = {
  1: '08:00–09:00',
  2: '09:00–10:00',
  3: '10:00–11:00',
  4: '11:00–12:00',
  5: '13:00–14:00',
  6: '14:00–15:00',
};

async function seed() {
  await connectDB();

  // ── Fetch teacher IDs from DB ─────────────────────────────
  let jane = await User.findOne({ email: 'jane.smith@college.edu' });
  if (!jane) {
    jane = await new User({
      name: 'Dr. Jane Smith',
      email: 'jane.smith@college.edu',
      password: 'password123',
      role: 'Teacher',
      subjectsTaught: ['Mathematics', 'Physics'],
    }).save();
    console.log('➕ Created teacher: jane.smith@college.edu');
  }

  // Create a second teacher if not present
  let bob = await User.findOne({ email: 'bob.jones@college.edu' });
  if (!bob) {
    bob = await new User({
      name: 'Prof. Bob Jones',
      email: 'bob.jones@college.edu',
      password: 'password123',
      role: 'Teacher',
      subjectsTaught: ['Data Structures', 'Algorithms', 'Database Systems'],
    }).save();
    console.log('➕ Created teacher: bob.jones@college.edu');
  }

  // Create a third teacher if not present
  let priya = await User.findOne({ email: 'priya.sharma@college.edu' });
  if (!priya) {
    priya = await new User({
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@college.edu',
      password: 'password123',
      role: 'Teacher',
      subjectsTaught: ['Operating Systems', 'Computer Networks'],
    }).save();
    console.log('➕ Created teacher: priya.sharma@college.edu');
  }

  // ── Clear old timetable ────────────────────────────────────
  const deleted = await MasterTimetable.deleteMany({});
  console.log(`🗑️  Cleared ${deleted.deletedCount} old timetable entries`);

  // ── Build schedule ─────────────────────────────────────────
  // Semester 4, Division A — 6 slots per day, Mon–Fri
  const J = jane._id;  // Mathematics, Physics
  const B = bob._id;   // Data Structures, Algorithms, Database Systems
  const P = priya._id; // Operating Systems, Computer Networks

  /*  Schedule layout:
      Slot  Mon           Tue           Wed           Thu           Fri
       1    Mathematics   Data Struct.  Op. Systems   Mathematics   Data Struct.
       2    Physics       Algorithms    Comp. Networks Database      Physics
       3    Data Struct.  Mathematics   Mathematics   Comp. Networks Op. Systems
       4    Op. Systems   Physics       Data Struct.  Algorithms    Mathematics
       5    Algorithms    Database      Physics       Op. Systems   Comp. Networks
       6    Database      Comp.Network  Algorithms    Physics       Algorithms
  */
  const slots = [
    // Monday
    { dayOfWeek: 'Monday', slotNumber: 1, semester: 4, division: 'A', teacherId: J, subject: 'Mathematics' },
    { dayOfWeek: 'Monday', slotNumber: 2, semester: 4, division: 'A', teacherId: J, subject: 'Physics' },
    { dayOfWeek: 'Monday', slotNumber: 3, semester: 4, division: 'A', teacherId: B, subject: 'Data Structures' },
    { dayOfWeek: 'Monday', slotNumber: 4, semester: 4, division: 'A', teacherId: P, subject: 'Operating Systems' },
    { dayOfWeek: 'Monday', slotNumber: 5, semester: 4, division: 'A', teacherId: B, subject: 'Algorithms' },
    { dayOfWeek: 'Monday', slotNumber: 6, semester: 4, division: 'A', teacherId: B, subject: 'Database Systems' },

    // Tuesday
    { dayOfWeek: 'Tuesday', slotNumber: 1, semester: 4, division: 'A', teacherId: B, subject: 'Data Structures' },
    { dayOfWeek: 'Tuesday', slotNumber: 2, semester: 4, division: 'A', teacherId: B, subject: 'Algorithms' },
    { dayOfWeek: 'Tuesday', slotNumber: 3, semester: 4, division: 'A', teacherId: J, subject: 'Mathematics' },
    { dayOfWeek: 'Tuesday', slotNumber: 4, semester: 4, division: 'A', teacherId: J, subject: 'Physics' },
    { dayOfWeek: 'Tuesday', slotNumber: 5, semester: 4, division: 'A', teacherId: B, subject: 'Database Systems' },
    { dayOfWeek: 'Tuesday', slotNumber: 6, semester: 4, division: 'A', teacherId: P, subject: 'Computer Networks' },

    // Wednesday
    { dayOfWeek: 'Wednesday', slotNumber: 1, semester: 4, division: 'A', teacherId: P, subject: 'Operating Systems' },
    { dayOfWeek: 'Wednesday', slotNumber: 2, semester: 4, division: 'A', teacherId: P, subject: 'Computer Networks' },
    { dayOfWeek: 'Wednesday', slotNumber: 3, semester: 4, division: 'A', teacherId: J, subject: 'Mathematics' },
    { dayOfWeek: 'Wednesday', slotNumber: 4, semester: 4, division: 'A', teacherId: B, subject: 'Data Structures' },
    { dayOfWeek: 'Wednesday', slotNumber: 5, semester: 4, division: 'A', teacherId: J, subject: 'Physics' },
    { dayOfWeek: 'Wednesday', slotNumber: 6, semester: 4, division: 'A', teacherId: B, subject: 'Algorithms' },

    // Thursday
    { dayOfWeek: 'Thursday', slotNumber: 1, semester: 4, division: 'A', teacherId: J, subject: 'Mathematics' },
    { dayOfWeek: 'Thursday', slotNumber: 2, semester: 4, division: 'A', teacherId: B, subject: 'Database Systems' },
    { dayOfWeek: 'Thursday', slotNumber: 3, semester: 4, division: 'A', teacherId: P, subject: 'Computer Networks' },
    { dayOfWeek: 'Thursday', slotNumber: 4, semester: 4, division: 'A', teacherId: B, subject: 'Algorithms' },
    { dayOfWeek: 'Thursday', slotNumber: 5, semester: 4, division: 'A', teacherId: P, subject: 'Operating Systems' },
    { dayOfWeek: 'Thursday', slotNumber: 6, semester: 4, division: 'A', teacherId: J, subject: 'Physics' },

    // Friday
    { dayOfWeek: 'Friday', slotNumber: 1, semester: 4, division: 'A', teacherId: B, subject: 'Data Structures' },
    { dayOfWeek: 'Friday', slotNumber: 2, semester: 4, division: 'A', teacherId: J, subject: 'Physics' },
    { dayOfWeek: 'Friday', slotNumber: 3, semester: 4, division: 'A', teacherId: P, subject: 'Operating Systems' },
    { dayOfWeek: 'Friday', slotNumber: 4, semester: 4, division: 'A', teacherId: J, subject: 'Mathematics' },
    { dayOfWeek: 'Friday', slotNumber: 5, semester: 4, division: 'A', teacherId: P, subject: 'Computer Networks' },
    { dayOfWeek: 'Friday', slotNumber: 6, semester: 4, division: 'A', teacherId: B, subject: 'Algorithms' },
  ];

  await MasterTimetable.insertMany(slots);
  console.log(`✅ Inserted ${slots.length} timetable slots for Sem 4 / Div A`);

  // ── Print summary ──────────────────────────────────────────
  console.log('\n📅 TIMETABLE SUMMARY (Sem 4, Div A)\n');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  for (const day of days) {
    console.log(`  ${day}:`);
    const daySlots = slots.filter(s => s.dayOfWeek === day).sort((a, b) => a.slotNumber - b.slotNumber);
    for (const s of daySlots) {
      const time = SLOT_TIMES[s.slotNumber];
      const teacher = [jane, bob, priya].find(t => t._id.equals(s.teacherId));
      console.log(`    Slot ${s.slotNumber} (${time}): ${s.subject} — ${teacher.name}`);
    }
  }

  console.log('\n👥 TEACHER ACCOUNTS:\n');
  console.log('  jane.smith@college.edu   (Mathematics, Physics)           password: password123');
  console.log('  bob.jones@college.edu    (Data Structures, Algorithms, Database) password: password123');
  console.log('  priya.sharma@college.edu (Operating Systems, Networks)    password: password123');

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seed().catch(err => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
