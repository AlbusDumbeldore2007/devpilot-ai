import mongoose from 'mongoose';

/**
 * Destructive agent tools never execute immediately. They create a pending
 * action that an authorised user must approve explicitly.
 */
const pendingAgentActionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: String, required: true, index: true },
    runId: { type: String, default: null },
    conversationId: { type: String, default: null },
    tool: { type: String, required: true },
    arguments: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    executedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

pendingAgentActionSchema.index({ userId: 1, status: 1, createdAt: -1 });
pendingAgentActionSchema.index({ teamId: 1, status: 1 });

export const PendingAgentAction = mongoose.model('PendingAgentAction', pendingAgentActionSchema);
