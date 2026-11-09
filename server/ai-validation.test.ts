import { describe, it, expect } from 'vitest'
import { validatePlan } from './utils/planValidator.js'

describe('Plan Validator', () => {
  it('should reject non-object input', () => {
    const result = validatePlan(null)
    expect(result.errors).toContain('AI response is not a JSON object.')
    expect(result.plan).toBeNull()
  })

  it('should reject array input', () => {
    const result = validatePlan([{ title: 'Test' }])
    expect(result.errors).toContain('AI response is not a JSON object.')
    expect(result.plan).toBeNull()
  })

  it('should reject valid structure with missing fields', () => {
    const result = validatePlan({ projectTitle: 'Short' })
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should normalize a valid plan', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description',
      technologies: ['React', 'Node', 'MongoDB'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              title: 'Task 1',
              description: 'Description 1',
              priority: 'High',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
          ],
        },
      ],
    })
    expect(result.errors).toHaveLength(0)
    expect(result.plan).not.toBeNull()
    expect(result.plan.projectTitle).toBe('My Project')
    expect(result.plan.difficulty).toBe('Medium')
  })

  it('should reject project title too short', () => {
    const result = validatePlan({
      projectTitle: 'Ab',
      description: 'A test project description with more than 10 characters',
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
      ]
    })
    expect(result.errors).toContain('projectTitle is missing or too short.')
  })

  it('should reject project title too long', () => {
    const result = validatePlan({
      projectTitle: 'A'.repeat(121),
      description: 'A test project description with more than 10 characters',
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
      ]
    })
    expect(result.errors).toContain('projectTitle cannot exceed 120 characters.')
  })

  it('should reject description too short (less than 10 chars)', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
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
      ]
    })
    expect(result.errors).toContain('description is missing or too short.')
  })

  it('should reject description too long', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A'.repeat(2001),
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
      ]
    })
    expect(result.errors).toContain('description cannot exceed 2000 characters.')
  })

  it('should normalize technologies (unique, max 30)', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React', 'Node', 'React', 'MongoDB', 'Express', 'Redis'],
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
      ]
    })
    expect(result.errors).toHaveLength(0)
    // Should be de-duplicated and capped at 30
    expect(result.plan?.technologies.length).toBeLessThanOrEqual(6)
  })

  it('should normalize difficulty to Medium when invalid', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Impossible',
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
      ]
    })
    expect(result.plan?.difficulty).toBe('Medium')
  })

  it('should reject plan with no phases', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: []
    })
    expect(result.errors).toContain('At least one development phase is required.')
  })

  it('should reject plan with more than 8 phases', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: Array(9).fill({
        name: 'Phase',
        tasks: [
          {
            title: 'Task',
            priority: 'High',
            difficulty: 'Medium',
            estimatedDays: 3,
          },
        ],
      })
    })
    expect(result.errors).toContain('A plan cannot contain more than 8 phases.')
  })

  it('should reject phase with missing name', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: '',
          tasks: [
            {
              title: 'Task',
              priority: 'High',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
          ],
        },
      ]
    })
    expect(result.errors).toContain('Phase 1 is missing a name.')
  })

  it('should reject phase with empty tasks', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: [],
        },
      ]
    })
    expect(result.errors).toContain('Phase "Phase 1" must contain at least one task.')
  })

  it('should reject phase with more than 15 tasks', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: Array(16).fill({
            title: 'Task',
            priority: 'High',
            difficulty: 'Medium',
            estimatedDays: 3,
          }),
        },
      ]
    })
    expect(result.errors).toContain('Phase "Phase 1" cannot contain more than 15 tasks.')
  })

  it('should reject task with missing title', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              title: '',
              priority: 'High',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
          ],
        },
      ]
    })
    expect(result.errors).toContain('Phase "Phase 1" task 1 is missing a title.')
  })

  it('should normalize task title (max 160 chars)', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              title: 'A'.repeat(200),
              priority: 'High',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
          ],
        },
      ]
    })
    expect(result.plan?.phases[0].tasks[0].title.length).toBeLessThanOrEqual(160)
  })

  it('should normalize priority to Medium when invalid', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              title: 'Task 1',
              priority: 'Invalid',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
          ],
        },
      ]
    })
    expect(result.plan?.phases[0].tasks[0].priority).toBe('Medium')
  })

  it('should normalize task difficulty to plan difficulty when invalid', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Hard',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              title: 'Task 1',
              priority: 'High',
              difficulty: 'Impossible',
              estimatedDays: 3,
            },
          ],
        },
      ]
    })
    expect(result.plan?.phases[0].tasks[0].difficulty).toBe('Hard')
  })

  it('should clamp estimatedDays to 1-60', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
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
              estimatedDays: 0,
            },
          ],
        },
      ]
    })
    expect(result.plan?.phases[0].tasks[0].estimatedDays).toBe(1)

    const result2 = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
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
              estimatedDays: 200,
            },
          ],
        },
      ]
    })
    expect(result2.plan?.phases[0].tasks[0].estimatedDays).toBe(60)
  })

  it('should reject plan with zero valid tasks', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              title: '',
              priority: 'High',
              difficulty: 'Medium',
              estimatedDays: 0,
            },
          ],
        },
      ]
    })
    expect(result.errors).toContain('The plan does not contain any valid tasks.')
  })

  it('should reject plan with more than 60 tasks', () => {
    const result = validatePlan({
      projectTitle: 'My Project',
      description: 'A test project description with more than 10 characters',
      technologies: ['React'],
      difficulty: 'Medium',
      phases: Array(5).fill(null).map((_, i) => ({
        name: `Phase ${i + 1}`,
        tasks: Array(13).fill({
          title: 'Task',
          priority: 'High',
          difficulty: 'Medium',
          estimatedDays: 1,
        }),
      })),
    })
    expect(result.errors).toContain('A plan cannot contain more than 60 tasks.')
  })

  it('should validate plan with all valid fields', () => {
    const result = validatePlan({
      projectTitle: 'Full Stack Application',
      description: 'A full stack web application with React frontend and Node.js backend',
      technologies: ['React', 'Node', 'MongoDB', 'Express', 'Tailwind'],
      difficulty: 'Hard',
      phases: [
        {
          name: 'Setup',
          tasks: [
            {
              title: 'Set up repository',
              priority: 'High',
              difficulty: 'Easy',
              estimatedDays: 2,
            },
          ],
        },
        {
          name: 'Frontend',
          tasks: [
            {
              title: 'Build UI components',
              priority: 'Medium',
              difficulty: 'Medium',
              estimatedDays: 5,
            },
            {
              title: 'Implement state management',
              priority: 'High',
              difficulty: 'Hard',
              estimatedDays: 3,
            },
          ],
        },
        {
          name: 'Backend',
          tasks: [
            {
              title: 'API design and routes',
              priority: 'High',
              difficulty: 'Hard',
              estimatedDays: 4,
            },
            {
              title: 'Database schemas',
              priority: 'Medium',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
            {
              title: 'Authentication flow',
              priority: 'Critical',
              difficulty: 'Hard',
              estimatedDays: 5,
            },
          ],
        },
        {
          name: 'Testing & Deployment',
          tasks: [
            {
              title: 'Write unit tests',
              priority: 'Medium',
              difficulty: 'Easy',
              estimatedDays: 2,
            },
            {
              title: 'CI/CD pipeline',
              priority: 'High',
              difficulty: 'Medium',
              estimatedDays: 3,
            },
          ],
        },
      ]
    })
    expect(result.errors).toHaveLength(0)
    expect(result.plan).not.toBeNull()
  })
})