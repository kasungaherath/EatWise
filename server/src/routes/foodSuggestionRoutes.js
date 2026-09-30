import { Router } from 'express'
import pool from '../config/db.js'
import requireAuth from '../middleware/requireAuth.js'
import { calculateEnergy } from '../services/nutritionService.js'
import { calculateNutritionTargets } from '../services/nutritionTargets.js'
import { evaluateFoodEligibility } from '../services/foodEligibilityService.js'
import { generateFoodSuggestion } from '../services/foodSuggestionService.js'

const router = Router()
const activeRequests = new Set()

router.use(requireAuth)

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

function requestError(message, status = 422) {
  const error = new Error(message)
  error.status = status
  return error
}

async function loadContext(userId) {
  const [profileRows] = await pool.execute(
    `SELECT age, sex_for_calculation, height_cm, weight_kg,
            activity_level, goal
     FROM user_profiles
     WHERE user_id = ?`,
    [userId]
  )

  if (!profileRows.length) {
    throw requestError('Save your personal profile first.')
  }

  const [preferenceRows] = await pool.execute(
    `SELECT diet_type, allergies, avoided_foods, meals_per_day
     FROM user_preferences
     WHERE user_id = ?`,
    [userId]
  )

  if (!preferenceRows.length) {
    throw requestError('Save your food preferences first.')
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

  const targets = calculateNutritionTargets({
    maintenanceCalories: estimate.maintenanceCalories,
    goal: profile.goal,
  })

  const [foodRows] = await pool.execute(
    `SELECT id, name, preparation_state, review_status,
            is_vegan, is_vegetarian, is_pescatarian,
            allergens, allergen_reviewed_at,
            source_name, source_reference,
            calories_per_100g, protein_per_100g,
            carbohydrate_per_100g, fat_per_100g,
            fiber_per_100g
     FROM foods
     WHERE review_status = 'approved'
     ORDER BY id`
  )

  const eligibleFoods = foodRows.filter(
    (food) => evaluateFoodEligibility(food, preferences).eligible
  )

  if (!eligibleFoods.length) {
    throw requestError(
      'No approved foods match the supported preference checks. Some foods or exclusions may need review.'
    )
  }

  const foodIds = eligibleFoods.map((food) => Number(food.id))
  const placeholders = foodIds.map(() => '?').join(', ')

  const [portionRows] = await pool.execute(
    `SELECT id, food_id, label, amount,
            unit_singular, unit_plural, gram_weight
     FROM food_portions
     WHERE review_status = 'approved'
       AND food_id IN (${placeholders})
     ORDER BY food_id, id`,
    foodIds
  )

  const portionsByFood = new Map()

  for (const portion of portionRows) {
    const foodId = Number(portion.food_id)

    if (!portionsByFood.has(foodId)) {
      portionsByFood.set(foodId, [])
    }

    portionsByFood.get(foodId).push({
      portionId: Number(portion.id),
      label: portion.label,
      amount: Number(portion.amount),
      unitSingular: portion.unit_singular,
      unitPlural: portion.unit_plural,
      gramWeight: Number(portion.gram_weight),
    })
  }

  const foods = eligibleFoods
    .map((food) => ({
      foodId: Number(food.id),
      name: food.name,
      preparationState: food.preparation_state,
      nutritionPer100g: {
        calories: Number(food.calories_per_100g),
        proteinGrams: Number(food.protein_per_100g),
        carbohydrateGrams: Number(food.carbohydrate_per_100g),
        fatGrams: Number(food.fat_per_100g),
        fiberGrams:
          food.fiber_per_100g == null
            ? null
            : Number(food.fiber_per_100g),
      },
      portions: portionsByFood.get(Number(food.id)) ?? [],
    }))
    .filter((food) => food.portions.length > 0)

  if (!foods.length) {
    throw requestError(
      'The eligible foods have no approved portions yet.'
    )
  }

  return {
    goal: profile.goal,
    dietType: preferences.diet_type,
    mealsPerDay: Number(preferences.meals_per_day),
    targets,
    foods,
  }
}

function handleError(error, res, next) {
  const status = error.status ?? error.statusCode

  if ([409, 422, 429, 502, 503].includes(status)) {
    return res.status(status).json({
      success: false,
      message: error.message,
    })
  }

  return next(error)
}

router.get('/context', async (req, res, next) => {
  try {
    const context = await loadContext(req.session.userId)

    return res.json({
      success: true,
      context,
      limitations: [
        'Nutrition targets are estimates.',
        'Food eligibility uses the currently supported preference checks.',
        'Budget matching is not available.',
        'Catalogue availability does not guarantee a balanced daily plan.',
      ],
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

router.post('/generate', async (req, res, next) => {
  const userId = req.session.userId

  // Prevent simultaneous generation for this user in this server process.
  if (activeRequests.has(userId)) {
    return res.status(429).json({
      success: false,
      message: 'A suggestion is already being generated. Please wait.',
    })
  }

  activeRequests.add(userId)

  try {
    const context = await loadContext(userId)
    const suggestion = await generateFoodSuggestion(context)

    // Recheck eligibility and targets after the AI call.
    const latestContext = await loadContext(userId)

    if (JSON.stringify(context) !== JSON.stringify(latestContext)) {
      throw requestError(
        'Your targets or available foods changed during generation. Please generate again.',
        409
      )
    }

    return res.json({
      success: true,
      suggestion,
    })
  } catch (error) {
    return handleError(error, res, next)
  } finally {
    activeRequests.delete(userId)
  }
})

export default router