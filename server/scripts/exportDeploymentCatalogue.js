import { writeFile } from 'node:fs/promises'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true })

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
})

try {
  // Only public nutrition catalogue tables are exported. Account data stays local.
  const [foodRows] = await db.query(
    "SELECT * FROM foods WHERE review_status = 'approved' ORDER BY id"
  )
  const foods = []
  const foodReferences = new Map()
  for (const { id, created_at, updated_at, ...food } of foodRows) {
    foodReferences.set(id, {
      source_name: food.source_name,
      source_reference: food.source_reference,
    })
    const [portionRows] = await db.execute(
      "SELECT * FROM food_portions WHERE food_id = ? AND review_status = 'approved' ORDER BY id",
      [id]
    )
    const portions = portionRows.map(
      ({ id, food_id, created_at, updated_at, ...portion }) => portion
    )
    const [[limit]] = await db.execute(
      'SELECT max_daily_grams, policy_label FROM food_quantity_limits WHERE food_id = ?',
      [id]
    )
    foods.push({ food, portions, limit: limit ?? null })
  }

  const [recipeRows] = await db.query(
    "SELECT * FROM recipes WHERE review_status = 'approved' ORDER BY id"
  )
  const recipes = []
  for (const { id, created_at, updated_at, ...recipe } of recipeRows) {
    const [ingredientRows] = await db.execute(
      'SELECT food_id, quantity_grams, preparation_note, sort_order FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order, id',
      [id]
    )
    if (ingredientRows.some(({ food_id }) => !foodReferences.has(food_id))) continue
    recipes.push({
      recipe,
      ingredients: ingredientRows.map(({ food_id, ...ingredient }) => ({
        ...ingredient,
        food: foodReferences.get(food_id),
      })),
    })
  }

  await writeFile(
    new URL('../database/deployment_catalogue.json', import.meta.url),
    `${JSON.stringify({ version: 1, foods, recipes }, null, 2)}\n`
  )
  console.log(`Exported ${foods.length} approved foods and ${recipes.length} approved recipes.`)
} catch (error) {
  console.error('Catalogue export failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  await db.end()
}
