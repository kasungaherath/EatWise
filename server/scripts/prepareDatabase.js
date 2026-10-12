import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true })

for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
  if (!process.env[key]) throw new Error(`${key} environment variable is missing`)
}

const { default: pool } = await import('../src/config/db.js')
let db
let locked = false

const schemaFiles = [
  'schema.sql',
  'meal_catalog.sql',
  'food_portions.sql',
  'food_quantity_limits.sql',
  'food_plan_drafts.sql',
]

async function insertMissing(table, record) {
  const columns = Object.keys(record)
  if (columns.some((name) => !/^[a-z][a-z0-9_]*$/.test(name))) {
    throw new Error('Invalid catalogue column')
  }
  const values = columns.map((column) => {
    const value = record[column]
    return value !== null && typeof value === 'object'
      ? JSON.stringify(value)
      : value
  })
  await db.execute(
    `INSERT IGNORE INTO ${table} (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    values
  )
}

async function foodId(reference) {
  const [[row]] = await db.execute(
    'SELECT id, review_status FROM foods WHERE source_name = ? AND source_reference = ?',
    [reference.source_name, reference.source_reference]
  )
  return row?.review_status === 'approved' ? row.id : null
}

async function completeStapleReview(food) {
  // These two old starter records were pending with unknown diet flags.
  // Their nutrition and classifications are now verified in the public seed.
  // Complete only pending reviews; preserve approved/rejected decisions and
  // separately reviewed allergen metadata.
  if (food.source_name !== 'USDA FoodData Central'
    || !['171477', '173944'].includes(food.source_reference)
    || food.review_status !== 'approved') return
  const columns = ['name', 'preparation_state', 'calories_per_100g', 'protein_per_100g',
    'carbohydrate_per_100g', 'fat_per_100g', 'fiber_per_100g', 'is_vegan',
    'is_vegetarian', 'is_pescatarian', 'source_url', 'source_accessed_at']
  await db.execute(
    `UPDATE foods SET ${columns.map(column => `\`${column}\` = ?`).join(', ')}, review_status = 'approved'
     WHERE source_name = ? AND source_reference = ? AND review_status = 'pending'`,
    [...columns.map(column => food[column]), food.source_name, food.source_reference],
  )
}

try {
  db = await pool.getConnection()
  const [[lock]] = await db.query(
    "SELECT GET_LOCK(CONCAT(DATABASE(), ':eatwise-bootstrap'), 30) AS acquired"
  )
  if (Number(lock.acquired) !== 1) throw new Error('Database setup is already running')
  locked = true

  // Use the configured database, including Railway's default database name.
  // Existing tables and records are retained on subsequent deployments.
  for (const file of schemaFiles) {
    const sql = await readFile(new URL(`../database/${file}`, import.meta.url), 'utf8')
    const statements = sql.replace(/^\s*--.*$/gm, '').split(';')
    for (const statement of statements) {
      if (/^\s*CREATE TABLE IF NOT EXISTS\b/i.test(statement)) {
        await db.query(statement)
      }
    }
  }

  const catalogue = JSON.parse(
    await readFile(new URL('../database/deployment_catalogue.json', import.meta.url), 'utf8')
  )
  if (catalogue.version !== 1) throw new Error('Unsupported catalogue version')

  const expansion = JSON.parse(await readFile(new URL('../database/twenty_more_foods.json', import.meta.url), 'utf8'))
  const knownFoods = new Set(catalogue.foods.map(({ food }) => `${food.source_name}:${food.source_reference}`))
  for (const entry of expansion) {
    const key = `${entry.food.source_name}:${entry.food.source_reference}`
    if (!knownFoods.has(key)) {
      catalogue.foods.push(entry)
      knownFoods.add(key)
    }
  }

  await db.beginTransaction()
  for (const { food, portions, limit } of catalogue.foods) {
    await insertMissing('foods', food)
    await completeStapleReview(food)
    const id = await foodId(food)
    // Never reverse a review decision already made in the deployed database.
    if (!id) continue
    for (const portion of portions) {
      await insertMissing('food_portions', { food_id: id, ...portion })
    }
    if (limit) {
      await insertMissing('food_quantity_limits', { food_id: id, ...limit })
    }
  }

  for (const { recipe, ingredients } of catalogue.recipes) {
    const resolved = []
    for (const { food, ...ingredient } of ingredients) {
      const id = await foodId(food)
      if (!id) break
      resolved.push({ food_id: id, ...ingredient })
    }
    if (resolved.length !== ingredients.length) continue
    await insertMissing('recipes', recipe)
    const [[row]] = await db.execute(
      'SELECT id, review_status FROM recipes WHERE slug = ?',
      [recipe.slug]
    )
    if (row.review_status !== 'approved') continue
    const [[existing]] = await db.execute(
      'SELECT COUNT(*) AS count FROM recipe_ingredients WHERE recipe_id = ?',
      [row.id]
    )
    if (Number(existing.count) > 0) continue
    for (const ingredient of resolved) {
      await insertMissing('recipe_ingredients', { recipe_id: row.id, ...ingredient })
    }
  }

  const [[ready]] = await db.query(
    `SELECT COUNT(DISTINCT f.id) AS count FROM foods f
     JOIN food_portions p ON p.food_id = f.id AND p.review_status = 'approved'
     JOIN food_quantity_limits q ON q.food_id = f.id AND q.max_daily_grams > 0
     WHERE f.review_status = 'approved'`
  )
  if (Number(ready.count) === 0) throw new Error('No foods are ready for generation')
  await db.commit()
  console.log(`Database ready: ${ready.count} approved foods with portions and quantity limits.`)
} catch (error) {
  await db?.rollback()
  console.error('Database setup failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  if (locked) {
    await db.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':eatwise-bootstrap'))")
  }
  db?.release()
  await pool.end()
}
