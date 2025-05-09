import { Request, Response } from 'express';
import { Enrollment } from '../models/enrollment';
import { Student } from '../models/student';
import { Course } from '../models/course';
import mongoose from 'mongoose';

// Create a new enrollment
export const createEnrollment = async (req: Request, res: Response) => {
  try {
    const { studentId, courseSlug, validMonths } = req.body;
    
    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if course exists
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseSlug
    });
    
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Student is already enrolled in this course' });
    }
    
    // Calculate valid until date
    const enrollDate = new Date();
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + (validMonths || 12)); // Default to 12 months
    
    // Create new enrollment
    const newEnrollment = new Enrollment({
      studentId,
      courseSlug,
      enrollDate,
      validUntil,
      completedModules: [],
      quizAttempts: []
    });
    
    await newEnrollment.save();
    
    // Update student's enrollment reference
    student.enrollment = newEnrollment._id;
    await student.save();
    
    res.status(201).json({
      message: 'Enrollment created successfully',
      enrollment: newEnrollment
    });
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all enrollments
export const getAllEnrollments = async (req: Request, res: Response) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('studentId', 'name')
      .sort({ enrollDate: -1 });
    
    res.status(200).json(enrollments);
  } catch (error) {
    console.error('Get all enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get enrollments by course
export const getEnrollmentsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseSlug } = req.params;
    
    const enrollments = await Enrollment.find({ courseSlug })
      .populate('studentId', 'name')
      .sort({ enrollDate: -1 });
    
    res.status(200).json(enrollments);
  } catch (error) {
    console.error('Get enrollments by course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get enrollments by student
export const getEnrollmentsByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const enrollments = await Enrollment.find({ studentId })
      .sort({ enrollDate: -1 });
    
    // Get course details for each enrollment
    const enrollmentsWithCourses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await Course.findOne({ slug: enrollment.courseSlug });
        return {
          ...enrollment.toObject(),
          course: course ? {
            slug: course.slug,
            title: course.title,
            type: course.type
          } : null
        };
      })
    );
    
    res.status(200).json(enrollmentsWithCourses);
  } catch (error) {
    console.error('Get enrollments by student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update enrollment (extend validity)
export const updateEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { validUntil } = req.body;
    
    const enrollment = await Enrollment.findById(id);
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Update valid until date if provided
    if (validUntil) {
      enrollment.validUntil = new Date(validUntil);
    }
    
    await enrollment.save();
    
    res.status(200).json({
      message: 'Enrollment updated successfully',
      enrollment
    });
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete enrollment
export const deleteEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const enrollment = await Enrollment.findById(id);
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Find student and remove enrollment reference
    const student = await Student.findById(enrollment.studentId);
    if (student && student.enrollment && student.enrollment.toString() === id) {
      student.enrollment = undefined;
      await student.save();
    }
    
    await Enrollment.deleteOne({ _id: id });
    
    res.status(200).json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Record module completion
export const completeModule = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug, moduleIndex } = req.body;
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      courseSlug
    });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Check if module exists in course
    const course = await Course.findOne({ slug: courseSlug });
    if (!course || !course.modules[moduleIndex]) {
      return res.status(404).json({ message: 'Module not found' });
    }
    
    // Find or create module completion record
    const existingModuleCompletion = enrollment.completedModules.find(
      m => m.moduleIndex === moduleIndex
    );
    
    if (existingModuleCompletion) {
      existingModuleCompletion.completed = true;
      existingModuleCompletion.completedAt = new Date();
    } else {
      enrollment.completedModules.push({
        moduleIndex,
        completed: true,
        completedAt: new Date()
      });
    }
    
    await enrollment.save();
    
    res.status(200).json({
      message: 'Module marked as completed',
      moduleIndex
    });
  } catch (error) {
    console.error('Complete module error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Record quiz attempt
export const recordQuizAttempt = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug, quizId, score, maxScore } = req.body;
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      courseSlug
    });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Add quiz attempt
    enrollment.quizAttempts.push({
      quizId,
      score,
      maxScore,
      attemptedAt: new Date(),
      passed: score >= (maxScore * 0.7) // 70% passing threshold
    });
    
    await enrollment.save();
    
    res.status(200).json({
      message: 'Quiz attempt recorded successfully',
      quizId,
      score,
      maxScore,
      passed: score >= (maxScore * 0.7)
    });
  } catch (error) {
    console.error('Record quiz attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
