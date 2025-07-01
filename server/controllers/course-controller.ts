import { Request, Response } from 'express';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { Student } from '../models/student';
import { desc } from 'drizzle-orm';

// Get all courses
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// List minimal course info for admin dropdowns
export const listCourses = async (req: Request, res: Response) => {
  try {
    // Fetch only slug and title for the dropdown
    const courses = await Course.find({}, 'slug title');
    res.status(200).json(courses);
  } catch (error) {
    console.error('List courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific course
export const getCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const course = await Course.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.status(200).json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new course
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { slug, title, type, liveClassConfig, modules, mbaModules } = req.body;
    
    // Check if course with this slug already exists
    const existingCourse = await Course.findOne({ slug });
    
    if (existingCourse) {
      return res.status(400).json({ message: 'Course with this slug already exists' });
    }
    
    // Filter out empty videos and documents from modules
    const cleanedModules = modules ? modules.map((module: any) => ({
      ...module,
      videos: module.videos ? module.videos.filter((video: any) => 
        video.title && video.title.trim() && video.url && video.url.trim()
      ) : [],
      documents: module.documents ? module.documents.filter((doc: any) => 
        doc.title && doc.title.trim() && doc.url && doc.url.trim()
      ) : []
    })) : [];

    const cleanedMbaModules = mbaModules ? mbaModules.map((module: any) => ({
      ...module,
      videos: module.videos ? module.videos.filter((video: any) => 
        video.title && video.title.trim() && video.url && video.url.trim()
      ) : [],
      documents: module.documents ? module.documents.filter((doc: any) => 
        doc.title && doc.title.trim() && doc.url && doc.url.trim()
      ) : []
    })) : [];

    // Create new course
    const newCourse = new Course({
      slug,
      title,
      type,
      liveClassConfig: liveClassConfig || {
        enabled: false,
        frequency: 'weekly',
        dayOfWeek: 'Monday',
        durationMin: 60
      },
      modules: cleanedModules,
      mbaModules: cleanedMbaModules
    });
    
    await newCourse.save();
    
    // Create quizzes for each module if quiz questions are provided
    if (modules && Array.isArray(modules)) {
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const module = modules[moduleIndex];
        if (module.quiz && module.quiz.questions && module.quiz.questions.length > 0) {
          // Import Quiz model
          const Quiz = (await import('../models/quiz')).default;
          
          // Transform quiz questions to match the expected format
          const quizQuestions = module.quiz.questions.map((q: any) => ({
            text: q.text,
            choices: q.choices,
            correctIndex: q.correctIndex
          }));
          
          const quiz = new Quiz({
            courseSlug: slug,
            moduleIndex: moduleIndex,
            questions: quizQuestions
          });
          
          await quiz.save();
        }
      }
    }
    
    res.status(201).json({
      message: 'Course created successfully',
      course: newCourse
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a course
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, type, liveClassConfig, modules, mbaModules } = req.body;
    
    const course = await Course.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Update fields
    if (title) course.title = title;
    if (type) course.type = type;
    if (liveClassConfig) course.liveClassConfig = liveClassConfig;
    
    if (modules) {
      // Filter out empty videos and documents
      const cleanedModules = modules.map((module: any) => ({
        ...module,
        videos: module.videos ? module.videos.filter((video: any) => 
          video.title && video.title.trim() && video.url && video.url.trim()
        ) : [],
        documents: module.documents ? module.documents.filter((doc: any) => 
          doc.title && doc.title.trim() && doc.url && doc.url.trim()
        ) : []
      }));
      course.modules = cleanedModules;
    }
    
    if (mbaModules) {
      // Filter out empty videos and documents
      const cleanedMbaModules = mbaModules.map((module: any) => ({
        ...module,
        videos: module.videos ? module.videos.filter((video: any) => 
          video.title && video.title.trim() && video.url && video.url.trim()
        ) : [],
        documents: module.documents ? module.documents.filter((doc: any) => 
          doc.title && doc.title.trim() && doc.url && doc.url.trim()
        ) : []
      }));
      course.mbaModules = cleanedMbaModules;
    }
    
    await course.save();
    
    // Update quizzes for each module if quiz questions are provided
    if (modules && Array.isArray(modules)) {
      // Import Quiz model
      const Quiz = (await import('../models/quiz')).default;
      
      // First, delete existing quizzes for this course
      await Quiz.deleteMany({ courseSlug: slug });
      
      // Then create new quizzes based on updated modules
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const module = modules[moduleIndex];
        if (module.quiz && module.quiz.questions && module.quiz.questions.length > 0) {
          // Transform quiz questions to match the expected format
          const quizQuestions = module.quiz.questions.map((q: any) => ({
            text: q.text,
            choices: q.choices,
            correctIndex: q.correctIndex
          }));
          
          const quiz = new Quiz({
            courseSlug: slug,
            moduleIndex: moduleIndex,
            questions: quizQuestions
          });
          
          await quiz.save();
        }
      }
    }
    
    res.status(200).json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a course
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // Check if course exists
    const course = await Course.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if there are enrollments for this course
    const enrollments = await Enrollment.countDocuments({ courseSlug: slug });
    
    if (enrollments > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete course with active enrollments. Remove enrollments first.' 
      });
    }
    
    await Course.deleteOne({ slug });
    
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get student's course detail
export const getStudentCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { slug } = req.params;
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Get course
    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get enrollment
    const enrollment = await Enrollment.findOne({ 
      studentId: student._id,
      courseSlug: slug
    });
    
    if (!enrollment) {
      return res.status(403).json({ 
        message: 'You are not enrolled in this course' 
      });
    }
    
    // Calculate progress and prepare response
    const totalModules = course.modules.length;
    const completedModules = enrollment.completedModules.filter(m => m.completed).length;
    const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
    
    // Calculate watch time
    let totalWatchTime = 0;
    student.watchTime.forEach(record => {
      totalWatchTime += record.duration;
    });
    
    // Format modules with completion status
    const formattedModules = course.modules.map((module, index) => {
      const moduleCompletion = enrollment.completedModules.find(m => m.moduleIndex === index);
      const isCompleted = moduleCompletion?.completed || false;
      const completedAt = moduleCompletion?.completedAt;
      
      // Get quiz attempts for this module
      const quizAttempts = enrollment.quizAttempts.filter(
        qa => qa.quizId === module.quizId
      ).sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime());
      
      // Calculate average quiz score
      let avgQuizScore = null;
      if (quizAttempts.length > 0) {
        avgQuizScore = quizAttempts.reduce((sum, qa) => sum + qa.score, 0) / quizAttempts.length;
      }
      
      return {
        ...module.toObject(),
        isCompleted,
        completedAt,
        isLocked: index > 0 && !enrollment.completedModules.find(m => m.moduleIndex === index - 1)?.completed,
        quizAttempts: quizAttempts.length,
        bestQuizScore: quizAttempts.length > 0 ? Math.max(...quizAttempts.map(qa => qa.score)) : null,
        avgQuizScore
      };
    });
    
    res.status(200).json({
      course: {
        slug: course.slug,
        title: course.title,
        type: course.type
      },
      enrollment: {
        enrollDate: enrollment.enrollDate,
        validUntil: enrollment.validUntil
      },
      progress,
      totalModules,
      completedModules,
      totalWatchTime: formatWatchTime(totalWatchTime),
      modules: formattedModules
    });
  } catch (error) {
    console.error('Get student course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reorder course modules
export const reorderModules = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { modules } = req.body;
    
    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({ message: 'Invalid modules data' });
    }
    
    const course = await Course.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Update the modules array with the new order
    course.modules = modules;
    
    await course.save();
    
    res.status(200).json({
      message: 'Module order updated successfully',
      course
    });
  } catch (error) {
    console.error('Reorder modules error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to format watch time
function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
}

export default {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getStudentCourse,
  listCourses,
  reorderModules
};
