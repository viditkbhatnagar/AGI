import nodemailer from 'nodemailer';
import path from 'path';
import { Request, Response } from 'express';
import { User } from '../models/user';
import { Student } from '../models/student';
import { TeacherAssignment } from '../models/teacher-assignment';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import { renderWelcomeHtml } from '../utils/emailTemplates';
import mongoose from 'mongoose';

// Get all students
export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const students = await Student.find()
      .populate({
        path: 'enrollment',
        select: 'courseSlug enrollDate validUntil completedModules'
      })
      .populate({
        path: 'userId',
        select: 'accessEnabled email username',
        model: 'User'
      });

    // Transform the data to include accessEnabled at the student level for easier frontend access
    const studentsWithAccess = students.map(student => ({
      ...student.toObject(),
      accessEnabled: (student.userId as any)?.accessEnabled !== false
    }));

    res.status(200).json(studentsWithAccess);
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
      courseSlugs
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

    // 3) Enroll them in the selected courses
    if (!Array.isArray(courseSlugs) || courseSlugs.length === 0) {
      return res.status(400).json({ message: 'At least one course must be selected' });
    }
    const enrollDate = new Date();
    const validUntil = new Date(enrollDate);
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    await Promise.all(
      courseSlugs.map(async (slug: string) => {
        const course = await Course.findOne({ slug });
        if (!course) {
          throw new Error(`Course not found: ${slug}`);
        }
        const enrollment = new Enrollment({
          studentId:       student._id,
          courseSlug:      slug,
          enrollDate,
          validUntil,
          completedModules: [],
          quizAttempts:     [],
          watchTime:        []
        });
        await enrollment.save();
      })
    );

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
      courseTitle: courseSlugs.join(', '),
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
        courseSlugs
      }
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create teacher
export const createTeacher = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      email,
      password,
      name,
      phone,
      address,
      courseSlugs
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
      role: 'teacher'
    });
    await user.save({ session });

    // 2) Assign teacher to courses
    if (!Array.isArray(courseSlugs) || courseSlugs.length === 0) {
      return res.status(400).json({ message: 'At least one course must be assigned' });
    }

    // Verify all courses exist
    const courses = await Course.find({ slug: { $in: courseSlugs } });
    if (courses.length !== courseSlugs.length) {
      return res.status(400).json({ message: 'Some courses not found' });
    }

    // Create teacher assignments
    await Promise.all(
      courseSlugs.map(async (slug: string) => {
        const assignment = new TeacherAssignment({
          teacherId: user._id,
          courseSlug: slug,
          assignedBy: new mongoose.Types.ObjectId(req.user!.id)
        });
        await assignment.save({ session });
      })
    );

    // 3) Send welcome email to teacher
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const courseNames = courses.map(c => c.title).join(', ');
    
    const text = `Hello ${name},\n\nWelcome ${name} onboard! You have been assigned to teach the following courses: ${courseNames}\n\nHere are your credentials:\n• Email: ${email}\n• Temporary password: ${password}\n\nPlease sign in at ${process.env.APP_URL}/login and change your password.\n\nWelcome to the team!\nAGI.online Team`;

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome ${name} - Teacher Account</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="cid:agiLogo" alt="AGI Logo" style="max-width: 200px; height: auto;">
        </div>
        
        <h1 style="color: #0C5FB3; text-align: center;">Welcome ${name} Onboard!</h1>
        
        <p>Dear ${name},</p>
        
        <p>Welcome to the AGI.online teaching team! You have been assigned to teach the following courses:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Your Assigned Courses:</strong><br>
            ${courseNames}
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0C5FB3;">Here are your credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/login" style="background-color: #0C5FB3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Teacher Portal</a>
        </div>
        
        <p>Welcome to the team!</p>
        
        <p>Best regards,<br>The AGI.online Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent from AGI.online. Please do not reply to this email.
        </p>
    </div>
