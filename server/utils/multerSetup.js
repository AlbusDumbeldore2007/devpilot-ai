import multer from 'multer';
import path from 'node:path';
import { sanitizeFilename } from './sanitize.js';

// Set up disk storage for uploaded files.
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads');
export { uploadDir };

// Ensure the upload directory exists.
import { mkdir, access } from 'node:fs/promises';
mkdir(uploadDir, { recursive: true }).catch(() => {});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(path.parse(file.originalname).name);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${safeName}-${Date.now()}${ext}`);
  },
});

// Filter: only allow safe file types for RAG knowledge base.
const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: pdf, txt, md, docx`), false);
  }
};

const limits = { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 };

export const uploadMiddleware = multer({ storage, fileFilter, limits });