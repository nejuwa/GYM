import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'profile-images');

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

export const profileImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error('Only JPEG, PNG, and WEBP images are allowed.'));
      return;
    }
    callback(null, true);
  },
});

export function getUploadedProfileImageUrl(req: { protocol: string; get(name: string): string | undefined }, filename: string): string {
  const host = req.get('host');
  if (!host) throw new Error('Unable to determine upload host');
  return `${req.protocol}://${host}/uploads/profile-images/${filename}`;
}
