import mongoose from 'mongoose';
import { connectDB } from './db';
import { User } from './models/user';
import { Student } from './models/student';
import { Course } from './models/course';
import { LiveClass } from './models/liveclass';
import { Enrollment } from './models/enrollment';

async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Connect to the database
    await connectDB();
    console.log('Connected to database');
    
    // Delete all existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});
    await LiveClass.deleteMany({});
    
    // Create admin user
    console.log('Creating admin user...');
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password', // will be hashed by the model pre-save hook
      role: 'admin',
    });
    await admin.save();
    console.log('Admin created:', admin._id);
    
    // Create student user
    console.log('Creating student user...');
    const studentUser = new User({
      username: 'student',
      email: 'student@example.com',
      password: 'password', // will be hashed by the model pre-save hook
      role: 'student',
    });
    await studentUser.save();
    console.log('Student user created:', studentUser._id);
    
    // Create student profile
    console.log('Creating student profile...');
    const student = new Student({
      name: 'Test Student',
      userId: studentUser._id,
      pathway: 'standalone',
      address: '123 Test Street, Test City',
      phone: '+1234567890',
      dob: new Date(1990, 0, 1),
    });
    await student.save();
    console.log('Student profile created:', student._id);
    
    // Create courses
    console.log('Creating courses...');
    const course1 = new Course({
      title: 'Introduction to AI',
      slug: 'intro-to-ai',
      type: 'standalone',
      modules: [
        {
          title: 'Getting Started with AI',
          videos: [
            {
              title: 'What is Artificial Intelligence?',
              duration: 15,
              url: 'https://example.com/video1',
            },
            {
              title: 'History of AI',
              duration: 20,
              url: 'https://example.com/video2',
            },
          ],
          documents: [
            {
              title: 'AI Basics',
              url: 'https://example.com/doc1',
            },
          ],
          quizId: 'q1',
        },
        {
          title: 'Machine Learning Fundamentals',
          videos: [
            {
              title: 'Introduction to Machine Learning',
              duration: 25,
              url: 'https://example.com/video3',
            },
          ],
          documents: [
            {
              title: 'ML Algorithms',
              url: 'https://example.com/doc2',
            },
          ],
          quizId: 'q2',
        },
      ],
      liveClassConfig: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 'Friday',
        durationMin: 60,
      },
    });
    await course1.save();
    console.log('Course created:', course1._id);
    
    const course2 = new Course({
      title: 'Advanced Machine Learning',
      slug: 'advanced-ml',
      type: 'with-mba',
      modules: [
        {
          title: 'Deep Learning',
          videos: [
            {
              title: 'Neural Networks',
              duration: 30,
              url: 'https://example.com/video4',
            },
          ],
          documents: [
            {
              title: 'Deep Learning Architectures',
              url: 'https://example.com/doc3',
            },
          ],
          quizId: 'q3',
        },
      ],
      mbaModules: [
        {
          title: 'Business Applications of AI',
          videos: [
            {
              title: 'AI in Business Strategy',
              duration: 35,
              url: 'https://example.com/mbavideo1',
            },
          ],
          documents: [
            {
              title: 'Business Case Studies',
              url: 'https://example.com/mbadoc1',
            },
          ],
          quizId: 'mq1',
        },
      ],
      liveClassConfig: {
        enabled: true,
        frequency: 'biweekly',
        dayOfWeek: 'Wednesday',
        durationMin: 90,
      },
    });
    await course2.save();
    console.log('Course created:', course2._id);
    
    // Create enrollments
    console.log('Creating enrollments...');
    const enrollment1 = new Enrollment({
      studentId: student._id,
      courseSlug: course1.slug,
      enrollDate: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      completedModules: [
        {
          moduleIndex: 0,
          completed: true,
          completedAt: new Date()
        }
      ], // First module completed
      quizAttempts: [
        {
          quizId: 'q1',
          score: 80,
          maxScore: 100,
          attemptedAt: new Date(),
          passed: true,
        },
      ],
    });
    await enrollment1.save();
    console.log('Enrollment created:', enrollment1._id);
    
    // Create live classes
    console.log('Creating live classes...');
    const liveClass1 = new LiveClass({
      title: 'Introduction to AI Concepts',
      courseSlug: course1.slug,
      description: 'An interactive session covering the fundamental concepts of AI',
      meetLink: 'https://meet.example.com/intro-ai',
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      status: 'scheduled',
    });
    await liveClass1.save();
    console.log('Live class created:', liveClass1._id);
    
    const liveClass2 = new LiveClass({
      title: 'Advanced ML Techniques',
      courseSlug: course2.slug,
      description: 'Deep dive into advanced machine learning algorithms',
      meetLink: 'https://meet.example.com/adv-ml',
      startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 1.5 hour duration
      status: 'scheduled',
    });
    await liveClass2.save();
    console.log('Live class created:', liveClass2._id);
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

seed();