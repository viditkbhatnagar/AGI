import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dz4tvlaqo';
const CLOUDINARY_API_KEY = 'HJtSkwwCymtk9q_mC-UhEXS3yog';
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_uploads';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  resource_type: string;
}

export interface FileUploadResponse {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

/**
 * Upload file to Cloudinary
 * Supports documents, images, and other file types
 */
export const uploadToCloudinary = async (
  file: File,
  folder: 'question-documents' | 'answer-sheets' = 'question-documents'
): Promise<FileUploadResponse> => {
  console.log('🚀 Starting Cloudinary upload:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    folder,
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET
  });

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `agi-online/${folder}`);
    
    // Determine resource type based on file type
    const resourceType = getResourceType(file.type);
    formData.append('resource_type', resourceType);

    console.log('📤 FormData prepared:', {
      resourceType,
      folder: `agi-online/${folder}`,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET
    });

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    console.log('🌐 Upload URL:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed - Response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(errorData.error?.message || `Upload failed: ${response.status} ${response.statusText}`);
    }

    const result: CloudinaryUploadResult = await response.json();
    console.log('✅ Upload successful:', result);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: result.original_filename || file.name,
      fileSize: result.bytes,
      fileType: result.format,
    };
  } catch (error) {
    console.error('💥 Cloudinary upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload file');
  }
};

/**
 * Get the appropriate Cloudinary resource type based on file MIME type
 */
function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else {
    // For documents (PDF, Word, Excel, etc.)
    return 'raw';
  }
}

/**
 * Extract public_id from a Cloudinary URL
 */
export const extractPublicIdFromUrl = (cloudinaryUrl: string): string => {
  try {
    // Example URL: https://res.cloudinary.com/dz4tvlaqo/raw/upload/v1234567890/agi-online/question-documents/filename.pdf
    const urlParts = cloudinaryUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) return '';
    
    // Get everything after 'upload' and the version number (if present)
    let pathAfterUpload = urlParts.slice(uploadIndex + 1);
    
    // Remove version number if present (starts with 'v' followed by numbers)
    if (pathAfterUpload[0] && pathAfterUpload[0].match(/^v\d+$/)) {
      pathAfterUpload = pathAfterUpload.slice(1);
    }
    
    // Join the remaining parts (this is the public_id with folder structure)
    const fullPath = pathAfterUpload.join('/');
    
    // For Cloudinary, we need the full path without extension as public_id
    const lastDotIndex = fullPath.lastIndexOf('.');
    return lastDotIndex > 0 ? fullPath.substring(0, lastDotIndex) : fullPath;
  } catch (error) {
    console.error('Error extracting public_id from URL:', error);
    return '';
  }
};

/**
 * Generate a download URL for a Cloudinary file
 * This ensures the file downloads instead of displaying in browser
 */
export const getDownloadUrl = (cloudinaryUrl: string, fileName?: string): string => {
  const publicId = extractPublicIdFromUrl(cloudinaryUrl);
  if (!publicId) return cloudinaryUrl; // Fallback to original URL
  
  // Correct Cloudinary download URL format with fl_attachment as transformation
  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
  const downloadParam = fileName ? `fl_attachment:${encodeURIComponent(fileName)}` : 'fl_attachment';
  
  // The correct format is: baseUrl/transformations/public_id
  return `${baseUrl}/${downloadParam}/${publicId}`;
};

/**
 * Create a download/view link for files
 * Simple, reliable approach that opens files in new tab
 */
export const createDownloadLink = (cloudinaryUrl: string, fileName?: string): void => {
  try {
    console.log('🔗 Opening file:', { 
      originalUrl: cloudinaryUrl, 
      fileName,
      urlType: typeof cloudinaryUrl,
      urlLength: cloudinaryUrl?.length,
      isString: typeof cloudinaryUrl === 'string',
      hasCloudinary: cloudinaryUrl?.includes?.('cloudinary.com')
    });
    
    // Validate input
    if (!cloudinaryUrl) {
      throw new Error('No URL provided');
    }
    
    if (typeof cloudinaryUrl !== 'string') {
      throw new Error(`Invalid URL type: ${typeof cloudinaryUrl}`);
    }
    
    // Clean up the URL to ensure it's valid
    const cleanUrl = cloudinaryUrl.trim();
    
    if (!cleanUrl) {
      throw new Error('Empty URL after trimming');
    }
    
    if (!cleanUrl.includes('cloudinary.com')) {
      console.warn('⚠️ URL does not contain cloudinary.com:', cleanUrl);
      // Still try to open it
    }
    
    console.log('✅ URL validation passed, opening:', cleanUrl);
    
    // Simple approach: open in new tab
    // Users can download from there using browser's download option
    const newWindow = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      // If popup blocked, try alternative method
      console.log('⚠️ Popup blocked, trying anchor method...');
      
      const link = document.createElement('a');
      link.href = cleanUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Add download attribute for browsers that support it
      if (fileName) {
        link.download = fileName;
      }
      
      // Temporarily add to DOM and click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    console.log('✅ File opened successfully');
    
  } catch (error) {
    console.error('❌ Failed to open file:', error);
    console.error('❌ Error details:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      urlReceived: cloudinaryUrl,
      urlType: typeof cloudinaryUrl
    });
    
    // Show user-friendly error
    alert(`Unable to open file: ${error instanceof Error ? error.message : 'Unknown error'}\n\nURL: ${cloudinaryUrl}`);
  }
};

/**
 * Delete a file from Cloudinary (for cleanup)
 */
/**
 * Test Cloudinary connection with a simple upload
 */
export const testCloudinaryConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Create a small test PDF (allowed format)
    const testContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n204\n%%EOF';
    const testFile = new File([testContent], 'cloudinary-test.pdf', { type: 'application/pdf' });
    
    console.log('🧪 Testing Cloudinary connection with PDF...');
    
    const result = await uploadToCloudinary(testFile, 'question-documents');
    
    return {
      success: true,
      message: `✅ Connection successful! Uploaded: ${result.url}`
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    // Note: Deletion requires signed requests, which should be done on the backend
    // For now, we'll just return true as files can be managed via Cloudinary dashboard
    console.log('File deletion should be handled on backend for security:', publicId);
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { isValid: boolean; error?: string } => {
  const { maxSizeMB = 10, allowedTypes } = options;

  // Check file size (Cloudinary free tier has 10MB limit per file)
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB. Current size: ${fileSizeMB.toFixed(2)}MB`,
    };
  }

  // Check file type if specified
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
};

/**
 * Common file type mappings for validation
 */
export const FILE_TYPES = {
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
  ],
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  ALL_UPLOADS: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
};
