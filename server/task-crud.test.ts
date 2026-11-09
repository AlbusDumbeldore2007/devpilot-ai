import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import Project from './models/Project.js'
import Task from './models/Task.js'

let isConnected = false

describe('Task CRUD', () => {
  beforeAll(async () => {
    // Connect to test MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devpilot_test'
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 1500 })
      isConnected = true
    } catch {
      isConnected = false
    }
  })

  beforeEach((context) => {
    if (!isConnected) {
      context.skip()
      return
    }
  })

  afterEach(async () => {
    if (!isConnected) return
    // Clean up after each test
    await Task.deleteMany({})
    await Project.deleteMany({})
  })

  afterAll(async () => {
    if (isConnected) {
      // Disconnect after all tests
      await mongoose.connection.close()
    }
  })

  it('should create a task via POST /api/tasks', async () => {
    // Create the project through the API (live server uses its own DB).
    const projectRes = await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Test Project', description: 'A test project', technologies: ['React', 'Node'], status: 'Planning' })
    const project = { _id: projectRes.body.data._id }

    const taskData = {
      title: 'Test Task',
      description: 'A test task description',
      project: project._id,
      priority: 'High',
      status: 'To Do',
      dueDate: '2026-12-15',
    }

    const response = await request('http://localhost:5000')
      .post('/api/tasks')
      .send(taskData)

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.title).toBe('Test Task')
    expect(response.body.data.project._id).toEqual(project._id.toString())
    expect(response.body.data.priority).toBe('High')
    expect(response.body.data.status).toBe('To Do')
  })

  it('should return 404 when creating task for non-existent project', async () => {
    const taskData = {
      title: 'Test Task',
      project: '6712f0c1a1b2c3d4e5f60730', // Non-existent project ID
    }

    const response = await request('http://localhost:5000')
      .post('/api/tasks')
      .send(taskData)

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })

  it('should list tasks via GET /api/tasks', async () => {
    // Create a project and task
    const project = await Project.create({
      name: 'List Test Project',
      description: 'Testing task listing',
      technologies: ['React'],
      status: 'Planning',
    })

    await Task.create({
      title: 'Task 1',
      project: project._id,
      priority: 'Medium',
      status: 'To Do',
    })

    await Task.create({
      title: 'Task 2',
      project: project._id,
      priority: 'High',
      status: 'In Progress',
    })

    const response = await request('http://localhost:5000')
      .get('/api/tasks')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.count).toBeGreaterThan(0)
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('should filter tasks by status', async () => {
    // Create through the API: the live server uses its own database,
    // so documents created directly in the test DB are invisible to it.
    const projectRes = await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Filter Test Project', description: 'Testing status filter' })
    const projectId = projectRes.body.data._id
    await request('http://localhost:5000').post('/api/tasks').send({ title: 'Task 1', project: projectId, status: 'To Do' })
    await request('http://localhost:5000').post('/api/tasks').send({ title: 'Task 2', project: projectId, status: 'Completed' })

    // Scope to this test's project: the live API DB also holds seed data.
    const response = await request('http://localhost:5000')
      .get(`/api/tasks?status=To Do&project=${projectId}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    const todoTasks = response.body.data.filter((t: any) => t.status === 'To Do')
    expect(todoTasks.length).toBe(1)
  })

  it('should filter tasks by priority', async () => {
    const projectRes = await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Priority Test Project', description: 'Testing priority filter' })
    const projectId = projectRes.body.data._id
    await request('http://localhost:5000').post('/api/tasks').send({ title: 'Task 1', project: projectId, priority: 'High' })
    await request('http://localhost:5000').post('/api/tasks').send({ title: 'Task 2', project: projectId, priority: 'Low' })

    // Scope to this test's project: the live API DB also holds seed data.
    const response = await request('http://localhost:5000')
      .get(`/api/tasks?priority=High&project=${projectId}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    const highTasks = response.body.data.filter((t: any) => t.priority === 'High')
    expect(highTasks.length).toBe(1)
  })

  it('should update a task via PUT /api/tasks/:id', async () => {
    // Create through the API: the live server uses its own database,
    // so documents created directly in the test DB are invisible to it.
    const projectRes = await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Update Test Project', description: 'Testing task update' })
    const taskRes = await request('http://localhost:5000')
      .post('/api/tasks')
      .send({ title: 'Updatable Task', project: projectRes.body.data._id, status: 'To Do' })

    const response = await request('http://localhost:5000')
      .put(`/api/tasks/${taskRes.body.data._id}`)
      .send({ status: 'In Progress' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('In Progress')
  })

  it('should delete a task via DELETE /api/tasks/:id', async () => {
    const projectRes = await request('http://localhost:5000')
      .post('/api/projects')
      .send({ name: 'Delete Test Project', description: 'Testing task deletion' })
    const taskRes = await request('http://localhost:5000')
      .post('/api/tasks')
      .send({ title: 'Deletable Task', project: projectRes.body.data._id })

    const response = await request('http://localhost:5000')
      .delete(`/api/tasks/${taskRes.body.data._id}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    // Verify task is deleted
    const getResponse = await request('http://localhost:5000')
      .get(`/api/tasks/${taskRes.body.data._id}`)

    expect(getResponse.status).toBe(404)
  })

  it('should return 404 for non-existent task update', async () => {
    const response = await request('http://localhost:5000')
      .put('/api/tasks/6712f0c1a1b2c3d4e5f60730')
      .send({ status: 'In Progress' })

    expect(response.status).toBe(404)
  })

  it('should return 404 for non-existent task deletion', async () => {
    const response = await request('http://localhost:5000')
      .delete('/api/tasks/6712f0c1a1b2c3d4e5f60730')

    expect(response.status).toBe(404)
  })
})