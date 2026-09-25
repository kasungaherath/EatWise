import pool from '../config/db.js'

const dietTypes = [
  'omnivore',
  'vegetarian',
  'vegan',
  'pescatarian',
]

function validFoodList(value) {
  return (
    Array.isArray(value) &&
    value.length <= 30 &&
    value.every(
      (item) =>
        typeof item === 'string' &&
        item.trim().length > 0 &&
        item.trim().length <= 80
    )
  )
}

function cleanFoodList(items) {
  return [...new Set(
    items.map((item) => item.trim().toLowerCase())
  )]
}

function readJsonList(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

export async function getPreferences(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const [rows] = await pool.execute(
      `SELECT diet_type, allergies, avoided_foods,
              daily_budget_lkr, meals_per_day
       FROM user_preferences
       WHERE user_id = ?`,
      [req.session.userId]
    )

    if (!rows.length) {
      return res.json({
        success: true,
        preferences: null,
      })
    }

    const row = rows[0]

    return res.json({
      success: true,
      preferences: {
        dietType: row.diet_type,
        allergies: readJsonList(row.allergies),
        avoidedFoods: readJsonList(row.avoided_foods),
        dailyBudgetLkr:
          row.daily_budget_lkr === null
            ? null
            : Number(row.daily_budget_lkr),
        mealsPerDay: row.meals_per_day,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function savePreferences(req, res, next) {
  const {
    dietType,
    allergies,
    avoidedFoods,
    dailyBudgetLkr,
    mealsPerDay,
  } = req.body || {}

  if (!dietTypes.includes(dietType)) {
    return res.status(400).json({
      success: false,
      message: 'Select a valid diet preference',
    })
  }

  if (!validFoodList(allergies) || !validFoodList(avoidedFoods)) {
    return res.status(400).json({
      success: false,
      message:
        'Food lists must contain up to 30 items, each between 1 and 80 characters',
    })
  }

  if (
    !Number.isInteger(mealsPerDay) ||
    mealsPerDay < 2 ||
    mealsPerDay > 6
  ) {
    return res.status(400).json({
      success: false,
      message: 'Choose between 2 and 6 meals per day',
    })
  }

  if (
    dailyBudgetLkr !== null &&
    (
      typeof dailyBudgetLkr !== 'number' ||
      !Number.isFinite(dailyBudgetLkr) ||
      dailyBudgetLkr < 1 ||
      dailyBudgetLkr > 100000
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Enter a daily budget between LKR 1 and 100,000, or leave it unset',
    })
  }

  const preferences = {
    dietType,
    allergies: cleanFoodList(allergies),
    avoidedFoods: cleanFoodList(avoidedFoods),
    dailyBudgetLkr:
      dailyBudgetLkr === null
        ? null
        : Number(dailyBudgetLkr.toFixed(2)),
    mealsPerDay,
  }

  const values = [
    preferences.dietType,
    JSON.stringify(preferences.allergies),
    JSON.stringify(preferences.avoidedFoods),
    preferences.dailyBudgetLkr,
    preferences.mealsPerDay,
  ]

  try {
    await pool.execute(
      `INSERT INTO user_preferences
        (user_id, diet_type, allergies, avoided_foods,
         daily_budget_lkr, meals_per_day)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         diet_type = ?,
         allergies = ?,
         avoided_foods = ?,
         daily_budget_lkr = ?,
         meals_per_day = ?`,
      [req.session.userId, ...values, ...values]
    )

    res.set('Cache-Control', 'no-store')

    return res.json({
      success: true,
      message: 'Food preferences saved successfully',
      preferences,
    })
  } catch (error) {
    next(error)
  }
}