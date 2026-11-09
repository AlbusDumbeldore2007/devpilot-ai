import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import request from 'supertest'
import { prisma } from './config/prisma.js'
import Project from './models/Project.js'
import Task from './models/Task.js'

let server: any
let authToken: string

let isConnected = false
let isServerRunning = false

beforeAll(async () => {
  const mongoose = await import('mongoose')
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devpilot_test'
  try {
    await mongoose.default.connect(MONGODB_URI, { serverSelectionTimeoutMS: 1500 })
    isConnected = true
  } catch {
    isConnected = false
  }

  try {
    const res = await request('http://localhost:5000').get('/api/health')
    isServerRunning = res.status === 200
  } catch {
    isServerRunning = false
  }
})

describe('Project CRUD', () => {
  beforeEach((context) => {
    if (!isConnected || !isServerRunning) {
      context.skip()
      return
    }
  })

  afterEach(async () => {
    if (!isConnected) return
    // Clean up after each test
    await Project.deleteMany({})
    await Task.deleteMany({})
  })

  afterAll(async () => {
    if (isConnected) {
      // Disconnect after all tests
      const mongoose = await import('mongoose')
      await mongoose.default.connection.close()
    }
  })

  it('should create a project via POST /api/projects', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project for CRUD testing',
      technologies: ['React', 'Node', 'MongoDB'],
      status: 'Planning',
      startDate: '2026-11-01',
      deadline: '2026-12-31',
    }

    const response = await request('http://localhost:5000')
      .post('/api/projects')
      .send(projectData)

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.name).toBe('Test Project')
    expect(response.body.data.description).toBe('A test project for CRUD testing')
    expect(Array.isArray(response.body.data.technologies)).toBe(true)
    expect(response.body.data.status).toBe('Planning')
  })

  it('should return 400 for invalid project name (too short)', async () => {
    const projectData = {
      name: 'A', // 1 char — below the 2-char minimum
      description: 'Too short name',
    }

    const response = await request('http://localhost:5000')
      .post('/api/projects')
      .send(projectData)

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 for invalid project name (too long)', async () => {
    const longName = 'A'.repeat(121)
    const projectData = {
      name: longName,
    }

    const response = await request('http://localhost:5000')
      .post('/api/projects')
      .send(projectData)

    expect(response.status).toBe(400)
  })

  it('should list projects via GET /api/projects', async () => {
    // Create a project first
    await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'List Test Project', description: 'Testing listing' })

    const response = await request('http://localhost:5000')
      .get('/api/projects')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.count).toBeGreaterThan(0)
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('should filter projects by status', async () => {
    await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'In Progress Project', status: 'In Progress' })

    const response = await request('http://localhost:5000')
      .get('/api/projects?status=In Progress')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    const matching = response.body.data.filter((p: any) => p.status === 'In Progress')
    expect(matching.length).toBeGreaterThan(0)
  })

  it('should search projects', async () => {
    await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Search Test Project', description: 'Testing search' })

    const response = await request('http://localhost:5000')
      .get('/api/projects?search=Search')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    const matching = response.body.data.filter((p: any) => p.name.includes('Search'))
    expect(matching.length).toBeGreaterThan(0)
  })

  it('should delete a project and cascade delete its tasks', async () => {
    // Create a project with tasks
    const project = await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Cascade Test Project', description: 'Testing cascade delete' })

    // Create a task for this project
    await request('http://localhost:5000')
      .post('/api/tasks')
      .send({
        title: 'Test Task',
        project: project.body.data._id,
        priority: 'High',
        status: 'To Do',
      })

    // Delete the project
    const deleteResponse = await request('http://localhost:5000')
      .delete(`/api/projects/${project.body.data._id}`)

    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body.success).toBe(true)

    // Verify tasks are also deleted (scoped: the live DB holds seed data too)
    const remainingTasks = await request('http://localhost:5000')
      .get(`/api/tasks?project=${project.body.data._id}`)

    expect(remainingTasks.body.data.length).toBe(0)
  })

  it('should return 404 for non-existent project deletion', async () => {
    const response = await request('http://localhost:5000')
      .delete('/api/projects/6712f0c1a1b2c3d4e5f60730')

    expect(response.status).toBe(404)
  })
})