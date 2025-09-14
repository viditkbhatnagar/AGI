import { Request, Response } from 'express';
import { DocumentMigrationService } from '../services/documentMigrationService';

/**
 * Controller for document migration operations
 */
export class MigrationController {
  /**
   * Get migration status for all courses
   * GET /api/migration/status
   */
  static async getMigrationStatus(req: Request, res: Response) {
    try {
      const status = await DocumentMigrationService.getMigrationStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting migration status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get migration status'
      });
    }
  }
}