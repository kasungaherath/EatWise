import 'dotenv/config'
import assert from 'node:assert/strict'
import pool from '../src/config/db.js'
import { calculateFoodPortions } from '../src/services/foodPortionService.js'

const selections = [
  {
    sourceReference: '173424',
    portionKey: 'usda-92500',
    quantity: 2,
    expectedGrams: 100,
  },
  {
    sourceReference: '173944',
    portionKey: 'usda-93515',
    quantity: 2,
    expectedGrams: 236,
  },
  {
    sourceReference: '168878',
    portionKey: '100g',
    quantity: 150,
    expectedGrams: 150,
  },
]

async function main() {
  const items = []

  for (const selection of selections) {
    const [rows] = await pool.execute(
      `SELECT
         f.id AS food_id,
         f.name,
         f.preparation_state,
         f.calories_per_100g,
         f.protein_per_100g,
         f.carbohydrate_per_100g,
         f.fat_per_100g,
         f.fiber_per_100g,
         p.id AS portion_id,
         p.amount,
         p.gram_weight,
         p.unit_singular,
         p.unit_plural,
         p.review_status AS portion_status
       FROM foods f
       JOIN food_portions p ON p.food_id = f.id
       WHERE f.source_name = ?
         AND f.source_reference = ?
         AND p.portion_key = ?`,
      [
        'USDA FoodData Central',
        selection.sourceReference,
        selection.portionKey,
      ]
    )

    if (rows.length !== 1) {
      throw new Error(
        `Expected one portion for food ${selection.sourceReference}, ` +
        `key ${selection.portionKey}. Found ${rows.length}.`
      )
    }

    const row = rows[0]

    if (row.portion_status !== 'approved') {
      throw new Error(
        `Portion ${selection.portionKey} is not approved.`
      )
    }

    items.push({
      food: {
        id: row.food_id,
        name: row.name,
        preparation_state: row.preparation_state,
        calories_per_100g: row.calories_per_100g,
        protein_per_100g: row.protein_per_100g,
        carbohydrate_per_100g: row.carbohydrate_per_100g,
        fat_per_100g: row.fat_per_100g,
        fiber_per_100g: row.fiber_per_100g,
      },
      portion: {
        id: row.portion_id,
        food_id: row.food_id,
        amount: row.amount,
        gram_weight: row.gram_weight,
        unit_singular: row.unit_singular,
        unit_plural: row.unit_plural,
      },
      quantity: selection.quantity,
    })
  }

  const result = calculateFoodPortions(items)

  result.items.forEach((item, index) => {
    assert.equal(
      item.grams,
      selections[index].expectedGrams,
      `Unexpected gram weight for ${item.name}`
    )
  })

  assert.equal(result.totalWeightGrams, 486)

  console.table(
    result.items.map((item) => ({
      food: item.name,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      calories: item.nutrition.calories,
      proteinGrams: item.nutrition.proteinGrams,
      carbohydrateGrams: item.nutrition.carbohydrateGrams,
      fatGrams: item.nutrition.fatGrams,
    }))
  )

  console.log('Combined nutrition:')
  console.table([result.totals])

  console.log('Stored portion checks passed.')
  console.log(
    'Calculation test only; diet and allergy eligibility are not checked.'
  )
}

try {
  await main()
} catch (error) {
  console.error(
    error.code && error.code !== 'ERR_ASSERTION'
      ? `Database error: ${error.code}`
      : error.message
  )

  process.exitCode = 1
} finally {
  await pool.end()
}