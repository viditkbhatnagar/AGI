import cron from 'node-cron';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { LiveClass } from '../models/liveclass';
import { Student } from '../models/student';
import { renderLiveClassReminderHtml } from '../utils/emailTemplates';
import path from 'path';

// Track which reminders have been sent to avoid duplicates
const sentReminders = new Set<string>();

// Helper function to create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Helper function to get students with emails for a live class
const getStudentsWithEmails = async (studentIds: mongoose.Types.ObjectId[]) => {
  const students = await Student.find({ _id: { $in: studentIds } })
    .populate({ path: 'userId', select: 'email' })
    .select('name userId');
  
  return students.filter((s: any) => s.userId?.email);
};

// Function to send reminder emails for upcoming classes
export const sendLiveClassReminders = async () => {
  try {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const thirtyTwoMinutesFromNow = new Date(now.getTime() + 32 * 60 * 1000); // 32 minutes from now (2-minute window)

    // Find live classes starting in 30-32 minutes
    const upcomingClasses = await LiveClass.find({
      status: 'scheduled',
      startTime: {
        $gte: thirtyMinutesFromNow,
        $lte: thirtyTwoMinutesFromNow
      }
    });

    for (const liveClass of upcomingClasses) {
      const reminderKey = `${liveClass._id}_${liveClass.startTime.getTime()}`;
      
      // Skip if reminder already sent for this class
      if (sentReminders.has(reminderKey)) {
        continue;
      }

      try {
        const students = await getStudentsWithEmails(liveClass.studentIds);
        
        if (students.length > 0) {
          const transporter = createEmailTransporter();

          // Format time for email
          const whenPretty = liveClass.startTime.toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Asia/Dubai',
          });

          await Promise.all(
            students.map((student: any) => {
              const html = renderLiveClassReminderHtml({
                name: student.name,
                title: liveClass.title,
                startTime: liveClass.startTime,
                meetLink: liveClass.meetLink,
              });

              return transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: student.userId.email,
                subject: `🔔 Live Class Starting Soon: ${liveClass.title}`,
                text: `Hi ${student.name || 'Student'},\n\nReminder: Your live class "${liveClass.title}" is starting in 30 minutes at ${whenPretty}.\n\nJoin: ${liveClass.meetLink}\n\nSee you in class!\nAGI.online`,
                html,
                attachments: [
                  {
                    filename: 'logo.png',
                    path: path.resolve('client/src/components/layout/AGI Logo.png'),
                    cid: 'agiLogo',
                  },
                ],
              });
            })
          );

          // Mark reminder as sent
          sentReminders.add(reminderKey);
          
          console.log(`✅ Reminder emails sent to ${students.length} students for class: ${liveClass.title}`);
        }
      } catch (error) {
        console.error(`❌ Error sending reminder for class ${liveClass.title}:`, error);
      }
    }

    // Clean up old reminder keys (remove reminders older than 24 hours)
    const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;
    for (const key of sentReminders) {
      const timestamp = parseInt(key.split('_')[1]);
      if (timestamp < twentyFourHoursAgo) {
        sentReminders.delete(key);
      }
    }

  } catch (error) {
    console.error('❌ Error in reminder service:', error);
  }
};

// Start the reminder service
export const startReminderService = () => {
  console.log('🔔 Starting Live Class Reminder Service...');
  
  // Run every 2 minutes to check for upcoming classes
  cron.schedule('*/2 * * * *', () => {
    sendLiveClassReminders();
  });

  console.log('✅ Reminder service started - checking every 2 minutes for classes starting in 30 minutes');
};

// Stop the reminder service (for testing or shutdown)
export const stopReminderService = () => {
  cron.destroy();
  console.log('🔔 Reminder service stopped');
};

 