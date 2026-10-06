import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import pool from '../config/db.js'
import { deleteOwnedFoodPlan } from '../services/deleteFoodPlanService.js'
import {
  saveFoodPlan,
  listFoodPlans,
} from '../controllers/foodPlanController.js'

const router = Router()

router.use(requireAuth)

router.get('/', listFoodPlans)
router.post('/', saveFoodPlan)
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteOwnedFoodPlan(pool, req.session.userId, req.params.id)
    res.status(204).end()
  } catch (error) {
    if ([400, 401, 404].includes(error.status)) {
      return res.status(error.status).json({ message: error.message })
    }
    next(error)
  }
})

export default router
