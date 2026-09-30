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
    allergies: ['milk'],
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