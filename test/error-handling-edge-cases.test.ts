import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SandboxToCoursesCopyService } from '../server/services/sandboxToCoursesCopyService';

describe('Error Handling and Edge Case Management Tests', () => {
  let copyService: SandboxToCoursesCopyService;

  beforeEach(() => {
    copyService = new SandboxToCoursesCopyService();
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle empty array input', async () => {
      await expect(copyService.copySandboxCourses([])).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should handle null input', async () => {
      await expect(copyService.copySandboxCourses(null as any)).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should handle undefined input', async () => {
      await expect(copyService.copySandboxCourses(undefined as any)).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should handle non-array input', async () => {
      await expect(copyService.copySandboxCourses('not-an-array' as any)).rejects.toThrow('sandboxSlugs must be a non-empty array');
    });

    it('should filter out invalid slugs and return validation errors', async () => {
      const invalidSlugs = ['', null, undefined, '   ', 'valid-slug'];
      
      // Mock the copySingleCourse method to avoid database calls
      const mockCopySingleCourse = vi.spyOn(copyService, 'copySingleCourse' as any);
      mockCopySingleCourse.mockResolvedValue({
        sandboxSlug: 'valid-slug',
        success: true,
        newCourseSlug: 'valid-slug-copy-1'
      });

      const results = await copyService.copySandboxCourses(invalidSlugs);
      
      expect(results).toHaveLength(5); // 4 invalid + 1 valid
      
      // Check invalid slug results
      const invalidResults = results.filter(r => !r.success && r.errorType === 'VALIDATION_ERROR');
      expect(invalidResults).toHaveLength(4);
      
      // Check valid slug result
      const validResults = results.filter(r => r.success);
      expect(validResults).toHaveLength(1);
      expect(validResults[0].sandboxSlug).toBe('valid-slug');

      mockCopySingleCourse.mockRestore();
    });

    it('should handle array with only whitespace slugs', async () => {
      const whitespaceSlugs = ['   ', '\t', '\n', '  \t\n  '];
      
      await expect(copyService.copySandboxCourses(whitespaceSlugs)).rejects.toThrow('No valid sandbox course slugs provided');
    });
  });

  describe('Single Course Copy Edge Cases', () => {
    it('should handle empty string slug', async () => {
      const result = await copyService.copySingleCourse('');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
      expect(result.sandboxSlug).toBe('[empty]');
    });

    it('should handle null slug', async () => {
      const result = await copyService.copySingleCourse(null as any);
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
      expect(result.sandboxSlug).toBe('[empty]');
    });

    it('should handle undefined slug', async () => {
      const result = await copyService.copySingleCourse(undefined as any);
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
      expect(result.sandboxSlug).toBe('[empty]');
    });

    it('should handle whitespace-only slug', async () => {
      const result = await copyService.copySingleCourse('   \t\n   ');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
    });

    it('should handle non-string slug', async () => {
      const result = await copyService.copySingleCourse(123 as any);
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Invalid sandbox course slug provided');
    });
  });

  describe('Sandbox Course Validation', () => {
    it('should validate course with missing title', () => {
      const invalidCourse = {
        slug: 'test-slug',
        type: 'standalone',
        modules: []
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Sandbox course must have a valid title');
    });

    it('should validate course with empty title', () => {
      const invalidCourse = {
        slug: 'test-slug',
        title: '',
        type: 'standalone',
        modules: []
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Sandbox course must have a valid title');
    });

    it('should validate course with whitespace-only title', () => {
      const invalidCourse = {
        slug: 'test-slug',
        title: '   \t\n   ',
        type: 'standalone',
        modules: []
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Sandbox course must have a valid title');
    });

    it('should validate course with missing slug', () => {
      const invalidCourse = {
        title: 'Test Course',
        type: 'standalone',
        modules: []
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Sandbox course must have a valid slug');
    });

    it('should validate course with missing type', () => {
      const invalidCourse = {
        slug: 'test-slug',
        title: 'Test Course',
        modules: []
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Sandbox course must have a valid type');
    });

    it('should validate course with no modules or MBA modules', () => {
      const invalidCourse = {
        slug: 'test-slug',
        title: 'Test Course',
        type: 'standalone',
        modules: [],
        mbaModules: []
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Sandbox course must have at least one module or MBA module');
    });

    it('should validate course with invalid module title', () => {
      const invalidCourse = {
        slug: 'test-slug',
        title: 'Test Course',
        type: 'standalone',
        modules: [
          { title: '' },
          { title: 'Valid Module' }
        ]
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('Module 1 must have a valid title');
    });

    it('should validate course with invalid MBA module title', () => {
      const invalidCourse = {
        slug: 'test-slug',
        title: 'Test Course',
        type: 'with-mba',
        modules: [{ title: 'Valid Module' }],
        mbaModules: [
          { title: 'Valid MBA Module' },
          { title: null }
        ]
      };

      const validationError = (copyService as any).validateSandboxCourse(invalidCourse);
      expect(validationError).toBe('MBA module 2 must have a valid title');
    });

    it('should pass validation for valid course', () => {
      const validCourse = {
        slug: 'test-slug',
        title: 'Test Course',
        type: 'standalone',
        modules: [
          { title: 'Module 1' },
          { title: 'Module 2' }
        ]
      };

      const validationError = (copyService as any).validateSandboxCourse(validCourse);
      expect(validationError).toBeNull();
    });
  });

  describe('Document Transformation Edge Cases', () => {
    it('should handle null documents array', () => {
      const result = (copyService as any).transformDocuments(null);
      expect(result).toEqual([]);
    });

    it('should handle undefined documents array', () => {
      const result = (copyService as any).transformDocuments(undefined);
      expect(result).toEqual([]);
    });

    it('should handle non-array documents', () => {
      const result = (copyService as any).transformDocuments('not-an-array');
      expect(result).toEqual([]);
    });

    it('should filter out documents with missing title', () => {
      const documents = [
        {
          title: 'Valid Document',
          fileUrl: 'https://example.com/doc.pdf'
        },
        {
          fileUrl: 'https://example.com/doc2.pdf'
        },
        {
          title: '',
          fileUrl: 'https://example.com/doc3.pdf'
        }
      ];

      const result = (copyService as any).transformDocuments(documents);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Document');
    });

    it('should filter out documents with missing fileUrl', () => {
      const documents = [
        {
          title: 'Valid Document',
          fileUrl: 'https://example.com/doc.pdf'
        },
        {
          title: 'Invalid Document'
        },
        {
          title: 'Another Invalid',
          fileUrl: ''
        }
      ];

      const result = (copyService as any).transformDocuments(documents);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Document');
    });

    it('should trim whitespace from title and url', () => {
      const documents = [
        {
          title: '  Document with spaces  ',
          fileUrl: '  https://example.com/doc.pdf  '
        }
      ];

      const result = (copyService as any).transformDocuments(documents);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Document with spaces');
      expect(result[0].url).toBe('https://example.com/doc.pdf');
    });

    it('should handle array with null/undefined documents', () => {
      const documents = [
        {
          title: 'Valid Document',
          fileUrl: 'https://example.com/doc.pdf'
        },
        null,
        undefined,
        {
          title: 'Another Valid',
          fileUrl: 'https://example.com/doc2.pdf'
        }
      ];

      const result = (copyService as any).transformDocuments(documents);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Valid Document');
      expect(result[1].title).toBe('Another Valid');
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

    it('should handle undefined module', () => {
      const result = (copyService as any).transformModule(undefined);
      
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

    it('should handle module with empty title', () => {
      const module = {
        title: '',
        videos: [],
        documents: []
      };

      const result = (copyService as any).transformModule(module);
      expect(result.title).toBe('Untitled Module');
    });

    it('should filter out invalid videos', () => {
      const module = {
        title: 'Test Module',
        videos: [
          {
            title: 'Valid Video',
            url: 'https://youtube.com/watch?v=test'
          },
          {
            title: '',
            url: 'https://youtube.com/watch?v=invalid'
          },
          {
            title: 'Invalid Video'
          },
          null,
          {
            title: 'Another Valid',
            url: 'https://youtube.com/watch?v=test2'
          }
        ]
      };

      const result = (copyService as any).transformModule(module);
      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].title).toBe('Valid Video');
      expect(result.videos[1].title).toBe('Another Valid');
    });

    it('should handle non-array videos', () => {
      const module = {
        title: 'Test Module',
        videos: 'not-an-array'
      };

      const result = (copyService as any).transformModule(module);
      expect(result.videos).toEqual([]);
    });
  });

  describe('Unique Slug Generation Edge Cases', () => {
    it('should handle empty base slug', async () => {
      await expect((copyService as any).generateUniqueSlug('')).rejects.toThrow('Base slug must be a non-empty string');
    });

    it('should handle null base slug', async () => {
      await expect((copyService as any).generateUniqueSlug(null)).rejects.toThrow('Base slug must be a non-empty string');
    });

    it('should handle undefined base slug', async () => {
      await expect((copyService as any).generateUniqueSlug(undefined)).rejects.toThrow('Base slug must be a non-empty string');
    });

    it('should handle whitespace-only base slug', async () => {
      await expect((copyService as any).generateUniqueSlug('   \t\n   ')).rejects.toThrow('Base slug must be a non-empty string');
    });

    it('should trim whitespace from base slug', async () => {
      // Mock Course.findOne to return null (no existing course)
      const mockFindOne = vi.fn().mockResolvedValue(null);
      
      // Mock the Course model properly
      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      const result = await (copyService as any).generateUniqueSlug('  test-slug  ');
      expect(result).toBe('test-slug');
    }, 10000);
  });

  describe('Duplicate Course Name Handling', () => {
    it('should handle empty course title', () => {
      const result = copyService.handleDuplicateCourse('');
      expect(result).toBe(' - Copy');
    });

    it('should handle null course title', () => {
      const result = copyService.handleDuplicateCourse(null as any);
      expect(result).toBe('null - Copy');
    });

    it('should handle undefined course title', () => {
      const result = copyService.handleDuplicateCourse(undefined as any);
      expect(result).toBe('undefined - Copy');
    });

    it('should handle course title with existing copy suffix', () => {
      const result = copyService.handleDuplicateCourse('Test Course - Copy');
      expect(result).toBe('Test Course - Copy - Copy');
    });

    it('should handle course title with multiple copy suffixes', () => {
      const result = copyService.handleDuplicateCourse('Test Course - Copy - Copy');
      expect(result).toBe('Test Course - Copy - Copy - Copy');
    });

    it('should handle very long course titles', () => {
      const longTitle = 'A'.repeat(1000);
      const result = copyService.handleDuplicateCourse(longTitle);
      expect(result).toBe(longTitle + ' - Copy');
    });
  });

  describe('Quiz Question Transformation Edge Cases', () => {
    it('should handle null questions array', () => {
      const result = (copyService as any).transformQuizQuestions(null);
      expect(result).toEqual([]);
    });

    it('should handle undefined questions array', () => {
      const result = (copyService as any).transformQuizQuestions(undefined);
      expect(result).toEqual([]);
    });

    it('should handle non-array questions', () => {
      const result = (copyService as any).transformQuizQuestions('not-an-array');
      expect(result).toEqual([]);
    });

    it('should filter out questions with empty text', () => {
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
          text: '   ',
          choices: ['A', 'B'],
          correctIndex: 0
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Valid question?');
    });

    it('should filter out questions with no choices', () => {
      const questions = [
        {
          text: 'Valid question?',
          choices: ['A', 'B'],
          correctIndex: 0
        },
        {
          text: 'Invalid question?',
          choices: [],
          correctIndex: 0
        },
        {
          text: 'Another invalid?',
          correctIndex: 0
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Valid question?');
    });

    it('should filter out empty/null choices', () => {
      const questions = [
        {
          text: 'Question with mixed choices?',
          choices: ['Valid A', '', null, undefined, '   ', 'Valid B'],
          correctIndex: 0
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(1);
      expect(result[0].choices).toEqual(['Valid A', 'Valid B']);
      expect(result[0].correctIndex).toBe(0); // Should remain valid
    });

    it('should reset correctIndex when out of bounds', () => {
      const questions = [
        {
          text: 'Question with invalid correctIndex?',
          choices: ['A', 'B'],
          correctIndex: 5
        },
        {
          text: 'Question with negative correctIndex?',
          choices: ['A', 'B'],
          correctIndex: -1
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(2);
      expect(result[0].correctIndex).toBe(0);
      expect(result[1].correctIndex).toBe(0);
    });

    it('should handle null/undefined questions in array', () => {
      const questions = [
        {
          text: 'Valid question?',
          choices: ['A', 'B'],
          correctIndex: 0
        },
        null,
        undefined,
        {
          text: 'Another valid?',
          choices: ['C', 'D'],
          correctIndex: 1
        }
      ];

      const result = (copyService as any).transformQuizQuestions(questions);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Valid question?');
      expect(result[1].text).toBe('Another valid?');
    });
  });
});