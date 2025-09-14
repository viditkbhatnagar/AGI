import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxToCoursesCopyService } from '../server/services/sandboxToCoursesCopyService';

describe('Copy Endpoint Integration Tests', () => {
  let copyService: SandboxToCoursesCopyService;

  beforeEach(() => {
    copyService = new SandboxToCoursesCopyService();
  });

  describe('Document Transformation Logic', () => {
    it('should transform sandbox document structure to regular course format', () => {
      // Test the private transformDocuments method by accessing it through reflection
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

      // Access the private method using bracket notation
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

    it('should transform module structure correctly', () => {
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
  });

  describe('Quiz Question Transformation', () => {
    it('should transform quiz questions correctly', () => {
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

    it('should filter out invalid quiz questions', () => {
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

  describe('Duplicate Handling', () => {
    it('should handle duplicate course names correctly', () => {
      const originalTitle = 'Test Course';
      const newTitle = copyService.handleDuplicateCourse(originalTitle);
      
      expect(newTitle).toBe('Test Course - Copy');
    });

    it('should handle duplicate course names with existing copy suffix', () => {
      const originalTitle = 'Test Course - Copy';
      const newTitle = copyService.handleDuplicateCourse(originalTitle);
      
      expect(newTitle).toBe('Test Course - Copy - Copy');
    });
  });
});