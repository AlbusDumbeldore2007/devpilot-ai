import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import request from 'supertest'
import { mongoose } from 'mongoose'
import { Project } from '../models/Project.js'
import { Task } from '../models/Task.js'

describe('Task CRUD', () => {
  beforeAll(async () => {
    // Connect to test MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devpilot_test'
    await mongoose.connect(MONGODB_URI)
  })

  afterEach(async () => {
    // Clean up after each test
    await Task.deleteMany({})
    await Project.deleteMany({})
  })

  afterAll(async () => {
    // Disconnect after all tests
    await mongoose.connection.close()
  })

  it('should create a task via POST /api/tasks', async () => {
    // First create a project
    const project = await Project.create({
      name: 'Test Project',
      description: 'A test project',
      technologies: ['React', 'Node'],
      status: 'Planning',
    })

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
    expect(response.body.data.project).toEqual(project._id.toString())
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
    const project = await Project.create({
      name: 'Filter Test Project',
      description: 'Testing status filter',
      technologies: ['Node'],
      status: 'Planning',
    })

    await Task.create({
      title: 'Task 1',
      project: project._id,
      status: 'To Do',
    })

    await Task.create({
      title: 'Task 2',
      project: project._id,
      status: 'Completed',
    })

    const response = await request('http://localhost:5000')
      .get('/api/tasks?status=To Do')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    const todoTasks = response.body.data.filter((t: any) => t.status === 'To Do')
    expect(todoTasks.length).toBe(1)
  })

  it('should filter tasks by priority', async () => {
    const project = await Project.create({
      name: 'Priority Test Project',
      description: 'Testing priority filter',
      technologies: ['Express'],
      status: 'Planning',
    })

    await Task.create({
      title: 'Task 1',
      project: project._id,
      priority: 'High',
    })

    await Task.create({
      title: 'Task 2',
      project: project._id,
      priority: 'Low',
    })

    const response = await request('http://localhost:5000')
      .get('/api/tasks?priority=High')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    const highTasks = response.body.data.filter((t: any) => t.priority === 'High')
    expect(highTasks.length).toBe(1)
  })

  it('should update a task via PUT /api/tasks/:id', async () => {
    const project = await Project.create({
      name: 'Update Test Project',
      description: 'Testing task update',
      technologies: ['MongoDB'],
      status: 'Planning',
    })

    const task = await Task.create({
      title: 'Updatable Task',
      project: project._id,
      status: 'To Do',
    })

    const response = await request('http://localhost:5000')
      .put(`/api/tasks/${task._id}`)
      .send({ status: 'In Progress' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('In Progress')
  })

  it('should delete a task via DELETE /api/tasks/:id', async () => {
    const project = await Project.create({
      name: 'Delete Test Project',
      description: 'Testing task deletion',
      technologies: ['React'],
      status: 'Planning',
    })

    const task = await Task.create({
      title: 'Deletable Task',
      project: project._id,
    })

    const response = await request('http://localhost:5000')
      .delete(`/api/tasks/${task._id}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    // Verify task is deleted
    const getResponse = await request('http://localhost:5000')
      .get(`/api/tasks/${task._id}`)

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