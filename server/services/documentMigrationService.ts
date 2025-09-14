import { Course, ICourse, IHybridDocument } from '../models/course';
import { validateHybridDocument, convertLegacyDocument } from '../utils/documentValidation';

export interface MigrationResult {
  success: boolean;
  coursesProcessed: number;
  documentsConverted: number;
  errors: Array<{
    courseSlug: string;
    moduleIndex: number;
    documentIndex: number;
    error: string;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  totalCourses: number;
  totalDocuments: number;
  invalidDocuments: Array<{
    courseSlug: string;
    moduleIndex: number;
    documentIndex: number;
    error: string;
  }>;
}

/**
 * Service for migrating existing documents to hybrid format and ensuring data integrity
 */
export class DocumentMigrationService {
  /**
   * Detects if a document is in legacy format (url-only) or hybrid format
   * @param document The document to analyze
   * @returns 'legacy' | 'hybrid' | 'invalid'
   */
  static detectDocumentType(document: any): 'legacy' | 'hybrid' | 'invalid' {
    if (!document || typeof document !== 'object') {
      return 'invalid';
    }

    // Check if it has the type field (hybrid format)
    if (document.type && ['link', 'upload'].includes(document.type)) {
      return 'hybrid';
    }

    // Check if it's legacy format (has title and url, but no type)
    if (document.title && document.url && !document.type) {
      return 'legacy';
    }

    return 'invalid';
  }

  /**
   * Converts a legacy document to hybrid format
   * @param legacyDocument Document in old format
   * @returns Converted hybrid document
   */
  static convertToHybridFormat(legacyDocument: any): IHybridDocument {
    if (this.detectDocumentType(legacyDocument) !== 'legacy') {
      throw new Error('Document is not in legacy format');
    }

    return convertLegacyDocument({
      title: legacyDocument.title,
      url: legacyDocument.url
    });
  }

  /**
   * Validates all documents in the database for structural integrity
   * @returns Validation result with details of any issues found
   */
  static async validateAllDocuments(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      totalCourses: 0,
      totalDocuments: 0,
      invalidDocuments: []
    };

    try {
      const courses = await Course.find({});
      result.totalCourses = courses.length;

      for (const course of courses) {
        // Validate documents in regular modules
        for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
          const module = course.modules[moduleIndex];
          for (let docIndex = 0; docIndex < module.documents.length; docIndex++) {
            const document = module.documents[docIndex];
            result.totalDocuments++;

            const validation = validateHybridDocument(document);
            if (!validation.isValid) {
              result.isValid = false;
              result.invalidDocuments.push({
                courseSlug: course.slug,
                moduleIndex,
                documentIndex: docIndex,
                error: validation.error || 'Unknown validation error'
              });
            }
          }
        }

        // Validate documents in MBA modules
        for (let moduleIndex = 0; moduleIndex < course.mbaModules.length; moduleIndex++) {
          const module = course.mbaModules[moduleIndex];
          for (let docIndex = 0; docIndex < module.documents.length; docIndex++) {
            const document = module.documents[docIndex];
            result.totalDocuments++;

            const validation = validateHybridDocument(document);
            if (!validation.isValid) {
              result.isValid = false;
              result.invalidDocuments.push({
                courseSlug: course.slug,
                moduleIndex: moduleIndex + 1000, // Offset to distinguish MBA modules
                documentIndex: docIndex,
                error: validation.error || 'Unknown validation error'
              });
            }
          }
        }
      }
    } catch (error) {
      result.isValid = false;
      result.invalidDocuments.push({
        courseSlug: 'SYSTEM_ERROR',
        moduleIndex: -1,
        documentIndex: -1,
        error: error instanceof Error ? error.message : 'Unknown system error'
      });
    }

