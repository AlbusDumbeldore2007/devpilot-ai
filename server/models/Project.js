import mongoose from 'mongoose';
import Task from './Task.js';
import { PROJECT_STATUSES, DEFAULT_PROJECT_STATUS } from '../utils/constants.js';

/**
 * PROJECT MODEL
 * Represents a software project. Relationships are modelled by a virtual
 * `tasks` field (Task.project holds the foreign key), which keeps task
 * documents independently queryable while still allowing population.
 */
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required.'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters.'],
      maxlength: [120, 'Project name cannot exceed 120 characters.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Project description cannot exceed 2000 characters.'],
    },
    technologies: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: PROJECT_STATUSES,
        message: `Status must be one of: ${PROJECT_STATUSES.join(', ')}.`,
      },
      default: DEFAULT_PROJECT_STATUS,
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
});

projectSchema.index({ createdAt: -1 });

/**
 * REFERENTIAL INTEGRITY
 * A query middleware hook guarantees that deleting a project also removes
 * every associated task — no orphaned documents, regardless of the caller.
 */
projectSchema.pre('findOneAndDelete', async function cascadeDeleteTasks() {
  const projectId = this.getQuery()._id;
  if (projectId) {
    await Task.deleteMany({ project: projectId });
  }
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
