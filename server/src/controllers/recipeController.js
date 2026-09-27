import pool from '../config/db.js'
import { calculateRecipeNutrition } from '../services/recipeNutritionService.js'

const dietColumns = {
  omnivore: null,
  vegetarian: 'is_vegetarian',
  vegan: 'is_vegan',
  pescatarian: 'is_pescatarian',
}

function readInstructions(value) {
  const instructions =
    typeof value === 'string' ? JSON.parse(value) : value

  if (
    !Array.isArray(instructions) ||
    instructions.some((step) => typeof step !== 'string')
  ) {
    throw new Error('Invalid recipe instructions.')
  }

  return instructions
}

export async function listRecipes(req, res, next) {
  res.set('Cache-Control', 'no-store')

  try {
    const userId = req.session?.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to continue.',
      })
    }

    const [preferences] = await pool.execute(
      `SELECT diet_type
       FROM user_preferences
       WHERE user_id = ?`,
      [userId]
    )

    if (!preferences.length) {
      return res.status(422).json({
        success: false,
        message: 'Save your food preferences to view matching recipes.',
      })
    }

    const dietType = preferences[0].diet_type

    if (!Object.hasOwn(dietColumns, dietType)) {
      return res.status(422).json({
        success: false,
        message: 'Select and save a valid diet type.',
      })
    }

    const dietColumn = dietColumns[dietType]

    const dietCondition = dietColumn
      ? `AND NOT EXISTS (
          SELECT 1
          FROM recipe_ingredients ri
          JOIN foods f ON f.id = ri.food_id
          WHERE ri.recipe_id = r.id
            AND (f.${dietColumn} IS NULL OR f.${dietColumn} <> 1)
        )`
      : ''

    const [recipes] = await pool.execute(
      `SELECT
         r.id, r.slug, r.name, r.description,
         r.meal_type, r.servings,
         r.preparation_minutes, r.cooking_minutes,
         r.instructions
       FROM recipes r
       WHERE r.review_status = 'approved'
         AND EXISTS (
           SELECT 1
           FROM recipe_ingredients ri
           WHERE ri.recipe_id = r.id
         )
         AND NOT EXISTS (
           SELECT 1
           FROM recipe_ingredients ri
           JOIN foods f ON f.id = ri.food_id
           WHERE ri.recipe_id = r.id
             AND f.review_status <> 'approved'
         )
         ${dietCondition}
       ORDER BY r.id
       LIMIT 50`
    )

    const filtersApplied = {
      dietType,
      allergies: false,
      avoidedFoods: false,
    }

    if (!recipes.length) {
      return res.json({
        success: true,
        filtersApplied,
        recipes: [],
      })
    }

    const placeholders = recipes.map(() => '?').join(', ')

    const [ingredients] = await pool.execute(
      `SELECT
         ri.recipe_id, ri.food_id, ri.quantity_grams,
         ri.preparation_note, ri.sort_order,
         f.name, f.preparation_state,
         f.calories_per_100g, f.protein_per_100g,
         f.carbohydrate_per_100g, f.fat_per_100g,
         f.fiber_per_100g
       FROM recipe_ingredients ri
       JOIN foods f ON f.id = ri.food_id
       WHERE ri.recipe_id IN (${placeholders})
       ORDER BY ri.recipe_id, ri.sort_order, ri.id`,
      recipes.map((recipe) => recipe.id)
    )

    const results = recipes.map((recipe) => {
      const recipeIngredients = ingredients.filter(
        (ingredient) => ingredient.recipe_id === recipe.id
      )

      const nutrition = calculateRecipeNutrition({
        servings: recipe.servings,
        ingredients: recipeIngredients,
      })

      return {
        id: recipe.id,
        slug: recipe.slug,
        name: recipe.name,
        description: recipe.description,
        mealType: recipe.meal_type,
        servings: Number(recipe.servings),
        preparationMinutes: recipe.preparation_minutes,
        cookingMinutes: recipe.cooking_minutes,
        instructions: readInstructions(recipe.instructions),
        ingredients: recipeIngredients.map((ingredient) => ({
          foodId: ingredient.food_id,
          name: ingredient.name,
          preparationState: ingredient.preparation_state,
          quantityGrams: Number(ingredient.quantity_grams),
          preparationNote: ingredient.preparation_note,
        })),
        nutrition,
      }
    })

    return res.json({
      success: true,
      filtersApplied,
      recipes: results,
    })
  } catch (error) {
    next(error)
  }
}