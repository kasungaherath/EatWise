import { calculateFoodPortions } from './foodPortionService.js'
import { assessNutritionMatch } from './nutritionMatchService.js'

function limitError(message) {
  const error = new Error(message)
  error.status = 422
  return error
}

export function readDailyLimit(value) {
  if (
    value == null ||
    (typeof value !== 'number' && typeof value !== 'string') ||
    String(value).trim() === ''
  ) {
    return null
  }

  const limit = Number(value)

  return Number.isFinite(limit) && limit > 0 && limit <= 10000
    ? limit
    : null
}

export function maximumWholeQuantity(limitValue, amountValue, weightValue) {
  const limit = readDailyLimit(limitValue)
  const amount = Number(amountValue)
  const weight = Number(weightValue)

  if (
    limit === null ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    return 0
  }

  let maximum = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.floor((limit / weight) * amount)
  )

  // Guard against floating-point rounding above the limit.
  if (maximum > 0 && (maximum / amount) * weight > limit) {
    maximum -= 1
  }

  return maximum
}

export function assertDailyQuantity({
  name,
  quantity,
  amount,
  gramWeight,
  maxDailyGrams,
}) {
  const maximum = maximumWholeQuantity(
    maxDailyGrams,
    amount,
    gramWeight
  )

  if (maximum < 1) {
    throw limitError(
      `${name} has no usable daily quantity limit for this portion.`
    )
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > maximum
  ) {
    throw limitError(
      `${name} exceeds its configured daily limit of ${maxDailyGrams} g.`
    )
  }
}

function scoreMatch(assessment) {
  return Object.values(assessment.comparison).reduce((sum, row) => {
    const distance = Math.abs(row.actual - row.target) / row.target
    const excess = Math.max(
      0,
      distance - row.tolerancePercent / 100
    )

    return sum + excess ** 2 + 0.001 * distance ** 2
  }, 0)
}

export function applyDailyQuantityLimits(suggestion, context) {
  const proposedItems = suggestion?.calculation?.items

  if (
    !Array.isArray(proposedItems) ||
    proposedItems.length < 1 ||
    proposedItems.length > 50
  ) {
    throw limitError('The generated draft contains invalid food items.')
  }

  const targets = {
    calories: context.targets.targetCalories,
    proteinGrams: context.targets.macros.proteinGrams,
    carbohydrateGrams: context.targets.macros.carbohydrateGrams,
    fatGrams: context.targets.macros.fatGrams,
  }

  const portionsById = new Map()

  for (const food of context.foods) {
    for (const portion of food.portions) {
      portionsById.set(portion.portionId, { food, portion })
    }
  }

  const selectedFoods = new Set()
  const maxima = []
  const appliedLimits = []

  let current = proposedItems.map((item) => {
    const selected = portionsById.get(item.portionId)

    if (
      !selected ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw limitError('The generated draft contains an invalid portion.')
    }

    const { food, portion } = selected

    if (selectedFoods.has(food.foodId)) {
      throw limitError('The generated draft contains a duplicate food.')
    }

    selectedFoods.add(food.foodId)

    const maximum = maximumWholeQuantity(
      food.maxDailyGrams,
      portion.amount,
      portion.gramWeight
    )

    if (maximum < 1) {
      throw limitError(
        `${food.name} has no usable daily quantity limit.`
      )
    }

    maxima.push(maximum)

    appliedLimits.push({
      foodId: food.foodId,
      maxDailyGrams: food.maxDailyGrams,
      policyLabel: food.quantityPolicyLabel,
    })

    return {
      food: {
        id: food.foodId,
        name: food.name,
        preparation_state: food.preparationState,
        calories_per_100g: food.nutritionPer100g.calories,
        protein_per_100g: food.nutritionPer100g.proteinGrams,
        carbohydrate_per_100g:
          food.nutritionPer100g.carbohydrateGrams,
        fat_per_100g: food.nutritionPer100g.fatGrams,
        fiber_per_100g: food.nutritionPer100g.fiberGrams,
      },
      portion: {
        id: portion.portionId,
        food_id: food.foodId,
        label: portion.label,
        amount: portion.amount,
        gram_weight: portion.gramWeight,
        unit_singular: portion.unitSingular,
        unit_plural: portion.unitPlural,
      },
      quantity: Math.min(item.quantity, maximum),
    }
  })

  let calculation = calculateFoodPortions(current)
  let assessment = assessNutritionMatch(calculation.totals, targets)
  let bestScore = scoreMatch(assessment)

  search:
  for (const step of [100, 25, 5, 1]) {
    for (let pass = 0; pass < 80; pass++) {
      if (assessment.targetMatch.status === 'within_tolerance') {
        break search
      }

      let improved = false

      for (let index = 0; index < current.length; index++) {
        for (const direction of [-1, 1]) {
          const quantity =
            current[index].quantity + step * direction

          if (quantity < 1 || quantity > maxima[index]) {
            continue
          }

          const candidate = current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, quantity } : item
          )

          const nextCalculation = calculateFoodPortions(candidate)
          const nextAssessment = assessNutritionMatch(
            nextCalculation.totals,
            targets
          )

          const nextScore = scoreMatch(nextAssessment)
          const matched =
            nextAssessment.targetMatch.status === 'within_tolerance'

          if (matched || nextScore < bestScore - 1e-12) {
            current = candidate
            calculation = nextCalculation
            assessment = nextAssessment
            bestScore = nextScore
            improved = true

            if (matched) break search
          }
        }
      }

      if (!improved) break
    }
  }

  // Final checks use quantities and original portion measurements.
  current.forEach((item, index) => {
    assertDailyQuantity({
      name: item.food.name,
      quantity: item.quantity,
      amount: item.portion.amount,
      gramWeight: item.portion.gram_weight,
      maxDailyGrams: appliedLimits[index].maxDailyGrams,
    })
  })

  const adjusted = current.some(
    (item, index) => item.quantity !== proposedItems[index].quantity
  )

  const matched =
    assessment.targetMatch.status === 'within_tolerance'

  return {
    ...suggestion,
    calculation,
    comparison: assessment.comparison,
    targetMatch: assessment.targetMatch,
    quantityAdjustment: {
      method: 'bounded_local_search_with_daily_limits',
      applied:
        adjusted || Boolean(suggestion.quantityAdjustment?.applied),
      status: matched ? 'within_tolerance' : 'needs_adjustment',
      message: matched
        ? 'The draft meets the target tolerances within configured quantity limits.'
        : 'The search did not find a target match within the configured quantity limits.',
    },
    quantityLimits: {
      status: 'within_configured_limits',
      items: appliedLimits,
    },
    requiresReview: true,
    limitations: [
      'Nutrition totals were recalculated from the food database.',
      'Configured daily quantity limits were enforced.',
      'The initial quantity limits are editable demo settings, not validated dietary guidance.',
      'The search does not prove that a target match is impossible.',
      'Nutritional completeness and personal suitability have not been validated.',
      'Budget matching is not available.',
    ],
  }
}