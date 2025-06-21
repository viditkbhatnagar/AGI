import mongoose from 'mongoose';
import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { LiveClass } from '../models/liveclass';
import { Course } from '../models/course';
import { Student } from '../models/student';
import { Enrollment } from '../models/enrollment';
import { renderLiveClassHtml, renderLiveClassUpdateHtml, renderLiveClassCancellationHtml, renderLiveClassReminderHtml } from '../utils/emailTemplates';
import path from 'path';
import ics from 'ics';

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

// Create a new live class
export const createLiveClass = async (req: Request, res: Response) => {
  try {
    const { courseSlug, title, description, meetLink, startTime, endTime, studentIds } = req.body;
    
    // Check if course exists
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Validate and convert studentIds to ObjectId[]
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds must be a non-empty array' });
    }
    const studentObjectIds = studentIds.map((id: string) => new mongoose.Types.ObjectId(id));
    
    // Create new live class
    const newLiveClass = new LiveClass({
      courseSlug,
      title,
      description: description || '',
      meetLink,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'scheduled',
      studentIds: studentObjectIds
    });
    
    await newLiveClass.save();

    // Utility formats - format for Gulf Standard Time (GMT+4)
    const whenPretty = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Dubai', // Gulf Standard Time
    });

    // Google‑Calendar share link (UTC times, basic template)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]|\.000Z/g, '').slice(0, 15) + 'Z';
    const addToCal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent(
      `Join link: ${meetLink}`
    )}&location=${encodeURIComponent(
      'Online'
    )}&dates=${fmt(new Date(startTime))}/${fmt(new Date(endTime))}`;

    // .ics file
    const { error: icsErr, value: icsVal } = ics.createEvent({
      title,
      description,
      start: [
        new Date(startTime).getUTCFullYear(),
        new Date(startTime).getUTCMonth() + 1,
        new Date(startTime).getUTCDate(),
        new Date(startTime).getUTCHours(),
        new Date(startTime).getUTCMinutes(),
      ],
      end: [
        new Date(endTime).getUTCFullYear(),
        new Date(endTime).getUTCMonth() + 1,
        new Date(endTime).getUTCDate(),
        new Date(endTime).getUTCHours(),
        new Date(endTime).getUTCMinutes(),
      ],
      location: 'Online (Google Meet)',
      url: meetLink,
    });
    const icsAttachment = icsErr
      ? null
      : {
          filename: `${title}.ics`,
          content: icsVal,
          method: 'REQUEST',
          contentType: 'text/calendar',
        };

    // -- EMAIL NOTIFICATION LOGIC START --
    try {
      // load student records along with their user document to get e‑mail
      const students = await Student.find({ _id: { $in: studentObjectIds } })
        .populate({ path: 'userId', select: 'email' })  // userId.email
        .select('name userId');

      const emails = students
        .map((s: any) => s.userId?.email)
        .filter(Boolean); // remove undefined

      if (emails.length) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        // send one e‑mail per recipient (or you could bcc in bulk)
        await Promise.all(
          students.map((student: any) => {
            const htmlBase = renderLiveClassHtml({
              name: student.name,
              title,
              startTime: new Date(startTime),
              meetLink,
            });

            const html =
              htmlBase +
              `<p style="text-align:center;margin-top:24px;">
                 <a href="${addToCal}"
                    style="display:inline-block;background:#3b82f6;color:#ffffff !important;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
                   Add to Google Calendar
                 </a>
               </p>`;

            return transporter.sendMail({
              from: process.env.SMTP_FROM,
              to: student.userId.email,
              subject: `New Live Class Scheduled: ${title}`,
              text: `Hi ${student.name || 'Student'},\n\nA new live class "${title}" is scheduled for ${whenPretty}.\nJoin: ${meetLink}\nAdd to calendar: ${addToCal}\n\nCheers,\nAGI.online`,
              html,
              attachments: [
                {
                  filename: 'logo.png',
                  path: path.resolve('client/src/components/layout/AGI Logo.png'),
                  cid: 'agiLogo',
                },
                ...(icsAttachment ? [icsAttachment] : []),
              ],
            });
          })
        );
      } else {
        console.warn('No valid emails found for selected students');
      }
    } catch (mailError) {
      console.error('Error sending live class emails:', mailError);
    }
    // -- EMAIL NOTIFICATION LOGIC END --

    res.status(201).json({
      message: 'Live class created successfully',
      liveClass: newLiveClass
    });
  } catch (error) {
    console.error('Create live class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all live classes
export const getAllLiveClasses = async (req: Request, res: Response) => {
  try {
    const liveClasses = await LiveClass.find()
      .sort({ startTime: 1 });
    
    res.status(200).json(liveClasses);
  } catch (error) {
    console.error('Get all live classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get upcoming live classes
export const getUpcomingLiveClasses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const liveClasses = await LiveClass.find({
      studentIds: student._id,
      status: 'scheduled',
    }).sort({ startTime: -1 });
    
    res.status(200).json(liveClasses);
  } catch (error) {
    console.error('Get upcoming live classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get live classes by course
export const getLiveClassesByCourse = async (req: Request, res: Response) => {
  try {
    const { courseSlug } = req.params;
    
    const liveClasses = await LiveClass.find({ courseSlug })
      .sort({ startTime: 1 });
    
    res.status(200).json(liveClasses);
  } catch (error) {
    console.error('Get live classes by course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get live classes for student
export const getStudentLiveClasses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Fetch all scheduled classes (past and future) for this student, newest first
    const liveClasses = await LiveClass.find({
      studentIds: student._id,
      status: 'scheduled'
    }).sort({ startTime: -1 });
    
    // Add course details to each live class
    const liveClassesWithCourses = await Promise.all(
      liveClasses.map(async (liveClass) => {
        const course = await Course.findOne({ slug: liveClass.courseSlug });
        return {
          ...liveClass.toObject(),
          course: course ? {
            slug: course.slug,
            title: course.title
          } : null
        };
      })
    );
    
    res.status(200).json(liveClassesWithCourses);
  } catch (error) {
    console.error('Get student live classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update live class
export const updateLiveClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, meetLink, startTime, endTime, status, studentIds } = req.body;
    
    const liveClass = await LiveClass.findById(id);
    
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Store original values for email comparison
    const originalStartTime = liveClass.startTime;
    const originalEndTime = liveClass.endTime;
    const originalStudentIds = [...liveClass.studentIds];
    
    // Check if timing is being changed
    const timingChanged = startTime && (
      new Date(startTime).getTime() !== originalStartTime.getTime() ||
      (endTime && new Date(endTime).getTime() !== originalEndTime.getTime())
    );


    
    // Update fields
    if (title) liveClass.title = title;
    if (description !== undefined) liveClass.description = description;
    if (meetLink) liveClass.meetLink = meetLink;
    if (startTime) liveClass.startTime = new Date(startTime);
    if (endTime) liveClass.endTime = new Date(endTime);
    if (status) liveClass.status = status;

    // Update student assignments if provided
    if (Array.isArray(studentIds)) {
      const studentObjectIds = studentIds.map((sid: string) => new mongoose.Types.ObjectId(sid));
      liveClass.studentIds = studentObjectIds;
    }
    
    await liveClass.save();

    // Send email notification if timing was changed
    if (timingChanged) {
      try {
        const students = await getStudentsWithEmails(originalStudentIds);
        
        if (students.length > 0) {
          const transporter = createEmailTransporter();

          // Format times for email
          const oldWhen = originalStartTime.toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Asia/Dubai',
          });
          
          const newWhen = new Date(startTime).toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Asia/Dubai',
          });

          // Google Calendar link for new time
          const fmt = (d: Date) =>
            d.toISOString().replace(/[-:]|\.000Z/g, '').slice(0, 15) + 'Z';
          const addToCal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
            liveClass.title
          )}&details=${encodeURIComponent(
            `Join link: ${liveClass.meetLink}`
          )}&location=${encodeURIComponent(
            'Online'
          )}&dates=${fmt(new Date(startTime))}/${fmt(new Date(endTime || startTime))}`;

          await Promise.all(
            students.map((student: any) => {
              const htmlBase = renderLiveClassUpdateHtml({
                name: student.name,
                title: liveClass.title,
                oldStartTime: originalStartTime,
                newStartTime: new Date(startTime),
                meetLink: liveClass.meetLink,
              });

              const html = htmlBase.replace('{{ADD_TO_CAL}}', addToCal);

              return transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: student.userId.email,
                subject: `Live Class Time Updated: ${liveClass.title}`,
                text: `Hi ${student.name || 'Student'},\n\nThe timing for your live class "${liveClass.title}" has been updated.\n\nPrevious Time: ${oldWhen}\nNew Time: ${newWhen}\n\nJoin: ${liveClass.meetLink}\nAdd to calendar: ${addToCal}\n\nCheers,\nAGI.online`,
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

          console.log(`✅ Time update emails sent to ${students.length} students for class: ${liveClass.title}`);
        }
      } catch (mailError) {
        console.error('Error sending live class update emails:', mailError);
      }
    }
    
    res.status(200).json({
      message: 'Live class updated successfully',
      liveClass
    });
  } catch (error) {
    console.error('Update live class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET a single live class by ID
 */
export const getLiveClassById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ message: "Live class not found" });
    }
    res.json(liveClass);
  } catch (err) {
    console.error("Error in getLiveClassById:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete live class
export const deleteLiveClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const liveClass = await LiveClass.findById(id);
    
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Store class details before deletion for email
    const classTitle = liveClass.title;
    const classStartTime = liveClass.startTime;
    const classStudentIds = [...liveClass.studentIds];
    
    // Send cancellation emails before deleting
    try {
      const students = await getStudentsWithEmails(classStudentIds);
      
      if (students.length > 0) {
        const transporter = createEmailTransporter();

        await Promise.all(
          students.map((student: any) => {
            const html = renderLiveClassCancellationHtml({
              name: student.name,
              title: classTitle,
              startTime: classStartTime,
            });

            const whenPretty = classStartTime.toLocaleString('en-US', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'Asia/Dubai',
            });

            return transporter.sendMail({
              from: process.env.SMTP_FROM,
              to: student.userId.email,
              subject: `Live Class Cancelled: ${classTitle}`,
              text: `Hi ${student.name || 'Student'},\n\nWe regret to inform you that the live class "${classTitle}" scheduled for ${whenPretty} has been cancelled.\n\nWe apologize for any inconvenience. We will notify you as soon as a new session is scheduled.\n\nCheers,\nAGI.online`,
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

        console.log(`✅ Cancellation emails sent to ${students.length} students for class: ${classTitle}`);
      }
    } catch (mailError) {
      console.error('Error sending live class cancellation emails:', mailError);
    }
    
    await LiveClass.deleteOne({ _id: id });
    
    res.status(200).json({ message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('Delete live class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


