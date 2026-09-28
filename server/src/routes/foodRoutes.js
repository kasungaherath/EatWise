import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import {
  listFoods,
  calculateFoods,
} from '../controllers/foodController.js'

const router = Router()

router.use(requireAuth)

router.get('/', listFoods)
router.post('/calculate', calculateFoods)

export default router