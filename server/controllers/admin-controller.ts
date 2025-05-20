import nodemailer from 'nodemailer';
import path from 'path';
import { Request, Response } from 'express';
import { User } from '../models/user';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import { renderWelcomeHtml } from '../utils/emailTemplates';
import mongoose from 'mongoose';

// Get all students
export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const students = await Student.find().populate({
      path: 'enrollment',
      select: 'courseSlug enrollDate validUntil completedModules'
    });

    res.status(200).json(students);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific student
export const getStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const student = await Student.findById(id).populate({
      path: 'enrollment',
      select: 'courseSlug enrollDate validUntil completedModules'
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.status(200).json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      address,
      dob,
      pathway,
      courseSlug
    } = req.body;

    // Derive a simple username from email prefix
    const username = email.split('@')[0];

    // 1) Create the User account
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const user = new User({
      username,
      email,
      password,
      role: 'student'
    });
    await user.save();

    // 2) Create the Student profile
    const student = new Student({
      userId: user._id,
      name,
      phone,
      address,
      dob: dob ? new Date(dob) : undefined,
      pathway
    });
    await student.save();

    // 3) Enroll them in the selected course
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const enrollDate = new Date();
    const validUntil = new Date(enrollDate);
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const enrollment = new Enrollment({
      studentId:   student._id,
      courseSlug,
      enrollDate,
      validUntil,
      completedModules: [],
      quizAttempts:     [],
      watchTime:        []
    });
    await enrollment.save();

    // send email with login credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587/STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const text = `Hello ${name},

Your student account has been created on AGI.online!

Login details:
• Email: ${email}
• Temporary password: ${password}

Please sign in at ${process.env.APP_URL}/login and change your password right away.

Happy learning!
AGI.online Team
`;

    const html = renderWelcomeHtml({
      name,
      email,
      tempPassword: password,
      appUrl: process.env.APP_URL!,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      replyTo: process.env.SUPPORT_EMAIL,
      subject: 'Welcome to American Global Institute – Your Student Account',
      text,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.resolve('client/src/components/layout/AGI Logo.png'),
          cid: 'agiLogo'   // referenced in renderWelcomeHtml
        }
      ]
    })
    .then(info => console.log('Welcome email sent:', info.messageId))
    .catch(err => console.error('Error sending welcome email:', err));

    // 4) Return the newly created student record
    res.status(201).json({
      message: 'Student created and enrolled successfully',
      student: {
        id:       student._id,
        userId:   user._id,
        name:     student.name,
        pathway:  student.pathway,
        enrollDate: enrollment.enrollDate,
        validUntil: enrollment.validUntil
      }
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update student
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, address, dob, pathway } = req.body;
    
    const student = await Student.findById(id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update fields
    if (name) student.name = name;
    if (phone) student.phone = phone;
    if (address) student.address = address;
    if (dob) student.dob = new Date(dob);
    if (pathway) student.pathway = pathway;
    
    await student.save();
    
    res.status(200).json({
      message: 'Student updated successfully',
      student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete student
export const deleteStudent = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    
    const student = await Student.findById(id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find and delete associated user
    const user = await User.findOne({ _id: student.userId });
    
    if (user) {
      await User.deleteOne({ _id: user._id }, { session });
    }
    
    // Delete enrollments
    await Enrollment.deleteMany({ studentId: student._id }, { session });
    
    // Delete student
    await Student.deleteOne({ _id: student._id }, { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const upcomingLiveClasses = await LiveClass.countDocuments({ 
      startTime: { $gte: new Date() },
      status: 'scheduled'
    });
    
    // Get new students this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const newStudentsThisMonth = await Student.countDocuments({
      createdAt: { $gte: firstDayOfMonth }
    });
    
    // Get course types breakdown
    const standaloneCourses = await Course.countDocuments({ type: 'standalone' });
    const mbaCourses = await Course.countDocuments({ type: 'with-mba' });
    
    // Get next upcoming live class
    const nextLiveClass = await LiveClass.findOne({
      startTime: { $gte: new Date() },
      status: 'scheduled'
    }).sort({ startTime: 1 });
    
    res.status(200).json({
      totalStudents,
      totalCourses,
      totalEnrollments,
      upcomingLiveClasses,
      newStudentsThisMonth,
      coursesBreakdown: {
        standalone: standaloneCourses,
        withMba: mbaCourses
      },
      nextLiveClass
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
