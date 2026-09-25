import pool from '../config/db.js'

const activityLevels = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]

const goals = [
  'lose_weight',
  'maintain_weight',
  'gain_muscle',
]

function validNumber(value, min, max) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  )
}

function formatProfile(row) {
  return {
    age: row.age,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    activityLevel: row.activity_level,
    goal: row.goal,
  }
}

export async function getProfile(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const [rows] = await pool.execute(
      `SELECT age, height_cm, weight_kg, activity_level, goal
       FROM user_profiles
       WHERE user_id = ?`,
      [req.session.userId]
    )

    return res.json({
      success: true,
      profile: rows.length ? formatProfile(rows[0]) : null,
    })
  } catch (error) {
    next(error)
  }
}

export async function saveProfile(req, res, next) {
  const {
    age,
    heightCm,
    weightKg,
    activityLevel,
    goal,
  } = req.body || {}

  if (!Number.isInteger(age) || age < 18 || age > 120) {
    return res.status(400).json({
      success: false,
      message: 'Enter an age between 18 and 120',
    })
  }

  if (!validNumber(heightCm, 50, 260)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a height between 50 and 260 cm',
    })
  }

  if (!validNumber(weightKg, 20, 500)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a weight between 20 and 500 kg',
    })
  }

  if (!activityLevels.includes(activityLevel)) {
    return res.status(400).json({
      success: false,
      message: 'Select a valid activity level',
    })
  }

  if (!goals.includes(goal)) {
    return res.status(400).json({
      success: false,
      message: 'Select a valid goal',
    })
  }

  const profile = {
    age,
    heightCm: Number(heightCm.toFixed(2)),
    weightKg: Number(weightKg.toFixed(2)),
    activityLevel,
    goal,
  }

  const values = [
    profile.age,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevel,
    profile.goal,
  ]

  try {
    await pool.execute(
      `INSERT INTO user_profiles
        (user_id, age, height_cm, weight_kg, activity_level, goal)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         age = ?,
         height_cm = ?,
         weight_kg = ?,
         activity_level = ?,
         goal = ?`,
      [req.session.userId, ...values, ...values]
    )

    res.set('Cache-Control', 'no-store')

    return res.json({
      success: true,
      message: 'Profile saved successfully',
      profile,
    })
  } catch (error) {
    next(error)
  }
}