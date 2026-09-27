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
    age: Number(row.age),
    sexForCalculation: row.sex_for_calculation ?? null,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    activityLevel: row.activity_level,
    goal: row.goal,
  }
}

async function readProfile(userId) {
  const [rows] = await pool.execute(
    `SELECT age, sex_for_calculation, height_cm, weight_kg,
            activity_level, goal
     FROM user_profiles
     WHERE user_id = ?`,
    [userId]
  )

  return rows.length ? formatProfile(rows[0]) : null
}

export async function getProfile(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const profile = await readProfile(req.session.userId)

    console.log(
      '[Profile GET] sexForCalculation:',
      profile?.sexForCalculation
    )

    return res.json({
      success: true,
      profile,
    })
  } catch (error) {
    next(error)
  }
}

export async function saveProfile(req, res, next) {
  res.set('Cache-Control', 'no-store')

  const {
    age,
    sexForCalculation,
    heightCm,
    weightKg,
    activityLevel,
    goal,
  } = req.body || {}

  if (sexForCalculation === undefined) {
    return res.status(400).json({
      success: false,
      message:
        'The form did not send sexForCalculation. Save the updated ProfileForm.jsx and reload the website.',
    })
  }

  if (
    sexForCalculation !== null &&
    sexForCalculation !== 'male' &&
    sexForCalculation !== 'female'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Select Male, Female, or Prefer not to specify',
    })
  }

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

  const values = [
    age,
    sexForCalculation,
    Number(heightCm.toFixed(2)),
    Number(weightKg.toFixed(2)),
    activityLevel,
    goal,
  ]

  try {
    await pool.execute(
      `INSERT INTO user_profiles
        (user_id, age, sex_for_calculation, height_cm,
         weight_kg, activity_level, goal)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         age = ?,
         sex_for_calculation = ?,
         height_cm = ?,
         weight_kg = ?,
         activity_level = ?,
         goal = ?`,
      [req.session.userId, ...values, ...values]
    )

    const savedProfile = await readProfile(req.session.userId)

    console.log('[Profile SAVE]', {
      received: sexForCalculation,
      stored: savedProfile?.sexForCalculation,
    })

    if (
      !savedProfile ||
      savedProfile.sexForCalculation !== sexForCalculation
    ) {
      return res.status(500).json({
        success: false,
        message:
          'The database returned a different sex selection after saving. Check the backend terminal.',
      })
    }

    return res.json({
      success: true,
      message: 'Profile saved successfully',
      profile: savedProfile,
    })
  } catch (error) {
    next(error)
  }
}