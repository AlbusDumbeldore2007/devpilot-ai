import { describe, it, expect } from 'vitest'
import {
  validateProjectPayload,
  validateTaskPayload,
  validateChatPayload,
  validatePlanRequestPayload,
  validateSavePlanPayload,
} from './utils/validators.js'

describe('Project Payload Validation', () => {
  it('should validate valid project creation payload', () => {
    const result = validateProjectPayload({
      name: 'My Project',
      description: 'A description',
      technologies: ['React', 'Node'],
      status: 'Planning',
      startDate: '2026-11-01',
      deadline: '2026-12-31',
    })

    expect(result.errors).toHaveLength(0)
    expect(result.values.name).toBe('My Project')
  })

  it('should accept name with exactly 2 characters (minimum)', () => {
    // 'Ab' is exactly 2 chars, which is the minimum allowed
    const result = validateProjectPayload({
      name: 'Ab',
    })
    // Validator allows 2 chars (name.length < 2 is false)
    expect(result.errors).toHaveLength(0)
    expect(result.values.name).toBe('Ab')
  })

  it('should reject project name too short (1 char)', () => {
    const result = validateProjectPayload({
      name: 'A',
    })

    expect(result.errors).toContain('Project name must be at least 2 characters.')
  })

  it('should reject project name too long', () => {
    const result = validateProjectPayload({
      name: 'A'.repeat(121),
    })

    expect(result.errors).toContain('Project name cannot exceed 120 characters.')
  })

  it('should validate partial project update', () => {
    const result = validateProjectPayload(
      { status: 'In Progress' },
      { partial: true }
    )

    expect(result.errors).toHaveLength(0)
    expect(result.values.status).toBe('In Progress')
  })

  it('should validate project with description', () => {
    const result = validateProjectPayload({
      name: 'Test',
      description: 'A description',
    })

    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid start date', () => {
    const result = validateProjectPayload({
      name: 'Test',
      startDate: 'not-a-date',
    })

    expect(result.errors).toContain('Start date is invalid.')
  })

  it('should reject deadline earlier than start date', () => {
    const result = validateProjectPayload({
      name: 'Test',
      startDate: '2026-12-01',
      deadline: '2026-11-01',
    })

    expect(result.errors).toContain('Deadline must be later than the start date.')
  })
})

describe('Task Payload Validation', () => {
  it('should validate valid task creation payload with project', () => {
    const result = validateTaskPayload({
      title: 'My Task',
      description: 'A task description',
      project: '6712f0c1a1b2c3d4e5f60730',
      priority: 'High',
      status: 'To Do',
      dueDate: '2026-12-15',
    })

    expect(result.errors).toHaveLength(0)
    expect(result.values.title).toBe('My Task')
  })

  it('should accept name with exactly 2 characters (minimum)', () => {
    // 'Ab' is exactly 2 chars, which is the minimum allowed
    const result = validateTaskPayload({
      title: 'Ab',
      project: '6712f0c1a1b2c3d4e5f60730',
    })
    expect(result.errors).toHaveLength(0)
    expect(result.values.title).toBe('Ab')
  })

  it('should reject task title too short (1 char)', () => {
    const result = validateTaskPayload({
      title: 'A',
      project: '6712f0c1a1b2c3d4e5f60730',
    })

    expect(result.errors).toContain('Task title must be at least 2 characters.')
  })

  it('should reject task title too long', () => {
    const result = validateTaskPayload({
      title: 'A'.repeat(161),
      project: '6712f0c1a1b2c3d4e5f60730',
    })

    expect(result.errors).toContain('Task title cannot exceed 160 characters.')
  })

  it('should reject invalid project ObjectId', () => {
    const result = validateTaskPayload({
      title: 'Test',
      project: 'invalid-id',
    })

    expect(result.errors).toContain('A valid project id is required.')
  })

  it('should validate partial task update', () => {
    const result = validateTaskPayload({ status: 'In Progress' }, { partial: true })

    expect(result.errors).toHaveLength(0)
    expect(result.values.status).toBe('In Progress')
  })

  it('should require project in non-partial mode', () => {
    // In non-partial mode, missing project is an error
    const result = validateTaskPayload({
      title: 'Test',
    })

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors).toContain('A valid project id is required.')
  })
})

