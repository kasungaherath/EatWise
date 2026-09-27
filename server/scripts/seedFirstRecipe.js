import 'dotenv/config'
import pool from '../src/config/db.js'
import { calculateRecipeNutrition } from '../src/services/recipeNutritionService.js'

const slug = 'rice-lentils-and-egg'

const ingredientDefinitions = [
  {
    sourceReference: '168878',
    grams: 150,
    note: 'Weigh after cooking.',
  },
  {
    sourceReference: '172421',
    grams: 100,
    note: 'Boiled without salt; weigh cooked lentils.',
  },
  {
    sourceReference: '173424',
    grams: 50,
    note: 'Hard-boiled; remove shell before weighing.',
  },
]

async function main() {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [existing] = await connection.execute(
      'SELECT id FROM recipes WHERE slug = ?',
      [slug]
    )

    if (existing.length) {
      await connection.rollback()
      console.log(
        `Recipe already exists with ID ${existing[0].id}. No changes made.`
      )
      return
    }

    const [foods] = await connection.execute(
      `SELECT
         id, name, source_reference,
         calories_per_100g, protein_per_100g,
         carbohydrate_per_100g, fat_per_100g,
         fiber_per_100g
       FROM foods
       WHERE source_name = ?
         AND source_reference IN (?, ?, ?)`,
      [
        'USDA FoodData Central',
        ...ingredientDefinitions.map(
          (ingredient) => ingredient.sourceReference
        ),
      ]
    )

    const ingredients = ingredientDefinitions.map((definition) => {
      const food = foods.find(
        (item) =>
          item.source_reference === definition.sourceReference
      )

      if (!food) {
        throw new Error(
          `Import USDA food ${definition.sourceReference} first.`
        )
      }

      return {
        ...food,
        quantity_grams: definition.grams,
        preparation_note: definition.note,
      }
    })

    const nutrition = calculateRecipeNutrition({
      servings: 1,
      ingredients,
    })

    const instructions = [
      'Use cooked rice, boiled lentils, and a hard-boiled egg.',
      'Weigh 150 g cooked rice and 100 g cooked lentils.',
      'Remove the egg shell and weigh 50 g of the edible egg.',
      'Arrange the rice and lentils in a bowl and add the sliced egg.',
      'Nutrition includes only the listed ingredients; added oil or sauces must be recorded separately.',
    ]

    const [result] = await connection.execute(
      `INSERT INTO recipes (
         slug, name, description, meal_type,
         servings, instructions, review_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        'Rice, lentils and egg bowl',
        'A sample recipe assembled from prepared ingredients.',
        'lunch',
        1,
        JSON.stringify(instructions),
        'pending',
      ]
    )

    for (const [index, ingredient] of ingredients.entries()) {
      await connection.execute(
        `INSERT INTO recipe_ingredients (
           recipe_id, food_id, quantity_grams,
           preparation_note, sort_order
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          result.insertId,
          ingredient.id,
          ingredient.quantity_grams,
          ingredient.preparation_note,
          index + 1,
        ]
      )
    }

    await connection.commit()

    console.log(`Recipe created. ID: ${result.insertId}`)
    console.log('Review status: pending')

    console.table(
      ingredients.map((ingredient) => ({
        food: ingredient.name,
        grams: ingredient.quantity_grams,
      }))
    )

    console.log('Estimated nutrition per serving:')
    console.table([nutrition.perServing])
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

try {
  await main()
} catch (error) {
  console.error(
    error.code
      ? `Database error: ${error.code}`
      : error.message
  )
  process.exitCode = 1
} finally {
  await pool.end()
}