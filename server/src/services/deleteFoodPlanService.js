export async function deleteOwnedFoodPlan(db, userId, draftId) {
  if (!/^[1-9]\d*$/.test(String(draftId)) ||
      !Number.isSafeInteger(Number(draftId)) || Number(draftId) > 4294967295) {
    const error = new Error('Invalid draft ID.')
    error.status = 400
    throw error
  }
  if (!Number.isSafeInteger(Number(userId)) || Number(userId) < 1) {
    const error = new Error('Sign in to delete a draft.')
    error.status = 401
    throw error
  }
  const [result] = await db.execute(
    'DELETE FROM food_plan_drafts WHERE id = ? AND user_id = ?',
    [Number(draftId), Number(userId)]
  )
  if (result.affectedRows === 0) {
    const error = new Error('Draft not found. Refresh your saved drafts.')
    error.status = 404
    throw error
  }
}
