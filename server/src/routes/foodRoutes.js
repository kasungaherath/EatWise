import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import {
  listFoods,
  listEligibleFoods,
  calculateFoods,
} from '../controllers/foodController.js'

const router = Router()

router.use(requireAuth)

router.get('/', listFoods)
router.get('/eligible', listEligibleFoods)
router.post('/calculate', calculateFoods)

export default router