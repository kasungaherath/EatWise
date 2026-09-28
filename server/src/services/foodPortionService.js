import { calculateRecipeNutrition } from './recipeNutritionService.js'

function validationError(message) {
  const error = new Error(message)
  error.status = 422
  return error
}

function positiveNumber(value, label) {
  if (
    value === null ||
    value === undefined ||
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    throw validationError(`${label} is required.`)
  }

  const number = Number(value)

  if (!Number.isFinite(number) || number <= 0) {
    throw validationError(`${label} must be a positive number.`)
  }

  return number
}

export function portionToGrams(portion, quantity) {
  if (!portion || typeof portion !== 'object') {
    throw validationError('A portion record is required.')
  }

  const requestedQuantity = positiveNumber(quantity, 'Quantity')
  const referenceAmount = positiveNumber(
    portion.amount,
    'Reference portion amount'
  )
  const referenceWeight = positiveNumber(
    portion.gram_weight,
    'Reference portion weight'
  )

  const grams =
    (requestedQuantity / referenceAmount) * referenceWeight

  if (!Number.isFinite(grams) || grams <= 0) {
    throw validationError('Unable to calculate a valid gram weight.')
  }

  return grams
}

export function calculateFoodPortions(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw validationError('Add at least one food.')
  }

  const ingredients = []
  const calculatedItems = []

  for (const item of items) {
    if (!item?.food || !item?.portion) {
      throw validationError('Each item needs a food and portion.')
    }

    const foodId = positiveNumber(item.food.id, 'Food ID')
    const portionFoodId = positiveNumber(
      item.portion.food_id,
      'Portion food ID'
    )

    if (
      !Number.isSafeInteger(foodId) ||
      !Number.isSafeInteger(portionFoodId) ||
      foodId !== portionFoodId
    ) {
      throw validationError('The portion does not match its food.')
    }

    const quantity = positiveNumber(item.quantity, 'Quantity')
    const grams = portionToGrams(item.portion, quantity)

    const ingredient = {
      ...item.food,
      quantity_grams: grams,
    }

    const nutrition = calculateRecipeNutrition({
      servings: 1,
      ingredients: [ingredient],
    }).wholeRecipe

    ingredients.push(ingredient)

    calculatedItems.push({
      foodId,
      name: item.food.name,
      preparationState: item.food.preparation_state,
      portionId: item.portion.id,
      quantity,
      unit:
        quantity === 1
          ? item.portion.unit_singular
          : item.portion.unit_plural,
      grams: Number(grams.toFixed(3)),
      nutrition,
    })
  }

  const combined = calculateRecipeNutrition({
    servings: 1,
    ingredients,
  })

  return {
    items: calculatedItems,
    totals: combined.wholeRecipe,
    totalWeightGrams: combined.totalIngredientWeightGrams,
    fiberComplete: combined.fiberComplete,
    isEstimate: true,
  }
}