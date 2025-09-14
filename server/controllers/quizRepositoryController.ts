import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { QuizRepository } from '../models/quizRepository.js';
import { Course } from '../models/course.js';
import { extractQuestionsWithAI, extractDocumentContent, randomizeQuestions, validateQuizQuestion } from '../services/quizRepositoryService.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary.js';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'text/plain' // .txt
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(doc|docx|xls|xlsx|csv|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Word, Excel, CSV, and Text files are allowed for quiz uploads'));
    }
  }
});

/**
 * Create quiz repository entry with already uploaded document
 */
export const createQuizRepository = async (req: Request, res: Response) => {
  try {
    console.log('📄 Creating quiz repository entry...');
    
    const { 
      title, 
      description, 
      documentUrl, 
      documentType, 
      fileName, 
      fileSize, 
      publicId, 
      originCourse, 
      originModule 
    } = req.body;
    
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!documentUrl || !fileName) {
      return res.status(400).json({ error: 'Document URL and filename are required' });
    }
    
    // Create quiz repository entry
    const quizRepo = new QuizRepository({
      title: title || fileName,
      description,
      documentUrl,
      documentType,
      fileName,
      publicId, // Store publicId for Cloudinary cleanup
      questions: [], // Will be populated by AI extraction
      originCourse,
      originModule: originModule ? parseInt(originModule) : undefined,
      createdBy: userId,
      extractionStatus: 'pending'
    });
    
    await quizRepo.save();
    console.log('💾 Quiz repository entry created');
    
    // Start AI extraction process (async) - we'll simulate the file buffer
    // Since we have the Cloudinary URL, we'll fetch it for processing
    processQuizExtractionFromUrl(quizRepo._id.toString(), documentUrl, fileName, documentType)
      .catch(error => {
        console.error('❌ Background extraction failed:', error);
      });
    
    res.status(201).json({
      message: 'Quiz repository entry created successfully. AI extraction is in progress.',
      quizId: quizRepo._id,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('❌ Quiz creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz repository entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Background process for AI question extraction from URL
 */
async function processQuizExtractionFromUrl(
  quizId: string,
  documentUrl: string,
  fileName: string,
  mimeType: string
) {
  try {
    console.log(`🔄 Starting background extraction for quiz ${quizId} from URL...`);
    
    // Update status to processing
    await QuizRepository.findByIdAndUpdate(quizId, {
      extractionStatus: 'processing'
    });
    
    // Fetch the document from Cloudinary
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);
    
    // Extract content from document
    const content = await extractDocumentContent(fileBuffer, fileName, mimeType);
    
    // Use AI to extract questions
    const questions = await extractQuestionsWithAI(content, mimeType);
    
    // Update quiz with extracted questions
    await QuizRepository.findByIdAndUpdate(quizId, {
      questions,
      extractionStatus: 'completed',
      $unset: { extractionError: 1 }
    });
    
    console.log(`✅ Successfully extracted ${questions.length} questions for quiz ${quizId}`);
    
  } catch (error) {
    console.error(`❌ Extraction failed for quiz ${quizId}:`, error);
    
    await QuizRepository.findByIdAndUpdate(quizId, {
      extractionStatus: 'failed',
      extractionError: error instanceof Error ? error.message : 'Unknown extraction error'
    });
  }
}
export const uploadQuizDocument = async (req: Request, res: Response) => {
  try {
    console.log('📤 Quiz document upload started...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { title, description, originCourse, originModule } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if Cloudinary is configured
    let documentUrl = '';
    let publicId = '';
    
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      // Upload to Cloudinary if configured
      console.log('☁️ Uploading to Cloudinary...');
      const uploadResult = await uploadToCloudinary(req.file, 'quiz-documents');
      documentUrl = uploadResult.url;
      publicId = uploadResult.public_id;
    } else {
      // Use temporary placeholder URL for testing
      console.log('⚠️ Cloudinary not configured, using placeholder URL');
      documentUrl = `/temp/quiz-documents/${Date.now()}-${req.file.originalname}`;
    }
    
    // Create quiz repository entry
    const quizRepo = new QuizRepository({
      title: title || req.file.originalname,
      description,
      documentUrl,
      documentType: req.file.mimetype,
      fileName: req.file.originalname,
      publicId, // Store publicId for Cloudinary cleanup
      questions: [], // Will be populated by AI extraction
      originCourse,
      originModule: originModule ? parseInt(originModule) : undefined,
      createdBy: userId,
      extractionStatus: 'pending'
    });
    
    await quizRepo.save();
    console.log('💾 Quiz repository entry created');
    
    // Start AI extraction process (async)
    processQuizExtraction(quizRepo._id.toString(), req.file.buffer, req.file.originalname, req.file.mimetype)
      .catch(error => {
        console.error('❌ Background extraction failed:', error);
      });
    
    res.status(201).json({
      message: 'Quiz document uploaded successfully. AI extraction is in progress.',
      quizId: quizRepo._id,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('❌ Quiz upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload quiz document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Background process for AI question extraction
 */
async function processQuizExtraction(
  quizId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
) {
  try {
    console.log(`🔄 Starting background extraction for quiz ${quizId}...`);
    
    // Update status to processing
    await QuizRepository.findByIdAndUpdate(quizId, {
      extractionStatus: 'processing'
    });
    
    // Extract content from document
    const content = await extractDocumentContent(fileBuffer, fileName, mimeType);
    
    // Use AI to extract questions
    const questions = await extractQuestionsWithAI(content, mimeType);
    
    // Update quiz with extracted questions
    await QuizRepository.findByIdAndUpdate(quizId, {
      questions,
      extractionStatus: 'completed',
      $unset: { extractionError: 1 }
    });
    
    console.log(`✅ Successfully extracted ${questions.length} questions for quiz ${quizId}`);
    
  } catch (error) {
    console.error(`❌ Extraction failed for quiz ${quizId}:`, error);
    
    await QuizRepository.findByIdAndUpdate(quizId, {
      extractionStatus: 'failed',
      extractionError: error instanceof Error ? error.message : 'Unknown extraction error'
    });
  }
}

/**
 * Get all quizzes in repository
 */
export const getQuizRepository = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const query: any = {};
    
    if (search) {
      query.$text = { $search: search as string };
    }
    
    if (status) {
      query.extractionStatus = status;
    }
    
    // Get quizzes without populate first
    const quizzes = await QuizRepository.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) * Number(page))
      .skip((Number(page) - 1) * Number(limit))
      .lean();
    
    // Manually populate originCourse for quizzes that have valid course IDs
    const populatedQuizzes = await Promise.all(
      quizzes.map(async (quiz) => {
        if (quiz.originCourse && quiz.originCourse.trim() && mongoose.Types.ObjectId.isValid(quiz.originCourse)) {
          try {
            const course = await Course.findById(quiz.originCourse, 'title slug');
            return {
              ...quiz,
              originCourse: course
            };
          } catch (err) {
            console.warn(`Failed to populate course ${quiz.originCourse}:`, err);
            return quiz;
          }
        }
        return quiz;
      })
    );
    
    const total = await QuizRepository.countDocuments(query);
    
    res.json({
      quizzes: populatedQuizzes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching quiz repository:', error);
    res.status(500).json({ error: 'Failed to fetch quiz repository' });
  }
};

/**
 * Get quiz details with questions
 */
export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const quiz = await QuizRepository.findById(id).lean();
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Manually populate originCourse if valid
    if (quiz.originCourse && quiz.originCourse.trim() && mongoose.Types.ObjectId.isValid(quiz.originCourse)) {
      try {
        const course = await Course.findById(quiz.originCourse, 'title slug');
        (quiz as any).originCourse = course;
      } catch (err) {
        console.warn(`Failed to populate course ${quiz.originCourse}:`, err);
      }
    }
    
    res.json(quiz);
    
  } catch (error) {
    console.error('❌ Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

/**
 * Update quiz questions (admin editing)
 */
export const updateQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questions, title, description } = req.body;
    
    // Validate questions
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }
    
    const invalidQuestions = questions.filter(q => !validateQuizQuestion(q));
    if (invalidQuestions.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid question format',
        invalidQuestions: invalidQuestions.length
      });
    }
    
    const updateData: any = {
      questions,
      updatedAt: new Date()
    };
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    
    const quiz = await QuizRepository.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.json({
      message: 'Quiz updated successfully',
      quiz
    });
    
  } catch (error) {
    console.error('❌ Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
};

/**
 * Copy/Move quiz to course module
 */
export const deployQuizToModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { courseSlug, moduleIndex, operation = 'copy' } = req.body;
    
    // Find the quiz
    const quiz = await QuizRepository.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Find the target course
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Validate module index
    if (moduleIndex < 0 || moduleIndex >= course.modules.length) {
      return res.status(400).json({ error: 'Invalid module index' });
    }
    
    // Convert quiz questions to legacy format for compatibility
    const legacyQuestions = quiz.questions
      .filter(q => q.options && q.options.A && q.options.B && q.options.C && q.options.D)
      .map(q => ({
        text: q.question,
        choices: [q.options!.A, q.options!.B, q.options!.C, q.options!.D],
        correctIndex: ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer),
        explanation: q.explanation || undefined
      }));
    
    // Update the course module with quiz questions
    course.modules[moduleIndex].questions = legacyQuestions;
    course.modules[moduleIndex].quizTitle = quiz.title;
    course.modules[moduleIndex].quizDescription = quiz.description || undefined;
    
    // Mark the modules array as modified for Mongoose to save changes
    course.markModified('modules');
    
    await course.save();
    
    console.log(`✅ Quiz successfully ${operation === 'move' ? 'moved' : 'copied'} to ${course.title} - Module ${moduleIndex + 1}`, {
      questionsCount: legacyQuestions.length,
      quizTitle: quiz.title,
      moduleIndex
    });
    
    // If moving (not copying), update the quiz's origin
    if (operation === 'move') {
      await QuizRepository.findByIdAndUpdate(id, {
        originCourse: course._id,
        originModule: moduleIndex
      });
    }
    
    res.json({
      message: `Quiz ${operation === 'move' ? 'moved' : 'copied'} to ${course.title} - Module ${moduleIndex + 1} successfully`,
      course: course.title,
      module: moduleIndex + 1
    });
    
  } catch (error) {
    console.error('❌ Error deploying quiz:', error);
    res.status(500).json({ error: 'Failed to deploy quiz to module' });
  }
};

