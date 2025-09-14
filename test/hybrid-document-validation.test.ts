import { describe, it, expect } from 'vitest';
import { 
  validateHybridDocument, 
  convertLegacyDocument, 
  createUploadDocument, 
  createLinkDocument 
} from '../server/utils/documentValidation';

describe('Hybrid Document Validation', () => {
  describe('validateHybridDocument', () => {
    it('should validate link-type documents correctly', () => {
      const linkDoc = {
        title: 'Test Document',
        type: 'link',
        url: 'https://drive.google.com/file/d/123/view'
      };

      const result = validateHybridDocument(linkDoc);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate upload-type documents correctly', () => {
      const uploadDoc = {
        title: 'Test Upload',
        type: 'upload',
        fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        publicId: 'test_pdf_123'
      };

      const result = validateHybridDocument(uploadDoc);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject documents without required fields', () => {
      const invalidDoc = {
        title: 'Test Document'
        // Missing type field
      };

      const result = validateHybridDocument(invalidDoc);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('type must be either "link" or "upload"');
    });

    it('should reject link documents without url', () => {
      const invalidLinkDoc = {
        title: 'Test Document',
        type: 'link'
        // Missing url field
      };

      const result = validateHybridDocument(invalidLinkDoc);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must have a valid url field');
    });

    it('should reject upload documents without required file fields', () => {
      const invalidUploadDoc = {
        title: 'Test Upload',
        type: 'upload',
        fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/test.pdf'
        // Missing fileName, fileType, publicId
      };

      const result = validateHybridDocument(invalidUploadDoc);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must have a valid fileName field');
    });
  });

  describe('convertLegacyDocument', () => {
    it('should convert legacy document to hybrid format', () => {
      const legacyDoc = {
        title: 'Legacy Document',
        url: 'https://drive.google.com/file/d/123/view'
      };

      const hybridDoc = convertLegacyDocument(legacyDoc);
      
      expect(hybridDoc.title).toBe('Legacy Document');
      expect(hybridDoc.type).toBe('link');
      expect(hybridDoc.url).toBe('https://drive.google.com/file/d/123/view');
      expect(hybridDoc.fileUrl).toBeUndefined();
    });
  });

  describe('createUploadDocument', () => {
    it('should create upload-type hybrid document', () => {
      const fileData = {
        fileUrl: 'https://res.cloudinary.com/test/raw/upload/v123/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        publicId: 'test_pdf_123'
      };

      const hybridDoc = createUploadDocument('Test Upload', fileData);
      
      expect(hybridDoc.title).toBe('Test Upload');
      expect(hybridDoc.type).toBe('upload');
      expect(hybridDoc.fileUrl).toBe(fileData.fileUrl);
      expect(hybridDoc.fileName).toBe(fileData.fileName);
      expect(hybridDoc.fileSize).toBe(fileData.fileSize);
      expect(hybridDoc.fileType).toBe(fileData.fileType);
      expect(hybridDoc.publicId).toBe(fileData.publicId);
      expect(hybridDoc.url).toBeUndefined();
    });
  });

  describe('createLinkDocument', () => {
    it('should create link-type hybrid document', () => {
      const hybridDoc = createLinkDocument('Test Link', 'https://drive.google.com/file/d/123/view');
      
      expect(hybridDoc.title).toBe('Test Link');
      expect(hybridDoc.type).toBe('link');
      expect(hybridDoc.url).toBe('https://drive.google.com/file/d/123/view');
      expect(hybridDoc.fileUrl).toBeUndefined();
    });
  });
});