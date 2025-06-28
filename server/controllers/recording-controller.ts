import { Request, Response } from 'express';
import { Recording } from '../models/recording';
import { Course } from '../models/course';
import { Student } from '../models/student';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
// No longer needed - we're using Google Drive links instead of file uploads

// Admin: Get all recordings
export const getAllRecordings = async (req: Request, res: Response) => {
  try {
    const recordings = await Recording.find().sort({ uploadedAt: -1 });
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Failed to fetch recordings' });
  }
};

// Admin: Get recordings by course
export const getRecordingsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseSlug } = req.params;
    const recordings = await Recording.find({ courseSlug }).sort({ uploadedAt: -1 });
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings by course:', error);
    res.status(500).json({ message: 'Failed to fetch recordings' });
  }
};

// Student: Get recordings for enrolled courses
export const getStudentRecordings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get student by user ID
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get student's enrolled courses
    const enrollments = await Enrollment.find({ studentId: student._id });
    const enrolledCourseSlugs = enrollments.map(e => e.courseSlug);

    // Get recordings for enrolled courses
    const recordings = await Recording.find({ 
      courseSlug: { $in: enrolledCourseSlugs },
      isVisible: true
    }).sort({ uploadedAt: -1 });

    res.json(recordings);
  } catch (error) {
    console.error('Error fetching student recordings:', error);
    res.status(500).json({ message: 'Failed to fetch recordings' });
  }
};

// Student: Get recordings for a specific course
export const getStudentRecordingsByCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug } = req.params;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({ 
      studentId: student._id, 
      courseSlug 
    });
    
    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Get visible recordings for the course
    const recordings = await Recording.find({ 
      courseSlug,
      isVisible: true
    }).sort({ uploadedAt: -1 });

    res.json(recordings);
  } catch (error) {
    console.error('Error fetching student course recordings:', error);
    res.status(500).json({ message: 'Failed to fetch recordings' });
  }
};

// Admin: Create new recording
export const createRecording = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug, classDate, title, description, fileUrl, isVisible } = req.body;

    // Validate required fields
    if (!courseSlug || !classDate || !title || !fileUrl) {
      return res.status(400).json({ 
        message: 'Missing required fields: courseSlug, classDate, title, fileUrl' 
      });
    }

    // Validate that fileUrl is a Google Drive link
    if (!fileUrl.includes('drive.google.com')) {
      return res.status(400).json({ 
        message: 'Please provide a valid Google Drive link' 
      });
    }

    const recording = new Recording({
      courseSlug,
      classDate: new Date(classDate),
      title,
      description: description || '',
      fileUrl,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
      isVisible: isVisible !== undefined ? isVisible === true || isVisible === 'true' : true,
    });

    await recording.save();
    res.status(201).json(recording);
  } catch (error) {
    console.error('Error creating recording:', error);
    res.status(500).json({ message: 'Failed to create recording' });
  }
};

// Admin: Update recording
export const updateRecording = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingRecording = await Recording.findById(id);
    if (!existingRecording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Parse updates
    const updates: any = { ...req.body };
    if (updates.isVisible !== undefined) {
      updates.isVisible = updates.isVisible === 'true' || updates.isVisible === true;
    }
    if (updates.classDate) {
      updates.classDate = new Date(updates.classDate);
    }

    const updatedRecording = await Recording.findByIdAndUpdate(
      id, 
      updates, 
      { new: true }
    );
    res.json(updatedRecording);
  } catch (error) {
    console.error('Error updating recording:', error);
    res.status(500).json({ message: 'Failed to update recording' });
  }
};

// Admin: Delete recording
export const deleteRecording = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recording = await Recording.findById(id);
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    await Recording.findByIdAndDelete(id);
    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ message: 'Failed to delete recording' });
  }
};

// Get single recording (for both admin and student)
export const getRecording = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recording = await Recording.findById(id);
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // For students, check if they have access to this recording
    if (req.user?.role === 'student') {
      const student = await Student.findOne({ userId: req.user.id });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const enrollment = await Enrollment.findOne({ 
        studentId: student._id, 
        courseSlug: recording.courseSlug 
      });
      
      if (!enrollment || !recording.isVisible) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(recording);
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ message: 'Failed to fetch recording' });
  }
}; 