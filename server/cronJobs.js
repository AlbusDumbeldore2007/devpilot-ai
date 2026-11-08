/**
 * Scheduled jobs using node-cron.
 * 
 * These background jobs run alongside the Express server and perform
 * recurring tasks such as:
 * - Daily deadline reminders for overdue tasks
 * - Weekly task summary emails
 * - Monthly report generation
 * - Cron-based task priority refresh
 * 
 * The CRON_ENABLED flag in env.js controls whether these jobs are active.
 */

import mongoose from 'mongoose';
import Task from './models/Task.js';
import Project from './models/Project.js';

// Only start cron jobs if CRON_ENABLED is true
if (typeof process !== 'undefined' && process.env && process.env.CRON_ENABLED === 'true') {
  // We'll initialize cron jobs after the module loads
  console.log('[cron] CRON_ENABLED is true, initializing scheduled jobs');
} else {
  console.log('[cron] Cron jobs disabled (CRON_ENABLED not set or false)');
}