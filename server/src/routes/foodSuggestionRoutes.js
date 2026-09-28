import { Router } from 'express'
import pool from '../config/db.js'
import requireAuth from '../middleware/requireAuth.js'
import { calculateEnergy } from '../services/nutritionService.js'
import { calculateNutritionTargets } from '../services/nutritionTargets.js'
import { evaluateFoodEligibility } from '../services/foodEligibilityService.js'

const router = Router()

router.use(requireAuth)

router.get('/context', async (req, res, next) => {
  res.set('Cache-Control', 'no-store')

  try {
    const userId = req.session.userId

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
      return res.status(422).json({
        success: false,
        message:
          'No approved foods match the supported preference checks. Some foods or exclusion terms may need review.',
      })
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
      return res.status(422).json({
        success: false,
        message: 'The eligible foods have no approved portions yet.',
      })
    }

    return res.json({
      success: true,
      context: {
        goal: profile.goal,
        dietType: preferences.diet_type,
        mealsPerDay: Number(preferences.meals_per_day),
        targets,
        foods,
      },
      limitations: [
        'Nutrition targets are estimates.',
        'Food eligibility uses the currently supported preference checks.',
        'Budget matching is not available.',
        'Catalogue availability does not guarantee a balanced daily plan.',
      ],
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
})

export default router