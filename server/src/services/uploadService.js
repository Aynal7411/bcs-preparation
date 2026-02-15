import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export async function uploadToCloudinary(buffer, folder = 'job-prep') {
  const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
  return cloudinary.uploader.upload(base64, { folder });
}
