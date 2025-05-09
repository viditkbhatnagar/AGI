/**
 * Script to update CSCP course with real content
 */
import mongoose from 'mongoose';
import { Course } from './models/course';
import { connectDB } from './db';

async function updateCSCP() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Find the CSCP course
    const cscpCourse = await Course.findOne({ slug: 'certified-supply-chain-professional' });
    
    if (!cscpCourse) {
      console.log('CSCP course not found. Please run seed-cscp.ts first.');
      return;
    }
    
    console.log('Found CSCP course:', cscpCourse._id);
    
    // Update with exact YouTube videos and Google Doc URLs
    cscpCourse.modules = [
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
          }
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
    ];
    
    // Save the updated course
    await cscpCourse.save();
    console.log('CSCP course updated successfully with real content');
    
    mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error updating CSCP:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

updateCSCP();