import pool from '../config/db.js'
import { calculateFoodPortions } from '../services/foodPortionService.js'

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
         p.label AS portion_label,
         p.amount,
         p.unit_singular,
         p.unit_plural,
         p.gram_weight
       FROM foods f
       JOIN food_portions p ON p.food_id = f.id
       WHERE f.review_status = 'approved'
         AND p.review_status = 'approved'
       ORDER BY f.id, p.id`
    )

    const foods = new Map()

    for (const row of rows) {
      if (!foods.has(row.id)) {
        foods.set(row.id, {
          id: row.id,
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
        })
      }

      foods.get(row.id).portions.push({
        id: row.portion_id,
        label: row.portion_label,
        amount: Number(row.amount),
        unitSingular: row.unit_singular,
        unitPlural: row.unit_plural,
        gramWeight: Number(row.gram_weight),
      })
    }

    return res.json({
      success: true,
      personalized: false,
      foods: [...foods.values()],
    })
  } catch (error) {
    next(error)
  }
}

export async function calculateFoods(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const items = req.body?.items

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide between 1 and 50 food items.',
      })
    }

    for (const item of items) {
      if (
        !item ||
        !Number.isSafeInteger(item.portionId) ||
        item.portionId <= 0 ||
        typeof item.quantity !== 'number' ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Each item needs a positive integer portionId ' +
            'and a positive numeric quantity.',
        })
      }
    }

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
         p.amount,
         p.gram_weight,
         p.unit_singular,
         p.unit_plural
       FROM food_portions p
       JOIN foods f ON f.id = p.food_id
       WHERE p.id IN (${placeholders})
         AND p.review_status = 'approved'
         AND f.review_status = 'approved'`,
      portionIds
    )

    const portionsById = new Map(
      rows.map((row) => [Number(row.portion_id), row])
    )

    if (portionIds.some((id) => !portionsById.has(id))) {
      return res.status(422).json({
        success: false,
        message:
          'One or more portions are unavailable or not approved.',
      })
    }

    const calculationItems = items.map((item) => {
      const row = portionsById.get(item.portionId)

      return {
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
        quantity: item.quantity,
      }
    })

    const calculation = calculateFoodPortions(calculationItems)

    return res.json({
      success: true,
      personalized: false,
      message:
        'Nutrition calculation only. Diet, allergy, and portion ' +
        'suitability have not been checked.',
      calculation,
    })
  } catch (error) {
    if (error.status === 422) {
      return res.status(422).json({
        success: false,
        message: error.message,
      })
    }

    next(error)
  }
}