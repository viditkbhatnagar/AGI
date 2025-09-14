import { Request, Response } from 'express';
import { Feedback } from '../models/feedback';
import { Student } from '../models/student';
import { User } from '../models/user';
import { Enrollment } from '../models/enrollment';
import { Course } from '../models/course';
import { TeacherAssignment } from '../models/teacher-assignment';
import mongoose from 'mongoose';

// Get student's enrollment data and feedback status for all courses
export const getStudentFeedbackData = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const studentId = req.user.id;

    // Get student details
    const student = await Student.findOne({ userId: studentId });
    const user = await User.findById(studentId);

    if (!student || !user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get student's enrollments using the student document ID (enrollment uses Student._id)
    const enrollments = await Enrollment.find({ studentId: student._id });

    if (!enrollments || enrollments.length === 0) {
      return res.status(404).json({ message: 'No course enrollments found' });
    }

    // Get course details
    const courseSlugs = enrollments.map(e => e.courseSlug);
    const courses = await Course.find({ slug: { $in: courseSlugs } });

    // Get existing feedback for all courses
    const existingFeedbacks = await Feedback.find({ 
      studentId,
      courseSlug: { $in: courseSlugs }
    });

    // Get teachers assigned to these courses
    const teacherAssignments = await TeacherAssignment.find({ 
      courseSlug: { $in: courseSlugs } 
    }).populate('teacherId', 'username email');

    // Build course data with feedback status and teachers
    const coursesWithFeedback = courses.map(course => {
      const existingFeedback = existingFeedbacks.find(f => f.courseSlug === course.slug);
      const courseTeachers = teacherAssignments
        .filter(assignment => assignment.courseSlug === course.slug)
        .map(assignment => ({
          id: (assignment.teacherId as any)._id,
          name: (assignment.teacherId as any).username,
          email: (assignment.teacherId as any).email
        }));

      return {
        slug: course.slug,
        title: course.title,
        feedbackCompleted: !!existingFeedback,
        existingFeedback: existingFeedback || null,
        teachers: courseTeachers
      };
    });

    res.json({
      student: {
        id: studentId,
        name: student.name,
        email: user.email,
        phone: student.phone || ''
      },
      courses: coursesWithFeedback
    });
  } catch (error) {
    console.error('Get feedback data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get feedback data for a specific course
export const getCourseFeedbackData = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug } = req.params;
    const studentId = req.user.id;

    // Get student details
    const student = await Student.findOne({ userId: studentId });
    const user = await User.findById(studentId);

    if (!student || !user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ 
      studentId: student._id,
      courseSlug 
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    // Get course details
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get teachers for this course
    const teacherAssignments = await TeacherAssignment.find({ 
      courseSlug 
    }).populate('teacherId', 'username email');

    const teachers = teacherAssignments.map(assignment => ({
      id: (assignment.teacherId as any)._id,
      name: (assignment.teacherId as any).username,
      email: (assignment.teacherId as any).email
    }));

    // Check for existing feedback
    const existingFeedback = await Feedback.findOne({ 
      studentId,
      courseSlug 
    });

    res.json({
      student: {
        id: studentId,
        name: student.name,
        email: user.email,
        phone: student.phone || ''
      },
      course: {
        slug: course.slug,
        title: course.title
      },
      teachers,
      existingFeedback: existingFeedback || null
    });
  } catch (error) {
    console.error('Get course feedback data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit feedback for a specific course
export const submitCourseFeedback = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug } = req.params;
    const studentId = req.user.id;
    const {
      studentName,
      studentEmail,
      studentPhone,
      overallRating,
      contentRating,
      teacherRatings,
      feedbackText
    } = req.body;

    // Validation
    if (!studentName || !studentEmail || !studentPhone || !feedbackText) {
      return res.status(400).json({ message: 'All basic fields are required' });
    }

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ message: 'Overall rating must be between 1 and 5 stars' });
    }

    if (!contentRating || contentRating < 1 || contentRating > 5) {
      return res.status(400).json({ message: 'Content rating must be between 1 and 5 stars' });
    }

    if (!teacherRatings || !Array.isArray(teacherRatings)) {
      return res.status(400).json({ message: 'Teacher ratings are required' });
    }

    // Validate teacher ratings
    for (const rating of teacherRatings) {
      if (!rating.teacherId || !rating.teacherName || !rating.rating) {
        return res.status(400).json({ message: 'All teacher rating fields are required' });
      }
      if (rating.rating < 1 || rating.rating > 5) {
        return res.status(400).json({ message: 'All teacher ratings must be between 1 and 5 stars' });
      }
    }

    // Word count validation
    const wordCount = feedbackText.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
    if (wordCount > 2000) {
      return res.status(400).json({ message: 'Feedback cannot exceed 2000 words' });
    }

    // Get student details to verify enrollment
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ 
      studentId: student._id,
      courseSlug 
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    // Get course details
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if feedback already exists (update) or create new
    const existingFeedback = await Feedback.findOne({ 
      studentId,
      courseSlug 
    });

    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.studentName = studentName;
      existingFeedback.studentEmail = studentEmail;
      existingFeedback.studentPhone = studentPhone;
      existingFeedback.courseName = course.title;
      existingFeedback.overallRating = overallRating;
      existingFeedback.contentRating = contentRating;
      existingFeedback.teacherRatings = teacherRatings;
      existingFeedback.feedbackText = feedbackText;
      existingFeedback.submittedAt = new Date();
      existingFeedback.isCompleted = true;

      await existingFeedback.save();

      res.json({
        message: 'Feedback updated successfully',
        feedback: existingFeedback
      });
    } else {
      // Create new feedback
      const newFeedback = new Feedback({
        studentId,
        studentName,
        studentEmail,
        studentPhone,
        courseSlug,
        courseName: course.title,
        overallRating,
        contentRating,
        teacherRatings,
        feedbackText,
        isCompleted: true
      });

      await newFeedback.save();

      res.json({
        message: 'Feedback submitted successfully',
        feedback: newFeedback
      });
    }
  } catch (error) {
    console.error('Submit feedback error:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ message: 'Feedback for this course already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Check if student has completed feedback for a specific course
export const checkCourseFeedbackStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug } = req.params;
    const studentId = req.user.id;

    const feedback = await Feedback.findOne({ 
      studentId,
      courseSlug,
      isCompleted: true 
    });

    res.json({
      hasCompletedFeedback: !!feedback,
      feedbackId: feedback?._id || null
    });
  } catch (error) {
    console.error('Check feedback status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all feedbacks for admin/superadmin
export const getAllFeedbacks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find({ isCompleted: true })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalFeedbacks = await Feedback.countDocuments({ isCompleted: true });

    res.json({
      feedbacks,
      totalFeedbacks,
      currentPage: page,
      totalPages: Math.ceil(totalFeedbacks / limit)
    });
  } catch (error) {
    console.error('Get all feedbacks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get feedback statistics for admin dashboard
export const getFeedbackStats = async (req: Request, res: Response) => {
  try {
    const totalFeedbacks = await Feedback.countDocuments({ isCompleted: true });
    
    const feedbacks = await Feedback.find({ isCompleted: true });
    
    if (feedbacks.length === 0) {
      return res.json({
        totalFeedbacks: 0,
        avgOverallRating: 0,
        avgContentRating: 0,
        avgTeacherRating: 0,
        courseStats: {}
      });
    }

    // Calculate averages
    const avgOverallRating = feedbacks.reduce((sum, f) => sum + f.overallRating, 0) / feedbacks.length;
    const avgContentRating = feedbacks.reduce((sum, f) => sum + f.contentRating, 0) / feedbacks.length;
    
    // Calculate average teacher rating
    let totalTeacherRatings = 0;
    let teacherRatingCount = 0;
    feedbacks.forEach(feedback => {
      feedback.teacherRatings.forEach(rating => {
        totalTeacherRatings += rating.rating;
        teacherRatingCount++;
      });
    });
    const avgTeacherRating = teacherRatingCount > 0 ? totalTeacherRatings / teacherRatingCount : 0;

    // Course-wise statistics
    const courseStats: { [key: string]: any } = {};
    feedbacks.forEach(feedback => {
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

    // Calculate averages for each course
    Object.keys(courseStats).forEach(courseSlug => {
      const stats = courseStats[courseSlug];
      stats.avgOverall = stats.avgOverall / stats.count;
      stats.avgContent = stats.avgContent / stats.count;
    });

    res.json({
      totalFeedbacks,
      avgOverallRating: Math.round(avgOverallRating * 100) / 100,
      avgContentRating: Math.round(avgContentRating * 100) / 100,
      avgTeacherRating: Math.round(avgTeacherRating * 100) / 100,
      courseStats
    });
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};