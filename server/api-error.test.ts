import { describe, it, expect } from 'vitest'
import { ApiError } from './utils/ApiError.js'

describe('ApiError', () => {
  describe('status codes', () => {
    it('should create a bad request error', () => {
      const error = ApiError.badRequest('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBeUndefined()
    })

    it('should create an unauthorized error', () => {
      const error = ApiError.unauthorized('Access denied')
      expect(error.statusCode).toBe(401)
    })

    it('should create a forbidden error', () => {
      const error = ApiError.forbidden('Insufficient permissions', 'FORBIDDEN')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
    })

    it('should create a not found error', () => {
      const error = ApiError.notFound('Resource not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create a conflict error', () => {
      const error = ApiError.conflict('Duplicate entry')
      expect(error.statusCode).toBe(409)
    })

    it('should create an unprocessable error', () => {
      const error = ApiError.unprocessable('Bad response', ['detail1', 'detail2'])
      expect(error.statusCode).toBe(502)
      expect(error.code).toBe('AI_INVALID_RESPONSE')
    })

    it('should create a not configured error', () => {
      const error = ApiError.notConfigured('AI not set up', 'NOT_CONFIGURED')
      expect(error.statusCode).toBe(503)
      expect(error.code).toBe('NOT_CONFIGURED')
    })
  })

  describe('isOperational flag', () => {
    it('should set isOperational to true', () => {
      const error = ApiError.badRequest('Test message')
      expect(error.isOperational).toBe(true)
    })
  })
})