</body>
</html>`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      replyTo: process.env.SUPPORT_EMAIL,
      subject: `Welcome ${name} - Teacher Account Created`,
      text,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.resolve('client/src/components/layout/AGI Logo.png'),
          cid: 'agiLogo'
        }
      ]
    })
    .then((info: any) => console.log('Teacher welcome email sent:', info.messageId))
    .catch((err: any) => console.error('Error sending teacher welcome email:', err));

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Teacher created and assigned successfully',
      teacher: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: name,
        assignedCourses: courseSlugs
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error creating teacher:', error);
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

// Get all students' quiz scores
export const getAllStudentsQuizScores = async (req: Request, res: Response) => {
  try {
    const { courseSlug, studentId } = req.query;
    
    // Build query
    const enrollmentQuery: any = {};
    if (courseSlug) {
      enrollmentQuery.courseSlug = courseSlug;
    }
    if (studentId) {
      enrollmentQuery.studentId = studentId;
    }
    
    // Get enrollments with quiz attempts
    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate('studentId', 'name')
      .sort({ enrollDate: -1 });
    
    // Process and format the data
    const quizScoresData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await Course.findOne({ slug: enrollment.courseSlug });
        if (!course) return null;
        
        // Get module-wise quiz scores
        const moduleScores = await Promise.all(
          course.modules.map(async (module, moduleIndex) => {
            const moduleAttempts = enrollment.quizAttempts.filter(
              (attempt: any) => attempt.moduleIndex === moduleIndex
            );
            
            if (moduleAttempts.length === 0) {
              return {
                moduleIndex,
                moduleTitle: module.title,
                attempts: 0,
                bestScore: null,
                averageScore: null,
                lastAttempt: null
              };
            }
            
            const scores = moduleAttempts.map((a: any) => a.score);
            const bestScore = Math.max(...scores);
            const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const lastAttempt = moduleAttempts
              .sort((a: any, b: any) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())[0];
            
            return {
              moduleIndex,
              moduleTitle: module.title,
              attempts: moduleAttempts.length,
              bestScore,
              averageScore: Math.round(averageScore),
              lastAttempt: {
                score: lastAttempt.score,
                passed: lastAttempt.passed,
                attemptedAt: lastAttempt.attemptedAt
              }
            };
          })
        );
        
        // Calculate overall performance
        const allScores = enrollment.quizAttempts.map((a: any) => a.score);
        const overallAverage = allScores.length > 0
          ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
          : null;
        
        return {
          studentId: enrollment.studentId._id,
          studentName: (enrollment.studentId as any).name,
          courseSlug: enrollment.courseSlug,
          courseTitle: course.title,
          enrollDate: enrollment.enrollDate,
          totalQuizAttempts: enrollment.quizAttempts.length,
          overallAverage,
          moduleScores: moduleScores.filter(ms => ms !== null),
          completedModules: enrollment.completedModules.filter(m => m.completed).length,
          totalModules: course.modules.length
        };
      })
    );
    
    // Filter out null values
    const validQuizScores = quizScoresData.filter(data => data !== null);
    
    res.status(200).json(validQuizScores);
  } catch (error) {
    console.error('Get all students quiz scores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle student access status
export const toggleStudentAccess = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { accessEnabled } = req.body;

    console.log('Toggle access request:', { studentId, accessEnabled });

    // Find the student to get their userId
    const student = await Student.findById(studentId);
    if (!student) {
      console.log('Student not found:', studentId);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('Found student:', { studentId: student._id, userId: student.userId });

    // Update the user's access status
    const user = await User.findByIdAndUpdate(
      student.userId,
      { accessEnabled },
      { new: true }
    );

    if (!user) {
      console.log('User not found:', student.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updated user access:', { userId: user._id, accessEnabled: user.accessEnabled });

    res.status(200).json({
      message: `Student access ${accessEnabled ? 'enabled' : 'disabled'} successfully`,
      accessEnabled: user.accessEnabled,
      studentId,
      userId: user._id
    });
  } catch (error) {
    console.error('Toggle student access error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update teacher
export const updateTeacher = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { username, phone, address } = req.body;

    // Find the teacher user
    const teacher = await User.findById(id);
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Update teacher details
    if (username) teacher.username = username;
    // Note: Email is not updated as per requirements
    if (phone !== undefined) teacher.phone = phone;
    if (address !== undefined) teacher.address = address;
    
    await teacher.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      message: 'Teacher updated successfully',
      teacher: {
        _id: teacher._id,
        username: teacher.username,
        email: teacher.email,
        phone: teacher.phone,
        address: teacher.address,
        accessEnabled: teacher.accessEnabled,
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Update teacher error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete teacher
export const deleteTeacher = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    
    // Find the teacher
    const teacher = await User.findById(id);
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Delete teacher assignments
    await TeacherAssignment.deleteMany({ teacherId: teacher._id }, { session });
    
    // Delete the teacher user
    await User.deleteOne({ _id: teacher._id }, { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Delete teacher error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
