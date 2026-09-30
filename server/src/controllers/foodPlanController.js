import pool from '../config/db.js'
import { calculateEnergy } from '../services/nutritionService.js'
import { calculateNutritionTargets } from '../services/nutritionTargets.js'
import { evaluateFoodEligibility } from '../services/foodEligibilityService.js'
import { calculateFoodPortions } from '../services/foodPortionService.js'
import { assessNutritionMatch } from '../services/nutritionMatchService.js'

function validPlanDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const year = Number(value.slice(0, 4))

  if (year < 1000 || year > 9999) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function parseSnapshot(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function formatDraft(row) {
  return {
    id: Number(row.id),
    title: row.title,
    planDate: row.plan_date,
    status: row.status,
    suggestion: parseSnapshot(row.suggestion_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function handleError(error, res, next) {
  if (error.status === 422 || error.statusCode === 422) {
    return res.status(422).json({
      success: false,
      message: error.message,
    })
  }

  return next(error)
}

// POST /api/food-plans
export async function saveFoodPlan(req, res, next) {
  res.set('Cache-Control', 'no-store')

  const userId = req.session?.userId

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to continue.',
    })
  }

  const body = req.body ?? {}
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const { planDate, items } = body

  if (title.length < 1 || title.length > 120) {
    return res.status(400).json({
      success: false,
      message: 'Enter a draft title between 1 and 120 characters.',
    })
  }

  if (!validPlanDate(planDate)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid date in YYYY-MM-DD format.',
    })
  }

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
      !Array.isArray(item) &&
      Number.isSafeInteger(item.portionId) &&
      item.portionId > 0 &&
      Number.isSafeInteger(item.quantity) &&
      item.quantity > 0
  )

  if (!validItems) {
    return res.status(400).json({
      success: false,
      message:
        'Each item must have a positive integer portionId and quantity.',
    })
  }

  const portionIds = items.map((item) => item.portionId)

  if (new Set(portionIds).size !== portionIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Select each portion only once.',
    })
  }

  try {
    const [profileRows] = await pool.execute(
      `SELECT age, sex_for_calculation, height_cm, weight_kg,
              activity_level, goal
       FROM user_profiles
       WHERE user_id = ?`,
      [userId]
    )

    if (!profileRows.length) {
      return res.status(422).json({
        success: false,
        message: 'Save your personal profile first.',
      })
    }

    const [preferenceRows] = await pool.execute(
      `SELECT diet_type, allergies, avoided_foods, meals_per_day
       FROM user_preferences
       WHERE user_id = ?`,
      [userId]
    )

    if (!preferenceRows.length) {
      return res.status(422).json({
        success: false,
        message: 'Save your food preferences first.',
      })
    }

    const row = profileRows[0]
    const preferences = preferenceRows[0]

    const profile = {
      age: Number(row.age),
      sexForCalculation: row.sex_for_calculation ?? null,
      heightCm: Number(row.height_cm),
      weightKg: Number(row.weight_kg),
      activityLevel: row.activity_level,
      goal: row.goal,
    }

    const estimate = calculateEnergy(profile)

    const nutritionTargets = calculateNutritionTargets({
      maintenanceCalories: estimate.maintenanceCalories,
      goal: profile.goal,
    })

    const targets = {
      calories: nutritionTargets.targetCalories,
      proteinGrams: nutritionTargets.macros.proteinGrams,
      carbohydrateGrams: nutritionTargets.macros.carbohydrateGrams,
      fatGrams: nutritionTargets.macros.fatGrams,
    }

    const placeholders = portionIds.map(() => '?').join(', ')

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
       FROM food_portions p
       INNER JOIN foods f ON f.id = p.food_id
       WHERE p.id IN (${placeholders})
         AND p.review_status = 'approved'
         AND f.review_status = 'approved'`,
      portionIds
    )

    const portionsById = new Map(
      rows.map((food) => [Number(food.portion_id), food])
    )

    const selectedFoods = new Set()
    const calculationItems = []

    for (const item of items) {
      const food = portionsById.get(item.portionId)

      if (!food) {
        return res.status(422).json({
          success: false,
          message: 'A selected food or portion is unavailable.',
        })
      }

      const eligibility = evaluateFoodEligibility(food, preferences)

      if (!eligibility.eligible) {
        return res.status(422).json({
          success: false,
          message: `${food.name} does not pass your saved preference checks.`,
          reason: eligibility.reason,
        })
      }

      const foodId = Number(food.id)

      if (selectedFoods.has(foodId)) {
        return res.status(400).json({
          success: false,
          message: 'Select only one portion type for each food.',
        })
      }

      selectedFoods.add(foodId)

      const amount = Number(food.amount)
      const gramWeight = Number(food.gram_weight)

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(gramWeight) ||
        gramWeight <= 0
      ) {
        return res.status(422).json({
          success: false,
          message: 'A selected portion has invalid measurement data.',
        })
      }

      const grams = (item.quantity / amount) * gramWeight

      // Technical bound only; not a practical serving recommendation.
      if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
        return res.status(422).json({
          success: false,
          message: 'A selected food quantity is outside the supported range.',
        })
      }

      calculationItems.push({
        food: {
          id: foodId,
          name: food.name,
          preparation_state: food.preparation_state,
          calories_per_100g: food.calories_per_100g,
          protein_per_100g: food.protein_per_100g,
          carbohydrate_per_100g: food.carbohydrate_per_100g,
          fat_per_100g: food.fat_per_100g,
          fiber_per_100g: food.fiber_per_100g,
        },
        portion: {
          id: Number(food.portion_id),
          food_id: foodId,
          label: food.label,
          amount,
          gram_weight: gramWeight,
          unit_singular: food.unit_singular,
          unit_plural: food.unit_plural,
        },
        quantity: item.quantity,
      })
    }

    const calculation = calculateFoodPortions(calculationItems)

    const { comparison, targetMatch } = assessNutritionMatch(
      calculation.totals,
      targets
    )

    // Store server-calculated data, never browser-supplied nutrition totals.
    const snapshot = {
      schemaVersion: 1,
      status: 'draft',
      scope: 'daily_totals',
      goal: profile.goal,
      dietType: preferences.diet_type,
      mealsPerDay: Number(preferences.meals_per_day),
      targets: nutritionTargets,
      calculation,
      comparison,
      targetMatch,
      requiresReview: true,
      checkedAt: new Date().toISOString(),
      limitations: [
        'Food eligibility was checked against saved preferences at save time.',
        'Nutrition was recalculated from the food database.',
        'This is a historical snapshot; later preference changes do not update it.',
        'Practical serving limits and nutritional completeness have not been validated.',
        'Budget matching is not available.',
      ],
    }

    const [result] = await pool.execute(
      `INSERT INTO food_plan_drafts
         (user_id, title, plan_date, suggestion_json)
       VALUES (?, ?, ?, ?)`,
      [userId, title, planDate, JSON.stringify(snapshot)]
    )

    return res.status(201).json({
      success: true,
      message: 'Food-plan draft saved.',
      draft: {
        id: Number(result.insertId),
        title,
        planDate,
        status: 'draft',
        suggestion: snapshot,
      },
    })
  } catch (error) {
    return handleError(error, res, next)
  }
}

// GET /api/food-plans
export async function listFoodPlans(req, res, next) {
  res.set('Cache-Control', 'no-store')

  const userId = req.session?.userId

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to continue.',
    })
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, title,
              DATE_FORMAT(plan_date, '%Y-%m-%d') AS plan_date,
              status, suggestion_json, created_at, updated_at
       FROM food_plan_drafts
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [userId]
    )

    return res.json({
      success: true,
      drafts: rows.map(formatDraft),
    })
  } catch (error) {
    return next(error)
  }
}