import pool from '../config/db.js'
import { calculateEnergy } from '../services/nutritionService.js'
import { calculateNutritionTargets } from '../services/nutritionTargets.js'

export async function getEnergyEstimate(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const userId = req.session?.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to continue.',
      })
    }

    const [rows] = await pool.execute(
      `SELECT age, sex_for_calculation, height_cm, weight_kg,
              activity_level, goal
       FROM user_profiles
       WHERE user_id = ?`,
      [userId]
    )

    if (!rows.length) {
      return res.status(422).json({
        success: false,
        message: 'Save your personal profile first.',
      })
    }

    const row = rows[0]

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

    return res.json({
      success: true,
      estimate,
      targets,
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