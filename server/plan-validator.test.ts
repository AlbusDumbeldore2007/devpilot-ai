import { describe, it, expect } from 'vitest'
import { validatePlan } from './utils/planValidator.js'

describe('Plan Validator', () => {
  it('should reject non-object input', () => {
    const result = validatePlan(null)
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
})