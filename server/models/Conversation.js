import mongoose from 'mongoose';

/**
 * Mongo embedding: messages are embedded directly inside the conversation
 * because they are always read together and bounded in size. This avoids a
 * join/N+1 lookup on every chat load.
 */
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'tool'], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    toolName: { type: String, default: null },
    usage: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: String, default: null, index: true },
    title: { type: String, trim: true, default: 'New conversation', maxlength: 160 },
    messages: { type: [messageSchema], default: [] },
    model: { type: String, default: null },
    totalTokens: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ teamId: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
