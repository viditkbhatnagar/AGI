import { Request, Response } from 'express';
import { SandboxCourse } from '../models/sandboxCourse';
import { SandboxToCoursesCopyService } from '../services/sandboxToCoursesCopyService';
import { HybridCopyService, HybridCopyRequest } from '../services/hybridCopyService';
import { deleteFromCloudinary } from '../lib/cloudinary';

// Helper function to extract all publicIds from sandbox course modules
const extractPublicIdsFromSandboxCourse = (course: any): string[] => {
  const publicIds: string[] = [];
  
  // Extract from regular modules
  if (course.modules) {
    course.modules.forEach((module: any) => {
      if (module.documents) {
        module.documents.forEach((doc: any) => {
          if (doc.type === 'upload' && doc.publicId) {
            publicIds.push(doc.publicId);
          }
        });
      }
    });
  }
  
  // Extract from MBA modules
  if (course.mbaModules) {
    course.mbaModules.forEach((module: any) => {
      if (module.documents) {
        module.documents.forEach((doc: any) => {
          if (doc.type === 'upload' && doc.publicId) {
            publicIds.push(doc.publicId);
          }
        });
      }
    });
  }
  
  return publicIds;
};

// Get all sandbox courses
export const getAllSandboxCourses = async (req: Request, res: Response) => {
  try {
    const courses = await SandboxCourse.find();
    res.status(200).json(courses);
  } catch (error) {
    console.error('Get all sandbox courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// List minimal sandbox course info for admin dropdowns
export const listSandboxCourses = async (req: Request, res: Response) => {
  try {
    // Fetch only slug and title for the dropdown
    const courses = await SandboxCourse.find({}, 'slug title');
    res.status(200).json(courses);
  } catch (error) {
    console.error('List sandbox courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific sandbox course
export const getSandboxCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const course = await SandboxCourse.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Sandbox course not found' });
    }
    
    res.status(200).json(course);
  } catch (error) {
    console.error('Get sandbox course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new sandbox course
export const createSandboxCourse = async (req: Request, res: Response) => {
  try {
    const { slug, title, type, liveClassConfig, modules, mbaModules } = req.body;
    
    // Check if sandbox course with this slug already exists
    const existingCourse = await SandboxCourse.findOne({ slug });
    
    if (existingCourse) {
      return res.status(400).json({ message: 'Sandbox course with this slug already exists' });
    }
    
    // Debug: Log incoming data
    console.log('📝 Incoming modules:', JSON.stringify(modules, null, 2));
    
    // Filter out empty videos and documents from modules and validate content
    const cleanedModules = modules ? modules.map((module: any) => {
      console.log('🔍 Processing module:', module.title);
      console.log('📄 Raw documents:', JSON.stringify(module.documents, null, 2));
      
      const cleanedVideos = module.videos ? module.videos.filter((video: any) => 
        video.title && video.title.trim() && video.url && video.url.trim()
      ) : [];
      
      const filteredDocs = module.documents ? module.documents.filter((doc: any) => {
        const isValid = doc.title && doc.title.trim() && doc.fileUrl && doc.fileUrl.trim() && 
          doc.fileName && doc.publicId && doc.fileType && doc.fileSize;
        console.log(`📋 Document "${doc.title}" valid: ${isValid}`, {
          hasTitle: !!doc.title,
          hasFileUrl: !!doc.fileUrl,
          hasFileName: !!doc.fileName,
          hasPublicId: !!doc.publicId,
          hasFileType: !!doc.fileType,
          hasFileSize: !!doc.fileSize,
          document: doc
        });
        return isValid;
      }) : [];
      
      const hasQuiz = module.quiz && module.quiz.questions && module.quiz.questions.length > 0 && 
                     module.quiz.questions.some((q: any) => q.text && q.text.trim());
      
      console.log('✅ Filtered content:', {
        videos: cleanedVideos.length,
        documents: filteredDocs.length,
        hasQuiz
      });
      
      // Validate that at least one content type is present
      if (cleanedVideos.length === 0 && filteredDocs.length === 0 && !hasQuiz) {
        throw new Error(`Module "${module.title}" must have at least one video, document, or quiz question`);
      }
      
      return {
        ...module,
        videos: cleanedVideos,
        documents: filteredDocs,
        quiz: module.quiz || { questions: [] } // Preserve quiz data
      };
    }) : [];

    const cleanedMbaModules = mbaModules ? mbaModules.map((module: any) => {
      const cleanedVideos = module.videos ? module.videos.filter((video: any) => 
        video.title && video.title.trim() && video.url && video.url.trim()
      ) : [];
      
      const cleanedDocuments = module.documents ? module.documents.filter((doc: any) => 
        doc.title && doc.title.trim() && doc.fileUrl && doc.fileUrl.trim() && 
        doc.fileName && doc.publicId && doc.fileType && doc.fileSize
      ) : [];
      
      const hasQuiz = module.quiz && module.quiz.questions && module.quiz.questions.length > 0 && 
                     module.quiz.questions.some((q: any) => q.text && q.text.trim());
      
      // Validate that at least one content type is present
      if (cleanedVideos.length === 0 && cleanedDocuments.length === 0 && !hasQuiz) {
        throw new Error(`MBA Module "${module.title}" must have at least one video, document, or quiz question`);
      }
      
      return {
        ...module,
        videos: cleanedVideos,
        documents: cleanedDocuments,
        quiz: module.quiz || { questions: [] } // Preserve quiz data
      };
    }) : [];

    // Create new sandbox course
    const newCourse = new SandboxCourse({
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
            questions: quizQuestions,
            isSandbox: true // Flag to identify sandbox course quizzes
          });
          
          await quiz.save();
        }
      }
    }
    
    res.status(201).json({
      message: 'Sandbox course created successfully',
      course: newCourse
    });
  } catch (error) {
    console.error('Create sandbox course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a sandbox course
export const updateSandboxCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, type, liveClassConfig, modules, mbaModules } = req.body;
    
    const course = await SandboxCourse.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Sandbox course not found' });
    }
    
    // Update fields
    if (title) course.title = title;
    if (type) course.type = type;
    if (liveClassConfig) course.liveClassConfig = liveClassConfig;
    
    if (modules) {
      // Filter out empty videos and documents, preserve quiz data
      const cleanedModules = modules.map((module: any) => ({
        ...module,
        videos: module.videos ? module.videos.filter((video: any) => 
          video.title && video.title.trim() && video.url && video.url.trim()
        ) : [],
        documents: module.documents ? module.documents.filter((doc: any) => 
          doc.title && doc.title.trim() && doc.fileUrl && doc.fileUrl.trim() && 
          doc.fileName && doc.publicId
        ) : [],
        quiz: module.quiz || { questions: [] } // Preserve quiz data
      }));
      course.modules = cleanedModules;
    }
    
    if (mbaModules) {
      // Filter out empty videos and documents, preserve quiz data
      const cleanedMbaModules = mbaModules.map((module: any) => ({
        ...module,
        videos: module.videos ? module.videos.filter((video: any) => 
          video.title && video.title.trim() && video.url && video.url.trim()
        ) : [],
        documents: module.documents ? module.documents.filter((doc: any) => 
          doc.title && doc.title.trim() && doc.fileUrl && doc.fileUrl.trim() && 
          doc.fileName && doc.publicId && doc.fileType && doc.fileSize
        ) : [],
        quiz: module.quiz || { questions: [] } // Preserve quiz data
      }));
      course.mbaModules = cleanedMbaModules;
    }
    
    await course.save();
    
    // Update quizzes for each module if quiz questions are provided
    if (modules && Array.isArray(modules)) {
      // Import Quiz model
      const Quiz = (await import('../models/quiz')).default;
      
      // First, delete existing quizzes for this sandbox course
      await Quiz.deleteMany({ courseSlug: slug, isSandbox: true });
      
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
            questions: quizQuestions,
            isSandbox: true // Flag to identify sandbox course quizzes
          });
          
          await quiz.save();
        }
      }
    }
    
    res.status(200).json({
      message: 'Sandbox course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update sandbox course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a sandbox course
export const deleteSandboxCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // Check if sandbox course exists
    const course = await SandboxCourse.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Sandbox course not found' });
    }
    
    // Note: For sandbox courses, we might not have enrollments
    // But if you plan to add enrollments for sandbox courses in the future,
    // add the enrollment check here
    
    // Extract all publicIds from course modules for Cloudinary cleanup
    const publicIds = extractPublicIdsFromSandboxCourse(course);
    
    // Delete sandbox course from database first
    await SandboxCourse.deleteOne({ slug });
    
    // Delete associated quizzes
    const Quiz = (await import('../models/quiz')).default;
    await Quiz.deleteMany({ courseSlug: slug, isSandbox: true });
    
    // Clean up Cloudinary documents (do this after course deletion to avoid issues if cleanup fails)
    if (publicIds.length > 0) {
      console.log(`🗑️ Cleaning up ${publicIds.length} Cloudinary documents for sandbox course: ${slug}`);
      
      for (const publicId of publicIds) {
        try {
          await deleteFromCloudinary(publicId);
          console.log(`✅ Deleted Cloudinary document: ${publicId}`);
        } catch (cloudinaryError) {
          console.error(`⚠️ Failed to delete Cloudinary document ${publicId}:`, cloudinaryError);
          // Continue with other deletions even if one fails
        }
      }
    }
    
    res.status(200).json({ message: 'Sandbox course deleted successfully' });
  } catch (error) {
    console.error('Delete sandbox course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reorder sandbox course modules
export const reorderSandboxModules = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { modules } = req.body;
    
    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({ message: 'Invalid modules data' });
    }
    
    const course = await SandboxCourse.findOne({ slug });
    
    if (!course) {
      return res.status(404).json({ message: 'Sandbox course not found' });
    }
    
    // Update the modules array with the new order
    course.modules = modules;
    
    await course.save();
    
    res.status(200).json({
      message: 'Sandbox module order updated successfully',
      course
    });
  } catch (error) {
    console.error('Reorder sandbox modules error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Copy sandbox courses to main courses
export const copyToMainCourses = async (req: Request, res: Response) => {
  try {
    const { sandboxCourseSlugs } = req.body;
    
    // Enhanced input validation
    if (!sandboxCourseSlugs) {
      return res.status(400).json({ 
        message: 'sandboxCourseSlugs is required',
        errorType: 'VALIDATION_ERROR'
      });
    }

    if (!Array.isArray(sandboxCourseSlugs)) {
      return res.status(400).json({ 
        message: 'sandboxCourseSlugs must be an array',
        errorType: 'VALIDATION_ERROR'
      });
    }

    if (sandboxCourseSlugs.length === 0) {
      return res.status(400).json({ 
        message: 'sandboxCourseSlugs array must not be empty',
        errorType: 'VALIDATION_ERROR'
      });
    }

    // Validate array length (prevent abuse)
    if (sandboxCourseSlugs.length > 50) {
      return res.status(400).json({ 
        message: 'Cannot copy more than 50 courses at once',
        errorType: 'VALIDATION_ERROR'
      });
    }

    // Validate each slug in the array
    const invalidSlugs = sandboxCourseSlugs.filter(slug => 
      !slug || typeof slug !== 'string' || slug.trim().length === 0
    );

    if (invalidSlugs.length > 0) {
      return res.status(400).json({ 
        message: `Invalid course slugs found: ${invalidSlugs.length} invalid entries`,
        errorType: 'VALIDATION_ERROR',
        details: 'All course slugs must be non-empty strings'
      });
    }

    const copyService = new SandboxToCoursesCopyService();
    
    let results;
    try {
      results = await Promise.race([
        copyService.copySandboxCourses(sandboxCourseSlugs),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Copy operation timeout')), 300000) // 5 minute timeout
        )
      ]) as any;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return res.status(408).json({ 
          message: 'Copy operation timed out. Please try with fewer courses or try again later.',
          errorType: 'NETWORK_ERROR'
        });
      }
      throw error; // Re-throw other errors to be handled by outer catch
    }
    
    // Calculate summary with error categorization
    const summary = {
      total: results.length,
      successful: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
      errorBreakdown: {
        networkErrors: results.filter((r: any) => !r.success && r.errorType === 'NETWORK_ERROR').length,
        validationErrors: results.filter((r: any) => !r.success && r.errorType === 'VALIDATION_ERROR').length,
        databaseErrors: results.filter((r: any) => !r.success && r.errorType === 'DATABASE_ERROR').length,
        notFoundErrors: results.filter((r: any) => !r.success && r.errorType === 'NOT_FOUND').length,
        unknownErrors: results.filter((r: any) => !r.success && r.errorType === 'UNKNOWN_ERROR').length
      }
    };

    // Determine appropriate HTTP status code
    let statusCode = 200;
    if (summary.failed === summary.total) {
      statusCode = 422; // All operations failed
    } else if (summary.failed > 0) {
      statusCode = 207; // Partial success (Multi-Status)
    }

    res.status(statusCode).json({
      results,
      summary,
      message: summary.failed === 0 
        ? 'All courses copied successfully' 
        : summary.successful === 0 
          ? 'All copy operations failed'
          : `${summary.successful} courses copied successfully, ${summary.failed} failed`
    });
  } catch (error) {
    console.error('Copy sandbox courses to main courses error:', error);
    
    // Categorize server errors
    let errorMessage = 'Server error during copy operation';
    let errorType = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorType = 'DATABASE_ERROR';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorType = 'NETWORK_ERROR';
      } else if (error.message.includes('validation')) {
        errorType = 'VALIDATION_ERROR';
      }
    }

    res.status(500).json({ 
      message: errorMessage,
      errorType,
      timestamp: new Date().toISOString()
    });
  }
};

