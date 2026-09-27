import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateEnergy } from './nutritionService.js'

const profile = {
  age: 25,
  sexForCalculation: 'male',
  heightCm: 175,
  weightKg: 70,
  activityLevel: 'moderate',
}

test('calculates the male reference example', () => {
  const result = calculateEnergy(profile)

  assert.equal(result.restingCalories, 1674)
  assert.equal(result.maintenanceCalories, 2594)
})

test('calculates the female reference example', () => {
  const result = calculateEnergy({
    ...profile,
    sexForCalculation: 'female',
  })

  assert.equal(result.restingCalories, 1508)
  assert.equal(result.maintenanceCalories, 2337)
})

test('rejects a missing sex parameter', () => {
  assert.throws(
    () => calculateEnergy({
      ...profile,
      sexForCalculation: null,
    }),
    { status: 422 }
  )
})

test('rejects an unsupported age', () => {
  assert.throws(
    () => calculateEnergy({
      ...profile,
      age: 18,
    }),
    { status: 422 }
  )
})