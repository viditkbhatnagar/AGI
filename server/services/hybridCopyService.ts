import { SandboxCourse, ISandboxCourse } from '../models/sandboxCourse';
import { Course, ICourse } from '../models/course';
import Quiz from '../models/quiz';

export interface HybridCopyRequest {
  sourceCourseSlug: string;
  selectedModuleIndexes: number[];
  destinationCourseSlug: string;
}

export interface HybridCopyResult {
  success: boolean;
  destinationCourseSlug: string;
  copiedModulesCount: number;
  error?: string;
  errorType?: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNKNOWN_ERROR';
  copiedModules?: Array<{
    sourceIndex: number;
    destinationIndex: number;
    title: string;
  }>;
}

export class HybridCopyService {
  /**
   * Copy selected modules from a sandbox course to an existing main course
   */
  async copySelectedModules(request: HybridCopyRequest): Promise<HybridCopyResult> {
    try {
      // Validate input
      const validationError = this.validateRequest(request);
      if (validationError) {
        return {
          success: false,
          destinationCourseSlug: request.destinationCourseSlug,
          copiedModulesCount: 0,
          error: validationError,
          errorType: 'VALIDATION_ERROR'
        };
      }

      // Find source sandbox course
      const sourceCourse = await this.findSandboxCourse(request.sourceCourseSlug);
      if (!sourceCourse.success) {
        return {
          success: false,
          destinationCourseSlug: request.destinationCourseSlug,
          copiedModulesCount: 0,
          error: sourceCourse.error,
          errorType: sourceCourse.errorType
        };
      }

      // Find destination main course
      const destinationCourse = await this.findMainCourse(request.destinationCourseSlug);
      if (!destinationCourse.success) {
        return {
          success: false,
          destinationCourseSlug: request.destinationCourseSlug,
          copiedModulesCount: 0,
          error: destinationCourse.error,
          errorType: destinationCourse.errorType
        };
      }

      // Validate selected modules exist in source course
      const moduleValidation = this.validateSelectedModules(
        sourceCourse.course!, 
        request.selectedModuleIndexes
      );
      if (!moduleValidation.success) {
        return {
          success: false,
          destinationCourseSlug: request.destinationCourseSlug,
          copiedModulesCount: 0,
          error: moduleValidation.error,
          errorType: 'VALIDATION_ERROR'
        };
      }

      // Extract and transform selected modules
      const modulesToCopy = this.extractSelectedModules(
        sourceCourse.course!,
        request.selectedModuleIndexes
      );

      // Append modules to destination course
      const copyResult = await this.appendModulesToCourse(
        destinationCourse.course!,
        modulesToCopy,
        request.selectedModuleIndexes
      );

      if (!copyResult.success) {
        return {
          success: false,
          destinationCourseSlug: request.destinationCourseSlug,
          copiedModulesCount: 0,
          error: copyResult.error,
          errorType: copyResult.errorType
        };
      }

      // Copy quizzes for the selected modules
      await this.copyModuleQuizzes(
        request.sourceCourseSlug,
        request.destinationCourseSlug,
        request.selectedModuleIndexes,
        copyResult.startingIndex!
      );

      return {
        success: true,
        destinationCourseSlug: request.destinationCourseSlug,
        copiedModulesCount: request.selectedModuleIndexes.length,
        copiedModules: copyResult.copiedModules
      };

    } catch (error) {
      console.error('Unexpected error in hybrid copy operation:', error);
      return {
        success: false,
        destinationCourseSlug: request.destinationCourseSlug,
        copiedModulesCount: 0,
        error: error instanceof Error ? error.message : 'Unexpected error occurred',
        errorType: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Validate the hybrid copy request
   */
  private validateRequest(request: HybridCopyRequest): string | null {
    if (!request.sourceCourseSlug || typeof request.sourceCourseSlug !== 'string' || request.sourceCourseSlug.trim().length === 0) {
      return 'Source course slug is required and must be a non-empty string';
    }

    if (!request.destinationCourseSlug || typeof request.destinationCourseSlug !== 'string' || request.destinationCourseSlug.trim().length === 0) {
      return 'Destination course slug is required and must be a non-empty string';
    }

    if (!Array.isArray(request.selectedModuleIndexes) || request.selectedModuleIndexes.length === 0) {
      return 'Selected module indexes must be a non-empty array';
    }

    // Validate all module indexes are valid numbers
    for (const index of request.selectedModuleIndexes) {
      if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
        return 'All module indexes must be non-negative integers';
      }
    }

    // Check for duplicate indexes
    const uniqueIndexes = new Set(request.selectedModuleIndexes);
    if (uniqueIndexes.size !== request.selectedModuleIndexes.length) {
      return 'Duplicate module indexes are not allowed';
    }

    return null;
  }

  /**
   * Find sandbox course by slug
   */
  private async findSandboxCourse(slug: string): Promise<{
    success: boolean;
    course?: ISandboxCourse;
    error?: string;
    errorType?: HybridCopyResult['errorType'];
  }> {
    try {
      const course = await Promise.race([
        SandboxCourse.findOne({ slug: slug.trim() }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 10000)
        )
      ]) as any;

      if (!course) {
        return {
          success: false,
          error: `Sandbox course '${slug}' not found`,
          errorType: 'NOT_FOUND'
        };
      }

      return { success: true, course };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database connection failed',
        errorType: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Find main course by slug
   */
  private async findMainCourse(slug: string): Promise<{
    success: boolean;
    course?: ICourse;
    error?: string;
    errorType?: HybridCopyResult['errorType'];
  }> {
    try {
      const course = await Promise.race([
        Course.findOne({ slug: slug.trim() }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 10000)
        )
      ]) as any;

      if (!course) {
        return {
          success: false,
          error: `Main course '${slug}' not found`,
          errorType: 'NOT_FOUND'
        };
      }

      return { success: true, course };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database connection failed',
        errorType: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Validate that selected module indexes exist in the source course
   */
  private validateSelectedModules(
    sourceCourse: ISandboxCourse, 
    selectedIndexes: number[]
  ): { success: boolean; error?: string } {
    if (!sourceCourse.modules || sourceCourse.modules.length === 0) {
      return {
        success: false,
        error: 'Source sandbox course has no modules to copy'
      };
    }

    const maxIndex = sourceCourse.modules.length - 1;
    const invalidIndexes = selectedIndexes.filter(index => index > maxIndex);
    
    if (invalidIndexes.length > 0) {
      return {
        success: false,
        error: `Invalid module indexes: ${invalidIndexes.join(', ')}. Source course has only ${sourceCourse.modules.length} modules (indexes 0-${maxIndex})`
      };
    }

    return { success: true };
  }

  /**
   * Extract selected modules from source course and transform them for main course format
   */
  private extractSelectedModules(sourceCourse: ISandboxCourse, selectedIndexes: number[]): any[] {
    const modules: any[] = [];

    for (const index of selectedIndexes) {
      const sourceModule = sourceCourse.modules[index];
      if (sourceModule) {
        const transformedModule = this.transformSandboxModule(sourceModule);
        modules.push(transformedModule);
      }
    }

    return modules;
  }

  /**
   * Transform sandbox module to main course module format
   */
  private transformSandboxModule(sandboxModule: any): any {
    return {
      title: sandboxModule.title || 'Untitled Module',
      videos: Array.isArray(sandboxModule.videos) ? sandboxModule.videos.filter((video: any) => 
        video && video.title && video.url
      ) : [],
      documents: this.transformDocuments(sandboxModule.documents || []),
      quizId: null // Will be set when quiz is copied
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
   * Append modules to the destination course
   */
  private async appendModulesToCourse(
    destinationCourse: ICourse,
    modulesToAdd: any[],
    sourceIndexes: number[]
  ): Promise<{
    success: boolean;
    error?: string;
    errorType?: HybridCopyResult['errorType'];
    startingIndex?: number;
    copiedModules?: Array<{
      sourceIndex: number;
      destinationIndex: number;
      title: string;
    }>;
  }> {
    try {
      const startingIndex = destinationCourse.modules.length;
      const copiedModules: Array<{
        sourceIndex: number;
        destinationIndex: number;
        title: string;
      }> = [];

      // Add modules to the destination course
      modulesToAdd.forEach((module, i) => {
        destinationCourse.modules.push(module);
        copiedModules.push({
          sourceIndex: sourceIndexes[i],
          destinationIndex: startingIndex + i,
          title: module.title
        });
      });

      // Save the updated course
      await (destinationCourse as any).save();

      return {
        success: true,
        startingIndex,
        copiedModules
      };
    } catch (error) {
      console.error('Error appending modules to course:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to append modules to destination course',
        errorType: 'DATABASE_ERROR'
      };
    }
  }

  /**
   * Copy quizzes for the selected modules to the destination course
   */
  private async copyModuleQuizzes(
    sourceCourseSlug: string,
    destinationCourseSlug: string,
    sourceModuleIndexes: number[],
    destinationStartingIndex: number
  ): Promise<void> {
    try {
      // Get the source course to access embedded quiz data
      const sourceCourse = await SandboxCourse.findOne({ slug: sourceCourseSlug });
      if (!sourceCourse) {
        console.warn(`Source course ${sourceCourseSlug} not found during quiz copying`);
        return;
      }

      // Copy quizzes from both Quiz collection and embedded quiz data
      for (let i = 0; i < sourceModuleIndexes.length; i++) {
        const sourceModuleIndex = sourceModuleIndexes[i];
        const destinationModuleIndex = destinationStartingIndex + i;

        try {
          // First, check if there's a quiz in the Quiz collection
          const existingQuiz = await Quiz.findOne({
            courseSlug: sourceCourseSlug,
            moduleIndex: sourceModuleIndex,
            isSandbox: true
          });

          let quizCreated = false;

          if (existingQuiz && existingQuiz.questions && existingQuiz.questions.length > 0) {
            // Copy from Quiz collection
            const transformedQuestions = this.transformQuizQuestions(existingQuiz.questions);
            
            if (transformedQuestions.length > 0) {
              const newQuiz = new Quiz({
                courseSlug: destinationCourseSlug,
                moduleIndex: destinationModuleIndex,
                questions: transformedQuestions,
                isSandbox: false
              });

              const savedQuiz = await newQuiz.save();
              await this.updateModuleQuizReference(destinationCourseSlug, destinationModuleIndex, (savedQuiz as any)._id.toString());
              quizCreated = true;
              console.log(`Copied quiz from collection for module ${sourceModuleIndex} to ${destinationModuleIndex}`);
            }
          }

          // If no quiz was created from collection, check embedded quiz data
          if (!quizCreated && sourceCourse.modules[sourceModuleIndex]) {
            const sourceModule = sourceCourse.modules[sourceModuleIndex];
            if (sourceModule.quiz && sourceModule.quiz.questions && sourceModule.quiz.questions.length > 0) {
              const transformedQuestions = this.transformQuizQuestions(sourceModule.quiz.questions);
              
              if (transformedQuestions.length > 0) {
                const newQuiz = new Quiz({
                  courseSlug: destinationCourseSlug,
                  moduleIndex: destinationModuleIndex,
                  questions: transformedQuestions,
                  isSandbox: false
                });

                const savedQuiz = await newQuiz.save();
                await this.updateModuleQuizReference(destinationCourseSlug, destinationModuleIndex, (savedQuiz as any)._id.toString());
                console.log(`Copied embedded quiz for module ${sourceModuleIndex} to ${destinationModuleIndex}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error copying quiz for module ${sourceModuleIndex}:`, error);
          // Continue with other modules even if one quiz fails
        }
      }
    } catch (error) {
      console.error('Error in copyModuleQuizzes:', error);
      // Don't fail the entire operation for quiz copying issues
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

      if (moduleIndex < course.modules.length && course.modules[moduleIndex]) {
        course.modules[moduleIndex].quizId = quizId;
        await (course as any).save();
        console.log(`Updated module ${moduleIndex} with quiz reference ${quizId}`);
      } else {
        console.error(`Module ${moduleIndex} not found in course ${courseSlug}`);
      }
    } catch (error) {
      console.error(`Error updating module quiz reference for course ${courseSlug}, module ${moduleIndex}:`, error);
    }
  }
}