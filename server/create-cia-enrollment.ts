/**
 * Script to create CIA enrollment for Peter
 */
import mongoose from 'mongoose';
import { Student } from './models/student';
import { Course } from './models/course';
import { Enrollment } from './models/enrollment';
import { connectDB } from './db';

async function createCIAEnrollment() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Get Peter's student record
    const peterStudent = await Student.findOne({ name: 'Peter Parker' });
    if (!peterStudent) {
      console.error('Peter student not found');
      return;
    }
    console.log('Found Peter student:', peterStudent._id);
    
    // Get CIA course
    const ciaCourse = await Course.findOne({ slug: 'certified-investment-associate' });
    if (!ciaCourse) {
      console.error('CIA course not found');
      return;
    }
    console.log('Found CIA course:', ciaCourse._id);
    
    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      studentId: peterStudent._id,
      courseSlug: ciaCourse.slug
    });
    
    if (existingEnrollment) {
      console.log('Enrollment already exists:', existingEnrollment._id);
      return;
    }
    
    // Create new enrollment
    const newEnrollment = new Enrollment({
      studentId: peterStudent._id,
      courseSlug: ciaCourse.slug,
      enrollDate: new Date('2025-04-15'), // Enrolled on April 15, 2025
      validUntil: new Date('2026-04-15'), // Valid for 1 year
      completedModules: [], // No modules completed yet
      quizAttempts: []  // No quiz attempts yet
    });
    
    await newEnrollment.save();
    console.log('Created new CIA enrollment:', newEnrollment._id);
    
    mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating CIA enrollment:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

createCIAEnrollment();