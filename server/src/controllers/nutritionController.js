import pool from '../config/db.js'
import { calculateEnergy } from '../services/nutritionService.js'

export async function getEnergyEstimate(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const [rows] = await pool.execute(
      `SELECT age, sex_for_calculation, height_cm,
              weight_kg, activity_level
       FROM user_profiles
       WHERE user_id = ?`,
      [req.session.userId]
    )

    if (!rows.length) {
      return res.status(422).json({
        success: false,
        message: 'Create and save your personal profile first.',
      })
    }

    const row = rows[0]

    const estimate = calculateEnergy({
      age: Number(row.age),
      sexForCalculation: row.sex_for_calculation,
      heightCm: Number(row.height_cm),
      weightKg: Number(row.weight_kg),
      activityLevel: row.activity_level,
    })

    return res.json({
      success: true,
      estimate,
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