/**
 * Delete quiz from repository
 */
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find the quiz first to get publicId for Cloudinary cleanup
    const quiz = await QuizRepository.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Delete from Cloudinary if publicId exists
    if (quiz.publicId) {
      try {
        console.log('🗑️ Cleaning up Cloudinary document:', quiz.publicId);
        await deleteFromCloudinary(quiz.publicId);
        console.log('✅ Cloudinary cleanup successful');
      } catch (cloudinaryError) {
        console.error('⚠️ Cloudinary cleanup failed (continuing with quiz deletion):', cloudinaryError);
        // Continue with quiz deletion even if Cloudinary cleanup fails
      }
    }
    
    // Delete the quiz from database
    await QuizRepository.findByIdAndDelete(id);
    
    res.json({ message: 'Quiz deleted successfully' });
    
  } catch (error) {
    console.error('❌ Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};

/**
 * Get randomized quiz for student attempt
 */
export const getRandomizedQuiz = async (req: Request, res: Response) => {
  try {
    const { courseSlug, moduleIndex } = req.params;
    const studentId = req.user?.id;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Find the course and module
    const course = await Course.findOne({ slug: courseSlug });
    if (!course || !course.modules[parseInt(moduleIndex)]) {
      return res.status(404).json({ error: 'Course or module not found' });
    }
    
    const module = course.modules[parseInt(moduleIndex)];
    
    // If module has legacy questions, use them directly
    if (module.questions && module.questions.length > 0) {
      const legacyQuestions = module.questions.map((q: any, index: number) => ({
        id: `legacy_${index}`,
        question: q.text || q.prompt,
        options: {
          A: q.choices?.[0] || '',
          B: q.choices?.[1] || '',
          C: q.choices?.[2] || '',
          D: q.choices?.[3] || ''
        },
        correctAnswer: (['A', 'B', 'C', 'D'][q.correctIndex] || 'A') as 'A' | 'B' | 'C' | 'D'
      }));
      
      const randomizedQuestions = randomizeQuestions(legacyQuestions);
      
      return res.json({
        questions: randomizedQuestions,
        title: module.quizTitle || `Module ${parseInt(moduleIndex) + 1} Quiz`,
        totalQuestions: legacyQuestions.length,
        displayedQuestions: randomizedQuestions.length
      });
    }
    
    // If no legacy questions, this is handled by existing quiz system
    res.status(404).json({ error: 'No quiz found for this module' });
    
  } catch (error) {
    console.error('❌ Error getting randomized quiz:', error);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
};

// Multer middleware export
export const uploadMiddleware = upload.single('quizDocument');