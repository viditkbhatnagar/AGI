/**
 * Comprehensive database seeding script
 * - Creates users, students, courses, enrollments, and live classes
 * - Adds real course data for Certified Investment Associate and Certified Supply Chain Professional
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../db';
import { User } from '../models/user';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import Quiz from '../models/quiz';

// Course data
const coursesData = {
  "certified-supply-chain-professional": {
    title: "Certified Supply Chain Professional",
    slug: "certified-supply-chain-professional",
    type: "standalone",
    description: "This certification covers all aspects of supply chain management from procurement to logistics",
    modules: [
      {
        title: "Supply Chain Fundamentals",
        videos: [
          {
            title: "Introduction to Supply Chain Management",
            duration: 45,
            url: "https://www.youtube.com/watch?v=xIY097gEXjk",
          },
          {
            title: "Procurement and Supplier Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=bPgheptnmWs",
          }
        ],
        documents: [
          {
            title: "Unit specifications and Assessment_Certified Supply Chain Professional",
            url: "https://docs.google.com/document/d/1Kl1_z9n9hDplq6jVSnlRgKQdif_CPAMR/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Introduction to SCM",
            url: "https://docs.google.com/presentation/d/1yC2Tct2l9ciX34-08PIbLLkvqk3Q3bJD/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Procurement and Supplier Management",
            url: "https://docs.google.com/presentation/d/16AQqJBa8Q-iiZtuaq46bPylG3HULX5h4/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cscp-module-1-quiz",
      },
      {
        title: "Operations and Inventory",
        videos: [
          {
            title: "Production and Operations Management",
            duration: 55,
            url: "https://www.youtube.com/watch?v=0ZDrpf5aMiw",
          },
          {
            title: "Inventory Management",
            duration: 45,
            url: "https://www.youtube.com/watch?v=0ZDrpf5aMiw",
          }
        ],
        documents: [
          {
            title: "Production and Operations Management",
            url: "https://docs.google.com/presentation/d/1r0XXI8OgZ2V3oPQ5o5BxKZeMeCEqDtoS/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Inventory Management",
            url: "https://docs.google.com/presentation/d/1ZhOvlPh7V0nfpttHG1YJ19u_nNxT4Z8-/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cscp-module-2-quiz",
      },
      {
        title: "Logistics and Distribution",
        videos: [
          {
            title: "Logistics and Distribution Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=p3-JiamZALw",
          }
        ],
        documents: [
          {
            title: "Transport, Logistics and Distribution Management",
            url: "https://docs.google.com/presentation/d/1aX0MMkHBIIUfg9k1wdjy998UyCV6zYPl/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cscp-module-3-quiz",
      },
      {
        title: "Risk Management and Strategy",
        videos: [
          {
            title: "Supply Chain Risk Management",
            duration: 40,
            url: "https://www.youtube.com/watch?v=Cu1ZUBCiMHw",
          },
          {
            title: "Lean and Agile Supply Chain Strategies",
            duration: 45,
            url: "https://www.youtube.com/watch?v=c/WorldofProcurement",
          }
        ],
        documents: [
          {
            title: "Supply Chain Risk Management",
            url: "https://docs.google.com/presentation/d/1M0K0gK7-6UbCtq7Qi39mqZDLDMlJ9k2p/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Lean and Agile Supply Chain Strategies",
            url: "https://docs.google.com/presentation/d/1FGIOR5p-5NiTXp99bkNPp3T0pke-BIjN/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cscp-module-4-quiz",
      },
      {
        title: "Global Supply Chain",
        videos: [
          {
            title: "Strategic Sourcing and Global Procurement",
            duration: 55,
            url: "https://www.youtube.com/watch?v=WKeCZqB2qaA",
          },
          {
            title: "Technology in Supply Chain Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=SXDvHgjRNDQ",
          },
          {
            title: "Sustainability and Ethics in Supply Chain",
            duration: 45,
            url: "https://www.youtube.com/watch?v=a0VFCFBV9nI",
          }
        ],
        documents: [
          {
            title: "Strategic Sourcing and Global Procurement",
            url: "https://docs.google.com/presentation/d/1cxjhIFrRe0bTzR8H9Xo9WFFadffy-DLW/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Technology in Supply Chain Management",
            url: "https://docs.google.com/presentation/d/1XSCY2287CNovLPrLpfsS4UBmZM-wYrIH/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Sustainability and Ethics in Supply Chain",
            url: "https://docs.google.com/presentation/d/1a8jRCsho6xYxTRKeVIysr2aBNzL78fB2/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cscp-module-5-quiz",
      }
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "biweekly",
      dayOfWeek: "Thursday",
      durationMin: 90,
    }
  },
  "certified-investment-associate": {
    title: "Certified Investment Associate",
    slug: "certified-investment-associate",
    type: "standalone",
    description: "This certification prepares you for roles in financial services with a focus on investment products, regulations, and client management",
    modules: [
      {
        title: "Financial Services Overview",
        videos: [
          {
            title: "U.S. Financial Services Overview & Client Types",
            duration: 45,
            url: "https://www.youtube.com/watch?v=1tE9sUcTuJw",
          },
          {
            title: "Fundamentals of Investment Products",
            duration: 50,
            url: "https://www.youtube.com/watch?v=gn5zSwzTSL8",
          }
        ],
        documents: [
          {
            title: "Unit Specifications Certified Investment Management Associate",
            url: "https://docs.google.com/document/d/1lJP4dTHU91gCPRaAW1N5Rdiq-ptpVBIT/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Investment Management Overview",
            url: "https://docs.google.com/presentation/d/1GXyfWieUR9bsceClGxDDXcfUUM5SpQfw/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cia-module-1-quiz",
      },
      {
        title: "Investment Funds and Retirement",
        videos: [
          {
            title: "Mutual Fund and Retirement Plan Structures",
            duration: 55,
            url: "https://www.youtube.com/watch?v=jkUABXJkZmg",
          },
          {
            title: "Basics of Insurance and Annuities",
            duration: 40,
            url: "https://www.youtube.com/watch?v=kHOxvNpA4Go",
          }
        ],
        documents: [
          {
            title: "Risk Measurement and Management",
            url: "https://docs.google.com/presentation/d/1ZYUr7EJ3CA6-2zLKHUtQvnhWo9RaSFM5/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Portfolio Construction and Management",
            url: "https://docs.google.com/presentation/d/11UZiR71wXazOaKj6hy2F18LzIAwvypOm/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cia-module-2-quiz",
      },
      {
        title: "Brokerage and Compliance",
        videos: [
          {
            title: "Brokerage Operations & Trade Support",
            duration: 45,
            url: "https://www.youtube.com/watch?v=nZL4nxRkKk8",
          },
          {
            title: "Compliance, KYC & FINRA Rules",
            duration: 50,
            url: "https://www.youtube.com/watch?v=EvXz2cdu3Fo",
          },
          {
            title: "Ethics, Suitability, and Fiduciary Standards",
            duration: 60,
            url: "https://www.youtube.com/watch?v=YZK3ySGL7Gk",
          }
        ],
        documents: [
          {
            title: "Investment Policy",
            url: "https://docs.google.com/presentation/d/1-0Nc9oMlSBEZv5FIkhtxycicg4GPoRCT/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Ethics in Investment Management",
            url: "https://docs.google.com/presentation/d/1gAPX8NemVgQvMN8xw4aWH_BiTYxndghi/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Capital Markets",
            url: "https://docs.google.com/presentation/d/1zKWRf6iWM6kvduiAV379U0c3lQ63XAuu/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Alternative Investments",
            url: "https://docs.google.com/presentation/d/1P7y0idi-xU16xbuh7wI9wwBwMWdTJQAe/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
        quizId: "cia-module-3-quiz",
      }
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  }
};

// Generate upcoming live classes for a course
function generateLiveClasses(courseSlug: string, count: number = 3) {
  const courseData = coursesData[courseSlug as keyof typeof coursesData];
  if (!courseData) return [];
  
  const classes = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const dayOffset = 3 + (i * 7); // Starting 3 days from now, then weekly
    const startTime = new Date(today);
    startTime.setDate(today.getDate() + dayOffset);
    startTime.setHours(18, 0, 0, 0); // 6 PM
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + courseData.liveClassConfig.durationMin);
    
    const moduleIndex = i % courseData.modules.length;
    
    classes.push({
      title: `${courseData.title}: ${courseData.modules[moduleIndex].title} Session`,
      courseSlug: courseSlug,
      description: `Live session covering key concepts from ${courseData.modules[moduleIndex].title}`,
      meetLink: `https://meet.google.com/${courseSlug}-session-${i + 1}`,
      startTime: startTime,
      endTime: endTime,
      status: 'scheduled',
    });
  }
  
  return classes;
}

// Main seed function
async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
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
    
    // Create Peter Parker student user
    console.log('Creating Peter Parker student user...');
    const peterUser = new User({
      username: 'peterparker',
      email: 'peter@example.com',
      password: 'password', // will be hashed by the model pre-save hook
      role: 'student',
    });
    await peterUser.save();
    console.log('Peter Parker user created:', peterUser._id);
    
    // Create Peter Parker student profile
    console.log('Creating Peter Parker student profile...');
    const peter = new Student({
      name: 'Peter Parker',
      userId: peterUser._id,
      pathway: 'standalone',
      address: '20 Ingram St, Forest Hills, NY',
      phone: '+17185551212',
      dob: new Date(2000, 5, 12), // June 12, 2000
    });
    await peter.save();
    console.log('Student profile created:', peter._id);
    
    // Create Bruce Wayne student user
    console.log('Creating Bruce Wayne student user...');
    const bruceUser = new User({
      username: 'brucewayne',
      email: 'bruce@example.com',
      password: 'password',
      role: 'student',
    });
    await bruceUser.save();
    console.log('Bruce Wayne user created:', bruceUser._id);

    console.log('Creating Bruce Wayne student profile...');
    const bruce = new Student({
      name: 'Bruce Wayne',
      userId: bruceUser._id,
      pathway: 'standalone',
      address: '1007 Mountain Drive, Gotham',
      phone: '+17035551234',
      dob: new Date(1990, 1, 19), // Feb 19, 1990
    });
    await bruce.save();
    console.log('Student profile created:', bruce._id);

    // Create courses from data
    console.log('Creating courses...');
    const coursePromises = Object.values(coursesData).map(async (courseData) => {
      const course = new Course(courseData);
      await course.save();
      console.log(`Course created: ${course.title} (${course._id})`);
      return course;
    });

    const courses = await Promise.all(coursePromises);

    // Seed quizzes for each course module
    console.log('Seeding quizzes for each course module...');
    const quizTemplate = [
      { options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      { options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
      { options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
      { options: ['A', 'B', 'C', 'D'], correctIndex: 3 },
      { options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
    ];
    for (const [slug, courseDataItem] of Object.entries(coursesData)) {
      const course = courses.find(c => c.slug === slug);
      if (!course) continue;
      for (let idx = 0; idx < courseDataItem.modules.length; idx++) {
        const mod = courseDataItem.modules[idx];
        const questions = quizTemplate.map((tpl, qIdx) => ({
          prompt: `${mod.title} - Question ${qIdx + 1}`,
          options: tpl.options,
          correctIndex: tpl.correctIndex
        }));
        const quiz = new Quiz({ courseSlug: slug, moduleIndex: idx, questions });
        await quiz.save();
        console.log(`Quiz created for ${slug} module ${idx}`);
      }
    }

    // Create enrollments for Peter in CSCP and Bruce in CIA (zero progress)
    console.log('Creating enrollments...');
    const enrollmentData = [
      {
        studentId: peter._id,
        courseSlug: 'certified-supply-chain-professional',
        enrollDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        validUntil: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000),
        completedModules: [],
        quizAttempts: [],
        watchTime: []
      },
      {
        studentId: bruce._id,
        courseSlug: 'certified-investment-associate',
        enrollDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000),
        completedModules: [],
        quizAttempts: [],
        watchTime: []
      }
    ];

    for (const data of enrollmentData) {
      const enrollment = new Enrollment(data);
      await enrollment.save();
      let studentName = data.studentId.equals(peter._id) ? peter.name : bruce.name;
      console.log(`Enrollment created for ${studentName} in ${data.courseSlug} (${enrollment._id})`);
    }
    
    // Create live classes
    console.log('Creating live classes...');
    let allLiveClasses = [];
    
    // Generate live classes for each course
    for (const courseSlug of Object.keys(coursesData)) {
      const liveClasses = generateLiveClasses(courseSlug, 3);
      allLiveClasses = [...allLiveClasses, ...liveClasses];
    }
    
    // Save all live classes
    for (const liveClassData of allLiveClasses) {
      const liveClass = new LiveClass(liveClassData);
      await liveClass.save();
      console.log(`Live class created: ${liveClass.title} (${liveClass._id})`);
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

// Execute the seed function
seed();