// Hybrid copy selected modules from sandbox to main course
export const hybridCopyModules = async (req: Request, res: Response) => {
  try {
    const { sourceCourseSlug, selectedModuleIndexes, destinationCourseSlug }: HybridCopyRequest = req.body;
    
    // Enhanced input validation
    if (!sourceCourseSlug || !destinationCourseSlug || !selectedModuleIndexes) {
      return res.status(400).json({ 
        message: 'sourceCourseSlug, destinationCourseSlug, and selectedModuleIndexes are required',
        errorType: 'VALIDATION_ERROR'
      });
    }

    if (!Array.isArray(selectedModuleIndexes) || selectedModuleIndexes.length === 0) {
      return res.status(400).json({ 
        message: 'selectedModuleIndexes must be a non-empty array',
        errorType: 'VALIDATION_ERROR'
      });
    }

    // Prevent abuse - limit number of modules that can be copied at once
    if (selectedModuleIndexes.length > 20) {
      return res.status(400).json({ 
        message: 'Cannot copy more than 20 modules at once',
        errorType: 'VALIDATION_ERROR'
      });
    }

    // Validate module indexes are valid numbers
    const invalidIndexes = selectedModuleIndexes.filter(index => 
      typeof index !== 'number' || index < 0 || !Number.isInteger(index)
    );

    if (invalidIndexes.length > 0) {
      return res.status(400).json({ 
        message: 'All module indexes must be non-negative integers',
        errorType: 'VALIDATION_ERROR',
        invalidIndexes
      });
    }

    const hybridCopyService = new HybridCopyService();
    
    let result;
    try {
      result = await Promise.race([
        hybridCopyService.copySelectedModules({
          sourceCourseSlug: sourceCourseSlug.trim(),
          selectedModuleIndexes,
          destinationCourseSlug: destinationCourseSlug.trim()
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Hybrid copy operation timeout')), 120000) // 2 minute timeout
        )
      ]) as any;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return res.status(408).json({ 
          message: 'Hybrid copy operation timed out. Please try with fewer modules or try again later.',
          errorType: 'NETWORK_ERROR'
        });
      }
      throw error;
    }
    
    // Determine appropriate HTTP status code
    const statusCode = result.success ? 200 : 422;
    
    res.status(statusCode).json({
      success: result.success,
      message: result.success 
        ? `Successfully copied ${result.copiedModulesCount} modules to ${result.destinationCourseSlug}`
        : result.error || 'Hybrid copy operation failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hybrid copy modules error:', error);
    
    let errorMessage = 'Server error during hybrid copy operation';
    let errorType = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorType = 'DATABASE_ERROR';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorType = 'NETWORK_ERROR';
      } else if (error.message.includes('validation')) {
        errorType = 'VALIDATION_ERROR';
      }
    }

    res.status(500).json({ 
      message: errorMessage,
      errorType,
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  getAllSandboxCourses,
  getSandboxCourse,
  createSandboxCourse,
  updateSandboxCourse,
  deleteSandboxCourse,
  listSandboxCourses,
  reorderSandboxModules,
  copyToMainCourses,
  hybridCopyModules
};