describe('Chat Payload Validation', () => {
  it('should validate valid chat payload', () => {
    const result = validateChatPayload({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    })

    expect(result.errors).toHaveLength(0)
    expect(Array.isArray(result.values.messages)).toBe(true)
  })

  it('should reject empty messages array', () => {
    const result = validateChatPayload({
      messages: [],
    })

    expect(result.errors).toContain('At least one chat message is required.')
  })

  it('should reject messages over 30', () => {
    const result = validateChatPayload({
      messages: Array(31).fill({ role: 'user', content: 'Hi' }),
    })

    expect(result.errors).toContain('Conversation cannot exceed 30 messages.')
  })

  it('should reject messages with invalid role', () => {
    const result = validateChatPayload({
      messages: [{ role: 'admin', content: 'Hello' }],
    })

    expect(result.errors).toContain('Message 1 must have role "user" or "assistant".')
  })

  it('should reject empty message content', () => {
    const result = validateChatPayload({
      messages: [{ role: 'user', content: '' }],
    })

    expect(result.errors).toContain('Message 1 content cannot be empty.')
  })

  it('should reject message over 6000 characters', () => {
    const result = validateChatPayload({
      messages: [{ role: 'user', content: 'A'.repeat(6001) }],
    })

    expect(result.errors).toContain('Message 1 is too long (max 6000 characters).')
  })
})

describe('Plan Request Payload Validation', () => {
  it('should validate valid plan request payload', () => {
    const result = validatePlanRequestPayload({
      idea: 'Build a task management app',
      difficulty: 'Medium',
    })

    expect(result.errors).toHaveLength(0)
    expect(result.values.idea).toBe('Build a task management app')
  })

  it('should reject idea too short (less than 10 chars)', () => {
    const result = validatePlanRequestPayload({
      idea: 'Short',
    })

    expect(result.errors).toContain('Describe your project idea in at least 10 characters.')
  })

  it('should reject idea too long (over 4000 chars)', () => {
    const result = validatePlanRequestPayload({
      idea: 'A'.repeat(4001),
    })

    expect(result.errors).toContain('Project idea is too long (max 4000 characters).')
  })

  it('should accept valid difficulty', () => {
    const result = validatePlanRequestPayload({
      idea: 'Build an app',
      difficulty: 'Hard',
    })

    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid difficulty', () => {
    const result = validatePlanRequestPayload({
      idea: 'Build an app',
      difficulty: 'Impossible',
    })

    expect(result.errors).toContain('Difficulty must be one of: Easy, Medium, Hard.')
  })
})

describe('Save Plan Payload Validation', () => {
  it('should validate valid save plan payload', () => {
    const result = validateSavePlanPayload({
      plan: {
        projectTitle: 'Test Project',
        description: 'A test project description',
        technologies: ['React', 'Node'],
        difficulty: 'Medium',
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              {
                title: 'Task 1',
                priority: 'High',
                difficulty: 'Medium',
                estimatedDays: 3,
              },
            ],
          },
        ],
      },
      startDate: '2026-11-10',
    })

    expect(result.errors).toHaveLength(0)
  })

  it('should reject plan with too short project title (1 char)', () => {
    const result = validateSavePlanPayload({
      plan: {
        projectTitle: 'A',
        description: 'A test project description',
        technologies: ['React'],
        difficulty: 'Medium',
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              {
                title: 'Task 1',
                priority: 'High',
                difficulty: 'Medium',
                estimatedDays: 3,
              },
            ],
          },
        ],
      },
    })

    expect(result.errors).toContain('plan: projectTitle is missing or too short.')
  })

  it('should reject plan with too short description (less than 10 chars)', () => {
    const result = validateSavePlanPayload({
      plan: {
        projectTitle: 'Test Project',
        description: 'Short',
        technologies: ['React'],
        difficulty: 'Medium',
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              {
                title: 'Task 1',
                priority: 'High',
                difficulty: 'Medium',
                estimatedDays: 3,
              },
            ],
          },
        ],
      },
    })

    expect(result.errors).toContain('plan: description is missing or too short.')
  })

  it('should reject deadline earlier than start date', () => {
    const result = validateSavePlanPayload({
      plan: {
        projectTitle: 'Test Project',
        description: 'A test',
        technologies: ['React'],
        difficulty: 'Medium',
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              {
                title: 'Task 1',
                priority: 'High',
                difficulty: 'Medium',
                estimatedDays: 3,
              },
            ],
          },
        ],
      },
      startDate: '2026-12-01',
      deadline: '2026-11-01',
    })

    expect(result.errors).toContain('Deadline must be later than the start date.')
  })

  it('should reject plan with no valid tasks', () => {
    const result = validateSavePlanPayload({
      plan: {
        projectTitle: 'Test Project',
        description: 'A test',
        technologies: ['React'],
        difficulty: 'Medium',
        phases: [
          {
            name: 'Phase 1',
            tasks: [],
          },
        ],
      },
    })

    expect(result.errors).toContain('plan: The plan does not contain any valid tasks.')
  })
})
