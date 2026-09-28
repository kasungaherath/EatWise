import pool from '../config/db.js'
import { calculateFoodPortions } from '../services/foodPortionService.js'
import { evaluateFoodEligibility } from '../services/foodEligibilityService.js'

function formatFood(row) {
  return {
    id: Number(row.id),
    name: row.name,
    preparationState: row.preparation_state,
    nutritionPer100g: {
      calories: Number(row.calories_per_100g),
      proteinGrams: Number(row.protein_per_100g),
      carbohydrateGrams: Number(row.carbohydrate_per_100g),
      fatGrams: Number(row.fat_per_100g),
      fiberGrams:
        row.fiber_per_100g == null
          ? null
          : Number(row.fiber_per_100g),
    },
    portions: [],
  }
}

function formatPortion(row) {
  return {
    id: Number(row.portion_id),
    label: row.label,
    amount: Number(row.amount),
    unitSingular: row.unit_singular,
    unitPlural: row.unit_plural,
    gramWeight: Number(row.gram_weight),
  }
}

// GET /api/foods
// Approved catalogue; does not apply personal preferences.
export async function listFoods(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const [rows] = await pool.execute(
      `SELECT
         f.id,
         f.name,
         f.preparation_state,
         f.calories_per_100g,
         f.protein_per_100g,
         f.carbohydrate_per_100g,
         f.fat_per_100g,
         f.fiber_per_100g,
         p.id AS portion_id,
         p.label,
         p.amount,
         p.unit_singular,
         p.unit_plural,
         p.gram_weight
       FROM foods f
       INNER JOIN food_portions p ON p.food_id = f.id
       WHERE f.review_status = 'approved'
         AND p.review_status = 'approved'
       ORDER BY f.id, p.id`
    )

    const foodsById = new Map()

    for (const row of rows) {
      const foodId = Number(row.id)

      if (!foodsById.has(foodId)) {
        foodsById.set(foodId, formatFood(row))
      }

      foodsById.get(foodId).portions.push(formatPortion(row))
    }

    return res.json({
      success: true,
      personalized: false,
      foods: [...foodsById.values()],
    })
  } catch (error) {
    return next(error)
  }
}

// GET /api/foods/eligible
// Applies the supported checks against saved preferences.
export async function listEligibleFoods(req, res, next) {
  res.set('Cache-Control', 'no-store')

  const userId = req.session?.userId

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to continue.',
    })
  }

  try {
    const [preferencesRows] = await pool.execute(
      `SELECT diet_type, allergies, avoided_foods
       FROM user_preferences
       WHERE user_id = ?`,
      [userId]
    )

    if (!preferencesRows.length) {
      return res.status(422).json({
        success: false,
        message: 'Save your food preferences first.',
      })
    }

    const preferences = preferencesRows[0]

    const [rows] = await pool.execute(
      `SELECT
         f.id,
         f.name,
         f.preparation_state,
         f.review_status,
         f.is_vegan,
         f.is_vegetarian,
         f.is_pescatarian,
         f.allergens,
         f.allergen_reviewed_at,
         f.source_name,
         f.source_reference,
         f.calories_per_100g,
         f.protein_per_100g,
         f.carbohydrate_per_100g,
         f.fat_per_100g,
         f.fiber_per_100g,
         p.id AS portion_id,
         p.label,
         p.amount,
         p.unit_singular,
         p.unit_plural,
         p.gram_weight
       FROM foods f
       LEFT JOIN food_portions p
         ON p.food_id = f.id
         AND p.review_status = 'approved'
       ORDER BY f.id, p.id`
    )

    const foodsById = new Map()

    for (const row of rows) {
      const foodId = Number(row.id)

      if (!foodsById.has(foodId)) {
        foodsById.set(foodId, {
          record: row,
          food: formatFood(row),
        })
      }

      if (row.portion_id != null) {
        foodsById
          .get(foodId)
          .food.portions.push(formatPortion(row))
      }
    }

    const foods = []
    const excludedFoods = []

    for (const { record, food } of foodsById.values()) {
      const evaluation = evaluateFoodEligibility(
        record,
        preferences
      )

      if (!evaluation.eligible) {
        excludedFoods.push({
          foodId: food.id,
          name: food.name,
          reason: evaluation.reason,
        })

        continue
      }

      if (!food.portions.length) {
        excludedFoods.push({
          foodId: food.id,
          name: food.name,
          reason: 'no_approved_portions',
        })

        continue
      }

      foods.push(food)
    }

    return res.json({
      success: true,
      personalized: true,
      dietType: preferences.diet_type,
      foods,
      excludedFoods,
      message: foods.length
        ? 'Foods matching the supported preference checks. This is not a validated daily plan.'
        : 'No eligible foods found. Check the exclusion reasons; some foods or preference terms may need review.',
    })
  } catch (error) {
    return next(error)
  }
}

// POST /api/foods/calculate
// Calculates nutrition only; does not validate personal suitability.
export async function calculateFoods(req, res, next) {
  res.set('Cache-Control', 'no-store')

  const items = req.body?.items

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    return res.status(400).json({
      success: false,
      message: 'Provide between 1 and 50 food portions.',
    })
  }

  const validItems = items.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      Number.isSafeInteger(item.portionId) &&
      item.portionId > 0 &&
      typeof item.quantity === 'number' &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0
  )

  if (!validItems) {
    return res.status(400).json({
      success: false,
      message:
        'Each item must contain a positive integer portionId and a positive numeric quantity.',
    })
  }

  try {
    const portionIds = [
      ...new Set(items.map((item) => item.portionId)),
    ]

    const placeholders = portionIds.map(() => '?').join(', ')

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
         p.label,
         p.amount,
         p.unit_singular,
         p.unit_plural,
         p.gram_weight
       FROM food_portions p
       INNER JOIN foods f ON f.id = p.food_id
       WHERE p.id IN (${placeholders})
         AND p.review_status = 'approved'
         AND f.review_status = 'approved'`,
      portionIds
    )

    const portionsById = new Map(
      rows.map((row) => [Number(row.portion_id), row])
    )

    const unavailablePortionIds = portionIds.filter(
      (portionId) => !portionsById.has(portionId)
    )

    if (unavailablePortionIds.length) {
      return res.status(422).json({
        success: false,
        message:
          'One or more selected portions are unavailable or not approved.',
        unavailablePortionIds,
      })
    }

    const calculationItems = items.map((item) => {
      const row = portionsById.get(item.portionId)

      return {
        food: {
          id: Number(row.food_id),
          name: row.name,
          preparation_state: row.preparation_state,
          calories_per_100g: row.calories_per_100g,
          protein_per_100g: row.protein_per_100g,
          carbohydrate_per_100g: row.carbohydrate_per_100g,
          fat_per_100g: row.fat_per_100g,
          fiber_per_100g: row.fiber_per_100g,
        },
        portion: {
          id: Number(row.portion_id),
          food_id: Number(row.food_id),
          label: row.label,
          amount: row.amount,
          unit_singular: row.unit_singular,
          unit_plural: row.unit_plural,
          gram_weight: row.gram_weight,
        },
        quantity: item.quantity,
      }
    })

    const calculation = calculateFoodPortions(calculationItems)

    return res.json({
      success: true,
      personalized: false,
      message:
        'Nutrition calculation only. Diet, allergy, and portion suitability have not been checked.',
      calculation,
    })
  } catch (error) {
    if (error.status === 422 || error.statusCode === 422) {
      return res.status(422).json({
        success: false,
        message: error.message,
      })
    }

    return next(error)
  }
}