const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

function validationError(message) {
  const error = new Error(message)
  error.status = 422
  return error
}

export function calculateEnergy(profile) {
  const {
    age,
    sexForCalculation,
    heightCm,
    weightKg,
    activityLevel,
  } = profile

  if (!['male', 'female'].includes(sexForCalculation)) {
    throw validationError(
      'Select and save the sex parameter in your personal profile to calculate an estimate.'
    )
  }

  if (!Number.isInteger(age) || age < 19 || age > 78) {
    throw validationError(
      'This version provides automatic energy estimates for ages 19–78.'
    )
  }

  if (
    !Number.isFinite(heightCm) ||
    heightCm < 50 ||
    heightCm > 260 ||
    !Number.isFinite(weightKg) ||
    weightKg < 20 ||
    weightKg > 500
  ) {
    throw validationError(
      'Check your saved height and weight before calculating.'
    )
  }

  if (!Object.hasOwn(activityMultipliers, activityLevel)) {
    throw validationError(
      'Select and save a valid activity level.'
    )
  }

  const sexAdjustment = sexForCalculation === 'male' ? 5 : -161

  const restingCalories =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    sexAdjustment

  const activityMultiplier = activityMultipliers[activityLevel]
  const maintenanceCalories = restingCalories * activityMultiplier

  if (
    !Number.isFinite(restingCalories) ||
    restingCalories <= 0 ||
    !Number.isFinite(maintenanceCalories) ||
    maintenanceCalories <= 0
  ) {
    throw validationError(
      'These measurements cannot produce a valid estimate. Check your profile.'
    )
  }

  return {
    restingCalories: Math.round(restingCalories),
    maintenanceCalories: Math.round(maintenanceCalories),
    activityMultiplier,
    unit: 'kcal/day',
    formula: 'Mifflin–St Jeor',
    isEstimate: true,
    goalAdjustmentApplied: false,
    note:
      'Approximate energy expenditure, not a prescribed intake. Activity multipliers are rough estimates. Not designed for pregnancy, breastfeeding, or medical nutrition needs.',
  }
}