import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SandboxToCoursesCopyService } from '../server/services/sandboxToCoursesCopyService';

describe('Duplicate Course Name Handling Tests', () => {
  let copyService: SandboxToCoursesCopyService;

  beforeEach(() => {
    copyService = new SandboxToCoursesCopyService();
  });

  describe('Duplicate Course Title Handling', () => {
    it('should append " - Copy" to duplicate course titles', () => {
      const originalTitle = 'Introduction to Finance';
      const result = copyService.handleDuplicateCourse(originalTitle);
      
      expect(result).toBe('Introduction to Finance - Copy');
    });

    it('should handle titles that already have " - Copy" suffix', () => {
      const originalTitle = 'Introduction to Finance - Copy';
      const result = copyService.handleDuplicateCourse(originalTitle);
      
      expect(result).toBe('Introduction to Finance - Copy - Copy');
    });

    it('should handle multiple copy suffixes', () => {
      const originalTitle = 'Introduction to Finance - Copy - Copy';
      const result = copyService.handleDuplicateCourse(originalTitle);
      
      expect(result).toBe('Introduction to Finance - Copy - Copy - Copy');
    });

    it('should handle titles with "Copy" in the middle', () => {
      const originalTitle = 'Copy Trading Strategies';
      const result = copyService.handleDuplicateCourse(originalTitle);
      
      expect(result).toBe('Copy Trading Strategies - Copy');
    });

    it('should handle very long course titles', () => {
      const longTitle = 'A'.repeat(200) + ' Course';
      const result = copyService.handleDuplicateCourse(longTitle);
      
      expect(result).toBe(longTitle + ' - Copy');
      expect(result.length).toBe(longTitle.length + 7); // " - Copy" is 7 characters
    });

    it('should handle titles with special characters', () => {
      const specialTitle = 'Finance & Economics: A Comprehensive Guide (2024)';
      const result = copyService.handleDuplicateCourse(specialTitle);
      
      expect(result).toBe('Finance & Economics: A Comprehensive Guide (2024) - Copy');
    });

    it('should handle titles with unicode characters', () => {
      const unicodeTitle = 'Финансы и экономика 📊';
      const result = copyService.handleDuplicateCourse(unicodeTitle);
      
      expect(result).toBe('Финансы и экономика 📊 - Copy');
    });

    it('should handle single character titles', () => {
      const singleChar = 'A';
      const result = copyService.handleDuplicateCourse(singleChar);
      
      expect(result).toBe('A - Copy');
    });

    it('should handle titles with only whitespace', () => {
      const whitespaceTitle = '   ';
      const result = copyService.handleDuplicateCourse(whitespaceTitle);
      
      expect(result).toBe('    - Copy');
    });
  });

  describe('Unique Slug Generation with Duplicates', () => {
    it('should generate unique slug when base slug exists', async () => {
      // Mock Course.findOne to simulate existing courses
      const mockFindOne = vi.fn()
        .mockResolvedValueOnce({ slug: 'test-course' }) // First call: base slug exists
        .mockResolvedValueOnce({ slug: 'test-course-copy-1' }) // Second call: first copy exists
        .mockResolvedValueOnce(null); // Third call: second copy doesn't exist

      // Mock the Course model
      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      const result = await (copyService as any).generateUniqueSlug('test-course');
      
      expect(result).toBe('test-course-copy-2');
      expect(mockFindOne).toHaveBeenCalledTimes(3);
      expect(mockFindOne).toHaveBeenNthCalledWith(1, { slug: 'test-course' });
      expect(mockFindOne).toHaveBeenNthCalledWith(2, { slug: 'test-course-copy-1' });
      expect(mockFindOne).toHaveBeenNthCalledWith(3, { slug: 'test-course-copy-2' });
    });

    it('should return original slug when no duplicates exist', async () => {
      const mockFindOne = vi.fn().mockResolvedValue(null);

      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      const result = await (copyService as any).generateUniqueSlug('unique-course');
      
      expect(result).toBe('unique-course');
      expect(mockFindOne).toHaveBeenCalledTimes(1);
      expect(mockFindOne).toHaveBeenCalledWith({ slug: 'unique-course' });
    });

    it('should handle many existing duplicates', async () => {
      // Mock Course.findOne to simulate many existing courses
      const mockFindOne = vi.fn();
      
      // Simulate 10 existing copies
      for (let i = 0; i <= 10; i++) {
        if (i === 0) {
          mockFindOne.mockResolvedValueOnce({ slug: 'popular-course' });
        } else if (i <= 9) {
          mockFindOne.mockResolvedValueOnce({ slug: `popular-course-copy-${i}` });
        } else {
          mockFindOne.mockResolvedValueOnce(null); // 10th copy doesn't exist
        }
      }

      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      const result = await (copyService as any).generateUniqueSlug('popular-course');
      
      expect(result).toBe('popular-course-copy-10');
    });

    it('should throw error when max attempts reached', async () => {
      // Mock Course.findOne to always return existing course
      const mockFindOne = vi.fn().mockResolvedValue({ slug: 'always-exists' });

      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      await expect((copyService as any).generateUniqueSlug('always-exists'))
        .rejects.toThrow('Could not generate unique slug after 100 attempts');
    });

    it('should handle database timeout during slug generation', async () => {
      const mockFindOne = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout during slug generation')), 100)
        )
      );

      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      await expect((copyService as any).generateUniqueSlug('test-course'))
        .rejects.toThrow('Database query timeout during slug generation');
    });

    it('should handle database errors during slug generation', async () => {
      const mockFindOne = vi.fn().mockRejectedValue(new Error('Connection lost'));

      vi.doMock('../server/models/course', () => ({
        Course: {
          findOne: mockFindOne
        }
      }));

      await expect((copyService as any).generateUniqueSlug('test-course'))
        .rejects.toThrow('Database error during slug generation: Connection lost');
    });
  });

  describe('Integration: Duplicate Handling in Copy Operation', () => {
    it('should handle duplicate course during copy operation', async () => {
      const mockSandboxCourse = {
        slug: 'existing-course',
        title: 'Existing Course Title',
        type: 'standalone',
        description: 'Test description',
        modules: [
          {
            title: 'Module 1',
            videos: [],
            documents: []
          }
        ],
        mbaModules: []
      };

      // Mock SandboxCourse.findOne to return the course
      const mockSandboxFindOne = vi.fn().mockResolvedValue(mockSandboxCourse);
      
      // Mock Course.findOne to simulate existing course (for slug generation)
      const mockCourseFindOne = vi.fn()
        .mockResolvedValueOnce({ slug: 'existing-course' }) // Base slug exists
        .mockResolvedValueOnce(null); // First copy doesn't exist

      // Mock Course constructor and save
      const mockCourseSave = vi.fn().mockResolvedValue({});
      const mockCourseConstructor = vi.fn().mockImplementation(() => ({
        save: mockCourseSave
      }));

      vi.doMock('../server/models/sandboxCourse', () => ({
        SandboxCourse: {
          findOne: mockSandboxFindOne
        }
      }));

      vi.doMock('../server/models/course', () => ({
        Course: mockCourseConstructor
      }));

      // Mock the static findOne method on Course
      mockCourseConstructor.findOne = mockCourseFindOne;

      // Mock copyQuizzes method to avoid database calls
      const mockCopyQuizzes = vi.spyOn(copyService as any, 'copyQuizzes');
      mockCopyQuizzes.mockResolvedValue(undefined);

      const result = await copyService.copySingleCourse('existing-course');

      expect(result.success).toBe(true);
      expect(result.newCourseSlug).toBe('existing-course-copy-1');
      expect(result.duplicateHandled).toBe(true);

      // Verify the course was created with the modified title
      expect(mockCourseConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'existing-course-copy-1',
          title: 'Existing Course Title - Copy'
        })
      );

      mockCopyQuizzes.mockRestore();
    });

    it('should not modify title when no duplicate exists', async () => {
      const mockSandboxCourse = {
        slug: 'unique-course',
        title: 'Unique Course Title',
        type: 'standalone',
        description: 'Test description',
        modules: [
          {
            title: 'Module 1',
            videos: [],
            documents: []
          }
        ],
        mbaModules: []
      };

      // Mock SandboxCourse.findOne to return the course
      const mockSandboxFindOne = vi.fn().mockResolvedValue(mockSandboxCourse);
      
      // Mock Course.findOne to simulate no existing course
      const mockCourseFindOne = vi.fn().mockResolvedValue(null);

      // Mock Course constructor and save
      const mockCourseSave = vi.fn().mockResolvedValue({});
      const mockCourseConstructor = vi.fn().mockImplementation(() => ({
        save: mockCourseSave
      }));

      vi.doMock('../server/models/sandboxCourse', () => ({
        SandboxCourse: {
          findOne: mockSandboxFindOne
        }
      }));

      vi.doMock('../server/models/course', () => ({
        Course: mockCourseConstructor
      }));

      mockCourseConstructor.findOne = mockCourseFindOne;

      // Mock copyQuizzes method
      const mockCopyQuizzes = vi.spyOn(copyService as any, 'copyQuizzes');
      mockCopyQuizzes.mockResolvedValue(undefined);

      const result = await copyService.copySingleCourse('unique-course');

      expect(result.success).toBe(true);
      expect(result.newCourseSlug).toBe('unique-course');
      expect(result.duplicateHandled).toBe(false);

      // Verify the course was created with the original title
      expect(mockCourseConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'unique-course',
          title: 'Unique Course Title'
        })
      );

      mockCopyQuizzes.mockRestore();
    });
  });
});