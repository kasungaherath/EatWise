import test from 'node:test'
import assert from 'node:assert/strict'
import {
  portionToGrams,
  calculateFoodPortions,
} from './foodPortionService.js'

test('converts two large eggs to 100 grams', () => {
  const grams = portionToGrams(
    { amount: '1', gram_weight: '50' },
    2
  )

  assert.equal(grams, 100)
})

test('converts two medium bananas to 236 grams', () => {
  const grams = portionToGrams(
    { amount: '1', gram_weight: '118' },
    2
  )

  assert.equal(grams, 236)
})

test('handles a 100-gram reference correctly', () => {
  const grams = portionToGrams(
    { amount: '100', gram_weight: '100' },
    150
  )

  assert.equal(grams, 150)
})

test('rejects zero reference amounts', () => {
  assert.throws(
    () =>
      portionToGrams(
        { amount: 0, gram_weight: 50 },
        2
      ),
    { status: 422 }
  )
})

test('rejects invalid quantities', () => {
  for (const quantity of [0, -1, '', null, NaN, Infinity]) {
    assert.throws(
      () =>
        portionToGrams(
          { amount: 1, gram_weight: 50 },
          quantity
        ),
      { status: 422 }
    )
  }
})

const sampleFood = {
  id: 1,
  name: 'Synthetic test food',
  preparation_state: 'test',
  calories_per_100g: 200,
  protein_per_100g: 10,
  carbohydrate_per_100g: 30,
  fat_per_100g: 4,
  fiber_per_100g: null,
}

const samplePortion = {
  id: 1,
  food_id: 1,
  amount: 1,
  gram_weight: 50,
  unit_singular: 'piece',
  unit_plural: 'pieces',
}

test('calculates nutrition from converted weights', () => {
  const result = calculateFoodPortions([
    {
      food: sampleFood,
      portion: samplePortion,
      quantity: 3,
    },
  ])

  assert.equal(result.items[0].grams, 150)
  assert.equal(result.items[0].unit, 'pieces')

  assert.deepEqual(result.totals, {
    calories: 300,
    proteinGrams: 15,
    carbohydrateGrams: 45,
    fatGrams: 6,
    fiberGrams: null,
  })

  assert.equal(result.fiberComplete, false)
})

test('rejects a portion belonging to another food', () => {
  assert.throws(
    () =>
      calculateFoodPortions([
        {
          food: sampleFood,
          portion: { ...samplePortion, food_id: 99 },
          quantity: 2,
        },
      ]),
    { status: 422 }
  )
})