const tolerances = {
  calories: 5,
  proteinGrams: 10,
  carbohydrateGrams: 10,
  fatGrams: 10,
}

function round(value) {
  return Math.round(value * 100) / 100
}

export function assessNutritionMatch(totals, targets) {
  const comparison = {}

  for (const [nutrient, tolerancePercent] of Object.entries(
    tolerances
  )) {
    const actual = totals?.[nutrient]
    const target = targets?.[nutrient]

    if (
      typeof actual !== 'number' ||
      !Number.isFinite(actual) ||
      actual < 0
    ) {
      throw new Error(`Invalid calculated value for ${nutrient}.`)
    }

    if (
      typeof target !== 'number' ||
      !Number.isFinite(target) ||
      target <= 0
    ) {
      throw new Error(`Invalid target for ${nutrient}.`)
    }

    const difference = actual - target
    const differencePercent = (difference / target) * 100

    // Compare before rounding.
    const withinTolerance =
      Math.abs(differencePercent) <= tolerancePercent + 1e-9

    comparison[nutrient] = {
      target,
      actual,
      difference: round(difference),
      differencePercent: round(differencePercent),
      tolerancePercent,
      withinTolerance,
      direction: withinTolerance
        ? 'within_range'
        : difference < 0
          ? 'below_target'
          : 'above_target',
    }
  }

  const outsideTolerance = Object.entries(comparison)
    .filter(([, value]) => !value.withinTolerance)
    .map(([nutrient]) => nutrient)

  return {
    comparison,
    targetMatch: {
      status:
        outsideTolerance.length === 0
          ? 'within_tolerance'
          : 'needs_adjustment',
      outsideTolerance,
      isSuitabilityAssessment: false,
    },
  }
}