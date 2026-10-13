import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateNutritionTargets } from './nutritionTargets.js'

const profile = { maintenanceCalories: 2800, weightKg: 75, activityLevel: 'active' }

test('protein follows saved weight, activity and goal rather than a fixed calorie percentage', () => {
  for (const [goal, proteinGrams] of Object.entries({ maintain_weight: 90, lose_weight: 105, gain_muscle: 120 })) {
    const targets = calculateNutritionTargets({ ...profile, goal })
    assert.equal(targets.macros.proteinGrams, proteinGrams)
    assert.equal(targets.proteinBasis.weightKg, 75)
    assert.equal(targets.proteinBasis.calorieCapApplied, false)
    assert.ok(targets.macros.proteinGrams < targets.targetCalories * 0.25 / 4)
  }
})

test('general activity uses lower maintenance and loss defaults', () => {
  for (const activityLevel of ['sedentary', 'light']) {
    assert.equal(calculateNutritionTargets({ ...profile, activityLevel, goal: 'maintain_weight' }).macros.proteinGrams, 75)
    assert.equal(calculateNutritionTargets({ ...profile, activityLevel, goal: 'lose_weight' }).macros.proteinGrams, 90)
  }
})

test('raising energy expenditure does not inflate protein at the same body weight and goal', () => {
  const lower = calculateNutritionTargets({ ...profile, goal: 'gain_muscle', maintenanceCalories: 2200 })
  const higher = calculateNutritionTargets({ ...profile, goal: 'gain_muscle', maintenanceCalories: 3400 })
  assert.equal(lower.macros.proteinGrams, higher.macros.proteinGrams)
  assert.ok(higher.macros.carbohydrateGrams > lower.macros.carbohydrateGrams)
})

test('macro energy still sums to the goal calories after changing protein', () => {
  for (const goal of ['maintain_weight', 'lose_weight', 'gain_muscle']) {
    const targets = calculateNutritionTargets({ ...profile, goal })
    const { proteinGrams, carbohydrateGrams, fatGrams } = targets.macros
    assert.ok(Math.abs(proteinGrams * 4 + carbohydrateGrams * 4 + fatGrams * 9 - targets.targetCalories) <= 0.2)
    assert.ok(Math.abs(Object.values(targets.macroPercentages).reduce((a, b) => a + b, 0) - 100) <= 0.2)
  }
})

test('extreme weight inputs keep a balanced, positive energy split', () => {
  const targets = calculateNutritionTargets({ ...profile, weightKg: 500, goal: 'gain_muscle' })
  assert.equal(targets.proteinBasis.calorieCapApplied, true)
  assert.ok(targets.macros.proteinGrams * 4 <= targets.targetCalories * 0.35)
  assert.ok(Object.values(targets.macros).every(value => Number.isFinite(value) && value > 0))
})

test('missing or invalid profile data cannot silently use the old calorie-based protein formula', () => {
  for (const overrides of [{weightKg:undefined}, {weightKg:0}, {weightKg:NaN}, {weightKg:'75'}, {activityLevel:undefined}, {activityLevel:'unknown'}, {goal:'invalid'}, {maintenanceCalories:0}]) {
    assert.throws(() => calculateNutritionTargets({ ...profile, goal: 'gain_muscle', ...overrides }), { status: 422 })
  }
})
