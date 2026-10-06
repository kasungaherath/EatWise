import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true })
const { default: pool } = await import('../src/config/db.js')
let connection
try {
  connection = await pool.getConnection()
  const sql = await readFile(new URL('../database/expand_whole_foods.sql', import.meta.url), 'utf8')
  for (const statement of sql.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)) {
    await connection.query(statement)
  }
  const [rows] = await connection.query(`SELECT f.name, f.review_status, p.id AS portion_id, q.max_daily_grams
    FROM foods f JOIN food_portions p ON p.food_id=f.id
    JOIN food_quantity_limits q ON q.food_id=f.id
    WHERE f.source_name='USDA FoodData Central' AND f.source_reference IN ('169967','168483','170894')`)
  console.table(rows)
} catch (error) {
  await connection?.rollback()
  console.error('Catalogue update failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  connection?.release()
  await pool.end()
}
