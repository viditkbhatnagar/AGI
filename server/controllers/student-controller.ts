import { Request, Response } from 'express';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import mongoose from 'mongoose';

// Get student dashboard data
export const getDashboard = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find student by user ID
    const student = await Student.findOne({ userId: req.user.id })
      .populate({
        path: 'enrollment',
        populate: {
          path: 'courseSlug',
          model: 'Course'
        }
      });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get enrollments for this student
    const enrollments = await Enrollment.find({ studentId: student._id });
    
    // Get courses data
    const courseData = [];
    for (const enrollment of enrollments) {
      const course = await Course.findOne({ slug: enrollment.courseSlug });
      if (course) {
        // Calculate progress
        const totalModules = course.modules.length;
        const completedModules = enrollment.completedModules.filter(m => m.completed).length;
        const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
        
        courseData.push({
          slug: course.slug,
          title: course.title,
          type: course.type,
          progress,
          totalModules,
          completedModules,
          enrollment: {
            enrollDate: enrollment.enrollDate,
            validUntil: enrollment.validUntil
          }
        });
      }
    }
    
    // Calculate total watch time
    const totalWatchTime = student.watchTime.reduce((total, record) => total + record.duration, 0);
    
    // Get this week's watch time
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const thisWeekWatchTime = student.watchTime
      .filter(record => new Date(record.date) >= startOfWeek)
      .reduce((total, record) => total + record.duration, 0);
    
    // Get upcoming live classes
    const upcomingLiveClasses = await LiveClass.find({
      courseSlug: { $in: enrollments.map(e => e.courseSlug) },
      startTime: { $gte: new Date() },
      status: 'scheduled'
    }).sort({ startTime: 1 }).limit(5);
    
    // Get certification progress
    // This is a placeholder - real logic would depend on certification requirements
    const certificationProgress = Math.min(courseData[0]?.progress || 0, 100);
    
    res.status(200).json({
      student: {
        id: student._id,
        name: student.name,
        pathway: student.pathway
      },
      courseProgress: courseData[0]?.progress || 0,
      completedModules: `${courseData[0]?.completedModules || 0} of ${courseData[0]?.totalModules || 0}`,
      watchTime: {
        total: formatWatchTime(totalWatchTime),
        thisWeek: formatWatchTime(thisWeekWatchTime)
      },
      certificationProgress,
      course: courseData[0] || null,
      upcomingLiveClasses
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Record watch time
export const recordWatchTime = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { moduleIndex, videoIndex, duration } = req.body;
    
    if (typeof moduleIndex !== 'number' || typeof videoIndex !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({ message: 'Invalid input data' });
    }
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Add watch time record
    student.watchTime.push({
      date: new Date(),
      moduleIndex,
      videoIndex,
      duration
    });
    
    await student.save();
    
    res.status(200).json({ message: 'Watch time recorded successfully' });
  } catch (error) {
    console.error('Record watch time error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get student profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find student by user ID
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.status(200).json({
      id: student._id,
      name: student.name,
      phone: student.phone,
      address: student.address,
      dob: student.dob,
      pathway: student.pathway,
      notifySettings: student.notifySettings
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update student profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { name, phone, address } = req.body;
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update fields
    if (name) student.name = name;
    if (phone) student.phone = phone;
    if (address) student.address = address;
    
    await student.save();
    
    res.status(200).json({
      message: 'Profile updated successfully',
      student: {
        id: student._id,
        name: student.name,
        phone: student.phone,
        address: student.address
      }
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update notification settings
export const updateNotifySettings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseProgress, quizSummary, certificateReady } = req.body;
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update notification settings
    if (courseProgress) {
      student.notifySettings.courseProgress = courseProgress;
    }
    
    if (quizSummary) {
      student.notifySettings.quizSummary = quizSummary;
    }
    
    if (certificateReady) {
      student.notifySettings.certificateReady = certificateReady;
    }
    
    await student.save();
    
    res.status(200).json({
      message: 'Notification settings updated successfully',
      notifySettings: student.notifySettings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to format watch time from seconds to hours and minutes
function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
}
