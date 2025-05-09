import { Request, Response } from 'express';
import { User } from '../models/user';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
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

// Create a new student and user
export const createStudent = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { name, email, password, phone, address, dob, pathway } = req.body;
    
    // Create user first
    const username = email.split('@')[0]; // Simple username generation
    
    const newUser = new User({
      username,
      email,
      password,
      role: 'student'
    });
    
    await newUser.save({ session });
    
    // Then create student record
    const newStudent = new Student({
      name,
      phone: phone || '',
      address: address || '',
      dob: dob ? new Date(dob) : null,
      pathway,
      userId: newUser._id
    });
    
    await newStudent.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      message: 'Student created successfully',
      student: newStudent
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Create student error:', error);
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
