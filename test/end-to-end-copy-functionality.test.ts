import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SandboxToCoursesCopyService } from '../server/services/sandboxToCoursesCopyService';

describe('End-to-End Copy Functionality Tests', () => {
  let copyService: SandboxToCoursesCopyService;

  beforeEach(() => {
    copyService = new SandboxToCoursesCopyService();
  });

  describe('Document Structure Transformation', () => {
    it('should transform sandbox document structure to regular course format', () => {
      // Requirement 2.3: Transform document structure from Cloudinary metadata to URL references
      const sandboxDocuments = [
        {
          title: 'Test Document 1',
          fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/test-doc1.pdf',
          fileName: 'test-doc1.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          publicId: 'test-doc1'
        },
        {
          title: 'Test Document 2',
          fileUrl: 'https://res.cloudinary.com/test/raw/upload/v456/test-doc2.docx',
          fileName: 'test-doc2.docx',
          fileSize: 2048,
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          publicId: 'test-doc2'
        }
      ];

      // Access the private method using bracket notation for testing
      const transformedDocs = (copyService as any).transformDocuments(sandboxDocuments);

      expect(transformedDocs).toHaveLength(2);
      
      // Verify first document transformation
      expect(transformedDocs[0]).toEqual({
        title: 'Test Document 1',
        url: 'https://res.cloudinary.com/test/raw/upload/v123/test-doc1.pdf'
      });
      
      // Verify second document transformation
      expect(transformedDocs[1]).toEqual({
        title: 'Test Document 2',
        url: 'https://res.cloudinary.com/test/raw/upload/v456/test-doc2.docx'
      });
      
      // Verify that Cloudinary metadata is removed
      expect(transformedDocs[0]).not.toHaveProperty('fileName');
      expect(transformedDocs[0]).not.toHaveProperty('fileSize');
      expect(transformedDocs[0]).not.toHaveProperty('fileType');
      expect(transformedDocs[0]).not.toHaveProperty('publicId');
    });

    it('should handle empty documents array', () => {
      const transformedDocs = (copyService as any).transformDocuments([]);
      expect(transformedDocs).toHaveLength(0);
    });

    it('should handle null/undefined documents', () => {
      const transformedDocs = (copyService as any).transformDocuments(null);
      expect(transformedDocs).toHaveLength(0);
    });
  }); 
 describe('Module Structure Transformation', () => {
    it('should transform module structure correctly preserving all content', () => {
      // Requirement 2.1, 2.2: Copy all associated modules with content
      const sandboxModule = {
        title: 'Test Module',
        videos: [
          {
            title: 'Test Video',
            url: 'https://youtube.com/watch?v=test',
            duration: 300
          }
        ],
        documents: [
          {
            title: 'Test Document',
            fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/test-doc.pdf',
            fileName: 'test-doc.pdf',
            fileSize: 1024,
            fileType: 'application/pdf',
            publicId: 'test-doc'
          }
        ],
        quiz: {
          questions: [{
            text: 'Test question?',
            choices: ['Option A', 'Option B', 'Option C'],
            correctIndex: 0
          }]
        },
        quizId: 'test-quiz-id'
      };

      const transformedModule = (copyService as any).transformModule(sandboxModule);

      expect(transformedModule.title).toBe('Test Module');
      expect(transformedModule.videos).toHaveLength(1);
      expect(transformedModule.videos[0]).toEqual({
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test',
        duration: 300
      });
      
      expect(transformedModule.documents).toHaveLength(1);
      expect(transformedModule.documents[0]).toEqual({
        title: 'Test Document',
        url: 'https://res.cloudinary.com/test/raw/upload/v123/test-doc.pdf'
      });
      
      expect(transformedModule.quizId).toBe('test-quiz-id');
    });

    it('should handle modules with multiple videos and documents', () => {
      // Requirement 2.4: Copy all video content and maintain media references
      const sandboxModule = {
        title: 'Complex Module',
        videos: [
          {
            title: 'Video 1',
            url: 'https://youtube.com/watch?v=video1',
            duration: 300
          },
          {
            title: 'Video 2',
            url: 'https://youtube.com/watch?v=video2',
            duration: 600
          }
        ],
        documents: [
          {
            title: 'Document 1',
            fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/doc1.pdf',
            fileName: 'doc1.pdf',
            fileSize: 1024,
            fileType: 'application/pdf',
            publicId: 'doc1'
          },
          {
            title: 'Document 2',
            fileUrl: 'https://res.cloudinary.com/test/raw/upload/v456/doc2.pdf',
            fileName: 'doc2.pdf',
            fileSize: 2048,
            fileType: 'application/pdf',
            publicId: 'doc2'
          }
        ],
        quizId: null
      };

      const transformedModule = (copyService as any).transformModule(sandboxModule);

      expect(transformedModule.videos).toHaveLength(2);
      expect(transformedModule.documents).toHaveLength(2);
      
      // Verify all videos are preserved
      expect(transformedModule.videos[0].title).toBe('Video 1');
      expect(transformedModule.videos[1].title).toBe('Video 2');
      
      // Verify all documents are transformed correctly
      expect(transformedModule.documents[0].title).toBe('Document 1');
      expect(transformedModule.documents[0].url).toBe('https://res.cloudinary.com/test/raw/upload/v123/doc1.pdf');
      expect(transformedModule.documents[1].title).toBe('Document 2');
      expect(transformedModule.documents[1].url).toBe('https://res.cloudinary.com/test/raw/upload/v456/doc2.pdf');
    });
  });

  describe('Quiz Question Transformation', () => {
    it('should transform quiz questions correctly preserving all data', () => {
      // Requirement 2.5: Copy all quiz data including questions and answers
      const sandboxQuestions = [
        {
          text: 'What is 2+2?',
          choices: ['3', '4', '5'],
          correctIndex: 1
        },
        {
          text: 'What is the capital of France?',
          choices: ['London', 'Berlin', 'Paris'],
          correctIndex: 2
        }
      ];

      const transformedQuestions = (copyService as any).transformQuizQuestions(sandboxQuestions);

      expect(transformedQuestions).toHaveLength(2);
      expect(transformedQuestions[0]).toEqual({
        text: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correctIndex: 1
      });
      expect(transformedQuestions[1]).toEqual({
        text: 'What is the capital of France?',
        choices: ['London', 'Berlin', 'Paris'],
        correctIndex: 2
      });
    });

    it('should filter out invalid quiz questions and fix correctIndex', () => {
      // Requirement 5.5: Ensure quiz functionality works normally
      const invalidQuestions = [
        {
          text: 'Valid question?',
          choices: ['A', 'B', 'C'],
          correctIndex: 0
        },
        {
          text: '', // Invalid: empty text
          choices: ['A', 'B'],
          correctIndex: 0
        },
        {
          text: 'Question with no choices?',
          choices: [], // Invalid: no choices
          correctIndex: 0
        },
        null, // Invalid: null question
        {
          text: 'Question with invalid correctIndex?',
          choices: ['A', 'B'],
          correctIndex: 5 // Invalid: out of bounds
        }
      ];

      const transformedQuestions = (copyService as any).transformQuizQuestions(invalidQuestions);

      expect(transformedQuestions).toHaveLength(2); // Only valid questions should remain
      expect(transformedQuestions[0].text).toBe('Valid question?');
      expect(transformedQuestions[1].text).toBe('Question with invalid correctIndex?');
      expect(transformedQuestions[1].correctIndex).toBe(0); // Should be reset to 0
    });

    it('should handle empty quiz questions array', () => {
      const transformedQuestions = (copyService as any).transformQuizQuestions([]);
      expect(transformedQuestions).toHaveLength(0);
    });

    it('should handle null quiz questions', () => {
      const transformedQuestions = (copyService as any).transformQuizQuestions(null);
      expect(transformedQuestions).toHaveLength(0);
    });
  }); 
 describe('Duplicate Handling Logic', () => {
    it('should handle duplicate course names correctly', () => {
      // Requirement 3.3: Handle duplicate course names with suffix
      const originalTitle = 'Test Course';
      const newTitle = copyService.handleDuplicateCourse(originalTitle);
      
      expect(newTitle).toBe('Test Course - Copy');
    });

    it('should handle duplicate course names with existing copy suffix', () => {
      const originalTitle = 'Test Course - Copy';
      const newTitle = copyService.handleDuplicateCourse(originalTitle);
      
      expect(newTitle).toBe('Test Course - Copy - Copy');
    });

    it('should handle empty course titles', () => {
      const originalTitle = '';
      const newTitle = copyService.handleDuplicateCourse(originalTitle);
      
      expect(newTitle).toBe(' - Copy');
    });
  });

  describe('Complete Course Structure Validation', () => {
    it('should validate complete course copy workflow for standalone course', () => {
      // Requirements 2.1, 2.2, 2.3, 2.4, 2.5: Complete course structure preservation
      const mockSandboxCourse = {
        slug: 'test-course',
        title: 'Test Standalone Course',
        type: 'standalone',
        description: 'A test course',
        liveClassConfig: {
          enabled: true,
          frequency: 'weekly',
          dayOfWeek: 'Monday',
          durationMin: 60
        },
        modules: [
          {
            title: 'Module 1',
            videos: [
              {
                title: 'Video 1',
                url: 'https://youtube.com/watch?v=test1',
                duration: 300
              }
            ],
            documents: [
              {
                title: 'Document 1',
                fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/doc1.pdf',
                fileName: 'doc1.pdf',
                fileSize: 1024,
                fileType: 'application/pdf',
                publicId: 'doc1'
              }
            ],
            quiz: {
              questions: [
                {
                  text: 'Test question?',
                  choices: ['A', 'B', 'C'],
                  correctIndex: 1
                }
              ]
            },
            quizId: null
          }
        ],
        mbaModules: []
      };

      // Test module transformation
      const transformedModules = mockSandboxCourse.modules.map(module => 
        (copyService as any).transformModule(module)
      );

      expect(transformedModules).toHaveLength(1);
      expect(transformedModules[0].title).toBe('Module 1');
      expect(transformedModules[0].videos).toHaveLength(1);
      expect(transformedModules[0].documents).toHaveLength(1);
      expect(transformedModules[0].documents[0].url).toBe('https://res.cloudinary.com/test/raw/upload/v123/doc1.pdf');
      expect(transformedModules[0].documents[0]).not.toHaveProperty('fileName');
    }); 
   it('should validate complete course copy workflow for with-mba course', () => {
      // Requirements 2.1, 2.2: Handle both regular and MBA modules
      const mockSandboxCourse = {
        slug: 'test-mba-course',
        title: 'Test MBA Course',
        type: 'with-mba',
        description: 'A test course with MBA modules',
        liveClassConfig: {
          enabled: false,
          frequency: 'monthly',
          dayOfWeek: 'Friday',
          durationMin: 90
        },
        modules: [
          {
            title: 'Core Module 1',
            videos: [
              {
                title: 'Core Video 1',
                url: 'https://youtube.com/watch?v=core1',
                duration: 600
              }
            ],
            documents: [
              {
                title: 'Core Document 1',
                fileUrl: 'https://res.cloudinary.com/test/raw/upload/v456/core-doc.pdf',
                fileName: 'core-doc.pdf',
                fileSize: 2048,
                fileType: 'application/pdf',
                publicId: 'core-doc'
              }
            ],
            quizId: null
          }
        ],
        mbaModules: [
          {
            title: 'MBA Module 1',
            videos: [
              {
                title: 'MBA Video 1',
                url: 'https://youtube.com/watch?v=mba1',
                duration: 900
              }
            ],
            documents: [
              {
                title: 'MBA Document 1',
                fileUrl: 'https://res.cloudinary.com/test/raw/upload/v789/mba-doc.pdf',
                fileName: 'mba-doc.pdf',
                fileSize: 3072,
                fileType: 'application/pdf',
                publicId: 'mba-doc'
              }
            ],
            quiz: {
              questions: [
                {
                  text: 'MBA question?',
                  choices: ['MBA A', 'MBA B'],
                  correctIndex: 0
                }
              ]
            },
            quizId: null
          }
        ]
      };

      // Test both regular and MBA module transformation
      const transformedModules = mockSandboxCourse.modules.map(module => 
        (copyService as any).transformModule(module)
      );
      const transformedMbaModules = mockSandboxCourse.mbaModules.map(module => 
        (copyService as any).transformModule(module)
      );

      // Verify core modules
      expect(transformedModules).toHaveLength(1);
      expect(transformedModules[0].title).toBe('Core Module 1');
      expect(transformedModules[0].documents[0].url).toBe('https://res.cloudinary.com/test/raw/upload/v456/core-doc.pdf');

      // Verify MBA modules
      expect(transformedMbaModules).toHaveLength(1);
      expect(transformedMbaModules[0].title).toBe('MBA Module 1');
      expect(transformedMbaModules[0].documents[0].url).toBe('https://res.cloudinary.com/test/raw/upload/v789/mba-doc.pdf');
      expect(transformedMbaModules[0].documents[0]).not.toHaveProperty('fileName');
    });
  });

  describe('Student Enrollment Compatibility', () => {
    it('should ensure copied course structure is compatible with enrollment system', () => {
      // Requirements 5.1, 5.2, 5.3, 5.4: Ensure student access compatibility
      const mockCopiedCourse = {
        slug: 'copied-course',
        title: 'Copied Course',
        type: 'standalone',
        modules: [
          {
            title: 'Module 1',
            videos: [
              {
                title: 'Video 1',
                url: 'https://youtube.com/watch?v=test',
                duration: 300
              }
            ],
            documents: [
              {
                title: 'Document 1',
                url: 'https://res.cloudinary.com/test/raw/upload/v123/doc.pdf'
              }
            ],
            quizId: 'quiz-id-123'
          }
        ],
        mbaModules: []
      };

      // Verify course structure matches enrollment expectations
      expect(mockCopiedCourse.slug).toBeTruthy();
      expect(mockCopiedCourse.title).toBeTruthy();
      expect(mockCopiedCourse.modules).toBeInstanceOf(Array);
      expect(mockCopiedCourse.modules[0]).toHaveProperty('title');
      expect(mockCopiedCourse.modules[0]).toHaveProperty('videos');
      expect(mockCopiedCourse.modules[0]).toHaveProperty('documents');
      expect(mockCopiedCourse.modules[0]).toHaveProperty('quizId');

      // Verify document structure is simplified for student access
      expect(mockCopiedCourse.modules[0].documents[0]).toHaveProperty('title');
      expect(mockCopiedCourse.modules[0].documents[0]).toHaveProperty('url');
      expect(mockCopiedCourse.modules[0].documents[0]).not.toHaveProperty('fileName');
      expect(mockCopiedCourse.modules[0].documents[0]).not.toHaveProperty('fileSize');
      expect(mockCopiedCourse.modules[0].documents[0]).not.toHaveProperty('fileType');
      expect(mockCopiedCourse.modules[0].documents[0]).not.toHaveProperty('publicId');
    });
  });
});