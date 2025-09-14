import { SandboxCourse, ISandboxCourse } from '../models/sandboxCourse';
import { Course, ICourse } from '../models/course';
import Quiz from '../models/quiz';

export interface CopyResult {
  sandboxSlug: string;
  success: boolean;
  newCourseSlug?: string;
  error?: string;
  duplicateHandled?: boolean;
  errorType?: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNKNOWN_ERROR';
}

export interface CopyProgress {
  total: number;
  completed: number;
  current?: string;
  results: CopyResult[];
}

export class SandboxToCoursesCopyService {
  /**
   * Copy multiple sandbox courses to main courses
   */
  async copySandboxCourses(sandboxSlugs: string[]): Promise<CopyResult[]> {
    // Validate input
    if (!sandboxSlugs || !Array.isArray(sandboxSlugs) || sandboxSlugs.length === 0) {
      throw new Error('sandboxSlugs must be a non-empty array');
    }

    // Validate each slug
    const validSlugs = sandboxSlugs.filter(slug => 
      slug && typeof slug === 'string' && slug.trim().length > 0
    );

    if (validSlugs.length === 0) {
      throw new Error('No valid sandbox course slugs provided');
    }

    const results: CopyResult[] = [];
    
    // Process each course individually to ensure partial failures don't break the entire operation
    for (const sandboxSlug of validSlugs) {
      try {
        const result = await this.copySingleCourse(sandboxSlug.trim());
        results.push(result);
      } catch (error) {
        console.error(`Error copying sandbox course ${sandboxSlug}:`, error);
        
        // Categorize error type for better handling
        let errorType: CopyResult['errorType'] = 'UNKNOWN_ERROR';
        let errorMessage = 'Unknown error occurred';

        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Categorize common error types
          if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('connection')) {
            errorType = 'NETWORK_ERROR';
          } else if (error.message.includes('validation') || error.message.includes('invalid')) {
            errorType = 'VALIDATION_ERROR';
          } else if (error.message.includes('database') || error.message.includes('duplicate key') || error.message.includes('constraint')) {
            errorType = 'DATABASE_ERROR';
          } else if (error.message.includes('not found')) {
            errorType = 'NOT_FOUND';
          }
        }

        results.push({
          sandboxSlug,
          success: false,
          error: errorMessage,
          errorType
        });
      }
    }

    // Add results for invalid slugs that were filtered out
    const invalidSlugs = sandboxSlugs.filter(slug => 
      !slug || typeof slug !== 'string' || slug.trim().length === 0
    );

    for (const invalidSlug of invalidSlugs) {
      results.push({
        sandboxSlug: invalidSlug || '[empty]',
        success: false,
        error: 'Invalid course slug provided',
        errorType: 'VALIDATION_ERROR'
      });
    }
    
    return results;
  }

  /**
   * Copy a single sandbox course to main courses
   */
  async copySingleCourse(sandboxSlug: string): Promise<CopyResult> {
    try {
      // Validate input
      if (!sandboxSlug || typeof sandboxSlug !== 'string' || sandboxSlug.trim().length === 0) {
        return {
          sandboxSlug: sandboxSlug || '[empty]',
          success: false,
          error: 'Invalid sandbox course slug provided',
          errorType: 'VALIDATION_ERROR'
        };
      }

      const trimmedSlug = sandboxSlug.trim();

      // Find the sandbox course with timeout handling
      let sandboxCourse;
      try {
        sandboxCourse = await Promise.race([
          SandboxCourse.findOne({ slug: trimmedSlug }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 10000)
          )
        ]) as any;
      } catch (error) {
        return {
          sandboxSlug: trimmedSlug,
          success: false,
          error: error instanceof Error ? error.message : 'Database connection failed',
          errorType: 'NETWORK_ERROR'
        };
      }
      
      if (!sandboxCourse) {
        return {
          sandboxSlug: trimmedSlug,
          success: false,
          error: 'Sandbox course not found',
          errorType: 'NOT_FOUND'
        };
      }

      // Validate sandbox course data
      const validationError = this.validateSandboxCourse(sandboxCourse);
      if (validationError) {
        return {
          sandboxSlug: trimmedSlug,
          success: false,
          error: validationError,
          errorType: 'VALIDATION_ERROR'
        };
      }

      // Generate unique slug for the new course
      let newSlug: string;
      try {
        newSlug = await this.generateUniqueSlug(sandboxCourse.slug);
      } catch (error) {
        return {
          sandboxSlug: trimmedSlug,
          success: false,
          error: 'Failed to generate unique course slug',
          errorType: 'DATABASE_ERROR'
        };
      }

      const newTitle = newSlug !== sandboxCourse.slug ? 
        this.handleDuplicateCourse(sandboxCourse.title) : 
        sandboxCourse.title;

      // Transform the sandbox course data to regular course format
      let courseData: Partial<ICourse>;
      try {
        courseData = {
          slug: newSlug,
          title: newTitle,
          type: sandboxCourse.type,
          description: sandboxCourse.description || '',
          liveClassConfig: sandboxCourse.liveClassConfig || {
            enabled: false,
            frequency: 'weekly',
            dayOfWeek: 'Monday',
            durationMin: 60
          },
          modules: (sandboxCourse.modules || []).map((module: any) => this.transformModule(module)),
          mbaModules: (sandboxCourse.mbaModules || []).map((module: any) => this.transformModule(module))
        };
      } catch (error) {
        return {
          sandboxSlug: trimmedSlug,
          success: false,
          error: 'Failed to transform course data: ' + (error instanceof Error ? error.message : 'Unknown transformation error'),
          errorType: 'VALIDATION_ERROR'
        };
      }

      // Create the new course with retry logic
      let newCourse;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          newCourse = new Course(courseData);
          await newCourse.save();
          break;
        } catch (error) {
          retryCount++;
          console.warn(`Attempt ${retryCount} failed to save course ${newSlug}:`, error);
          
          if (retryCount >= maxRetries) {
            return {
              sandboxSlug: trimmedSlug,
              success: false,
              error: `Failed to create course after ${maxRetries} attempts: ` + (error instanceof Error ? error.message : 'Unknown database error'),
              errorType: 'DATABASE_ERROR'
            };
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      // Copy quizzes for each module (non-blocking - log errors but don't fail the entire operation)
      try {
        await this.copyQuizzes(trimmedSlug, newSlug, sandboxCourse);
      } catch (error) {
        console.error(`Warning: Quiz copying failed for course ${newSlug}, but course was created successfully:`, error);
        // Don't fail the entire operation for quiz copying issues
      }

      return {
        sandboxSlug: trimmedSlug,
        success: true,
        newCourseSlug: newSlug,
        duplicateHandled: newSlug !== sandboxCourse.slug
      };
    } catch (error) {
      console.error(`Unexpected error copying sandbox course ${sandboxSlug}:`, error);
      return {
        sandboxSlug: sandboxSlug || '[empty]',
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error occurred',
        errorType: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Validate sandbox course data before copying
   */
  private validateSandboxCourse(sandboxCourse: any): string | null {
    if (!sandboxCourse) {
      return 'Sandbox course data is null or undefined';
    }

    if (!sandboxCourse.title || typeof sandboxCourse.title !== 'string' || sandboxCourse.title.trim().length === 0) {
      return 'Sandbox course must have a valid title';
    }

    if (!sandboxCourse.slug || typeof sandboxCourse.slug !== 'string' || sandboxCourse.slug.trim().length === 0) {
      return 'Sandbox course must have a valid slug';
    }

    if (!sandboxCourse.type || typeof sandboxCourse.type !== 'string') {
      return 'Sandbox course must have a valid type';
    }

    // Validate modules if they exist
    if (sandboxCourse.modules && Array.isArray(sandboxCourse.modules)) {
      for (let i = 0; i < sandboxCourse.modules.length; i++) {
        const module = sandboxCourse.modules[i];
        if (!module.title || typeof module.title !== 'string' || module.title.trim().length === 0) {
          return `Module ${i + 1} must have a valid title`;
        }
      }
    }

    // Validate MBA modules if they exist
    if (sandboxCourse.mbaModules && Array.isArray(sandboxCourse.mbaModules)) {
      for (let i = 0; i < sandboxCourse.mbaModules.length; i++) {
        const module = sandboxCourse.mbaModules[i];
        if (!module.title || typeof module.title !== 'string' || module.title.trim().length === 0) {
          return `MBA module ${i + 1} must have a valid title`;
        }
      }
    }

    // Check if course has any content (modules or MBA modules)
    const hasModules = sandboxCourse.modules && Array.isArray(sandboxCourse.modules) && sandboxCourse.modules.length > 0;
    const hasMbaModules = sandboxCourse.mbaModules && Array.isArray(sandboxCourse.mbaModules) && sandboxCourse.mbaModules.length > 0;
    
    if (!hasModules && !hasMbaModules) {
      return 'Sandbox course must have at least one module or MBA module';
    }

    return null; // No validation errors
  }

  /**
   * Transform sandbox module to regular course module
   * Main difference: documents structure transformation from Cloudinary metadata to simple URL
   */
  private transformModule(sandboxModule: any): any {
    if (!sandboxModule) {
      return {
        title: 'Untitled Module',
        description: '',
        videos: [],
        documents: [],
        quizId: null
      };
    }

    return {
      title: sandboxModule.title || 'Untitled Module',
      description: sandboxModule.description || '',
      videos: Array.isArray(sandboxModule.videos) ? sandboxModule.videos.filter((video: any) => 
        video && video.title && video.url
      ) : [],
      documents: this.transformDocuments(sandboxModule.documents || []),
      quizId: sandboxModule.quizId || null
    };
  }

  /**
   * Transform document structure from Cloudinary metadata to upload format
   * Preserves full Cloudinary metadata for admin interface compatibility
   */
  private transformDocuments(sandboxDocuments: any[]): Array<{ 
    title: string; 
    type: 'upload';
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    publicId: string;
  }> {
    if (!sandboxDocuments || !Array.isArray(sandboxDocuments)) {
      return [];
    }
    
    return sandboxDocuments
      .filter(doc => {
        // Filter out invalid documents - ensure required Cloudinary metadata is present
        return doc && 
               typeof doc === 'object' &&
               doc.title && 
               typeof doc.title === 'string' && 
               doc.title.trim().length > 0 &&
               doc.fileUrl && 
               typeof doc.fileUrl === 'string' && 
               doc.fileUrl.trim().length > 0 &&
               doc.fileName &&
               doc.fileSize &&
               doc.fileType &&
               doc.publicId;
      })
      .map(doc => ({
        title: doc.title.trim(),
        type: 'upload' as const,
        fileUrl: doc.fileUrl.trim(),
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        publicId: doc.publicId
      }));
  }

  /**
   * Generate a unique slug for the new course
   */
  async generateUniqueSlug(baseSlug: string): Promise<string> {
    if (!baseSlug || typeof baseSlug !== 'string' || baseSlug.trim().length === 0) {
      throw new Error('Base slug must be a non-empty string');
    }

    const cleanBaseSlug = baseSlug.trim();
    let slug = cleanBaseSlug;
    let counter = 1;
    const maxAttempts = 100; // Prevent infinite loops
    
    try {
      while (counter <= maxAttempts) {
        const existingCourse = await Promise.race([
          Course.findOne({ slug }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout during slug generation')), 5000)
          )
        ]) as any;

        if (!existingCourse) {
          return slug;
        }

        slug = `${cleanBaseSlug}-copy-${counter}`;
        counter++;
      }

      throw new Error(`Could not generate unique slug after ${maxAttempts} attempts`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw error;
      }
      throw new Error('Database error during slug generation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Handle duplicate course names by appending suffix
   */
  handleDuplicateCourse(existingTitle: string): string {
    return `${existingTitle} - Copy`;
  }

  /**
   * Copy quizzes from sandbox course to regular course
   * Handles both existing Quiz collection entries and embedded quiz data in modules
   */
  private async copyQuizzes(sandboxSlug: string, newCourseSlug: string, sandboxCourse: any): Promise<void> {
    try {
      // First, find any existing sandbox quizzes in the Quiz collection
      const existingSandboxQuizzes = await Quiz.find({ 
        courseSlug: sandboxSlug, 
        isSandbox: true 
      });

      console.log(`Found ${existingSandboxQuizzes.length} existing sandbox quizzes for ${sandboxSlug}`);

      // Create corresponding quizzes for existing Quiz collection entries
      for (const sandboxQuiz of existingSandboxQuizzes) {
        const transformedQuestions = this.transformQuizQuestions(sandboxQuiz.questions);
        
        if (transformedQuestions.length > 0) {
          const newQuiz = new Quiz({
            courseSlug: newCourseSlug,
            moduleIndex: sandboxQuiz.moduleIndex,
            questions: transformedQuestions,
            isSandbox: false // Explicitly set to false for regular courses
          });

          await newQuiz.save();
          console.log(`Created quiz for module ${sandboxQuiz.moduleIndex} with ${transformedQuestions.length} questions`);
        } else {
          console.warn(`Skipped quiz for module ${sandboxQuiz.moduleIndex} - no valid questions found`);
        }
      }

      // Process embedded quiz data from sandbox course modules
      await this.copyEmbeddedQuizzes(sandboxCourse, newCourseSlug);

    } catch (error) {
      console.error(`Error copying quizzes from ${sandboxSlug} to ${newCourseSlug}:`, error);
      // Log the error but don't fail the entire course copy operation
      // This allows courses to be copied even if quiz copying fails
    }
  }

  /**
   * Copy embedded quiz data from sandbox course modules to Quiz collection
   */
  private async copyEmbeddedQuizzes(sandboxCourse: any, newCourseSlug: string): Promise<void> {
    if (!sandboxCourse.modules && !sandboxCourse.mbaModules) {
      console.log('No modules found in sandbox course');
      return;
    }

    const mainModules = sandboxCourse.modules || [];
    const mbaModules = sandboxCourse.mbaModules || [];
    
    const allModules = [
      ...mainModules.map((module: any, index: number) => ({ ...module, moduleIndex: index, isMainModule: true })),
      ...mbaModules.map((module: any, index: number) => ({ ...module, moduleIndex: index + mainModules.length, isMainModule: false }))
    ];

    console.log(`Processing ${allModules.length} modules for embedded quiz data`);

    for (const module of allModules) {
      try {
        // Check if module has quiz data with questions
        if (module.quiz && module.quiz.questions && Array.isArray(module.quiz.questions) && module.quiz.questions.length > 0) {
          const transformedQuestions = this.transformQuizQuestions(module.quiz.questions);

          if (transformedQuestions.length > 0) {
            // Check if a quiz already exists for this module (from existing Quiz collection)
            const existingQuiz = await Quiz.findOne({
              courseSlug: newCourseSlug,
              moduleIndex: module.moduleIndex
            });

            if (!existingQuiz) {
              // Create new quiz from embedded data
              const newQuiz = new Quiz({
                courseSlug: newCourseSlug,
                moduleIndex: module.moduleIndex,
                questions: transformedQuestions,
                isSandbox: false
              });

              const savedQuiz = await newQuiz.save();
              console.log(`Created embedded quiz for module ${module.moduleIndex} (${module.title}) with ${transformedQuestions.length} questions`);
              
              // Update the course module to reference the new quiz
              await this.updateModuleQuizReference(newCourseSlug, module.moduleIndex, (savedQuiz as any)._id.toString());
            } else {
              console.log(`Quiz already exists for module ${module.moduleIndex}, skipping embedded quiz creation`);
            }
          } else {
            console.log(`Module ${module.moduleIndex} (${module.title}) has no valid quiz questions`);
          }
        }
      } catch (error) {
        console.error(`Error processing embedded quiz for module ${module.moduleIndex}:`, error);
        // Continue with other modules even if one fails
      }
    }
  }

  /**
   * Transform quiz questions ensuring all data is preserved and validated
   */
  private transformQuizQuestions(questions: any[]): Array<{text: string; choices: string[]; correctIndex: number}> {
    if (!Array.isArray(questions)) {
      return [];
    }

    return questions.map(q => {
      // Ensure question has required properties
      if (!q || typeof q !== 'object') {
        return null;
      }

      const text = typeof q.text === 'string' ? q.text.trim() : '';
      const choices = Array.isArray(q.choices) ? 
        q.choices.filter((choice: any) => 
          choice !== null && 
          choice !== undefined && 
          typeof choice === 'string' && 
          choice.trim() !== ''
        ) : [];

      // Validate correctIndex is within bounds
      let correctIndex = 0;
      if (typeof q.correctIndex === 'number' && 
          q.correctIndex >= 0 && 
          q.correctIndex < choices.length) {
        correctIndex = q.correctIndex;
      }

      return {
        text,
        choices,
        correctIndex
      };
    })
    .filter(q => q !== null && q.text !== '' && q.choices.length > 0) as Array<{text: string; choices: string[]; correctIndex: number}>;
  }

  /**
   * Update course module to reference the created quiz
   */
  private async updateModuleQuizReference(courseSlug: string, moduleIndex: number, quizId: string): Promise<void> {
    try {
      const course = await Course.findOne({ slug: courseSlug });
      if (!course) {
        console.error(`Course not found: ${courseSlug}`);
        return;
      }

      const totalMainModules = course.modules ? course.modules.length : 0;
      
      if (moduleIndex < totalMainModules) {
        // Update main module
        if (course.modules[moduleIndex]) {
          course.modules[moduleIndex].quizId = quizId;
          console.log(`Updated main module ${moduleIndex} with quiz reference ${quizId}`);
        } else {
          console.error(`Main module ${moduleIndex} not found in course ${courseSlug}`);
          return;
        }
      } else {
        // Update MBA module
        const mbaIndex = moduleIndex - totalMainModules;
        if (course.mbaModules && mbaIndex < course.mbaModules.length && course.mbaModules[mbaIndex]) {
          course.mbaModules[mbaIndex].quizId = quizId;
          console.log(`Updated MBA module ${mbaIndex} (index ${moduleIndex}) with quiz reference ${quizId}`);
        } else {
          console.error(`MBA module ${mbaIndex} (index ${moduleIndex}) not found in course ${courseSlug}`);
          return;
        }
      }

      await course.save();
    } catch (error) {
      console.error(`Error updating module quiz reference for course ${courseSlug}, module ${moduleIndex}:`, error);
    }
  }
}