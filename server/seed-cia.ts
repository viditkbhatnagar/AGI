/**
 * Seed script to create Certified Investment Associate course data
 */

import mongoose from 'mongoose';
import { Course } from './models/course';
import { Student } from './models/student';
import { User } from './models/user';
import { Enrollment } from './models/enrollment';
import { LiveClass } from './models/liveclass';
import { connectDB } from './db';

async function seedCIA() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Find Peter Parker's student account by querying user first
    const peterUser = await User.findOne({ username: 'peterparker' });
    if (!peterUser) {
      throw new Error('Peter Parker user not found! Run seed.ts first.');
    }
    
    const peterStudent = await Student.findOne({ userId: peterUser._id });
    if (!peterStudent) {
      throw new Error('Peter Parker student profile not found! Run seed.ts first.');
    }
    console.log('Found Peter Parker student:', peterStudent._id);

    // Create the course if it doesn't exist
    console.log('Creating CIA course...');
    let ciaCourse = await Course.findOne({ slug: 'certified-investment-associate' });
    
    if (!ciaCourse) {
      ciaCourse = new Course({
        title: 'Certified Investment Associate',
        slug: 'certified-investment-associate',
        type: 'standalone',
        modules: [
          {
            title: 'Financial Markets and Products',
            videos: [
              {
                title: 'U.S. Financial Services Overview & Client Types',
                duration: 45,
                url: 'https://www.youtube.com/watch?v=1tE9sUcTuJw',
                videoId: '1tE9sUcTuJw',
              },
              {
                title: 'Fundamentals of Investment Products',
                duration: 38,
                url: 'https://www.youtube.com/watch?v=gn5zSwzTSL8',
                videoId: 'gn5zSwzTSL8',
              },
              {
                title: 'Mutual Fund and Retirement Plan Structures',
                duration: 42,
                url: 'https://www.youtube.com/watch?v=jkUABXJkZmg',
                videoId: 'jkUABXJkZmg',
              }
            ],
            documents: [
              {
                title: 'Unit Specifications Certified Investment Management Associate',
                url: 'https://docs.google.com/document/d/1lJP4dTHU91gCPRaAW1N5Rdiq-ptpVBIT/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Investment Management Overview',
                url: 'https://docs.google.com/presentation/d/1GXyfWieUR9bsceClGxDDXcfUUM5SpQfw/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Capital Markets',
                url: 'https://docs.google.com/presentation/d/1zKWRf6iWM6kvduiAV379U0c3lQ63XAuu/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              }
            ],
            quizId: 'cia-m1-quiz',
          },
          {
            title: 'Insurance and Operations',
            videos: [
              {
                title: 'Basics of Insurance and Annuities',
                duration: 35,
                url: 'https://www.youtube.com/watch?v=kHOxvNpA4Go',
                videoId: 'kHOxvNpA4Go',
              },
              {
                title: 'Brokerage Operations & Trade Support',
                duration: 40,
                url: 'https://www.youtube.com/watch?v=nZL4nxRkKk8',
                videoId: 'nZL4nxRkKk8',
              }
            ],
            documents: [
              {
                title: 'Portfolio Construction and Management',
                url: 'https://docs.google.com/presentation/d/11UZiR71wXazOaKj6hy2F18LzIAwvypOm/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Risk Measurement and Management',
                url: 'https://docs.google.com/presentation/d/1ZYUr7EJ3CA6-2zLKHUtQvnhWo9RaSFM5/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Investment Policy',
                url: 'https://docs.google.com/presentation/d/1-0Nc9oMlSBEZv5FIkhtxycicg4GPoRCT/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Financial Calculator NPV & IRR',
                url: 'https://drive.google.com/file/d/18slln9Bk7G7h66tUhEPY82y4hvy5r2BP/view?usp=share_link',
              }
            ],
            quizId: 'cia-m2-quiz',
          },
          {
            title: 'Ethics and Compliance',
            videos: [
              {
                title: 'Compliance, KYC & FINRA Rules',
                duration: 42,
                url: 'https://www.youtube.com/watch?v=EvXz2cdu3Fo',
                videoId: 'EvXz2cdu3Fo',
              },
              {
                title: 'Ethics, Suitability, and Fiduciary Standards',
                duration: 39,
                url: 'https://www.youtube.com/watch?v=YZK3ySGL7Gk',
                videoId: 'YZK3ySGL7Gk',
              }
            ],
            documents: [
              {
                title: 'Ethics in Investment Management',
                url: 'https://docs.google.com/presentation/d/1gAPX8NemVgQvMN8xw4aWH_BiTYxndghi/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'Alternative Investments',
                url: 'https://docs.google.com/presentation/d/1P7y0idi-xU16xbuh7wI9wwBwMWdTJQAe/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true',
              },
              {
                title: 'CIA Entry Level',
                url: 'https://docs.google.com/spreadsheets/d/1jLQ9y6F_dvvSBAOitljL_jO7yYp-LyI3TSIqZQATi8w/edit?usp=share_link',
              }
            ],
            quizId: 'cia-m3-quiz',
          }
        ],
        liveClassConfig: {
          enabled: true,
          frequency: 'biweekly',
          dayOfWeek: 'Tuesday',
          durationMin: 90,
        },
      });
      await ciaCourse.save();
      console.log('CIA course created:', ciaCourse._id);
    } else {
      console.log('CIA course already exists:', ciaCourse._id);
    }
    
    // Create enrollment for Peter Parker in CIA course
    console.log('Creating enrollment...');
    let enrollment = await Enrollment.findOne({ 
      studentId: peterStudent._id,
      courseSlug: ciaCourse.slug
    });
    
    if (!enrollment) {
      enrollment = new Enrollment({
        studentId: peterStudent._id,
        courseSlug: ciaCourse.slug,
        enrollDate: new Date('2025-04-15'), // Enrolled on April 15, 2025
        validUntil: new Date('2026-04-15'), // Valid for 1 year
        completedModules: [],
        quizAttempts: []
      });
      await enrollment.save();
      console.log('Enrollment created:', enrollment._id);
    } else {
      console.log('Enrollment already exists:', enrollment._id);
    }
    
    // Create live classes for CIA course
    console.log('Creating live classes...');
    const liveClassExists = await LiveClass.findOne({
      courseSlug: ciaCourse.slug,
      title: 'Investment Products Deep Dive'
    });
    
    if (!liveClassExists) {
      const liveClass1 = new LiveClass({
        title: 'Investment Products Deep Dive',
        courseSlug: ciaCourse.slug,
        description: 'A comprehensive exploration of investment products and their applications.',
        meetLink: 'https://meet.agi.online/cia-products',
        startTime: new Date('2025-05-20T19:00:00Z'), // May 20, 2025, 7:00 PM UTC
        endTime: new Date('2025-05-20T20:30:00Z'),   // 90 minutes duration
        status: 'scheduled',
      });
      await liveClass1.save();
      console.log('Live class created:', liveClass1._id);
      
      const liveClass2 = new LiveClass({
        title: 'Ethical Standards in Investment Management',
        courseSlug: ciaCourse.slug,
        description: 'Learn about ethical considerations and fiduciary responsibilities for investment professionals.',
        meetLink: 'https://meet.agi.online/cia-ethics',
        startTime: new Date('2025-06-03T19:00:00Z'), // June 3, 2025, 7:00 PM UTC
        endTime: new Date('2025-06-03T20:30:00Z'),   // 90 minutes duration
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

seedCIA();