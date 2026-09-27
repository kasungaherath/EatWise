import 'dotenv/config'
import pool from '../src/config/db.js'

function readNutrient(food, nutrientId, unit, required = true) {
  const entry = food.foodNutrients?.find(
    (item) => item.nutrient?.id === nutrientId
  )

  if (entry?.amount === undefined || entry?.amount === null) {
    if (!required) return null
    throw new Error(`Missing required nutrient: ${nutrientId}`)
  }

  const amount = Number(entry.amount)
  const actualUnit = entry.nutrient.unitName?.toLowerCase()

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    actualUnit !== unit.toLowerCase()
  ) {
    throw new Error(`Invalid nutrient value or unit: ${nutrientId}`)
  }

  return amount
}

async function main() {
  const [fdcId, preparationState, ...options] = process.argv.slice(2)
  const save = options.includes('--save')
  const apiKey = process.env.USDA_API_KEY?.trim()

  if (
    !/^[1-9]\d*$/.test(fdcId || '') ||
    !preparationState?.trim() ||
    preparationState.length > 100 ||
    options.some((option) => option !== '--save')
  ) {
    throw new Error(
      'Usage: node scripts/importFood.js 168878 cooked [--save]'
    )
  }

  if (!apiKey) {
    throw new Error('Add USDA_API_KEY to server/.env.')
  }

  const url = new URL(
    `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`
  )
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(
      `USDA request failed (${response.status}). ` +
      'Check your API key or try again later.'
    )
  }

  const food = await response.json()

  if (String(food.fdcId) !== fdcId) {
    throw new Error('USDA returned a different food identifier.')
  }

  if (food.dataType !== 'SR Legacy') {
    throw new Error(
      'This importer currently supports SR Legacy records only.'
    )
  }

  if (
    typeof food.description !== 'string' ||
    !food.description.trim() ||
    food.description.length > 150
  ) {
    throw new Error('Food name is missing or exceeds 150 characters.')
  }

  const record = {
    name: food.description.trim(),
    preparationState: preparationState.trim(),
    calories: readNutrient(food, 1008, 'kcal'),
    protein: readNutrient(food, 1003, 'g'),
    carbohydrate: readNutrient(food, 1005, 'g'),
    fat: readNutrient(food, 1004, 'g'),
    fiber: readNutrient(food, 1079, 'g', false),
  }

  console.log(`\nFood: ${record.name}`)
  console.log(`FDC ID: ${fdcId}`)
  console.log(`Preparation state: ${record.preparationState}`)

  console.table([
    {
      basis: 'Per 100 g',
      caloriesKcal: record.calories,
      proteinGrams: record.protein,
      carbohydrateGrams: record.carbohydrate,
      fatGrams: record.fat,
      fiberGrams: record.fiber,
    },
  ])

  if (!save) {
    console.log(
      'Preview only. Check the food name and preparation state, ' +
      'then run again with --save.'
    )
    return
  }

  const sourceName = 'USDA FoodData Central'
  const sourceUrl =
    `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`

  try {
    const [result] = await pool.execute(
      `INSERT INTO foods (
        name,
        preparation_state,
        calories_per_100g,
        protein_per_100g,
        carbohydrate_per_100g,
        fat_per_100g,
        fiber_per_100g,
        source_name,
        source_reference,
        source_url,
        source_accessed_at,
        review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        record.name,
        record.preparationState,
        record.calories,
        record.protein,
        record.carbohydrate,
        record.fat,
        record.fiber,
        sourceName,
        fdcId,
        sourceUrl,
        new Date().toISOString().slice(0, 10),
      ]
    )

    console.log(`Saved successfully. EatWise food ID: ${result.insertId}`)
    console.log('Review status: pending')
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('This source record already exists. No changes made.')
      return
    }

    throw error
  }
}

try {
  await main()
} catch (error) {
  if (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError'
  ) {
    console.error('USDA request timed out. Try again.')
  } else if (error instanceof TypeError) {
    console.error('Unable to read the USDA response. Check your connection.')
  } else if (error.code) {
    console.error(`Database error: ${error.code}. Check your database setup.`)
  } else {
    console.error(error.message)
  }

  process.exitCode = 1
} finally {
  await pool.end()
}