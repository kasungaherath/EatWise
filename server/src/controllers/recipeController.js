import pool from '../config/db.js'
import { calculateRecipeNutrition } from '../services/recipeNutritionService.js'

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
       ORDER BY r.id
       LIMIT 50`
    )

    if (recipes.length === 0) {
      return res.json({
        success: true,
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
      recipes: results,
    })
  } catch (error) {
    next(error)
  }
}