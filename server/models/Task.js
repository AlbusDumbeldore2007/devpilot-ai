import mongoose from 'mongoose';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  DEFAULT_TASK_STATUS,
  DEFAULT_PRIORITY,
} from '../utils/constants.js';

/**
 * TASK MODEL
 * Each task belongs to exactly one project through an ObjectId reference.
 * Status/priority are enums validated at both the API and database layers.
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required.'],
      trim: true,
      minlength: [2, 'Task title must be at least 2 characters.'],
      maxlength: [160, 'Task title cannot exceed 160 characters.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [3000, 'Task description cannot exceed 3000 characters.'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'A task must belong to a project.'],
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`,
      },
      default: DEFAULT_PRIORITY,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: `Status must be one of: ${TASK_STATUSES.join(', ')}.`,
      },
      default: DEFAULT_TASK_STATUS,
      index: true,
    },
    dueDate: {
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

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
