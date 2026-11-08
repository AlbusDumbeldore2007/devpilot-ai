import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { hashPassword, verifyPassword } from './services/authService.js'

describe('Authentication Service', () => {
  beforeAll(() => {
    // Set up bcrypt rounds for testing
    process.env.BCRYPT_ROUNDS = '10'
  })

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe(password)
    })

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)
      const valid = await verifyPassword(password, hash)
      expect(valid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'WrongPassword123'
      const hash = await hashPassword('TestPassword123')
      const valid = await verifyPassword(password, hash)
      expect(valid).toBe(false)
    })
  })
})