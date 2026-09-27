const goalMultipliers = {
  lose_weight: 0.9,
  maintain_weight: 1,
  gain_muscle: 1.05,
}

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

  const multiplier = goalMultipliers[goal]

  const targetCalories = Math.round(
    maintenanceCalories * multiplier
  )

  if (!Number.isFinite(targetCalories) || targetCalories <= 0) {
    throw validationError('Unable to calculate a calorie target.')
  }

  return {
    goal,
    maintenanceCalories: Math.round(maintenanceCalories),
    targetCalories,
    calorieAdjustmentPercent: Math.round(
      (multiplier - 1) * 100
    ),
    macros: {
      proteinGrams: roundOne((targetCalories * 0.25) / 4),
      fatGrams: roundOne((targetCalories * 0.3) / 9),
      carbohydrateGrams: roundOne((targetCalories * 0.45) / 4),
    },
    macroPercentages: {
      protein: 25,
      fat: 30,
      carbohydrate: 45,
    },
    isEstimate: true,
    requiresSuitabilityReview: true,
    note:
      'Prototype estimates using adjustable app defaults. ' +
      'These are not individualized nutrition prescriptions. ' +
      'Suitability must be checked before generating a meal plan.',
  }
}