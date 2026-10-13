const goalMultipliers = {
  lose_weight: 0.9,
  maintain_weight: 1,
  gain_muscle: 1.05,
}

// Planning defaults within published adult/active-adult ranges; not prescriptions.
const proteinRates = {
  maintain_weight: { general: 1, active: 1.2 },
  lose_weight: { general: 1.2, active: 1.4 },
  gain_muscle: { general: 1.6, active: 1.6 },
}
const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active']

function validationError(message) {
  const error = new Error(message)
  error.status = 422
  return error
}

function roundOne(value) {
  return Math.round(value * 10) / 10
}

export function calculateNutritionTargets({
  maintenanceCalories,
  goal,
  weightKg,
  activityLevel,
}) {
  if (
    typeof maintenanceCalories !== 'number' ||
    !Number.isFinite(maintenanceCalories) ||
    maintenanceCalories <= 0
  ) {
    throw validationError(
      'A valid maintenance calorie estimate is required.'
    )
  }

  if (!Object.hasOwn(goalMultipliers, goal)) {
    throw validationError('Select a valid goal in your profile.')
  }

  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
    throw validationError('A valid saved body weight is required to estimate protein.')
  }

  if (!activityLevels.includes(activityLevel)) {
    throw validationError('A valid saved activity level is required to estimate protein.')
  }

  const multiplier = goalMultipliers[goal]

  const targetCalories = Math.round(
    maintenanceCalories * multiplier
  )

  if (!Number.isFinite(targetCalories) || targetCalories <= 0) {
    throw validationError('Unable to calculate a calorie target.')
  }

  const active = ['moderate', 'active', 'very_active'].includes(activityLevel)
  const gramsPerKg = proteinRates[goal][active ? 'active' : 'general']
  const requestedProtein = weightKg * gramsPerKg
  // Keep the weight-based default within 35% of energy at extreme inputs.
  const maximumProtein = targetCalories * 0.35 / 4
  const calorieCapApplied = requestedProtein > maximumProtein
  const proteinGrams = calorieCapApplied
    ? Math.floor(maximumProtein * 10) / 10
    : roundOne(requestedProtein)
  const fatGrams = roundOne((targetCalories * 0.3) / 9)
  const carbohydrateGrams = roundOne((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4)

  if ([proteinGrams, fatGrams, carbohydrateGrams].some(value => value <= 0)) {
    throw validationError('Unable to calculate balanced macro targets from this calorie estimate.')
  }

  return {
    goal,
    maintenanceCalories: Math.round(maintenanceCalories),
    targetCalories,
    calorieAdjustmentPercent: Math.round(
      (multiplier - 1) * 100
    ),
    macros: {
      proteinGrams,
      fatGrams,
      carbohydrateGrams,
    },
    macroPercentages: {
      protein: roundOne(proteinGrams * 4 / targetCalories * 100),
      fat: roundOne(fatGrams * 9 / targetCalories * 100),
      carbohydrate: roundOne(carbohydrateGrams * 4 / targetCalories * 100),
    },
    proteinBasis: {
      method: 'body_weight_goal_and_activity',
      weightKg,
      gramsPerKg,
      calorieCapApplied,
    },
    isEstimate: true,
    requiresSuitabilityReview: true,
    note:
      'Prototype estimates using adjustable app defaults. ' +
      'These are not individualized nutrition prescriptions. ' +
      'Suitability must be checked before generating a meal plan.',
  }
}
