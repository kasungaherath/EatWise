import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import {
  saveFoodPlan,
  listFoodPlans,
} from '../controllers/foodPlanController.js'

const router = Router()

router.use(requireAuth)

router.get('/', listFoodPlans)
router.post('/', saveFoodPlan)

export default router