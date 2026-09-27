const nutrientFields = {
  calories: 'calories_per_100g',
  proteinGrams: 'protein_per_100g',
  carbohydrateGrams: 'carbohydrate_per_100g',
  fatGrams: 'fat_per_100g',
  fiberGrams: 'fiber_per_100g',
}

function validationError(message) {
  const error = new Error(message)
  error.status = 422
  return error
}

function readNumber(value, label, allowZero = true) {
  if (
    value === null ||
    value === undefined ||
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    throw validationError(`${label} is required.`)
  }

  const number = Number(value)

  if (
    !Number.isFinite(number) ||
    (allowZero ? number < 0 : number <= 0)
  ) {
    throw validationError(`${label} has an invalid value.`)
  }

  return number
}

function roundTwo(value) {
  return Number(value.toFixed(2))
}

export function calculateRecipeNutrition({
  servings,
  ingredients,
}) {
  const servingCount = readNumber(
    servings,
    'Number of servings',
    false
  )

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw validationError('Add at least one ingredient.')
  }

  const totals = {
    calories: 0,
    proteinGrams: 0,
    carbohydrateGrams: 0,
    fatGrams: 0,
    fiberGrams: 0,
  }

  let totalIngredientWeightGrams = 0
  let fiberComplete = true

  for (const [index, ingredient] of ingredients.entries()) {
    if (!ingredient || typeof ingredient !== 'object') {
      throw validationError(`Ingredient ${index + 1} is invalid.`)
    }

    const quantity = readNumber(
      ingredient.quantity_grams,
      `Ingredient ${index + 1} weight`,
      false
    )

    totalIngredientWeightGrams += quantity

    for (const [outputField, databaseField] of Object.entries(
      nutrientFields
    )) {
      const value = ingredient[databaseField]

      if (
        outputField === 'fiberGrams' &&
        (value === null || value === undefined)
      ) {
        fiberComplete = false
        continue
      }

      const per100g = readNumber(
        value,
        `Ingredient ${index + 1}: ${databaseField}`
      )

      totals[outputField] += (quantity / 100) * per100g
    }
  }

  const wholeRecipe = {}
  const perServing = {}

  for (const [field, total] of Object.entries(totals)) {
    if (field === 'fiberGrams' && !fiberComplete) {
      wholeRecipe[field] = null
      perServing[field] = null
      continue
    }

    if (
      !Number.isFinite(total) ||
      !Number.isFinite(total / servingCount)
    ) {
      throw validationError('Recipe nutrition exceeds valid limits.')
    }

    wholeRecipe[field] = roundTwo(total)
    perServing[field] = roundTwo(total / servingCount)
  }

  if (!Number.isFinite(totalIngredientWeightGrams)) {
    throw validationError('Recipe weight exceeds valid limits.')
  }

  return {
    servings: servingCount,
    ingredientCount: ingredients.length,
    totalIngredientWeightGrams: roundTwo(
      totalIngredientWeightGrams
    ),
    wholeRecipe,
    perServing,
    fiberComplete,
    isEstimate: true,
  }
}