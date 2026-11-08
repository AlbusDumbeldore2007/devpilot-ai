import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requirePostgres } from '../middleware/validate.js';
import { detectPromptInjection, sanitizePrompt } from '../utils/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use a counter-based unique filename generator
let filenameCounter = 0;

function generateFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext);
  filenameCounter += 1;
  return `${base}-${filenameCounter}${ext}`;
}

// Multer storage: store uploads in the uploads directory with a unique name
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  },
});

// File filter: allow only documented file types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.txt', '.md', '.markdown', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type .${ext} is not allowed. Allowed types: ${allowedExtensions.join(', ')}.`), false);
  }
};

const upload = multer({ storage, fileFilter });

/** Generate a deterministic embedding vector from text content.
 * In production, this would call an embeddings API (OpenAI, etc.).
 * Here we use a simple hash-based vector for demonstration.
 */
function generateEmbedding(text) {
  const hash = crypto.createHash('sha256').update(text.substring(0, 1000)).digest();

  // Convert hash to a 1536-dimensional vector (matching embedding model size)
  const vector = new Float32Array(1536);
  for (let i = 0; i < 1536; i++) {
    vector[i] = (hash[i % hash.length] / 255) * 2 - 1; // Normalize to [-1, 1]
  }
  return vector;
}

/**
 * POST /api/uploads - Upload a document for RAG knowledge base.
 * 
 * - Validates file type and size.
 * - Extracts text content (PDF/DOCX/TXT/MD).
 * - Chunks the content and generates embeddings.
 * - Stores chunks in PostgreSQL with pgvector embeddings.
 * - Returns document metadata and chunk information.
 * 
 * Note: For text extraction from DOCX and PDF, this example uses dynamic
 * imports. In production, integrate with proper libraries or services.
 */
const router = Router();

router.post(
  '/',
  requirePostgres,
  upload.single('document'),
  asyncHandler(async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        return next(new ApiError(400, 'No file uploaded.'));
      }

      // File size check (max 5MB by default)
      const maxBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxBytes) {
        fs.unlinkSync(file.path);
        return next(new ApiError(400, `File size exceeds ${maxBytes / 1024 / 1024}MB limit.`));
      }

      const originalName = file.originalname;
      const fileExt = path.extname(originalName).toLowerCase();
      const storedName = file.filename;

      // Read the file content based on type
      let content = '';
      if (fileExt === '.pdf') {
        const pdfParse = await import('pdf-parse');
        const data = await pdfParse.default(createReadStream(file.path));
        content = data.text;
      } else if (fileExt === '.docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.default.extractRawText({ path: file.path });
        content = result.value;
      } else if (fileExt === '.txt' || fileExt === '.md' || fileExt === '.markdown') {
        content = fs.readFileSync(file.path, 'utf-8');
      } else {
        fs.unlinkSync(file.path);
        return next(new ApiError(400, `Unsupported file type: ${fileExt}`));
      }

      // Sanitize and check for prompt injection in extracted content
      if (detectPromptInjection(content)) {
        fs.unlinkSync(file.path);
        return next(new ApiError(400, 'The document contains potential prompt injection sequences.'));
      }

      const sanitizedContent = sanitizePrompt(content);

      // Chunk the content for RAG
      const chunkSize = Number(process.env.RAG_CHUNK_SIZE) || 900;
      const chunkOverlap = Number(process.env.RAG_CHUNK_OVERLAP) || 120;
      const chunks = [];
      const sentences = sanitizedContent.split(/(?<=[.!?])\s+/);

      let currentChunk = '';
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // Store chunks in PostgreSQL
      const topK = Number(process.env.RAG_TOP_K) || 5;
      const createdChunks = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        // Generate embedding (placeholder - in production would use embeddings model)
        const embedding = generateEmbedding(chunk);

        const dbChunk = await prisma.documentChunk.create({
          data: {
            documentId: storedName,
            chunkIndex: i,
            content: chunk,
            embedding: JSON.stringify(embedding),
          },
        });
        createdChunks.push(dbChunk);
      }

      // Clean up the uploaded file
      fs.unlinkSync(file.path);

      res.status(201).json({
        success: true,
        message: 'Document uploaded and processed successfully.',
        data: {
          documentName: originalName,
          chunkCount: createdChunks.length,
          topK,
          chunkSize,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      if (error instanceof ApiError) return next(error);
      next(new ApiError(500, `Document upload failed: ${error.message}`));
    }
  })
);

export default router;