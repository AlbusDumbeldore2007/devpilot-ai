import mongoose from 'mongoose';

/**
 * Mongo referencing: chunk text/vectors live in PostgreSQL (pgvector), while
 * flexible document metadata lives here. `chunkIds` references those rows.
 * This keeps optional, evolving metadata out of the relational schema without
 * duplicating large chunk bodies in Mongo.
 */
const knowledgeDocumentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    extension: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    title: { type: String, default: '' },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['PROCESSING', 'READY', 'FAILED'], default: 'PROCESSING', index: true },
    chunkCount: { type: Number, default: 0 },
    chunkIds: { type: [String], default: [] },
    embeddingModel: { type: String, default: null },
    embeddingSource: { type: String, enum: ['provider', 'local-fallback', null], default: null },
    textPreview: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

knowledgeDocumentSchema.index({ teamId: 1, createdAt: -1 });
knowledgeDocumentSchema.index({ teamId: 1, status: 1 });
knowledgeDocumentSchema.index({ title: 'text', textPreview: 'text' });

export const KnowledgeDocument = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
