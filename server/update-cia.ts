/**
 * Script to update CIA course with real content
 */
import mongoose from 'mongoose';
import { Course } from './models/course';
import { connectDB } from './db';

async function updateOrCreateCIA() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Find the CIA course or create a new one
    let ciaCourse = await Course.findOne({ slug: 'certified-investment-associate' });
    
    if (!ciaCourse) {
      console.log('CIA course not found. Creating new course...');
      ciaCourse = new Course({
        title: 'Certified Investment Associate',
        slug: 'certified-investment-associate',
        type: 'standalone',
        liveClassConfig: {
          enabled: true,
          frequency: 'biweekly',
          dayOfWeek: 'Tuesday',
          durationMin: 90,
        },
      });
    }
    
    console.log('Adding content to CIA course');
    
    // Update with exact YouTube videos and Google Doc URLs
    ciaCourse.modules = [
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
    ];
    
    // Save the updated/created course
    await ciaCourse.save();
    console.log('CIA course updated successfully with real content');
    
    mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error updating CIA:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

updateOrCreateCIA();