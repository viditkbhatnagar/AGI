import mongoose from 'mongoose';
import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { LiveClass } from '../models/liveclass';
import { Course } from '../models/course';
import { Student } from '../models/student';
import { Enrollment } from '../models/enrollment';
import { renderLiveClassHtml } from '../utils/emailTemplates';
import path from 'path';
import ics from 'ics';



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

    // Utility formats
    const whenPretty = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
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
              startTime,
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
    const { title, description, meetLink, startTime, endTime, status } = req.body;
    
    const liveClass = await LiveClass.findById(id);
    
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }
    
    // Update fields
    if (title) liveClass.title = title;
    if (description !== undefined) liveClass.description = description;
    if (meetLink) liveClass.meetLink = meetLink;
    if (startTime) liveClass.startTime = new Date(startTime);
    if (endTime) liveClass.endTime = new Date(endTime);
    if (status) liveClass.status = status;
    
    await liveClass.save();
    
    res.status(200).json({
      message: 'Live class updated successfully',
      liveClass
    });
  } catch (error) {
    console.error('Update live class error:', error);
    res.status(500).json({ message: 'Server error' });
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
    
    await LiveClass.deleteOne({ _id: id });
    
    res.status(200).json({ message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('Delete live class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
