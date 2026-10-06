// Reproducible USDA expansion; run from any directory with node server/scripts/addEightFoods.js.
import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true })
const { default: pool } = await import('../src/config/db.js')
// Editable prototype search bounds in grams, not dietary recommendations.
const settings = {
  '171265': [0, 1, 1, 500], '173806': [1, 1, 1, 60],
  '168917': [1, 1, 1, 500], '170287': [1, 1, 1, 500],
  '171688': [1, 1, 1, 300], '171705': [1, 1, 1, 200],
  '168463': [1, 1, 1, 300], '175168': [0, 0, 1, 300],
}
let connection
try {
  const records = JSON.parse(await readFile(new URL('../database/eight_more_foods.json', import.meta.url), 'utf8'))
  connection = await pool.getConnection()
  await connection.beginTransaction()
  for (const food of records) {
    const policy = settings[food.source_reference]
    if (!policy) throw new Error('Unclassified food record')
    const columns = Object.keys(food)
    await connection.execute(`INSERT IGNORE INTO foods (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, Object.values(food))
    // Preserve previous rejections and reviews. Allergen review is intentionally not inferred.
    await connection.execute(`UPDATE foods SET is_vegan=?, is_vegetarian=?, is_pescatarian=?, review_status='approved'
      WHERE source_name=? AND source_reference=? AND review_status='pending'`, [...policy.slice(0, 3), food.source_name, food.source_reference])
    const [[row]] = await connection.execute(`SELECT id, review_status FROM foods WHERE source_name=? AND source_reference=?`, [food.source_name, food.source_reference])
    if (row.review_status !== 'approved') continue
    await connection.execute(`INSERT INTO food_portions (food_id, portion_key, label, amount, unit_singular, unit_plural, gram_weight, source_name, source_reference, review_status)
      SELECT ?, '100g', '100 g', 100, 'gram', 'grams', 100, ?, ?, 'approved'
      WHERE NOT EXISTS (SELECT 1 FROM food_portions WHERE food_id=? AND portion_key='100g')`, [row.id, food.source_name, food.source_reference, row.id])
    await connection.execute(`INSERT IGNORE INTO food_quantity_limits (food_id, max_daily_grams, policy_label) VALUES (?, ?, 'demo-v1')`, [row.id, policy[3]])
  }
  await connection.commit()
  const [rows] = await connection.query(`SELECT f.source_reference, f.name, p.id AS portion_id, q.max_daily_grams
    FROM foods f JOIN food_portions p ON p.food_id=f.id JOIN food_quantity_limits q ON q.food_id=f.id
    WHERE f.source_name='USDA FoodData Central' AND f.source_reference IN (${Object.keys(settings).map(() => '?').join(',')}) AND f.review_status='approved'`, Object.keys(settings))
  console.table(rows)
} catch (error) {
  await connection?.rollback()
  console.error('Food expansion failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  connection?.release()
  await pool.end()
}
