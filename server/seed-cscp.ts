import mongoose from 'mongoose';
import { connectDB } from './db';
import { User } from './models/user';
import { Student } from './models/student';
import { Course } from './models/course';
import { LiveClass } from './models/liveclass';
import { Enrollment } from './models/enrollment';

async function seedCSCP() {
  console.log('Starting CSCP course and Peter Parker student seeding...');
  
  try {
    // Connect to the database
    await connectDB();
    console.log('Connected to database');
    
    // Create Peter Parker student user
    console.log('Creating Peter Parker student user...');
    const peterUser = await User.findOne({ email: 'peter@example.com' });
    
    let peterUserId;
    
    if (!peterUser) {
      const newPeterUser = new User({
        username: 'peterparker',
        email: 'peter@example.com',
        password: 'password', // will be hashed by the model pre-save hook
        role: 'student',
      });
      await newPeterUser.save();
      peterUserId = newPeterUser._id;
      console.log('Peter Parker user created:', peterUserId);
    } else {
      peterUserId = peterUser._id;
      console.log('Peter Parker user already exists:', peterUserId);
    }
    
    // Create Peter Parker student profile
    console.log('Creating Peter Parker student profile...');
    let peterStudent = await Student.findOne({ userId: peterUserId });
    
    if (!peterStudent) {
      peterStudent = new Student({
        name: 'Peter Parker',
        userId: peterUserId,
        pathway: 'standalone',
        address: '20 Ingram Street, Queens, New York',
        phone: '+1-212-555-7890',
        dob: new Date(2000, 11, 6), // December 6, 2000
        watchTime: [
          {
            date: new Date('2025-05-07'),
            moduleIndex: 0,
            videoIndex: 0,
            duration: 30 * 60  // 30 minutes in seconds
          },
          {
            date: new Date('2025-05-08'),
            moduleIndex: 0,
            videoIndex: 1,
            duration: 40 * 60  // 40 minutes in seconds
          },
          {
            date: new Date('2025-05-09'),
            moduleIndex: 1,
            videoIndex: 0,
            duration: 25 * 60  // 25 minutes in seconds
          }
        ],
        notifySettings: {
          courseProgress: {
            email: true,
            sms: false
          },
          quizSummary: {
            email: true,
            sms: false
          },
          certificateReady: {
            email: true,
            sms: true
          }
        },
        eventLogs: [],
        reminders: []
      });
      await peterStudent.save();
      console.log('Peter Parker student profile created:', peterStudent._id);
    } else {
      console.log('Peter Parker student profile already exists:', peterStudent._id);
    }
    
    // Create CSCP course if it doesn't exist
    console.log('Creating CSCP course...');
    let cscpCourse = await Course.findOne({ slug: 'certified-supply-chain-professional' });
    
    if (!cscpCourse) {
      cscpCourse = new Course({
        title: 'Certified Supply Chain Professional',
        slug: 'certified-supply-chain-professional',
        type: 'standalone',
        modules: [
          {
            title: 'Supply Chain Fundamentals',
            videos: [
              {
                title: 'Introduction to Supply Chain Management',
                duration: 45,
                url: 'https://www.youtube.com/watch?v=xIY097gEXjk',
                videoId: 'xIY097gEXjk',
              },
              {
                title: 'Inventory Management',
                duration: 38,
                url: 'https://www.youtube.com/watch?v=0ZDrpf5aMiw',
                videoId: '0ZDrpf5aMiw',
              },
              {
                title: 'Supply Chain Risk Management',
                duration: 42,
                url: 'https://www.youtube.com/watch?v=Cu1ZUBCiMHw',
                videoId: 'Cu1ZUBCiMHw',
              },
              {
                title: 'Technology in Supply Chain Management',
                duration: 40,
                url: 'https://www.youtube.com/watch?v=SXDvHgjRNDQ',
                videoId: 'SXDvHgjRNDQ',
              }
            ],
            documents: [
              {
                title: 'Introduction to SCM',
                url: 'https://docs.google.com/presentation/d/1yC2Tct2l9ciX34-08PIbLLkvqk3Q3bJD/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Inventory Management',
                url: 'https://docs.google.com/presentation/d/1ZhOvlPh7V0nfpttHG1YJ19u_nNxT4Z8-/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Supply Chain Risk Management',
                url: 'https://docs.google.com/presentation/d/1M0K0gK7-6UbCtq7Qi39mqZDLDMlJ9k2p/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Technology in Supply Chain Management',
                url: 'https://docs.google.com/presentation/d/1XSCY2287CNovLPrLpfsS4UBmZM-wYrIH/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
            ],
            quizId: 'cscp-m1-quiz',
          },
          {
            title: 'Procurement and Strategy',
            videos: [
              {
                title: 'Procurement and Supplier Management',
                duration: 35,
                url: 'https://www.youtube.com/watch?v=bPgheptnmWs',
                videoId: 'bPgheptnmWs',
              },
              {
                title: 'Strategic Sourcing and Global Procurement',
                duration: 40,
                url: 'https://www.youtube.com/watch?v=WKeCZqB2qaA',
                videoId: 'WKeCZqB2qaA',
              },
              {
                title: 'Lean and Agile Supply Chain Strategies',
                duration: 38,
                url: 'https://www.youtube.com/watch?v=c/WorldofProcurement',
                videoId: 'c/WorldofProcurement',
              }
            ],
            documents: [
              {
                title: 'Procurement and Supplier Management',
                url: 'https://docs.google.com/presentation/d/16AQqJBa8Q-iiZtuaq46bPylG3HULX5h4/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Strategic Sourcing and Global Procurement',
                url: 'https://docs.google.com/presentation/d/1cxjhIFrRe0bTzR8H9Xo9WFFadffy-DLW/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Lean and Agile Supply Chain Strategies',
                url: 'https://docs.google.com/presentation/d/1FGIOR5p-5NiTXp99bkNPp3T0pke-BIjN/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              }
            ],
            quizId: 'cscp-m2-quiz',
          },
          {
            title: 'Logistics and Sustainability',
            videos: [
              {
                title: 'Logistics and Distribution Management',
                duration: 42,
                url: 'https://www.youtube.com/watch?v=p3-JiamZALw',
                videoId: 'p3-JiamZALw',
              },
              {
                title: 'Production and Operations Management',
                duration: 39,
                url: 'https://www.youtube.com/watch?v=operationsmanagement101',
                videoId: 'operationsmanagement101',
              },
              {
                title: 'Sustainability and Ethics in Supply Chain',
                duration: 45,
                url: 'https://www.youtube.com/watch?v=a0VFCFBV9nI',
                videoId: 'a0VFCFBV9nI',
              }
            ],
            documents: [
              {
                title: 'Transport, Logistics and Distribution Management',
                url: 'https://docs.google.com/presentation/d/1aX0MMkHBIIUfg9k1wdjy998UyCV6zYPl/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Production and Operations Management',
                url: 'https://docs.google.com/presentation/d/1r0XXI8OgZ2V3oPQ5o5BxKZeMeCEqDtoS/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Sustainability and Ethics in Supply Chain',
                url: 'https://docs.google.com/presentation/d/1a8jRCsho6xYxTRKeVIysr2aBNzL78fB2/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              }
            ],
            quizId: 'cscp-m3-quiz',
          }
        ],
        liveClassConfig: {
          enabled: true,
          frequency: 'weekly',
          dayOfWeek: 'Thursday',
          durationMin: 90,
        },
      });
      await cscpCourse.save();
      console.log('CSCP course created:', cscpCourse._id);
    } else {
      console.log('CSCP course already exists:', cscpCourse._id);
    }
    
    // Create enrollment for Peter Parker in CSCP course
    console.log('Creating enrollment...');
    let enrollment = await Enrollment.findOne({ 
      studentId: peterStudent._id,
      courseSlug: cscpCourse.slug
    });
    
    if (!enrollment) {
      enrollment = new Enrollment({
        studentId: peterStudent._id,
        courseSlug: cscpCourse.slug,
        enrollDate: new Date('2025-05-01'), // Enrolled on May 1, 2025
        validUntil: new Date('2026-05-01'), // Valid for 1 year
        completedModules: [
          {
            moduleIndex: 0,
            completed: true,
            completedAt: new Date('2025-05-08')  // Completed Module 1
          },
          {
            moduleIndex: 1,
            completed: false,
            completedAt: null  // Currently working on Module 2
          }
        ],
        quizAttempts: [
          {
            quizId: 'cscp-m1-quiz',
            score: 85,
            maxScore: 100,
            attemptedAt: new Date('2025-05-08'),
            passed: true,
          }
        ],
      });
      await enrollment.save();
      console.log('Enrollment created:', enrollment._id);
    } else {
      console.log('Enrollment already exists:', enrollment._id);
    }
    
    // Create live classes for CSCP course
    console.log('Creating live classes...');
    const liveClassExists = await LiveClass.findOne({
      courseSlug: cscpCourse.slug,
      title: 'Supply Chain Risk Management Strategies'
    });
    
    if (!liveClassExists) {
      const liveClass1 = new LiveClass({
        title: 'Supply Chain Risk Management Strategies',
        courseSlug: cscpCourse.slug,
        description: 'Learn practical approaches to identifying, assessing, and mitigating supply chain risks.',
        meetLink: 'https://meet.agi.online/cscp-risk-management',
        startTime: new Date('2025-05-16T18:00:00Z'), // May 16, 2025, 6:00 PM UTC
        endTime: new Date('2025-05-16T19:30:00Z'),   // 90 minutes duration
        status: 'scheduled',
      });
      await liveClass1.save();
      console.log('Live class created:', liveClass1._id);
      
      const liveClass2 = new LiveClass({
        title: 'Sustainable Supply Chain Practices',
        courseSlug: cscpCourse.slug,
        description: 'Explore environmental and social responsibility in supply chain management.',
        meetLink: 'https://meet.agi.online/cscp-sustainability',
        startTime: new Date('2025-05-23T18:00:00Z'), // May 23, 2025, 6:00 PM UTC
        endTime: new Date('2025-05-23T19:30:00Z'),   // 90 minutes duration
        status: 'scheduled',
      });
      await liveClass2.save();
      console.log('Live class created:', liveClass2._id);
    } else {
      console.log('Live classes already exist for this course');
    }
    
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

seedCSCP();