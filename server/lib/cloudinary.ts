import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
}

/**
 * Upload file to Cloudinary
 */
export async function uploadToCloudinary(
  file: Express.Multer.File,
  folder: string = 'quiz-documents'
): Promise<CloudinaryUploadResult> {
  try {
    console.log('☁️ Uploading to Cloudinary...', { 
      originalName: file.originalname,
      size: file.size,
      folder 
    });

    // Convert buffer to base64 data URI
    const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: `agi-online/${folder}`,
      resource_type: 'raw', // Use 'raw' for non-image files
      public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      use_filename: true,
      unique_filename: false
    });

    console.log('✅ Cloudinary upload successful:', result.public_id);
    
    return {
      public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes
    };
    
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    throw new Error(`Cloudinary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting from Cloudinary:', publicId);
    
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    
    console.log('✅ Cloudinary deletion successful');
  } catch (error) {
    console.error('❌ Cloudinary deletion failed:', error);
    throw new Error(`Cloudinary deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get download URL for a file
 */
export function getDownloadUrl(publicId: string, fileName?: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    flags: 'attachment',
    public_id: fileName ? `${publicId}.${fileName}` : publicId
  });
}

export default cloudinary;