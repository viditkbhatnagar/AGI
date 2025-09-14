import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HybridCopyService, HybridCopyRequest } from '../server/services/hybridCopyService';

// Mock the models
vi.mock('../server/models/sandboxCourse', () => ({
  SandboxCourse: {
    findOne: vi.fn()
  }
}));

vi.mock('../server/models/course', () => ({
  Course: {
    findOne: vi.fn()
  }
}));

vi.mock('../server/models/quiz', () => ({
  default: vi.fn().mockImplementation(function(data) {
    this.save = vi.fn().mockResolvedValue({ _id: 'mock-quiz-id', ...data });
    return this;
  })
}));

describe('HybridCopyService', () => {
  let hybridCopyService: HybridCopyService;
  
  beforeEach(() => {
    hybridCopyService = new HybridCopyService();
    vi.clearAllMocks();
  });

  describe('copySelectedModules', () => {
    it('should validate input parameters correctly', async () => {
      const request: HybridCopyRequest = {
        sourceCourseSlug: '',
        selectedModuleIndexes: [],
        destinationCourseSlug: 'test-course'
      };

      const result = await hybridCopyService.copySelectedModules(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Source course slug is required');
    });

    it('should validate module indexes are positive integers', async () => {
      const request: HybridCopyRequest = {
        sourceCourseSlug: 'source-course',
        selectedModuleIndexes: [-1, 1.5],
        destinationCourseSlug: 'dest-course'
      };

      const result = await hybridCopyService.copySelectedModules(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('non-negative integers');
    });

    it('should detect duplicate module indexes', async () => {
      const request: HybridCopyRequest = {
        sourceCourseSlug: 'source-course',
        selectedModuleIndexes: [0, 1, 0],
        destinationCourseSlug: 'dest-course'
      };

      const result = await hybridCopyService.copySelectedModules(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Duplicate module indexes');
    });

    it('should handle non-existent source course', async () => {
      const { SandboxCourse } = await import('../server/models/sandboxCourse');
      (SandboxCourse.findOne as any).mockResolvedValue(null);

      const request: HybridCopyRequest = {
        sourceCourseSlug: 'non-existent-course',
        selectedModuleIndexes: [0],
        destinationCourseSlug: 'dest-course'
      };

      const result = await hybridCopyService.copySelectedModules(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('NOT_FOUND');
      expect(result.error).toContain('Sandbox course');
    });

    // Add more tests for successful cases if needed
  });

  describe('transformSandboxModule', () => {
    it('should transform sandbox module to main course format', () => {
      const sandboxModule = {
        title: 'Test Module',
        videos: [
          { title: 'Video 1', url: 'https://example.com/video1' },
          { title: '', url: 'https://example.com/video2' } // Should be filtered out
        ],
        documents: [
          {
            title: 'Document 1',
            fileUrl: 'https://cloudinary.com/doc1',
            fileName: 'doc1.pdf',
            publicId: 'doc1',
            fileType: 'application/pdf',
            fileSize: 1024
          },
          {
            title: '', // Should be filtered out
            fileUrl: 'https://cloudinary.com/doc2'
          }
        ],
        quiz: {
          questions: [
            {
              text: 'Test question?',
              choices: ['A', 'B', 'C'],
              correctIndex: 0
            }
          ]
        }
      };

      // Access the private method through a type assertion
      const result = (hybridCopyService as any).transformSandboxModule(sandboxModule);

      expect(result.title).toBe('Test Module');
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].title).toBe('Video 1');
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe('Document 1');
      expect(result.documents[0].url).toBe('https://cloudinary.com/doc1');
      expect(result.documents[0].type).toBe('upload');
      expect(result.quizId).toBeNull();
    });
  });
});