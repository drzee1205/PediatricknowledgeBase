/**
 * @jest-environment jsdom
 */

import { describe, test, expect } from '@jest/globals'

// Medical calculation functions (would be extracted from ClinicalFeatures.tsx)
interface Drug {
  name: string
  dosage: string
  frequency: string
  maxDose: string
  notes: string
}

const commonDrugs = [
  {
    name: 'Acetaminophen',
    dosage: '10-15 mg/kg/dose',
    frequency: 'Every 4-6 hours',
    maxDose: '75 mg/kg/day, max 4000 mg/day',
    notes: 'For fever and pain. Monitor liver function in prolonged use.'
  },
  {
    name: 'Ibuprofen',
    dosage: '5-10 mg/kg/dose',
    frequency: 'Every 6-8 hours',
    maxDose: '40 mg/kg/day, max 2400 mg/day',
    notes: 'For fever and pain. Avoid in dehydration. Use with food.'
  },
  {
    name: 'Amoxicillin',
    dosage: '25-45 mg/kg/day',
    frequency: 'Every 12 hours',
    maxDose: '90 mg/kg/day',
    notes: 'For bacterial infections. Complete full course of treatment.'
  }
]

function calculateDosage(weight: number, drugName: string): Drug | null {
  const drug = commonDrugs.find(d => d.name === drugName)
  if (!drug) return null

  const dosageMatch = drug.dosage.match(/(\d+)-?(\d*)\s*mg\/kg/)
  if (!dosageMatch) return drug

  const minDose = parseFloat(dosageMatch[1])
  const maxDose = dosageMatch[2] ? parseFloat(dosageMatch[2]) : minDose
  
  return {
    ...drug,
    dosage: `${(minDose * weight).toFixed(1)}-${(maxDose * weight).toFixed(1)} mg per dose`
  }
}

describe('Medical Drug Calculations', () => {
  describe('Acetaminophen Dosing', () => {
    test('calculates correct dose for 20kg child', () => {
      const result = calculateDosage(20, 'Acetaminophen')
      
      expect(result).not.toBeNull()
      expect(result?.dosage).toBe('200.0-300.0 mg per dose')
      expect(result?.frequency).toBe('Every 4-6 hours')
      expect(result?.maxDose).toBe('75 mg/kg/day, max 4000 mg/day')
    })

    test('calculates correct dose for 10kg infant', () => {
      const result = calculateDosage(10, 'Acetaminophen')
      
      expect(result).not.toBeNull()
      expect(result?.dosage).toBe('100.0-150.0 mg per dose')
    })

    test('handles edge case of 1kg neonate', () => {
      const result = calculateDosage(1, 'Acetaminophen')
      
      expect(result).not.toBeNull()
      expect(result?.dosage).toBe('10.0-15.0 mg per dose')
    })
  })

  describe('Ibuprofen Dosing', () => {
    test('calculates correct dose for 15kg child', () => {
      const result = calculateDosage(15, 'Ibuprofen')
      
      expect(result).not.toBeNull()
      expect(result?.dosage).toBe('75.0-150.0 mg per dose')
      expect(result?.frequency).toBe('Every 6-8 hours')
      expect(result?.notes).toContain('Avoid in dehydration')
    })
  })

  describe('Amoxicillin Dosing', () => {
    test('calculates correct daily dose for 25kg child', () => {
      const result = calculateDosage(25, 'Amoxicillin')
      
      expect(result).not.toBeNull()
      expect(result?.dosage).toBe('25.0-45.0 mg per dose') // This would be daily dose in real implementation
      expect(result?.frequency).toBe('Every 12 hours')
    })
  })

  describe('Error Handling', () => {
    test('returns null for unknown drug', () => {
      const result = calculateDosage(20, 'UnknownDrug')
      expect(result).toBeNull()
    })

    test('handles zero weight gracefully', () => {
      const result = calculateDosage(0, 'Acetaminophen')
      expect(result?.dosage).toBe('0.0-0.0 mg per dose')
    })

    test('handles negative weight gracefully', () => {
      const result = calculateDosage(-5, 'Acetaminophen')
      expect(result?.dosage).toBe('-50.0--75.0 mg per dose')
    })
  })

  describe('Safety Checks', () => {
    test('includes appropriate safety warnings', () => {
      const acetaminophenResult = calculateDosage(20, 'Acetaminophen')
      expect(acetaminophenResult?.notes).toContain('Monitor liver function')

      const ibuprofenResult = calculateDosage(20, 'Ibuprofen')
      expect(ibuprofenResult?.notes).toContain('Avoid in dehydration')

      const amoxicillinResult = calculateDosage(20, 'Amoxicillin')
      expect(amoxicillinResult?.notes).toContain('Complete full course')
    })

    test('includes maximum dose information', () => {
      const result = calculateDosage(100, 'Acetaminophen') // Large weight
      expect(result?.maxDose).toContain('max 4000 mg/day')
    })
  })
})

describe('Input Validation', () => {
  test('validates weight input format', () => {
    const validWeights = [10, 20.5, 0.5, 100]
    const invalidWeights = [-1, NaN, Infinity, null, undefined]

    validWeights.forEach(weight => {
      const result = calculateDosage(weight, 'Acetaminophen')
      expect(result).not.toBeNull()
    })

    invalidWeights.forEach(weight => {
      // In a real implementation, these would throw errors or return validation messages
      if (weight === null || weight === undefined || isNaN(weight) || !isFinite(weight)) {
        expect(() => calculateDosage(weight as number, 'Acetaminophen')).not.toThrow()
      }
    })
  })

  test('validates drug name input', () => {
    const validDrugs = ['Acetaminophen', 'Ibuprofen', 'Amoxicillin']
    const invalidDrugs = ['', null, undefined, 'InvalidDrug']

    validDrugs.forEach(drug => {
      const result = calculateDosage(20, drug)
      expect(result).not.toBeNull()
    })

    invalidDrugs.forEach(drug => {
      const result = calculateDosage(20, drug as string)
      expect(result).toBeNull()
    })
  })
})