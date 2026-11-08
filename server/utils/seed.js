/**
 * Optional demo seed script: `npm run seed` from the repo root.
 * Creates two realistic projects and a set of tasks so the dashboard can be
 * demonstrated immediately. This is clearly demo data — the app itself always
 * reads from MongoDB.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function seed() {
  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot seed without a MongoDB connection.');
    process.exit(1);
  }

  await Task.deleteMany({});
  await Project.deleteMany({});

  const orbis = await Project.create({
    name: 'Orbis Analytics',
    description:
      'A real-time product analytics platform with event ingestion, funnel analysis and shareable dashboards for SaaS teams.',
    technologies: ['React', 'Express', 'MongoDB', 'Recharts', 'Redis'],
    status: 'In Progress',
    startDate: daysFromNow(-18),
    deadline: daysFromNow(24),
  });

  const relay = await Project.create({
    name: 'Relay CLI',
    description:
      'A developer-friendly command-line tool for deploying preview environments from any Git branch in under a minute.',
    technologies: ['Node.js', 'Commander.js', 'Docker', 'GitHub API'],
    status: 'Planning',
    startDate: daysFromNow(-4),
    deadline: daysFromNow(45),
  });

  await Task.insertMany([
    {
      title: 'Design event ingestion schema',
      description: 'Model events, sessions and properties in MongoDB with compound indexes.',
      project: orbis._id,
      priority: 'Critical',
      status: 'Completed',
      dueDate: daysFromNow(-12),
    },
    {
      title: 'Build authentication flow',
      description: 'Email/password auth with JWT access tokens and refresh rotation.',
      project: orbis._id,
      priority: 'High',
      status: 'Completed',
      dueDate: daysFromNow(-8),
    },
    {
      title: 'Implement funnel analysis API',
      description: 'Aggregation pipeline that computes conversion between ordered steps.',
      project: orbis._id,
      priority: 'Critical',
      status: 'In Progress',
      dueDate: daysFromNow(3),
    },
    {
      title: 'Build dashboard chart components',
      description: 'Responsive line and bar charts with loading and empty states.',
      project: orbis._id,
      priority: 'High',
      status: 'In Progress',
      dueDate: daysFromNow(7),
    },
    {
      title: 'Add shareable dashboard links',
      description: 'Signed public links with read-only access and expiry.',
      project: orbis._id,
      priority: 'Medium',
      status: 'To Do',
      dueDate: daysFromNow(14),
    },
    {
      title: 'Write API integration tests',
      description: 'Cover project, task and analytics endpoints with Supertest.',
      project: orbis._id,
      priority: 'Low',
      status: 'To Do',
      dueDate: daysFromNow(20),
    },
    {
      title: 'Scaffold CLI command structure',
      description: 'Set up Commander.js, config loading and help output.',
      project: relay._id,
      priority: 'High',
      status: 'Completed',
      dueDate: daysFromNow(-2),
    },
    {
      title: 'Implement preview deployment command',
      description: 'Create `relay deploy --branch` with Docker build and cleanup.',
      project: relay._id,
      priority: 'Critical',
      status: 'In Progress',
      dueDate: daysFromNow(10),
    },
    {
      title: 'Add GitHub check integration',
      description: 'Post deployment status back to the pull request.',
      project: relay._id,
      priority: 'Medium',
      status: 'To Do',
      dueDate: daysFromNow(18),
    },
    {
      title: 'Publish first beta to npm',
      description: 'Version, changelog, license and npm publish workflow.',
      project: relay._id,
      priority: 'Low',
      status: 'To Do',
      dueDate: daysFromNow(30),
    },
  ]);

  console.log(`Seeded 2 projects and 10 tasks into ${env.mongoUri}.`);
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
