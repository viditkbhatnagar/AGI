import { IHybridDocument } from '../models/course';

/**
 * Validates a hybrid document structure
 * @param document The document to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateHybridDocument(document: any): { isValid: boolean; error?: string } {
  if (!document || typeof document !== 'object') {
    return { isValid: false, error: 'Document must be an object' };
  }

  if (!document.title || typeof document.title !== 'string') {
    return { isValid: false, error: 'Document title is required and must be a string' };
  }

  if (!document.type || !['link', 'upload'].includes(document.type)) {
    return { isValid: false, error: 'Document type must be either "link" or "upload"' };
  }

  if (document.type === 'link') {
    if (!document.url || typeof document.url !== 'string') {
      return { isValid: false, error: 'Link-type documents must have a valid url field' };
    }
  }

  if (document.type === 'upload') {
    const requiredFields = ['fileUrl', 'fileName', 'fileType', 'publicId'];
    for (const field of requiredFields) {
      if (!document[field] || typeof document[field] !== 'string') {
        return { isValid: false, error: `Upload-type documents must have a valid ${field} field` };
      }
    }

    if (document.fileSize !== undefined && (typeof document.fileSize !== 'number' || document.fileSize < 0)) {
      return { isValid: false, error: 'fileSize must be a positive number if provided' };
    }
  }

  return { isValid: true };
}

/**
 * Converts a legacy document (url-only) to hybrid format
 * @param legacyDocument Document with only title and url fields
 * @returns Hybrid document with type 'link'
 */
export function convertLegacyDocument(legacyDocument: { title: string; url: string }): IHybridDocument {
  return {
    title: legacyDocument.title,
    type: 'link',
    url: legacyDocument.url
  };
}

/**
 * Creates a new upload-type hybrid document
 * @param title Document title
 * @param fileData File metadata from Cloudinary
 * @returns Hybrid document with type 'upload'
 */
export function createUploadDocument(
  title: string,
  fileData: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    publicId: string;
  }
): IHybridDocument {
  return {
    title,
    type: 'upload',
    fileUrl: fileData.fileUrl,
    fileName: fileData.fileName,
    fileSize: fileData.fileSize,
    fileType: fileData.fileType,
    publicId: fileData.publicId
  };
}

/**
 * Creates a new link-type hybrid document
 * @param title Document title
 * @param url Google Drive or external URL
 * @returns Hybrid document with type 'link'
 */
export function createLinkDocument(title: string, url: string): IHybridDocument {
  return {
    title,
    type: 'link',
    url
  };
}