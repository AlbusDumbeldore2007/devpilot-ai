import mongoose from 'mongoose';

/**
 * An agent run embeds its short step history (tool name, arguments, result
 * summary). Long-lived pending actions are referenced by id instead, so a run
 * document stays small while approval records remain auditable.
 */
const stepSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    type: { type: String, enum: ['model', 'tool', 'pending', 'final', 'error'], required: true },
    tool: { type: String, default: null },
    arguments: { type: mongoose.Schema.Types.Mixed, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    content: { type: String, default: '' },
    latencyMs: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const agentRunSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: String, required: true, index: true },
    projectId: { type: String, default: null },
    goal: { type: String, required: true, maxlength: 4000 },
    status: { type: String, enum: ['RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL'], default: 'RUNNING' },
    steps: { type: [stepSchema], default: [] },
    finalAnswer: { type: String, default: '' },
    pendingActionId: { type: String, default: null },
    model: { type: String, default: null },
  },
  { timestamps: true }
);

agentRunSchema.index({ userId: 1, createdAt: -1 });
agentRunSchema.index({ teamId: 1, createdAt: -1 });

export const AgentRun = mongoose.model('AgentRun', agentRunSchema);
