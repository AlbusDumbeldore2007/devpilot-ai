import mongoose from 'mongoose';

/**
 * Generated plans are stored with their full structured payload and provider
 * metadata embedded. The shape is intentionally flexible (Mixed) because LLM
 * plans evolve; relational project/task rows are created only after approval.
 */
const generatedPlanSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: String, default: null, index: true },
    idea: { type: String, required: true, maxlength: 4000 },
    difficulty: { type: String, default: 'Medium' },
    plan: { type: mongoose.Schema.Types.Mixed, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    validation: {
      valid: { type: Boolean, default: true },
      errors: { type: [String], default: [] },
    },
    savedProjectId: { type: String, default: null },
  },
  { timestamps: true }
);

generatedPlanSchema.index({ userId: 1, createdAt: -1 });
generatedPlanSchema.index({ teamId: 1, createdAt: -1 });

export const GeneratedPlan = mongoose.model('GeneratedPlan', generatedPlanSchema);
