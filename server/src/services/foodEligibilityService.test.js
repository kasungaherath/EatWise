import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFoodEligibility } from './foodEligibilityService.js'
import { foodDisplayName } from './foodPresentationService.js'
import catalogue from '../../database/deployment_catalogue.json' with { type: 'json' }
import extraFoods from '../../database/twenty_more_foods.json' with { type: 'json' }

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

test('every catalogue suggestion name can be saved and excludes its food', () => {
  const foods = [...new Map([...catalogue.foods, ...extraFoods].map(({ food }) => [food.source_reference, food])).values()]
  assert.equal(foods.length, 40)
  for (const food of foods) {
    const label = foodDisplayName(food.name)
    assert(label.length <= 80 && !label.includes(','), `${label} must fit the preferences field`)
    assert.equal(evaluateFoodEligibility(food, {
      ...preferences, avoided_foods: [label],
    }).reason, 'avoided_food', `${label} must be recognized`)
  }
})

test('selecting cooked brown rice excludes that food while a broad rice entry excludes both rice types', () => {
  const whiteRice = catalogue.foods.find(({ food }) => food.source_reference === '168878').food
  const brownRice = extraFoods.find(({ food }) => food.source_reference === '169704').food
  const selected = { ...preferences, avoided_foods: ['Cooked brown rice'] }
  assert.equal(evaluateFoodEligibility(brownRice, selected).reason, 'avoided_food')
  assert.equal(evaluateFoodEligibility(whiteRice, selected).eligible, true)
  for (const food of [whiteRice, brownRice]) {
    assert.equal(evaluateFoodEligibility(food, { ...preferences, avoided_foods: ['rice'] }).reason, 'avoided_food')
  }
})

test('selecting milk keeps other dairy choices available without weakening milk allergy matching', () => {
  const milk = catalogue.foods.find(({ food }) => food.source_reference === '171265').food
  const yogurt = catalogue.foods.find(({ food }) => food.source_reference === '170894').food
  const selected = { ...preferences, avoided_foods: ['Fresh whole milk'] }
  assert.equal(evaluateFoodEligibility(milk, selected).reason, 'avoided_food')
  assert.equal(evaluateFoodEligibility(yogurt, selected).eligible, true)
  for (const food of [milk, yogurt]) {
    assert.equal(evaluateFoodEligibility(food, { ...preferences, avoided_foods: ['milk'] }).reason, 'avoided_food')
    assert.equal(evaluateFoodEligibility(food, { ...preferences, allergies: ['milk'] }).reason, 'allergy_match')
  }
  assert.equal(evaluateFoodEligibility(milk, { ...preferences, allergies: ['Fresh whole milk'] }).reason, 'unsupported_exclusion_term')
})

test('catalogue selections accept case and spacing differences, and unknown entries remain unsupported', () => {
  const chicken = catalogue.foods.find(({ food }) => food.source_reference === '171477').food
  assert.equal(evaluateFoodEligibility(chicken, { ...preferences, avoided_foods: ['  ROASTED  Chicken breast '] }).reason, 'avoided_food')
  assert.equal(evaluateFoodEligibility(chicken, { ...preferences, avoided_foods: ['unreviewed mystery food'] }).reason, 'unsupported_exclusion_term')
})

test('existing whole-wheat bread category exclusions keep their broader wheat meaning', () => {
  const bulgur = catalogue.foods.find(({ food }) => food.source_reference === '170287').food
  const bread = extraFoods.find(({ presentation }) => presentation.key === 'whole-wheat-bread').food
  for (const food of [bulgur, bread]) {
    assert.equal(evaluateFoodEligibility(food, { ...preferences, avoided_foods: ['Whole-wheat bread'] }).reason, 'avoided_food')
  }
})
