/**
 * @jest-environment node
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { SecurityService } from '@/lib/security'

describe('Security Service', () => {
  let securityService: SecurityService

  beforeEach(() => {
    securityService = new SecurityService({
      enableAuditLogging: true,
      enableInputValidation: true,
      enableEncryption: true,
      enableRateLimit: false, // Disable for tests
    })
  })

  describe('Input Validation', () => {
    test('validates clean medical query', () => {
      const input = { query: 'What is the dose of acetaminophen for a 20kg child?' }
      const result = securityService.validateMedicalInput(input)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitized).toEqual(input)
    })

    test('detects potential PHI in query', () => {
      const input = { query: 'Patient John Doe with SSN 123-45-6789 has fever' }
      const result = securityService.validateMedicalInput(input)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query contains potential personally identifiable information (PHI)')
    })

    test('detects email addresses in query', () => {
      const input = { query: 'Contact patient at john.doe@email.com about fever' }
      const result = securityService.validateMedicalInput(input)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query contains potential personally identifiable information (PHI)')
    })

    test('detects phone numbers in query', () => {
      const input = { query: 'Patient phone is 555-123-4567 for follow-up' }
      const result = securityService.validateMedicalInput(input)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query contains potential personally identifiable information (PHI)')
    })

    test('validates patient age format', () => {
      const validAges = ['5 years', '6 months', '2 weeks', '10 days', '1']
      const invalidAges = ['abc years', 'five years', '', null]

      validAges.forEach(age => {
        const input = { query: 'test', patientAge: age }
        const result = securityService.validateMedicalInput(input)
        expect(result.isValid).toBe(true)
      })

      invalidAges.forEach(age => {
        const input = { query: 'test', patientAge: age }
        const result = securityService.validateMedicalInput(input)
        if (age === null || age === '') {
          expect(result.isValid).toBe(true) // Empty age is allowed
        } else {
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('Invalid patient age format')
        }
      })
    })

    test('validates patient weight format', () => {
      const validWeights = ['20kg', '45 pounds', '15.5 kg', '30lbs', '25']
      const invalidWeights = ['heavy', 'twenty kg', '']

      validWeights.forEach(weight => {
        const input = { query: 'test', patientWeight: weight }
        const result = securityService.validateMedicalInput(input)
        expect(result.isValid).toBe(true)
      })

      invalidWeights.forEach(weight => {
        const input = { query: 'test', patientWeight: weight }
        const result = securityService.validateMedicalInput(input)
        if (weight === '') {
          expect(result.isValid).toBe(true) // Empty weight is allowed
        } else {
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('Invalid patient weight format')
        }
      })
    })

    test('removes script tags from query', () => {
      const input = { query: 'What is fever? <script>alert("xss")</script>' }
      const result = securityService.validateMedicalInput(input)
      
      expect(result.isValid).toBe(true)
      expect(result.sanitized?.query).toBe('What is fever?')
      expect(result.sanitized?.query).not.toContain('<script>')
    })

    test('rejects excessively long queries', () => {
      const longQuery = 'a'.repeat(5001) // Exceeds 5000 character limit
      const input = { query: longQuery }
      const result = securityService.validateMedicalInput(input)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query exceeds maximum length of 5000 characters')
    })
  })

  describe('Data Encryption', () => {
    test('encrypts and decrypts data correctly', () => {
      const originalData = 'Sensitive medical information'
      const encrypted = securityService.encryptData(originalData)
      
      expect(encrypted.encrypted).not.toBe(originalData)
      expect(encrypted.iv).toBeDefined()
      
      const decrypted = securityService.decryptData(encrypted.encrypted, encrypted.iv)
      expect(decrypted).toBe(originalData)
    })

    test('handles empty data encryption', () => {
      const originalData = ''
      const encrypted = securityService.encryptData(originalData)
      const decrypted = securityService.decryptData(encrypted.encrypted, encrypted.iv)
      
      expect(decrypted).toBe(originalData)
    })
  })

  describe('Security Configuration Validation', () => {
    test('validates complete security configuration', () => {
      // Mock required environment variables
      const originalEnv = process.env
      process.env = {
        ...originalEnv,
        NEXTAUTH_SECRET: 'test-secret',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        NODE_ENV: 'development'
      }

      const validation = securityService.validateSecurityConfig()
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      process.env = originalEnv
    })

    test('detects missing required environment variables', () => {
      const originalEnv = process.env
      process.env = { ...originalEnv }
      delete process.env.NEXTAUTH_SECRET
      delete process.env.DATABASE_URL

      const validation = securityService.validateSecurityConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Missing required environment variable: NEXTAUTH_SECRET')
      expect(validation.errors).toContain('Missing required environment variable: DATABASE_URL')

      process.env = originalEnv
    })

    test('validates encryption key strength', () => {
      const originalEnv = process.env
      process.env = {
        ...originalEnv,
        NEXTAUTH_SECRET: 'test-secret',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        ENCRYPTION_KEY: 'short' // Too short
      }

      const validation = securityService.validateSecurityConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('ENCRYPTION_KEY must be at least 32 characters long')

      process.env = originalEnv
    })
  })

  describe('Audit Logging', () => {
    test('creates audit log entry', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        timestamp: new Date(),
        userId: 'test-user-id',
        sessionId: 'test-session-id'
      }

      await securityService.createAuditLog(
        'medical_query',
        '/api/rag/chat',
        context,
        true,
        { queryLength: 50 }
      )

      expect(consoleSpy).toHaveBeenCalled()
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0] === '🔍 Audit Log:'
      )
      expect(logCall).toBeDefined()
      expect(logCall[1]).toMatchObject({
        action: 'medical_query',
        resource: '/api/rag/chat',
        success: true
      })

      consoleSpy.mockRestore()
    })
  })
})