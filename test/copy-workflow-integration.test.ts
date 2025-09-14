import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SandboxToCoursesCopyService } from '../server/services/sandboxToCoursesCopyService';

// Mock the database models
vi.mock('../server/models/sandboxCourse', () => ({
  SandboxCourse: {
    findOne: vi.fn()
  }
}));

vi.mock('../server/models/course', () => ({
  Course: vi.fn().mockImplementation((data) => ({
    ...data,
    save: vi.fn().mockResolvedValue(data)
  }))
}));

vi.mock('../server/models/quiz', () => ({
  default: vi.fn().mockImplementation((data) => ({
    ...data,
    _id: 'mock-quiz-id-' + Math.random(),
    save: vi.fn().mockResolvedValue(data)
  })),
  find: vi.fn().mockResolvedValue([])
}));

describe('Copy Workflow Integration Tests', () => {
  let copyService: SandboxToCoursesCopyService;
  let mockSandboxCourse: any;

  beforeEach(() => {
    copyService = new SandboxToCoursesCopyService();
    
    // Mock sandbox course data
    mockSandboxCourse = {
      slug: 'integration-test-course',
      title: 'Integration Test Course',
      type: 'with-mba',
      description: 'A comprehensive test course for integration testing',
      liveClassConfig: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 'Wednesday',
        durationMin: 90
      },
      modules: [
        {
          title: 'Core Module 1',
          videos: [
            {
              title: 'Introduction Video',
              url: 'https://youtube.com/watch?v=intro',
              duration: 600
            }
          ],
          documents: [
            {
              title: 'Course Introduction',
              fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/intro.pdf',
              fileName: 'intro.pdf',
              fileSize: 1024,
              fileType: 'application/pdf',
              publicId: 'intro'
            }
          ],
          quiz: {
            questions: [
              {
                text: 'What is the main focus of this course?',
                choices: ['Business', 'Technology', 'Finance', 'Marketing'],
                correctIndex: 2
              }
            ]
          },
          quizId: null
        }
      ],
      mbaModules: [
        {
          title: 'MBA Strategy Module',
          videos: [
            {
              title: 'Strategic Planning',
              url: 'https://youtube.com/watch?v=strategy',
              duration: 1200
            }
          ],
          documents: [
            {
              title: 'Strategy Framework',
              fileUrl: 'https://res.cloudinary.com/test/raw/upload/v456/strategy.pdf',
              fileName: 'strategy.pdf',
              fileSize: 2048,
              fileType: 'application/pdf',
              publicId: 'strategy'
            }
          ],
          quiz: {
            questions: [
              {
                text: 'What is the first step in strategic planning?',
                choices: ['Analysis', 'Implementation', 'Evaluation'],
                correctIndex: 0
              }
            ]
          },
          quizId: null
        }
      ]
    };
  });

  describe('Single Course Copy Integration', () => {
    it('should successfully copy a single sandbox course with all requirements met', async () => {
      // Requirements 2.7, 5.1, 5.2, 5.3, 5.4, 5.5: Complete copy workflow
      const { SandboxCourse } = await import('../server/models/sandboxCourse');
      const { Course } = await import('../server/models/course');
      
      // Mock finding the sandbox course
      (SandboxCourse.findOne as any).mockResolvedValue(mockSandboxCourse);
      
      // Mock course creation
      const mockCourseConstructor = Course as any;
      mockCourseConstructor.findOne = vi.fn().mockResolvedValue(null); // No existing course
      
      const results = await copyService.copySandboxCourses(['integration-test-course']);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].sandboxSlug).toBe('integration-test-course');
      expect(results[0].newCourseSlug).toBe('integration-test-course');
      
      // Verify SandboxCourse.findOne was called correctly
      expect(SandboxCourse.findOne).toHaveBeenCalledWith({ slug: 'integration-test-course' });
      
      // Verify Course constructor was called with transformed data
      expect(Course).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'integration-test-course',
        title: 'Integration Test Course',
        type: 'with-mba',
        description: 'A comprehensive test course for integration testing'
      }));
    });

    it('should handle non-existent sandbox course gracefully', async () => {
      const { SandboxCourse } = await import('../server/models/sandboxCourse');
      
      // Mock course not found
      (SandboxCourse.findOne as any).mockResolvedValue(null);
      
      const results = await copyService.copySandboxCourses(['non-existent-course']);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].sandboxSlug).toBe('non-existent-course');
      expect(results[0].error).toBe('Sandbox course not found');
      expect(results[0].newCourseSlug).toBeUndefined();
    });
  });

  describe('Multiple Course Copy Integration', () => {
    it('should copy multiple courses and handle mixed success/failure scenarios', async () => {
      const { SandboxCourse } = await import('../server/models/sandboxCourse');
      const { Course } = await import('../server/models/course');
      
      // Mock different responses for different courses
      (SandboxCourse.findOne as any)
        .mockResolvedValueOnce(mockSandboxCourse) // First course exists
        .mockResolvedValueOnce(null) // Second course doesn't exist
        .mockResolvedValueOnce({ // Third course exists
          ...mockSandboxCourse,
          slug: 'another-test-course',
          title: 'Another Test Course'
        });
      
      const mockCourseConstructor = Course as any;
      mockCourseConstructor.findOne = vi.fn().mockResolvedValue(null);
      
      const results = await copyService.copySandboxCourses([
        'integration-test-course',
        'non-existent-course',
        'another-test-course'
      ]);
      
      expect(results).toHaveLength(3);
      
      // First course should succeed
      expect(results[0].success).toBe(true);
      expect(results[0].sandboxSlug).toBe('integration-test-course');
      
      // Second course should fail
      expect(results[1].success).toBe(false);
      expect(results[1].sandboxSlug).toBe('non-existent-course');
      expect(results[1].error).toBe('Sandbox course not found');
      
      // Third course should succeed
      expect(results[2].success).toBe(true);
      expect(results[2].sandboxSlug).toBe('another-test-course');
    });
  }); 
 describe('Course Structure Validation', () => {
    it('should validate that copied courses maintain proper structure for student access', () => {
      // Requirements 5.2, 5.3: Students can access all content like regular courses
      
      // Simulate the transformation that would happen during copy
      const transformedModules = mockSandboxCourse.modules.map((module: any) => 
        (copyService as any).transformModule(module)
      );
      const transformedMbaModules = mockSandboxCourse.mbaModules.map((module: any) => 
        (copyService as any).transformModule(module)
      );
      
      const copiedCourseStructure = {
        slug: mockSandboxCourse.slug,
        title: mockSandboxCourse.title,
        type: mockSandboxCourse.type,
        description: mockSandboxCourse.description,
        liveClassConfig: mockSandboxCourse.liveClassConfig,
        modules: transformedModules,
        mbaModules: transformedMbaModules
      };
      
      // Verify course structure is suitable for student enrollment
      expect(copiedCourseStructure.slug).toBeTruthy();
      expect(copiedCourseStructure.title).toBeTruthy();
      expect(copiedCourseStructure.modules).toBeInstanceOf(Array);
      expect(copiedCourseStructure.mbaModules).toBeInstanceOf(Array);
      
      // Verify core module structure
      expect(copiedCourseStructure.modules).toHaveLength(1);
      const coreModule = copiedCourseStructure.modules[0];
      expect(coreModule.title).toBe('Core Module 1');
      expect(coreModule.videos).toHaveLength(1);
      expect(coreModule.documents).toHaveLength(1);
      
      // Verify document transformation (Cloudinary metadata removed)
      expect(coreModule.documents[0].title).toBe('Course Introduction');
      expect(coreModule.documents[0].url).toBe('https://res.cloudinary.com/test/raw/upload/v123/intro.pdf');
      expect(coreModule.documents[0]).not.toHaveProperty('fileName');
      expect(coreModule.documents[0]).not.toHaveProperty('fileSize');
      expect(coreModule.documents[0]).not.toHaveProperty('fileType');
      expect(coreModule.documents[0]).not.toHaveProperty('publicId');
      
      // Verify MBA module structure
      expect(copiedCourseStructure.mbaModules).toHaveLength(1);
      const mbaModule = copiedCourseStructure.mbaModules[0];
      expect(mbaModule.title).toBe('MBA Strategy Module');
      expect(mbaModule.videos).toHaveLength(1);
      expect(mbaModule.documents).toHaveLength(1);
      
      // Verify MBA document transformation
      expect(mbaModule.documents[0].title).toBe('Strategy Framework');
      expect(mbaModule.documents[0].url).toBe('https://res.cloudinary.com/test/raw/upload/v456/strategy.pdf');
      expect(mbaModule.documents[0]).not.toHaveProperty('fileName');
    });

    it('should validate quiz structure for student interaction', () => {
      // Requirement 5.5: Quiz functionality works normally for copied courses
      
      // Test core module quiz transformation
      const coreQuizQuestions = (copyService as any).transformQuizQuestions(
        mockSandboxCourse.modules[0].quiz.questions
      );
      
      expect(coreQuizQuestions).toHaveLength(1);
      expect(coreQuizQuestions[0]).toEqual({
        text: 'What is the main focus of this course?',
        choices: ['Business', 'Technology', 'Finance', 'Marketing'],
        correctIndex: 2
      });
      
      // Test MBA module quiz transformation
      const mbaQuizQuestions = (copyService as any).transformQuizQuestions(
        mockSandboxCourse.mbaModules[0].quiz.questions
      );
      
      expect(mbaQuizQuestions).toHaveLength(1);
      expect(mbaQuizQuestions[0]).toEqual({
        text: 'What is the first step in strategic planning?',
        choices: ['Analysis', 'Implementation', 'Evaluation'],
        correctIndex: 0
      });
      
      // Verify quiz structure is compatible with enrollment system
      expect(coreQuizQuestions[0]).toHaveProperty('text');
      expect(coreQuizQuestions[0]).toHaveProperty('choices');
      expect(coreQuizQuestions[0]).toHaveProperty('correctIndex');
      expect(Array.isArray(coreQuizQuestions[0].choices)).toBe(true);
      expect(typeof coreQuizQuestions[0].correctIndex).toBe('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle course save failures gracefully', async () => {
      const { SandboxCourse } = await import('../server/models/sandboxCourse');
      const { Course } = await import('../server/models/course');
      
      // Mock finding the sandbox course
      (SandboxCourse.findOne as any).mockResolvedValue(mockSandboxCourse);
      
      // Mock course save failure
      const mockCourseInstance = {
        save: vi.fn().mockRejectedValue(new Error('Database save failed'))
      };
      (Course as any).mockImplementation(() => mockCourseInstance);
      
      const results = await copyService.copySandboxCourses(['integration-test-course']);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].sandboxSlug).toBe('integration-test-course');
      expect(results[0].error).toBe('Database save failed');
    });

    it('should validate data integrity throughout the copy process', () => {
      // Comprehensive data validation test
      const originalModuleCount = mockSandboxCourse.modules.length + mockSandboxCourse.mbaModules.length;
      const originalVideoCount = mockSandboxCourse.modules.reduce((acc: number, mod: any) => acc + mod.videos.length, 0) +
                                mockSandboxCourse.mbaModules.reduce((acc: number, mod: any) => acc + mod.videos.length, 0);
      const originalDocumentCount = mockSandboxCourse.modules.reduce((acc: number, mod: any) => acc + mod.documents.length, 0) +
                                   mockSandboxCourse.mbaModules.reduce((acc: number, mod: any) => acc + mod.documents.length, 0);
      
      // Transform all modules
      const allTransformedModules = [
        ...mockSandboxCourse.modules.map((mod: any) => (copyService as any).transformModule(mod)),
        ...mockSandboxCourse.mbaModules.map((mod: any) => (copyService as any).transformModule(mod))
      ];
      
      const transformedVideoCount = allTransformedModules.reduce((acc, mod) => acc + mod.videos.length, 0);
      const transformedDocumentCount = allTransformedModules.reduce((acc, mod) => acc + mod.documents.length, 0);
      
      // Verify counts match
      expect(allTransformedModules.length).toBe(originalModuleCount);
      expect(transformedVideoCount).toBe(originalVideoCount);
      expect(transformedDocumentCount).toBe(originalDocumentCount);
      
      // Verify all documents have been transformed correctly
      allTransformedModules.forEach(module => {
        module.documents.forEach((doc: any) => {
          expect(doc).toHaveProperty('title');
          expect(doc).toHaveProperty('url');
          expect(doc).not.toHaveProperty('fileName');
          expect(doc).not.toHaveProperty('fileSize');
          expect(doc).not.toHaveProperty('fileType');
          expect(doc).not.toHaveProperty('publicId');
        });
      });
    });
  });
});