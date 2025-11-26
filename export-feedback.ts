import 'dotenv/config';
import mongoose from 'mongoose';
import { Feedback } from './server/models/feedback.js';
import { connectDB } from './server/db.js';
import fs from 'fs';

async function exportFeedback() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB');

    // Fetch all completed feedbacks
    const feedbacks = await Feedback.find({ isCompleted: true })
      .sort({ submittedAt: -1 })
      .lean();

    console.log(`Found ${feedbacks.length} feedback records`);

    if (feedbacks.length === 0) {
      console.log('No feedback data found');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Format the data for markdown
    let markdown = `# Student Feedback Data Export\n\n`;
    markdown += `**Export Date:** ${new Date().toISOString()}\n`;
    markdown += `**Total Feedbacks:** ${feedbacks.length}\n\n`;
    markdown += `---\n\n`;

    // Calculate statistics
    const totalFeedbacks = feedbacks.length;
    const avgOverallRating = feedbacks.reduce((sum: number, f: any) => sum + f.overallRating, 0) / totalFeedbacks;
    const avgContentRating = feedbacks.reduce((sum: number, f: any) => sum + f.contentRating, 0) / totalFeedbacks;
    
    let totalTeacherRatings = 0;
    let teacherRatingCount = 0;
    feedbacks.forEach((feedback: any) => {
      feedback.teacherRatings.forEach((rating: any) => {
        totalTeacherRatings += rating.rating;
        teacherRatingCount++;
      });
    });
    const avgTeacherRating = teacherRatingCount > 0 ? totalTeacherRatings / teacherRatingCount : 0;

    // Course-wise statistics
    const courseStats: Record<string, any> = {};
    feedbacks.forEach((feedback: any) => {
      if (!courseStats[feedback.courseSlug]) {
        courseStats[feedback.courseSlug] = {
          courseName: feedback.courseName,
          count: 0,
          avgOverall: 0,
          avgContent: 0
        };
      }
      courseStats[feedback.courseSlug].count++;
      courseStats[feedback.courseSlug].avgOverall += feedback.overallRating;
      courseStats[feedback.courseSlug].avgContent += feedback.contentRating;
    });

    Object.keys(courseStats).forEach(courseSlug => {
      const stats = courseStats[courseSlug];
      stats.avgOverall = stats.avgOverall / stats.count;
      stats.avgContent = stats.avgContent / stats.count;
    });

    markdown += `## Summary Statistics\n\n`;
    markdown += `- **Total Feedbacks:** ${totalFeedbacks}\n`;
    markdown += `- **Average Overall Rating:** ${avgOverallRating.toFixed(2)} / 5.00\n`;
    markdown += `- **Average Content Rating:** ${avgContentRating.toFixed(2)} / 5.00\n`;
    markdown += `- **Average Teacher Rating:** ${avgTeacherRating.toFixed(2)} / 5.00\n\n`;

    markdown += `### Course-Wise Statistics\n\n`;
    Object.keys(courseStats).forEach(courseSlug => {
      const stats = courseStats[courseSlug];
      markdown += `#### ${stats.courseName}\n`;
      markdown += `- **Total Feedbacks:** ${stats.count}\n`;
      markdown += `- **Average Overall Rating:** ${stats.avgOverall.toFixed(2)} / 5.00\n`;
      markdown += `- **Average Content Rating:** ${stats.avgContent.toFixed(2)} / 5.00\n\n`;
    });

    markdown += `---\n\n`;
    markdown += `## Detailed Feedback Records\n\n`;

    // Add each feedback record
    feedbacks.forEach((feedback: any, index: number) => {
      markdown += `### Feedback #${index + 1}\n\n`;
      markdown += `**Student Information:**\n`;
      markdown += `- **Name:** ${feedback.studentName}\n`;
      markdown += `- **Email:** ${feedback.studentEmail}\n`;
      markdown += `- **Phone:** ${feedback.studentPhone}\n\n`;
      
      markdown += `**Course Information:**\n`;
      markdown += `- **Course Name:** ${feedback.courseName}\n`;
      markdown += `- **Course Slug:** ${feedback.courseSlug}\n\n`;
      
      markdown += `**Ratings:**\n`;
      markdown += `- **Overall Course Rating:** ${feedback.overallRating} / 5 ⭐\n`;
      markdown += `- **Content Rating:** ${feedback.contentRating} / 5 ⭐\n\n`;
      
      markdown += `**Teacher Ratings:**\n`;
      feedback.teacherRatings.forEach((rating: any, idx: number) => {
        markdown += `${idx + 1}. **${rating.teacherName}:** ${rating.rating} / 5 ⭐\n`;
      });
      markdown += `\n`;
      
      markdown += `**Written Feedback:**\n`;
      markdown += `\`\`\`\n${feedback.feedbackText}\n\`\`\`\n\n`;
      
      markdown += `**Submission Details:**\n`;
      markdown += `- **Submitted At:** ${new Date(feedback.submittedAt).toLocaleString()}\n`;
      markdown += `- **Feedback ID:** ${feedback._id}\n`;
      markdown += `- **Student ID:** ${feedback.studentId}\n\n`;
      
      markdown += `---\n\n`;
    });

    // Write to file
    const filename = `student-feedback-export-${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, markdown, 'utf8');
    console.log(`Feedback data exported to ${filename}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error exporting feedback:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

exportFeedback();

