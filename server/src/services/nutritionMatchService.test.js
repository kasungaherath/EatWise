import test from 'node:test'
import assert from 'node:assert/strict'
import { assessNutritionMatch } from './nutritionMatchService.js'

const targets = {
  calories: 2000,
  proteinGrams: 100,
  carbohydrateGrams: 250,
  fatGrams: 60,
}

test('exact targets are within tolerance', () => {
  const result = assessNutritionMatch({ ...targets }, targets)

  assert.equal(result.targetMatch.status, 'within_tolerance')
  assert.deepEqual(result.targetMatch.outsideTolerance, [])
  assert.equal(result.comparison.calories.difference, 0)
})

test('values at the tolerance boundaries are accepted', () => {
  const result = assessNutritionMatch(
    {
      calories: 2100,
      proteinGrams: 90,
      carbohydrateGrams: 275,
      fatGrams: 54,
    },
    targets
  )

  assert.equal(result.targetMatch.status, 'within_tolerance')
})

test('calories above tolerance need adjustment', () => {
  const result = assessNutritionMatch(
    { ...targets, calories: 2101 },
    targets
  )

  assert.equal(result.targetMatch.status, 'needs_adjustment')
  assert.deepEqual(result.targetMatch.outsideTolerance, [
    'calories',
  ])
  assert.equal(
    result.comparison.calories.direction,
    'above_target'
  )
})

test('low protein is identified even when calories match', () => {
  const result = assessNutritionMatch(
    { ...targets, proteinGrams: 70 },
    targets
  )

  assert.equal(result.targetMatch.status, 'needs_adjustment')
  assert.equal(
    result.comparison.proteinGrams.direction,
    'below_target'
  )
  assert.equal(result.comparison.proteinGrams.difference, -30)
})

test('rounding does not hide a value outside tolerance', () => {
  const result = assessNutritionMatch(
    { ...targets, calories: 2100.01 },
    targets
  )

  assert.equal(result.comparison.calories.differencePercent, 5)
  assert.equal(result.comparison.calories.withinTolerance, false)
})

test('invalid calculated values are rejected', () => {
  for (const value of [undefined, null, NaN, Infinity, -1, '2000']) {
    assert.throws(() =>
      assessNutritionMatch(
        { ...targets, calories: value },
        targets
      )
    )
  }
})

test('zero or invalid targets are rejected', () => {
  for (const value of [0, -1, null, NaN, Infinity, '2000']) {
    assert.throws(() =>
      assessNutritionMatch(
        { ...targets },
        { ...targets, calories: value }
      )
    )
  }
})