import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFoodEligibility } from './foodEligibilityService.js'

const egg = {
  source_name: 'USDA FoodData Central',
  source_reference: '173424',
  review_status: 'approved',
  is_vegan: 0,
  is_vegetarian: 1,
  is_pescatarian: 1,
  allergens: ['egg'],
  allergen_reviewed_at: null,
}

const preferences = {
  diet_type: 'omnivore',
  allergies: [],
  avoided_foods: [],
}

test('allows an approved egg for an unrestricted omnivore', () => {
  assert.equal(
    evaluateFoodEligibility(egg, preferences).eligible,
    true
  )
})

test('excludes eggs for a vegan', () => {
  const result = evaluateFoodEligibility(egg, {
    ...preferences,
    diet_type: 'vegan',
  })

  assert.equal(result.eligible, false)
  assert.equal(result.reason, 'diet_mismatch_or_unknown')
})

test('recognizes eggs as an egg allergy exclusion', () => {
  const result = evaluateFoodEligibility(egg, {
    ...preferences,
    allergies: [' Eggs '],
  })

  assert.equal(result.reason, 'allergy_match')
})

test('excludes an avoided food', () => {
  const result = evaluateFoodEligibility(egg, {
    ...preferences,
    avoided_foods: ['eggs'],
  })

  assert.equal(result.reason, 'avoided_food')
})

test('does not ignore unsupported exclusions', () => {
  const result = evaluateFoodEligibility(egg, {
    ...preferences,
    allergies: ['sesame'],
  })

  assert.equal(result.eligible, false)
  assert.equal(result.reason, 'unsupported_exclusion_term')
})

test('excludes unreviewed allergen data when allergies exist', () => {
  const result = evaluateFoodEligibility(egg, {
    ...preferences,
    allergies: ['banana'],
  })

  assert.equal(result.reason, 'allergen_data_unreviewed')
})

test('accepts JSON arrays returned as database strings', () => {
  const result = evaluateFoodEligibility(egg, {
    ...preferences,
    allergies: '[]',
    avoided_foods: '["egg"]',
  })

  assert.equal(result.reason, 'avoided_food')
})

test('rejects missing preference arrays', () => {
  const result = evaluateFoodEligibility(egg, {
    diet_type: 'omnivore',
  })

  assert.equal(result.reason, 'invalid_preferences')
})

test('excludes foods pending approval', () => {
  const result = evaluateFoodEligibility(
    { ...egg, review_status: 'pending' },
    preferences
  )

  assert.equal(result.reason, 'food_not_approved')
})

test('new catalogue foods respect diets and exclusion aliases', () => {
  const yogurt = { ...egg, source_reference: '170894', allergens: ['milk'] }
  assert.equal(evaluateFoodEligibility(yogurt, { ...preferences, diet_type: 'vegan' }).eligible, false)
  for (const term of ['milk', 'dairy']) {
    assert.equal(evaluateFoodEligibility(yogurt, { ...preferences, allergies: [term] }).reason, 'allergy_match')
  }
  for (const term of ['yogurt', 'Greek yoghurt']) {
    assert.equal(evaluateFoodEligibility(yogurt, { ...preferences, avoided_foods: [term] }).reason, 'avoided_food')
  }
  for (const [id, term] of [['169967', 'broccoli'], ['168483', 'sweet potatoes']]) {
    const food = { ...egg, source_reference: id, is_vegan: 1 }
    assert.equal(evaluateFoodEligibility(food, { ...preferences, diet_type: 'vegan' }).eligible, true)
    assert.equal(evaluateFoodEligibility(food, { ...preferences, avoided_foods: [term] }).reason, 'avoided_food')
    assert.equal(evaluateFoodEligibility(food, { ...preferences, allergies: ['milk'] }).reason, 'allergen_data_unreviewed')
  }
})

test('eight-food expansion excludes allergens and respects fish and dairy diets', () => {
  for (const [id, terms] of [
    ['171265', ['milk', 'dairy']], ['173806', ['peanuts', 'groundnut']],
    ['170287', ['wheat', 'gluten']], ['175168', ['fish', 'salmon']],
  ]) {
    for (const term of terms) {
      assert.equal(evaluateFoodEligibility({ ...egg, source_reference: id }, { ...preferences, allergies: [term] }).reason, 'allergy_match')
    }
  }
  for (const [id, term] of [['168917', 'quinoa'], ['171688', 'apples'], ['171705', 'avocados'], ['168463', 'spinach']]) {
    const food = { ...egg, source_reference: id, is_vegan: 1 }
    assert.equal(evaluateFoodEligibility(food, { ...preferences, diet_type: 'vegan' }).eligible, true)
    assert.equal(evaluateFoodEligibility(food, { ...preferences, avoided_foods: [term] }).reason, 'avoided_food')
  }
  const salmon = { ...egg, source_reference: '175168', is_vegetarian: 0 }
  assert.equal(evaluateFoodEligibility(salmon, { ...preferences, diet_type: 'vegetarian' }).eligible, false)
  assert.equal(evaluateFoodEligibility(salmon, { ...preferences, diet_type: 'pescatarian' }).eligible, true)
  assert.equal(evaluateFoodEligibility({ ...egg, source_reference: '171265' }, { ...preferences, diet_type: 'vegan' }).eligible, false)
})