    return result;
  }

  /**
   * Migrates all legacy documents to hybrid format
   * @param dryRun If true, only simulates the migration without making changes
   * @returns Migration result with details of the operation
   */
  static async migrateAllDocuments(dryRun: boolean = false): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      coursesProcessed: 0,
      documentsConverted: 0,
      errors: []
    };

    try {
      const courses = await Course.find({});
      
      for (const course of courses) {
        let courseModified = false;
        result.coursesProcessed++;

        // Process regular modules
        for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
          const module = course.modules[moduleIndex];
          for (let docIndex = 0; docIndex < module.documents.length; docIndex++) {
            const document = module.documents[docIndex];
            
            try {
              const docType = this.detectDocumentType(document);
              
              if (docType === 'legacy') {
                if (!dryRun) {
                  const convertedDoc = this.convertToHybridFormat(document);
                  course.modules[moduleIndex].documents[docIndex] = convertedDoc as any;
                  courseModified = true;
                }
                result.documentsConverted++;
              } else if (docType === 'invalid') {
                result.errors.push({
                  courseSlug: course.slug,
                  moduleIndex,
                  documentIndex: docIndex,
                  error: 'Invalid document structure detected'
                });
                result.success = false;
              }
            } catch (error) {
              result.errors.push({
                courseSlug: course.slug,
                moduleIndex,
                documentIndex: docIndex,
                error: error instanceof Error ? error.message : 'Unknown conversion error'
              });
              result.success = false;
            }
          }
        }

        // Process MBA modules
        for (let moduleIndex = 0; moduleIndex < course.mbaModules.length; moduleIndex++) {
          const module = course.mbaModules[moduleIndex];
          for (let docIndex = 0; docIndex < module.documents.length; docIndex++) {
            const document = module.documents[docIndex];
            
            try {
              const docType = this.detectDocumentType(document);
              
              if (docType === 'legacy') {
                if (!dryRun) {
                  const convertedDoc = this.convertToHybridFormat(document);
                  course.mbaModules[moduleIndex].documents[docIndex] = convertedDoc as any;
                  courseModified = true;
                }
                result.documentsConverted++;
              } else if (docType === 'invalid') {
                result.errors.push({
                  courseSlug: course.slug,
                  moduleIndex: moduleIndex + 1000, // Offset for MBA modules
                  documentIndex: docIndex,
                  error: 'Invalid document structure detected'
                });
                result.success = false;
              }
            } catch (error) {
              result.errors.push({
                courseSlug: course.slug,
                moduleIndex: moduleIndex + 1000, // Offset for MBA modules
                documentIndex: docIndex,
                error: error instanceof Error ? error.message : 'Unknown conversion error'
              });
              result.success = false;
            }
          }
        }

        // Save the course if it was modified and not a dry run
        if (courseModified && !dryRun) {
          try {
            await course.save();
          } catch (error) {
            result.errors.push({
              courseSlug: course.slug,
              moduleIndex: -1,
              documentIndex: -1,
              error: `Failed to save course: ${error instanceof Error ? error.message : 'Unknown save error'}`
            });
            result.success = false;
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        courseSlug: 'SYSTEM_ERROR',
        moduleIndex: -1,
        documentIndex: -1,
        error: error instanceof Error ? error.message : 'Unknown system error'
      });
    }

    return result;
  }

  /**
   * Migrates documents for a specific course
   * @param courseSlug The slug of the course to migrate
   * @param dryRun If true, only simulates the migration without making changes
   * @returns Migration result for the specific course
   */
  static async migrateCourseDocuments(courseSlug: string, dryRun: boolean = false): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      coursesProcessed: 0,
      documentsConverted: 0,
      errors: []
    };

    try {
      const course = await Course.findOne({ slug: courseSlug });
      
      if (!course) {
        result.success = false;
        result.errors.push({
          courseSlug,
          moduleIndex: -1,
          documentIndex: -1,
          error: 'Course not found'
        });
        return result;
      }

      result.coursesProcessed = 1;
      let courseModified = false;

      // Process regular modules
      for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
        const module = course.modules[moduleIndex];
        for (let docIndex = 0; docIndex < module.documents.length; docIndex++) {
          const document = module.documents[docIndex];
          
          try {
            const docType = this.detectDocumentType(document);
            
            if (docType === 'legacy') {
              if (!dryRun) {
                const convertedDoc = this.convertToHybridFormat(document);
                course.modules[moduleIndex].documents[docIndex] = convertedDoc as any;
                courseModified = true;
              }
              result.documentsConverted++;
            } else if (docType === 'invalid') {
              result.errors.push({
                courseSlug: course.slug,
                moduleIndex,
                documentIndex: docIndex,
                error: 'Invalid document structure detected'
              });
              result.success = false;
            }
          } catch (error) {
            result.errors.push({
              courseSlug: course.slug,
              moduleIndex,
              documentIndex: docIndex,
              error: error instanceof Error ? error.message : 'Unknown conversion error'
            });
            result.success = false;
          }
        }
      }

      // Process MBA modules
      for (let moduleIndex = 0; moduleIndex < course.mbaModules.length; moduleIndex++) {
        const module = course.mbaModules[moduleIndex];
        for (let docIndex = 0; docIndex < module.documents.length; docIndex++) {
          const document = module.documents[docIndex];
          
          try {
            const docType = this.detectDocumentType(document);
            
            if (docType === 'legacy') {
              if (!dryRun) {
                const convertedDoc = this.convertToHybridFormat(document);
                course.mbaModules[moduleIndex].documents[docIndex] = convertedDoc as any;
                courseModified = true;
              }
              result.documentsConverted++;
            } else if (docType === 'invalid') {
              result.errors.push({
                courseSlug: course.slug,
                moduleIndex: moduleIndex + 1000, // Offset for MBA modules
                documentIndex: docIndex,
                error: 'Invalid document structure detected'
              });
              result.success = false;
            }
          } catch (error) {
            result.errors.push({
              courseSlug: course.slug,
              moduleIndex: moduleIndex + 1000, // Offset for MBA modules
              documentIndex: docIndex,
              error: error instanceof Error ? error.message : 'Unknown conversion error'
            });
            result.success = false;
          }
        }
      }

      // Save the course if it was modified and not a dry run
      if (courseModified && !dryRun) {
        try {
          await course.save();
        } catch (error) {
          result.errors.push({
            courseSlug: course.slug,
            moduleIndex: -1,
            documentIndex: -1,
            error: `Failed to save course: ${error instanceof Error ? error.message : 'Unknown save error'}`
          });
          result.success = false;
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        courseSlug,
        moduleIndex: -1,
        documentIndex: -1,
        error: error instanceof Error ? error.message : 'Unknown system error'
      });
    }

    return result;
  }

  /**
   * Gets migration status for all courses
   * @returns Summary of migration status
   */
  static async getMigrationStatus(): Promise<{
    totalCourses: number;
    totalDocuments: number;
    legacyDocuments: number;
    hybridDocuments: number;
    invalidDocuments: number;
    courseDetails: Array<{
      slug: string;
      title: string;
      legacyCount: number;
      hybridCount: number;
      invalidCount: number;
    }>;
  }> {
    const status = {
      totalCourses: 0,
      totalDocuments: 0,
      legacyDocuments: 0,
      hybridDocuments: 0,
      invalidDocuments: 0,
      courseDetails: [] as Array<{
        slug: string;
        title: string;
        legacyCount: number;
        hybridCount: number;
        invalidCount: number;
      }>
    };

    try {
      const courses = await Course.find({});
      status.totalCourses = courses.length;

      for (const course of courses) {
        const courseDetail = {
          slug: course.slug,
          title: course.title,
          legacyCount: 0,
          hybridCount: 0,
          invalidCount: 0
        };

        // Check regular modules
        for (const module of course.modules) {
          for (const document of module.documents) {
            status.totalDocuments++;
            const docType = this.detectDocumentType(document);
            
            switch (docType) {
              case 'legacy':
                status.legacyDocuments++;
                courseDetail.legacyCount++;
                break;
              case 'hybrid':
                status.hybridDocuments++;
                courseDetail.hybridCount++;
                break;
              case 'invalid':
                status.invalidDocuments++;
                courseDetail.invalidCount++;
                break;
            }
          }
        }

        // Check MBA modules
        for (const module of course.mbaModules) {
          for (const document of module.documents) {
            status.totalDocuments++;
            const docType = this.detectDocumentType(document);
            
            switch (docType) {
              case 'legacy':
                status.legacyDocuments++;
                courseDetail.legacyCount++;
                break;
              case 'hybrid':
                status.hybridDocuments++;
                courseDetail.hybridCount++;
                break;
              case 'invalid':
                status.invalidDocuments++;
                courseDetail.invalidCount++;
                break;
            }
          }
        }

        status.courseDetails.push(courseDetail);
      }
    } catch (error) {
      console.error('Error getting migration status:', error);
    }

    return status;
  }
}