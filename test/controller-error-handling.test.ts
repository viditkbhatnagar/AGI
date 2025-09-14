import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { copyToMainCourses } from '../server/controllers/sandboxCourse-controller';

describe('Controller Error Handling Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      body: {}
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('Input Validation', () => {
    it('should return 400 when sandboxCourseSlugs is missing', async () => {
      mockRequest.body = {};

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs is required',
        errorType: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when sandboxCourseSlugs is null', async () => {
      mockRequest.body = { sandboxCourseSlugs: null };

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs is required',
        errorType: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when sandboxCourseSlugs is not an array', async () => {
      mockRequest.body = { sandboxCourseSlugs: 'not-an-array' };

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs must be an array',
        errorType: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when sandboxCourseSlugs is empty array', async () => {
      mockRequest.body = { sandboxCourseSlugs: [] };

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs array must not be empty',
        errorType: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when trying to copy more than 50 courses', async () => {
      const tooManySlugs = Array(51).fill('test-slug');
      mockRequest.body = { sandboxCourseSlugs: tooManySlugs };

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Cannot copy more than 50 courses at once',
        errorType: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when array contains invalid slugs', async () => {
      mockRequest.body = { 
        sandboxCourseSlugs: ['valid-slug', '', null, undefined, '   '] 
      };

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Invalid course slugs found: 4 invalid entries',
        errorType: 'VALIDATION_ERROR',
        details: 'All course slugs must be non-empty strings'
      });
    });
  });

  describe('Success Response Handling', () => {
    it('should return 200 when all operations succeed', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug-1', 'test-slug-2'] };

      // Mock the copy service
      const mockCopyService = {
        copySandboxCourses: vi.fn().mockResolvedValue([
          {
            sandboxSlug: 'test-slug-1',
            success: true,
            newCourseSlug: 'test-slug-1-copy-1'
          },
          {
            sandboxSlug: 'test-slug-2',
            success: true,
            newCourseSlug: 'test-slug-2-copy-1'
          }
        ])
      };

      // Mock the service import
      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'All courses copied successfully',
          summary: expect.objectContaining({
            total: 2,
            successful: 2,
            failed: 0
          })
        })
      );
    });

    it('should return 207 when some operations fail (partial success)', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug-1', 'test-slug-2'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockResolvedValue([
          {
            sandboxSlug: 'test-slug-1',
            success: true,
            newCourseSlug: 'test-slug-1-copy-1'
          },
          {
            sandboxSlug: 'test-slug-2',
            success: false,
            error: 'Course not found',
            errorType: 'NOT_FOUND'
          }
        ])
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(207);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '1 courses copied successfully, 1 failed',
          summary: expect.objectContaining({
            total: 2,
            successful: 1,
            failed: 1,
            errorBreakdown: expect.objectContaining({
              notFoundErrors: 1
            })
          })
        })
      );
    });

    it('should return 422 when all operations fail', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug-1', 'test-slug-2'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockResolvedValue([
          {
            sandboxSlug: 'test-slug-1',
            success: false,
            error: 'Course not found',
            errorType: 'NOT_FOUND'
          },
          {
            sandboxSlug: 'test-slug-2',
            success: false,
            error: 'Database error',
            errorType: 'DATABASE_ERROR'
          }
        ])
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(422);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'All copy operations failed',
          summary: expect.objectContaining({
            total: 2,
            successful: 0,
            failed: 2,
            errorBreakdown: expect.objectContaining({
              notFoundErrors: 1,
              databaseErrors: 1
            })
          })
        })
      );
    });
  });

  describe('Error Categorization', () => {
    it('should categorize different error types in summary', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['slug1', 'slug2', 'slug3', 'slug4', 'slug5'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockResolvedValue([
          {
            sandboxSlug: 'slug1',
            success: false,
            error: 'Network timeout',
            errorType: 'NETWORK_ERROR'
          },
          {
            sandboxSlug: 'slug2',
            success: false,
            error: 'Invalid data',
            errorType: 'VALIDATION_ERROR'
          },
          {
            sandboxSlug: 'slug3',
            success: false,
            error: 'Database connection failed',
            errorType: 'DATABASE_ERROR'
          },
          {
            sandboxSlug: 'slug4',
            success: false,
            error: 'Course not found',
            errorType: 'NOT_FOUND'
          },
          {
            sandboxSlug: 'slug5',
            success: false,
            error: 'Unknown error',
            errorType: 'UNKNOWN_ERROR'
          }
        ])
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            errorBreakdown: {
              networkErrors: 1,
              validationErrors: 1,
              databaseErrors: 1,
              notFoundErrors: 1,
              unknownErrors: 1
            }
          })
        })
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should return 408 when operation times out', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Copy operation timeout')), 100)
          )
        )
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      // Mock Promise.race to simulate timeout
      const originalRace = Promise.race;
      vi.spyOn(Promise, 'race').mockImplementation((promises: any[]) => {
        return Promise.reject(new Error('Copy operation timeout'));
      });

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(408);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Copy operation timed out. Please try with fewer courses or try again later.',
        errorType: 'NETWORK_ERROR'
      });

      Promise.race = originalRace;
    });
  });

  describe('Server Error Handling', () => {
    it('should return 500 for unexpected errors', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockRejectedValue(new Error('Unexpected server error'))
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unexpected server error',
          errorType: 'UNKNOWN_ERROR',
          timestamp: expect.any(String)
        })
      );
    });

    it('should categorize database errors correctly', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'DATABASE_ERROR'
        })
      );
    });

    it('should categorize network errors correctly', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockRejectedValue(new Error('Network timeout occurred'))
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'NETWORK_ERROR'
        })
      );
    });

    it('should categorize validation errors correctly', async () => {
      mockRequest.body = { sandboxCourseSlugs: ['test-slug'] };

      const mockCopyService = {
        copySandboxCourses: vi.fn().mockRejectedValue(new Error('Validation failed for input'))
      };

      vi.doMock('../server/services/sandboxToCoursesCopyService', () => ({
        SandboxToCoursesCopyService: vi.fn(() => mockCopyService)
      }));

      await copyToMainCourses(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'VALIDATION_ERROR'
        })
      );
    });
  });
});