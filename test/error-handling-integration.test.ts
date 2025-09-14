import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxToCoursesCopyService } from '../server/services/sandboxToCoursesCopyService';

describe('Error Handling Integration Tests', () => {
  let copyService: SandboxToCoursesCopyService;

  beforeEach(() => {
    copyService = new SandboxToCoursesCopyService();
  });

  describe('Input Validation', () => {
    it('should reject empty array', async () => {
      await expect(copyService.copySandboxCourses([])).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should reject null input', async () => {
      await expect(copyService.copySandboxCourses(null as any)).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should reject undefined input', async () => {
      await expect(copyService.copySandboxCourses(undefined as any)).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should reject non-array input', async () => {
      await expect(copyService.copySandboxCourses('not-an-array' as any)).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });
  });

  describe('Single Course Validation', () => {
    it('should handle empty string slug', async () => {
      const result = await copyService.copySingleCourse('');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
    });

    it('should handle null slug', async () => {
      const result = await copyService.copySingleCourse(null as any);
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
    });

    it('should handle whitespace-only slug', async () => {
      const result = await copyService.copySingleCourse('   \t\n   ');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
    });
  });

  describe('Document Transformation Edge Cases', () => {
    it('should handle null documents', () => {
      const result = (copyService as any).transformDocuments(null);
      expect(result).toEqual([]);
    });

    it('should handle undefined documents', () => {
      const result = (copyService as any).transformDocuments(undefined);
      expect(result).toEqual([]);
    });

    it('should filter invalid documents', () => {
      const documents = [
        {
          title: 'Valid Document',
          fileUrl: 'https://example.com/doc.pdf'
        },
        {
          title: '',
          fileUrl: 'https://example.com/doc2.pdf'
        },
        {
          title: 'Invalid Document'
          // missing fileUrl
        }
      ];

      const result = (copyService as any).transformDocuments(documents);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Document');
    });
  });

  describe('Module Transformation Edge Cases', () => {
    it('should handle null module', () => {
      const result = (copyService as any).transformModule(null);
      
      expect(result).toEqual({
        title: 'Untitled Module',
        videos: [],
        documents: [],
        quizId: null
      });
    });

    it('should handle module with missing title', () => {
      const module = {
        videos: [],
        documents: []
      };

      const result = (copyService as any).transformModule(module);
      expect(result.title).toBe('Untitled Module');
    });
  });

  describe('Quiz Question Validation', () => {
    it('should filter invalid questions', () => {
      const questions = [
        {
          text: 'Valid question?',
          choices: ['A', 'B'],
          correctIndex: 0
        },
        {
          text: '',
          choices: ['A', 'B'],
          correctIndex: 0
        },
        {
          text: 'No choices question?',
          choices: [],
          correctIndex: 0
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Valid question?');
    });

    it('should reset invalid correctIndex', () => {
      const questions = [
        {
          text: 'Question with invalid index?',
          choices: ['A', 'B'],
          correctIndex: 5
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(1);
      expect(result[0].correctIndex).toBe(0);
    });
  });

  describe('Course Validation', () => {
    it('should validate missing title', () => {
      const course = {
        slug: 'test-slug',
        type: 'standalone',
        modules: [{ title: 'Module 1' }]
      };

      const error = (copyService as any).validateSandboxCourse(course);
      expect(error).toBe('Sandbox course must have a valid title');
    });

    it('should validate missing slug', () => {
      const course = {
        title: 'Test Course',
        type: 'standalone',
        modules: [{ title: 'Module 1' }]
      };

      const error = (copyService as any).validateSandboxCourse(course);
      expect(error).toBe('Sandbox course must have a valid slug');
    });

    it('should validate no modules', () => {
      const course = {
        slug: 'test-slug',
        title: 'Test Course',
        type: 'standalone',
        modules: [],
        mbaModules: []
      };

      const error = (copyService as any).validateSandboxCourse(course);
      expect(error).toBe('Sandbox course must have at least one module or MBA module');
    });

    it('should pass valid course', () => {
      const course = {
        slug: 'test-slug',
        title: 'Test Course',
        type: 'standalone',
        modules: [{ title: 'Module 1' }]
      };

      const error = (copyService as any).validateSandboxCourse(course);
      expect(error).toBeNull();
    });
  });

  describe('Duplicate Handling', () => {
    it('should append copy suffix', () => {
      const result = copyService.handleDuplicateCourse('Test Course');
      expect(result).toBe('Test Course - Copy');
    });

    it('should handle existing copy suffix', () => {
      const result = copyService.handleDuplicateCourse('Test Course - Copy');
      expect(result).toBe('Test Course - Copy - Copy');
    });

    it('should handle empty title', () => {
      const result = copyService.handleDuplicateCourse('');
      expect(result).toBe(' - Copy');
    });
  });

  describe('Slug Generation Validation', () => {
    it('should reject empty base slug', async () => {
      await expect((copyService as any).generateUniqueSlug('')).rejects.toThrow('Base slug must be a non-empty string');
    });

    it('should reject null base slug', async () => {
      await expect((copyService as any).generateUniqueSlug(null)).rejects.toThrow('Base slug must be a non-empty string');
    });

    it('should reject whitespace-only slug', async () => {
      await expect((copyService as any).generateUniqueSlug('   ')).rejects.toThrow('Base slug must be a non-empty string');
    });
  });
});