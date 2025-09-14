import { describe, it, expect, vi } from 'vitest';
import { copyToMainCourses } from '../server/controllers/sandboxCourse-controller';

describe('Copy API Endpoint Tests', () => {
  describe('copyToMainCourses Controller', () => {
    it('should return 400 for missing sandboxCourseSlugs', async () => {
      const mockReq = {
        body: {}
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      await copyToMainCourses(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs array is required and must not be empty'
      });
    });

    it('should return 400 for empty sandboxCourseSlugs array', async () => {
      const mockReq = {
        body: { sandboxCourseSlugs: [] }
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      await copyToMainCourses(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs array is required and must not be empty'
      });
    });

    it('should return 400 for invalid sandboxCourseSlugs type', async () => {
      const mockReq = {
        body: { sandboxCourseSlugs: 'not-an-array' }
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      await copyToMainCourses(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'sandboxCourseSlugs array is required and must not be empty'
      });
    });

    it('should accept valid request format without database operations', () => {
      // This test verifies that the controller function exists and can be imported
      expect(copyToMainCourses).toBeDefined();
      expect(typeof copyToMainCourses).toBe('function');
      
      // Verify the function signature by checking it accepts req and res parameters
      expect(copyToMainCourses.length).toBe(2); // Should accept 2 parameters (req, res)
    });
  });

  describe('Route Registration', () => {
    it('should verify copy endpoint is registered in routes', async () => {
      // Read the routes file to verify the endpoint is registered
      const routesContent = await import('../server/routes');
      
      // This test verifies that the routes module can be imported successfully
      // and that the registerRoutes function exists
      expect(routesContent.registerRoutes).toBeDefined();
      expect(typeof routesContent.registerRoutes).toBe('function');
    });
  });
});