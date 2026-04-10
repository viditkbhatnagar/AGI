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

    const { courseSlug, moduleIndex, classDate, title, description, fileUrl, isVisible } = req.body;

    // Validate required fields
    if (!courseSlug || moduleIndex === undefined || !classDate || !title || !fileUrl) {
      return res.status(400).json({ 
        message: 'Missing required fields: courseSlug, moduleIndex, classDate, title, fileUrl' 
      });
    }

    // Validate moduleIndex
    if (moduleIndex < 0 || !Number.isInteger(moduleIndex)) {
      return res.status(400).json({ 
        message: 'Module index must be a non-negative integer' 
      });
    }

    // Basic URL validation (allow any provider such as Google Drive or OneDrive)
    if (!/^https?:\/\//i.test(fileUrl)) {
      return res.status(400).json({ 
        message: 'Please provide a valid shareable link (http or https)' 
      });
    }

    const recording = new Recording({
      courseSlug,
      moduleIndex,
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

// Get recordings for a specific course and module
export const getRecordingsByCourseAndModule = async (req: Request, res: Response) => {
  try {
    const { courseSlug, moduleIndex } = req.params;
    const moduleIndexNum = parseInt(moduleIndex);

    if (isNaN(moduleIndexNum) || moduleIndexNum < 0) {
      return res.status(400).json({ message: 'Invalid module index' });
    }

    console.log(`🎥 [getRecordingsByCourseAndModule] Course: ${courseSlug}, Module: ${moduleIndexNum}`);

    let query: any = { 
      courseSlug, 
      moduleIndex: moduleIndexNum,
      isVisible: true 
    };

    // For student requests, verify enrollment
    if (req.user?.role === 'student') {
      const student = await Student.findOne({ userId: req.user.id });
      if (!student) {
        console.log(`🎥 [getRecordingsByCourseAndModule] Student not found for user: ${req.user.id}`);
        return res.status(404).json({ message: 'Student not found' });
      }

      // Check if student is enrolled in the course
      const enrollment = await Enrollment.findOne({ 
        studentId: student._id, 
        courseSlug 
      });
      
      if (!enrollment) {
        console.log(`🎥 [getRecordingsByCourseAndModule] Student not enrolled in course: ${courseSlug}`);
        return res.status(403).json({ message: 'Not enrolled in this course' });
      }

      console.log(`🎥 [getRecordingsByCourseAndModule] Student ${student.name} is enrolled in ${courseSlug}`);
    }

    // Fetch recordings for the specific module
    const recordings = await Recording.find(query)
      .sort({ classDate: 1, uploadedAt: 1 });

    console.log(`🎥 [getRecordingsByCourseAndModule] Found ${recordings.length} recordings for ${courseSlug} module ${moduleIndexNum}`);

    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings by course and module:', error);
    res.status(500).json({ message: 'Failed to fetch recordings' });
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

/**
 * Resolve a SharePoint/OneDrive share URL to a direct download URL.
 * Uses the SharePoint REST API v2.0 shares endpoint which works for
 * "Anyone with the link" shares without needing Graph API credentials.
 */
export const resolveSharePointUrl = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'url query parameter required' });
    }

    // Only allow sharepoint.com / onedrive URLs
    if (!url.includes('sharepoint.com') && !url.includes('1drv.ms') && !url.includes('onedrive.live.com')) {
      return res.status(400).json({ message: 'Not a SharePoint/OneDrive URL' });
    }

    // Encode the share URL as a sharing token:
    // 1. Base64 encode the URL
    // 2. Replace + with -, / with _, trim trailing =
    // 3. Prepend u!
    const base64 = Buffer.from(url).toString('base64');
    const shareToken = 'u!' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Extract the host from the URL for the API call
    const parsedUrl = new URL(url);
    const apiUrl = `${parsedUrl.origin}/_api/v2.0/shares/${shareToken}/driveItem?$select=id,name,@content.downloadUrl,file`;

    console.log(`🎥 [resolveSharePointUrl] Resolving: ${url.substring(0, 80)}...`);

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`🎥 [resolveSharePointUrl] SharePoint API returned ${response.status}`);
      // Fallback: try the download.aspx approach
      const m = url.match(/^(https:\/\/[^/]+)\/:[a-z]:\/[a-z]\/personal\/([^/]+)\/([^/?#]+)/i);
      const eMatch = url.match(/[?&]e=([^&#]+)/);
      if (m) {
        const downloadUrl = `${m[1]}/personal/${m[2]}/_layouts/15/download.aspx?share=${m[3]}${eMatch ? '&e=' + eMatch[1] : ''}`;
        return res.json({ downloadUrl, fallback: true });
      }
      return res.status(502).json({ message: 'Failed to resolve SharePoint URL' });
    }

    const data = await response.json();
    const downloadUrl = data['@content.downloadUrl'];

    if (!downloadUrl) {
      console.warn('🎥 [resolveSharePointUrl] No download URL in response');
      return res.status(502).json({ message: 'No download URL available - file may not be shared publicly' });
    }

    console.log(`🎥 [resolveSharePointUrl] Resolved successfully`);
    res.json({ downloadUrl, name: data.name, mimeType: data.file?.mimeType });
  } catch (error) {
    console.error('Error resolving SharePoint URL:', error);
    res.status(500).json({ message: 'Failed to resolve SharePoint URL' });
  }
};