import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteOwnedFoodPlan } from './deleteFoodPlanService.js'

test('deletes only a draft owned by the authenticated user', async () => {
  let captured
  const db = { execute: async (sql, args) => { captured = { sql, args }; return [{ affectedRows: 1 }] } }
  await deleteOwnedFoodPlan(db, 7, '12')
  assert.equal(captured.sql, 'DELETE FROM food_plan_drafts WHERE id = ? AND user_id = ?')
  assert.deepEqual(captured.args, [12, 7])
})
test('missing and other-user drafts both return not found', async () => {
  const db = { execute: async () => [{ affectedRows: 0 }] }
  await assert.rejects(deleteOwnedFoodPlan(db, 7, '12'), { status: 404 })
})
test('invalid IDs never reach the database', async () => {
  const db = { execute: async () => assert.fail('Unexpected database call') }
  for (const id of ['0', '-1', '1 OR 1=1', '1.2', '', '4294967296']) {
    await assert.rejects(deleteOwnedFoodPlan(db, 7, id), { status: 400 })
  }
  await assert.rejects(deleteOwnedFoodPlan(db, undefined, '12'), { status: 401 })
})
test('database failure is propagated without reporting deletion', async () => {
  const failure = new Error('unavailable')
  await assert.rejects(deleteOwnedFoodPlan({ execute: async () => { throw failure } }, 7, '12'), failure)
})
