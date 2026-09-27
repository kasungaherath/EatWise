import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRecipeNutrition } from './recipeNutritionService.js'

const ingredient = {
  quantity_grams: '200',
  calories_per_100g: '200',
  protein_per_100g: '10',
  carbohydrate_per_100g: '30',
  fat_per_100g: '4',
  fiber_per_100g: '5',
}

test('calculates totals and divides by servings', () => {
  const result = calculateRecipeNutrition({
    servings: '2',
    ingredients: [
      ingredient,
      { ...ingredient, quantity_grams: '100' },
    ],
  })

  assert.equal(result.totalIngredientWeightGrams, 300)

  assert.deepEqual(result.wholeRecipe, {
    calories: 600,
    proteinGrams: 30,
    carbohydrateGrams: 90,
    fatGrams: 12,
    fiberGrams: 15,
  })

  assert.deepEqual(result.perServing, {
    calories: 300,
    proteinGrams: 15,
    carbohydrateGrams: 45,
    fatGrams: 6,
    fiberGrams: 7.5,
  })
})

test('keeps fiber unknown if any ingredient lacks it', () => {
  const result = calculateRecipeNutrition({
    servings: 1,
    ingredients: [
      ingredient,
      { ...ingredient, fiber_per_100g: null },
    ],
  })

  assert.equal(result.fiberComplete, false)
  assert.equal(result.wholeRecipe.fiberGrams, null)
  assert.equal(result.perServing.fiberGrams, null)
})

test('rejects zero servings', () => {
  assert.throws(
    () =>
      calculateRecipeNutrition({
        servings: 0,
        ingredients: [ingredient],
      }),
    { status: 422 }
  )
})

test('rejects missing calorie data', () => {
  assert.throws(
    () =>
      calculateRecipeNutrition({
        servings: 1,
        ingredients: [
          { ...ingredient, calories_per_100g: null },
        ],
      }),
    { status: 422 }
  )
})

test('rejects negative ingredient weights', () => {
  assert.throws(
    () =>
      calculateRecipeNutrition({
        servings: 1,
        ingredients: [
          { ...ingredient, quantity_grams: -100 },
        ],
      }),
    { status: 422 }
  )
})