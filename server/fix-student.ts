/**
 * Script to fix student-user relationship
 */
import mongoose from 'mongoose';
import { Student } from './models/student';
import { User } from './models/user';
import { connectDB } from './db';

async function fixStudentRelationship() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Get Peter's user
    const peterUser = await User.findOne({ username: 'peterparker' });
    if (!peterUser) {
      console.error('Peter user not found');
      return;
    }
    console.log('Found Peter user:', peterUser._id);
    
    // Find Peter's student record
    const peterStudent = await Student.findOne({ name: 'Peter Parker' });
    if (!peterStudent) {
      console.error('Peter student not found');
      return;
    }
    console.log('Found Peter student:', peterStudent._id);
    
    // Update the student record with userId
    peterStudent.userId = peterUser._id;
    await peterStudent.save();
    
    console.log('Updated Peter student with userId:', peterUser._id);
    
    mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing student relationship:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

fixStudentRelationship();